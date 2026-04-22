import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';

import { config } from '../src/config.js';
import {
  createBackupMetadata,
  getBackupStorageDir,
  markBackupCompleted,
  markBackupFailed,
} from '../src/services/backup.js';

type BackupFormat = 'custom' | 'plain';

type BackupOptions = {
  actor: string;
  reason: string;
  format: BackupFormat;
  compressLevel: number;
  output?: string;
  dryRun: boolean;
};

const TARGET_COLLECTIONS = ['posts', 'post_versions', 'audit_logs', 'app_users'];

function readArgValue(flag: string): string {
  const index = process.argv.findIndex((item) => item === flag);
  if (index < 0) return '';
  return process.argv[index + 1] || '';
}

function readFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function usageAndExit(message?: string): never {
  if (message) {
    console.error(`ERROR: ${message}`);
    console.error('');
  }

  console.log('Usage:');
  console.log('  npm run backup:postgres -- --actor <actor> --reason <reason> [--format custom|plain] [--compress 0-9] [--output <path>] [--dry-run]');
  process.exit(1);
}

function parseOptions(): BackupOptions {
  const actor = readArgValue('--actor').trim();
  const reason = readArgValue('--reason').trim();
  const formatRaw = readArgValue('--format').trim().toLowerCase();
  const compressRaw = readArgValue('--compress').trim();
  const output = readArgValue('--output').trim() || undefined;

  if (!actor) usageAndExit('--actor is required');
  if (!reason) usageAndExit('--reason is required');

  const format: BackupFormat = formatRaw === 'plain' ? 'plain' : 'custom';
  const compressCandidate = Number.parseInt(compressRaw, 10);
  const compressLevel = Number.isFinite(compressCandidate)
    ? Math.min(9, Math.max(0, compressCandidate))
    : 6;

  return {
    actor,
    reason,
    format,
    compressLevel,
    output,
    dryRun: readFlag('--dry-run'),
  };
}

function detectConnectionString(): string {
  return (
    config.postgresPrismaUrl ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL ||
    ''
  ).trim();
}

function parseConnectionParts(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port || '5432',
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ''),
  };
}

function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env,
      shell: false,
    });

    child.on('error', (error) => reject(error));
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with code ${code ?? -1}`));
    });
  });
}

async function sha256OfFile(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function resolveOutputPath(options: BackupOptions): string {
  if (options.output) {
    return path.isAbsolute(options.output)
      ? options.output
      : path.resolve(process.cwd(), options.output);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const ext = options.format === 'plain' ? 'sql' : 'dump';
  return path.join(getBackupStorageDir(), `postgres-backup-${stamp}.${ext}`);
}

async function main() {
  const options = parseOptions();
  const connectionString = detectConnectionString();

  if (!connectionString) {
    throw new Error('POSTGRES_PRISMA_URL or DATABASE_URL must be configured for backup creation.');
  }

  const outputPath = resolveOutputPath(options);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  if (options.dryRun) {
    console.log(JSON.stringify({
      ok: true,
      dryRun: true,
      actor: options.actor,
      reason: options.reason,
      format: options.format,
      compressLevel: options.compressLevel,
      outputPath,
      storageDir: getBackupStorageDir(),
      collections: TARGET_COLLECTIONS,
    }, null, 2));
    return;
  }

  const backup = await createBackupMetadata(TARGET_COLLECTIONS, options.actor, {
    status: 'pending',
    filePath: outputPath,
    note: options.reason,
  });

  try {
    const parts = parseConnectionParts(connectionString);
    const pgDumpArgs: string[] = [
      '--host', parts.host,
      '--port', parts.port,
      '--username', parts.user,
      '--no-password',
      '--dbname', parts.database,
      '--file', outputPath,
    ];

    if (options.format === 'custom') {
      pgDumpArgs.push('--format', 'custom', '--compress', String(options.compressLevel));
    } else {
      pgDumpArgs.push('--format', 'plain');
    }

    await runCommand('pg_dump', pgDumpArgs, {
      ...process.env,
      PGPASSWORD: parts.password,
    });

    const stat = await fs.stat(outputPath);
    const checksumSha256 = await sha256OfFile(outputPath);

    await markBackupCompleted(backup.id, {
      filePath: outputPath,
      fileSize: stat.size,
      checksumSha256,
    });

    console.log(JSON.stringify({
      ok: true,
      id: backup.id,
      path: outputPath,
      bytes: stat.size,
      checksumSha256,
      actor: options.actor,
      reason: options.reason,
    }, null, 2));
  } catch (error) {
    await markBackupFailed(backup.id, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
