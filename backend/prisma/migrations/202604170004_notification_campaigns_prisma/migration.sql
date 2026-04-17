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

CREATE INDEX IF NOT EXISTS app_notification_campaigns_status_scheduled_idx
  ON app_notification_campaigns(status, scheduled_at);

CREATE INDEX IF NOT EXISTS app_notification_campaigns_created_idx
  ON app_notification_campaigns(created_at DESC);
