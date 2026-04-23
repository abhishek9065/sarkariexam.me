import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

import { config } from '../src/config.js';
import { getBackupById, resolveBackupArtifactPath } from '../src/services/backup.js';

type RestoreOptions = {
  actor: string;
  reason: string;
  backupId?: string;
  file?: string;
  dropSchema: boolean;
  dryRun: boolean;
};

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
  console.log('  npm run restore:postgres -- --actor <actor> --reason <reason> (--backup-id <id> | --file <path>) [--drop-schema] [--dry-run]');
  process.exit(1);
}

function parseOptions(): RestoreOptions {
  const actor = readArgValue('--actor').trim();
  const reason = readArgValue('--reason').trim();
  const backupId = readArgValue('--backup-id').trim() || undefined;
  const file = readArgValue('--file').trim() || undefined;

  if (!actor) usageAndExit('--actor is required');
  if (!reason) usageAndExit('--reason is required');
  if (!backupId && !file) usageAndExit('Either --backup-id or --file is required');
  if (backupId && file) usageAndExit('Use only one of --backup-id or --file');

  return {
    actor,
    reason,
    backupId,
    file,
    dropSchema: readFlag('--drop-schema'),
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

async function resolveInputPath(options: RestoreOptions): Promise<string> {
  if (options.file) {
    return path.isAbsolute(options.file)
      ? options.file
      : path.resolve(process.cwd(), options.file);
  }

  const backup = await getBackupById(options.backupId!);
  if (!backup) {
    throw new Error(`Backup metadata not found for id ${options.backupId}`);
  }
  if (!backup.filePath) {
    throw new Error(`Backup ${options.backupId} has no file path.`);
  }

  return resolveBackupArtifactPath(backup.filePath);
}

function inferFormat(filePath: string): 'custom' | 'plain' {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.dump') || lower.endsWith('.backup') || lower.endsWith('.bin')) {
    return 'custom';
  }
  return 'plain';
}

async function main() {
  const options = parseOptions();
  const connectionString = detectConnectionString();

  if (!connectionString) {
    throw new Error('POSTGRES_PRISMA_URL or DATABASE_URL must be configured for backup restore.');
  }

  const inputPath = await resolveInputPath(options);
  await fs.access(inputPath);

  const format = inferFormat(inputPath);
  const parts = parseConnectionParts(connectionString);

  if (options.dryRun) {
    console.log(JSON.stringify({
      ok: true,
      dryRun: true,
      actor: options.actor,
      reason: options.reason,
      source: inputPath,
      format,
      dropSchema: options.dropSchema,
      database: parts.database,
      host: parts.host,
      port: parts.port,
      user: parts.user,
    }, null, 2));
    return;
  }

  if (format === 'custom') {
    const args: string[] = [
      '--host', parts.host,
      '--port', parts.port,
      '--username', parts.user,
      '--no-password',
      '--dbname', parts.database,
      '--verbose',
    ];

    if (options.dropSchema) {
      args.push('--clean', '--if-exists');
    }

    args.push(inputPath);

    await runCommand('pg_restore', args, {
      ...process.env,
      PGPASSWORD: parts.password,
    });
  } else {
    const args: string[] = [
      '--host', parts.host,
      '--port', parts.port,
      '--username', parts.user,
      '--no-password',
      '--dbname', parts.database,
      '--file', inputPath,
    ];

    await runCommand('psql', args, {
      ...process.env,
      PGPASSWORD: parts.password,
    });
  }

  console.log(JSON.stringify({
    ok: true,
    restoredFrom: inputPath,
    format,
    actor: options.actor,
    reason: options.reason,
    dropSchema: options.dropSchema,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
