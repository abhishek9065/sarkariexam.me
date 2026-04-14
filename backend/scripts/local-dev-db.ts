import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

import { MongoMemoryServer } from 'mongodb-memory-server';

const COMMAND = process.argv[2] || 'status';
const shouldSeed = process.argv.includes('--seed');
const dbName = 'sarkari_db';
const port = 27017;
const stateDir = path.resolve(process.cwd(), '.tmp');
const statePath = path.join(stateDir, 'local-dev-db.json');

type StateRecord = {
  pid: number;
  uri: string;
  dbName: string;
  startedAt: string;
  seeded: boolean;
};

function ensureStateDir() {
  fs.mkdirSync(stateDir, { recursive: true });
}

function writeState(record: StateRecord) {
  ensureStateDir();
  fs.writeFileSync(statePath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
}

function readState(): StateRecord | null {
  if (!fs.existsSync(statePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8')) as StateRecord;
  } catch {
    return null;
  }
}

function clearState() {
  if (fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
  }
}

function isPidRunning(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function runSeedScript(scriptName: string, uri: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.resolve(process.cwd(), 'node_modules/tsx/dist/cli.mjs'), path.resolve(process.cwd(), 'scripts', scriptName)],
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          COSMOS_CONNECTION_STRING: uri,
          COSMOS_DATABASE_NAME: dbName,
        },
      },
    );

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${scriptName} exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

async function startServer() {
  const existing = readState();
  if (existing?.pid && isPidRunning(existing.pid)) {
    console.log(`[local-dev-db] already running at ${existing.uri}`);
    return;
  }

  const mongo = await MongoMemoryServer.create({
    instance: {
      ip: '127.0.0.1',
      port,
      dbName,
    },
  });

  const uri = mongo.getUri(dbName);
  writeState({
    pid: process.pid,
    uri,
    dbName,
    startedAt: new Date().toISOString(),
    seeded: false,
  });

  console.log(`[local-dev-db] started ${uri}`);
  console.log(`[local-dev-db] state ${statePath}`);

  if (shouldSeed) {
    console.log('[local-dev-db] seeding development announcements');
    await runSeedScript('seed-data.ts', uri);
    await runSeedScript('seed-more-data.ts', uri);
    await runSeedScript('seed-all-data.ts', uri);
    writeState({
      pid: process.pid,
      uri,
      dbName,
      startedAt: new Date().toISOString(),
      seeded: true,
    });
    console.log('[local-dev-db] seed complete');
  }

  const shutdown = async () => {
    clearState();
    await mongo.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await new Promise(() => {});
}

async function stopServer() {
  const existing = readState();
  if (!existing?.pid) {
    console.log('[local-dev-db] not running');
    return;
  }

  if (!isPidRunning(existing.pid)) {
    clearState();
    console.log('[local-dev-db] stale state removed');
    return;
  }

  process.kill(existing.pid, 'SIGTERM');
  console.log(`[local-dev-db] stop signal sent to pid ${existing.pid}`);
}

function statusServer() {
  const existing = readState();
  if (!existing?.pid) {
    console.log('[local-dev-db] not running');
    return;
  }

  const running = isPidRunning(existing.pid);
  if (!running) {
    clearState();
    console.log('[local-dev-db] stale state removed');
    return;
  }

  console.log(JSON.stringify({ ...existing, running: true }, null, 2));
}

async function main() {
  if (COMMAND === 'start') {
    await startServer();
    return;
  }

  if (COMMAND === 'stop') {
    await stopServer();
    return;
  }

  if (COMMAND === 'status') {
    statusServer();
    return;
  }

  throw new Error(`Unknown command "${COMMAND}". Use start, stop, or status.`);
}

main().catch((error) => {
  console.error('[local-dev-db] failed', error);
  process.exit(1);
});
