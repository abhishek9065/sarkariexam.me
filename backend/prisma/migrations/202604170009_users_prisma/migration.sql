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

CREATE INDEX IF NOT EXISTS app_users_role_active_idx ON app_users(role, is_active);
CREATE INDEX IF NOT EXISTS app_users_created_idx ON app_users(created_at DESC);
