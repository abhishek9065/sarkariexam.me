ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS last_digest_daily_sent_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS last_digest_weekly_sent_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS subscriptions_frequency_last_digest_daily_sent_at_idx
  ON subscriptions(frequency, last_digest_daily_sent_at);

CREATE INDEX IF NOT EXISTS subscriptions_frequency_last_digest_weekly_sent_at_idx
  ON subscriptions(frequency, last_digest_weekly_sent_at);
