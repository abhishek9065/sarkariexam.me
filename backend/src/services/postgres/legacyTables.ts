import { prisma } from './prisma.js';

let usersReady: Promise<void> | null = null;
let bookmarksReady: Promise<void> | null = null;
let profileReady: Promise<void> | null = null;
let pushReady: Promise<void> | null = null;
let communityReady: Promise<void> | null = null;
let errorReportsReady: Promise<void> | null = null;
let siteSettingsReady: Promise<void> | null = null;
let notificationCampaignsReady: Promise<void> | null = null;
let workflowLogsReady: Promise<void> | null = null;

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

async function createBookmarksTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS app_bookmarks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      announcement_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, announcement_id)
    );
  `);

  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS app_bookmarks_user_created_idx ON app_bookmarks(user_id, created_at DESC);');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS app_bookmarks_announcement_idx ON app_bookmarks(announcement_id);');
}

async function createProfileTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS app_user_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      preferred_categories TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      preferred_qualifications TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      preferred_locations TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      preferred_organizations TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      age_group TEXT NULL,
      education_level TEXT NULL,
      experience_years INTEGER NOT NULL DEFAULT 0,
      email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
      push_notifications BOOLEAN NOT NULL DEFAULT FALSE,
      notification_frequency TEXT NOT NULL DEFAULT 'daily',
      alert_window_days INTEGER NOT NULL DEFAULT 7,
      alert_max_items INTEGER NOT NULL DEFAULT 6,
      profile_complete BOOLEAN NOT NULL DEFAULT FALSE,
      onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

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

  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS app_saved_searches_user_updated_idx ON app_saved_searches(user_id, updated_at DESC);');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS app_user_notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      announcement_id TEXT NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      slug TEXT NULL,
      organization TEXT NULL,
      source TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      read_at TIMESTAMPTZ NULL,
      UNIQUE(user_id, announcement_id, source)
    );
  `);

  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS app_user_notifications_user_created_idx ON app_user_notifications(user_id, created_at DESC);');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS app_user_notifications_unread_idx ON app_user_notifications(user_id, read_at);');

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

  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS app_tracked_applications_user_updated_idx ON app_tracked_applications(user_id, updated_at DESC);');
}

async function createPushTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS app_push_subscriptions (
      id TEXT PRIMARY KEY,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_id TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS app_push_subscriptions_user_created_idx ON app_push_subscriptions(user_id, created_at DESC);');
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

async function createErrorReportsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS app_error_reports (
      id TEXT PRIMARY KEY,
      error_id TEXT NOT NULL,
      message TEXT NOT NULL,
      page_url TEXT NULL,
      user_agent TEXT NULL,
      note TEXT NULL,
      stack TEXT NULL,
      component_stack TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NULL,
      user_id TEXT NULL,
      user_email TEXT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      review_note TEXT NULL,
      assignee_email TEXT NULL,
      release TEXT NULL,
      request_id TEXT NULL,
      sentry_event_url TEXT NULL,
      resolved_at TIMESTAMPTZ NULL,
      resolved_by TEXT NULL
    );
  `);

  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS app_error_reports_status_created_idx ON app_error_reports(status, created_at DESC);');
}

async function createSiteSettingsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS app_site_settings (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function createNotificationCampaignsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS app_notification_campaigns (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      url TEXT NULL,
      segment_type TEXT NOT NULL,
      segment_value TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      sent_count INTEGER NOT NULL DEFAULT 0,
      failed_count INTEGER NOT NULL DEFAULT 0,
      open_count INTEGER NOT NULL DEFAULT 0,
      click_count INTEGER NOT NULL DEFAULT 0,
      scheduled_at TIMESTAMPTZ NULL,
      sent_at TIMESTAMPTZ NULL,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ab_test JSONB NULL
    );
  `);

  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS app_notification_campaigns_status_scheduled_idx ON app_notification_campaigns(status, scheduled_at);');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS app_notification_campaigns_created_idx ON app_notification_campaigns(created_at DESC);');
}

async function createWorkflowLogsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS app_workflow_logs (
      id TEXT PRIMARY KEY,
      announcement_id TEXT NOT NULL,
      action TEXT NOT NULL,
      actor TEXT NOT NULL,
      metadata JSONB NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS app_workflow_logs_announcement_created_idx ON app_workflow_logs(announcement_id, created_at DESC);');
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

export async function ensureBookmarksTable(): Promise<void> {
  if (!bookmarksReady) {
    bookmarksReady = createBookmarksTable().catch((error) => {
      bookmarksReady = null;
      throw error;
    });
  }
  await bookmarksReady;
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

export async function ensurePushTables(): Promise<void> {
  if (!pushReady) {
    pushReady = createPushTables().catch((error) => {
      pushReady = null;
      throw error;
    });
  }
  await pushReady;
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

export async function ensureErrorReportsTable(): Promise<void> {
  if (!errorReportsReady) {
    errorReportsReady = createErrorReportsTable().catch((error) => {
      errorReportsReady = null;
      throw error;
    });
  }
  await errorReportsReady;
}

export async function ensureSiteSettingsTable(): Promise<void> {
  if (!siteSettingsReady) {
    siteSettingsReady = createSiteSettingsTable().catch((error) => {
      siteSettingsReady = null;
      throw error;
    });
  }
  await siteSettingsReady;
}

export async function ensureNotificationCampaignsTable(): Promise<void> {
  if (!notificationCampaignsReady) {
    notificationCampaignsReady = createNotificationCampaignsTable().catch((error) => {
      notificationCampaignsReady = null;
      throw error;
    });
  }
  await notificationCampaignsReady;
}

export async function ensureWorkflowLogsTable(): Promise<void> {
  if (!workflowLogsReady) {
    workflowLogsReady = createWorkflowLogsTable().catch((error) => {
      workflowLogsReady = null;
      throw error;
    });
  }
  await workflowLogsReady;
}
