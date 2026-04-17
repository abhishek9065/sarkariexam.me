import { prisma } from './prisma.js';

// Transitional bootstrap for legacy app_* operational tables that have not been moved into Prisma yet.
// New operational slices should be modeled in Prisma directly instead of extending this file.
let usersReady: Promise<void> | null = null;
let profileReady: Promise<void> | null = null;
let communityReady: Promise<void> | null = null;

async function createUsersTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_history JSONB NOT NULL DEFAULT '[]'::jsonb,
      role TEXT NOT NULL DEFAULT 'user',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login TIMESTAMPTZ NULL,
      two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      two_factor_secret TEXT NULL,
      two_factor_temp_secret TEXT NULL,
      two_factor_verified_at TIMESTAMPTZ NULL,
      two_factor_backup_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
      two_factor_backup_codes_updated_at TIMESTAMPTZ NULL
    );
  `);

  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS app_users_role_active_idx ON app_users(role, is_active);');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS app_users_created_idx ON app_users(created_at DESC);');
}

async function createProfileTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS app_saved_searches (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      query TEXT NOT NULL DEFAULT '',
      filters JSONB NULL,
      notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      frequency TEXT NOT NULL DEFAULT 'daily',
      last_notified_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS app_tracked_applications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      announcement_id TEXT NULL,
      slug TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      organization TEXT NULL,
      deadline TIMESTAMPTZ NULL,
      status TEXT NOT NULL,
      notes TEXT NULL,
      reminder_at TIMESTAMPTZ NULL,
      tracked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, slug)
    );
  `);
}

async function createCommunityTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS app_community_forums (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL,
      author TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS app_community_qa (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NULL,
      answered_by TEXT NULL,
      author TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS app_community_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      topic TEXT NOT NULL,
      language TEXT NOT NULL,
      link TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS app_community_flags (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      reporter TEXT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS app_community_forums_created_idx ON app_community_forums(created_at DESC);');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS app_community_qa_created_idx ON app_community_qa(created_at DESC);');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS app_community_groups_created_idx ON app_community_groups(created_at DESC);');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS app_community_flags_status_created_idx ON app_community_flags(status, created_at DESC);');
}

export async function ensureUsersTable(): Promise<void> {
  if (!usersReady) {
    usersReady = createUsersTable().catch((error) => {
      usersReady = null;
      throw error;
    });
  }
  await usersReady;
}

export async function ensureProfileTables(): Promise<void> {
  if (!profileReady) {
    profileReady = createProfileTables().catch((error) => {
      profileReady = null;
      throw error;
    });
  }
  await profileReady;
}

export async function ensureCommunityTables(): Promise<void> {
  if (!communityReady) {
    communityReady = createCommunityTables().catch((error) => {
      communityReady = null;
      throw error;
    });
  }
  await communityReady;
}

