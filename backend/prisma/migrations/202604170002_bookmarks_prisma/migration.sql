CREATE TABLE IF NOT EXISTS app_bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  announcement_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_bookmarks
  DROP CONSTRAINT IF EXISTS app_bookmarks_user_id_announcement_id_key;

ALTER TABLE app_bookmarks
  ADD CONSTRAINT app_bookmarks_user_id_announcement_id_key
  UNIQUE (user_id, announcement_id);

CREATE INDEX IF NOT EXISTS app_bookmarks_user_created_idx
  ON app_bookmarks(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS app_bookmarks_announcement_idx
  ON app_bookmarks(announcement_id);
