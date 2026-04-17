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
  read_at TIMESTAMPTZ NULL
);

ALTER TABLE app_user_notifications
  DROP CONSTRAINT IF EXISTS app_user_notifications_user_id_announcement_id_source_key;

ALTER TABLE app_user_notifications
  ADD CONSTRAINT app_user_notifications_user_id_announcement_id_source_key
  UNIQUE (user_id, announcement_id, source);

CREATE INDEX IF NOT EXISTS app_user_notifications_user_created_idx
  ON app_user_notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS app_user_notifications_unread_idx
  ON app_user_notifications(user_id, read_at);
