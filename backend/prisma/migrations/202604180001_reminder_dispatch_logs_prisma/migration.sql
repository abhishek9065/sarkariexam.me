CREATE TABLE IF NOT EXISTS app_reminder_dispatch_logs (
  id TEXT PRIMARY KEY,
  dedupe_key TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  source TEXT NOT NULL,
  announcement_id TEXT NOT NULL,
  deadline_date TEXT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_reminder_dispatch_logs_user_sent_idx
  ON app_reminder_dispatch_logs(user_id, sent_at DESC);
