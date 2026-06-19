CREATE TABLE IF NOT EXISTS app_campaign_dispatch_logs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  recipient_user_id TEXT,
  subscription_id TEXT,
  push_endpoint TEXT,
  status TEXT NOT NULL,
  message_id TEXT,
  error TEXT,
  metadata JSONB,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  last_attempt_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT app_campaign_dispatch_logs_campaign_id_fkey
    FOREIGN KEY (campaign_id)
    REFERENCES app_notification_campaigns(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS app_campaign_dispatch_logs_campaign_status_idx
  ON app_campaign_dispatch_logs(campaign_id, status);

CREATE INDEX IF NOT EXISTS app_campaign_dispatch_logs_campaign_channel_idx
  ON app_campaign_dispatch_logs(campaign_id, channel);

CREATE INDEX IF NOT EXISTS app_campaign_dispatch_logs_channel_recipient_idx
  ON app_campaign_dispatch_logs(channel, recipient);
