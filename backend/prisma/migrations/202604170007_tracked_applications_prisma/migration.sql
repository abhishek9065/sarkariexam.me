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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_tracked_applications
  DROP CONSTRAINT IF EXISTS app_tracked_applications_user_id_slug_key;

ALTER TABLE app_tracked_applications
  ADD CONSTRAINT app_tracked_applications_user_id_slug_key
  UNIQUE (user_id, slug);

CREATE INDEX IF NOT EXISTS app_tracked_applications_user_updated_idx
  ON app_tracked_applications(user_id, updated_at DESC);
