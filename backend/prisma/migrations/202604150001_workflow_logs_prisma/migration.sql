CREATE TABLE IF NOT EXISTS app_workflow_logs (
  id TEXT PRIMARY KEY,
  announcement_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_workflow_logs
  ADD COLUMN IF NOT EXISTS announcement_id TEXT,
  ADD COLUMN IF NOT EXISTS action TEXT,
  ADD COLUMN IF NOT EXISTS actor TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS app_workflow_logs_announcement_created_idx
  ON app_workflow_logs(announcement_id, created_at DESC);
