CREATE TABLE "app_campaign_jobs" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "job_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMP(3),
    "locked_by" TEXT,
    "last_error" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_campaign_jobs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "app_campaign_jobs_campaign_id_fkey"
        FOREIGN KEY ("campaign_id") REFERENCES "app_notification_campaigns"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "app_campaign_jobs_type_check" CHECK ("job_type" IN ('send', 'retry')),
    CONSTRAINT "app_campaign_jobs_status_check" CHECK ("status" IN ('queued', 'processing', 'completed', 'failed')),
    CONSTRAINT "app_campaign_jobs_attempts_check" CHECK ("attempts" >= 0 AND "max_attempts" > 0)
);

CREATE INDEX "app_campaign_jobs_status_available_idx"
    ON "app_campaign_jobs"("status", "available_at");

CREATE INDEX "app_campaign_jobs_campaign_created_idx"
    ON "app_campaign_jobs"("campaign_id", "created_at");

CREATE UNIQUE INDEX "app_campaign_jobs_one_active_per_campaign_idx"
    ON "app_campaign_jobs"("campaign_id")
    WHERE "status" IN ('queued', 'processing');
