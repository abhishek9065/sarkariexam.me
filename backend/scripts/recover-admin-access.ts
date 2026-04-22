import '../src/config.js';

import { config } from '../src/config.js';
import AuditLogModelPostgres from '../src/models/auditLogs.postgres.js';
import { UserModelPostgres } from '../src/models/users.postgres.js';
import { closePrisma, prismaApp } from '../src/services/postgres/prisma.js';

type Options = {
  email: string;
  username?: string;
  password?: string;
  role: 'admin' | 'superadmin';
  actor: string;
  reason: string;
  confirm: string;
  ifNoAdmin: boolean;
  dryRun: boolean;
};

const PRIVILEGED_ROLES = new Set(['admin', 'superadmin']);

function usageAndExit(message?: string): never {
  if (message) {
    console.error(`ERROR: ${message}`);
    console.error('');
  }

  console.log('Usage:');
  console.log('  npm run recover:admin -- --email <email> --actor <actor> --reason <reason> --confirm <token> [--password <password>] [--username <name>] [--role admin|superadmin] [--if-no-admin] [--dry-run]');
  process.exit(1);
}

function readArgValue(flag: string): string {
  const index = process.argv.findIndex((item) => item === flag);
  if (index < 0) return '';
  return process.argv[index + 1] || '';
}

function readFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function parseOptions(): Options {
  const email = readArgValue('--email').trim().toLowerCase();
  const username = readArgValue('--username').trim() || undefined;
  const password = readArgValue('--password');
  const roleRaw = readArgValue('--role').trim().toLowerCase();
  const actor = readArgValue('--actor').trim();
  const reason = readArgValue('--reason').trim();
  const confirm = readArgValue('--confirm').trim();

  if (!email) usageAndExit('--email is required');
  if (!actor) usageAndExit('--actor is required');
  if (!reason) usageAndExit('--reason is required');
  if (!confirm) usageAndExit('--confirm is required');

  const role = roleRaw === 'admin' || roleRaw === 'superadmin' ? roleRaw : 'superadmin';

  return {
    email,
    username,
    password: password || undefined,
    role,
    actor,
    reason,
    confirm,
    ifNoAdmin: readFlag('--if-no-admin'),
    dryRun: readFlag('--dry-run'),
  };
}

function printSummary(summary: Record<string, unknown>) {
  console.log(JSON.stringify(summary, null, 2));
}

async function main() {
  const options = parseOptions();

  if (!config.adminRecoveryConfirmToken) {
    throw new Error('ADMIN_RECOVERY_CONFIRM_TOKEN is not configured. Refusing to run recovery script.');
  }

  if (options.confirm !== config.adminRecoveryConfirmToken) {
    throw new Error('Confirmation token mismatch. Refusing to run recovery script.');
  }

  const privilegedCount = await prismaApp.userAccountEntry.count({
    where: {
      isActive: true,
      role: {
        in: Array.from(PRIVILEGED_ROLES),
      },
    },
  });

  const existingUser = await UserModelPostgres.findByEmail(options.email);
  const existingIsPrivileged = Boolean(
    existingUser &&
    existingUser.isActive &&
    PRIVILEGED_ROLES.has(existingUser.role),
  );

  if (options.ifNoAdmin && privilegedCount > 0 && !existingIsPrivileged) {
    throw new Error('Active privileged users already exist. Use --if-no-admin only for break-glass bootstrap when none exist.');
  }

  if (!existingUser && !options.password) {
    throw new Error('A new user requires --password.');
  }

  const preview = {
    mode: existingUser ? 'update' : 'create',
    targetEmail: options.email,
    targetRole: options.role,
    targetUsername: options.username || existingUser?.username || options.email.split('@')[0],
    willSetPassword: Boolean(options.password),
    actor: options.actor,
    reason: options.reason,
    ifNoAdmin: options.ifNoAdmin,
    dryRun: options.dryRun,
    existingPrivilegedCount: privilegedCount,
  };

  if (options.dryRun) {
    printSummary({
      ok: true,
      preview,
    });
    return;
  }

  const nextUsername = options.username || existingUser?.username || options.email.split('@')[0];

  let updated = existingUser;
  if (existingUser) {
    updated = await UserModelPostgres.update(existingUser.id, {
      username: nextUsername,
      role: options.role,
      isActive: true,
      ...(options.password ? { password: options.password } : {}),
    });
  } else {
    updated = await UserModelPostgres.create({
      email: options.email,
      username: nextUsername,
      password: options.password!,
      role: options.role,
    });
  }

  if (!updated) {
    throw new Error('Failed to create or update recovery account.');
  }

  await AuditLogModelPostgres.create({
    entityType: 'auth',
    entityId: updated.id,
    action: existingUser ? 'admin_recovery_update' : 'admin_recovery_create',
    actorId: options.actor,
    actorRole: 'system',
    summary: `${existingUser ? 'Updated' : 'Created'} privileged account ${options.email}`,
    metadata: {
      reason: options.reason,
      role: options.role,
      forcedActivation: true,
      passwordUpdated: Boolean(options.password),
      ifNoAdmin: options.ifNoAdmin,
    },
  });

  printSummary({
    ok: true,
    result: {
      mode: existingUser ? 'updated' : 'created',
      id: updated.id,
      email: updated.email,
      role: updated.role,
      isActive: updated.isActive,
    },
  });
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePrisma().catch(() => {});
  });
