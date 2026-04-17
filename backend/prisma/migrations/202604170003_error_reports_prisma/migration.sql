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

CREATE INDEX IF NOT EXISTS app_error_reports_status_created_idx
  ON app_error_reports(status, created_at DESC);
