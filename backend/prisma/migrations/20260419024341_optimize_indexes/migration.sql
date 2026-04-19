-- DropIndex
DROP INDEX "app_bookmarks_user_created_idx";

-- DropIndex
DROP INDEX "app_error_reports_status_created_idx";

-- DropIndex
DROP INDEX "app_notification_campaigns_created_idx";

-- DropIndex
DROP INDEX "app_push_subscriptions_user_created_idx";

-- DropIndex
DROP INDEX "app_reminder_dispatch_logs_user_sent_idx";

-- DropIndex
DROP INDEX "app_saved_searches_user_updated_idx";

-- DropIndex
DROP INDEX "app_tracked_applications_user_updated_idx";

-- DropIndex
DROP INDEX "app_user_notifications_user_created_idx";

-- DropIndex
DROP INDEX "app_users_created_idx";

-- DropIndex
DROP INDEX "app_workflow_logs_announcement_created_idx";

-- DropIndex
DROP INDEX "content_pages_payload_gin_idx";

-- DropIndex
DROP INDEX "posts_createdAt_idx";

-- DropIndex
DROP INDEX "posts_examId_status_publishedAt_idx";

-- DropIndex
DROP INDEX "posts_institutionId_status_publishedAt_idx";

-- DropIndex
DROP INDEX "posts_organizationId_status_publishedAt_idx";

-- DropIndex
DROP INDEX "posts_programId_status_publishedAt_idx";

-- DropIndex
DROP INDEX "posts_searchText_trgm_idx";

-- DropIndex
DROP INDEX "posts_status_updatedAt_idx";

-- DropIndex
DROP INDEX "posts_summary_trgm_idx";

-- DropIndex
DROP INDEX "posts_title_trgm_idx";

-- DropIndex
DROP INDEX "posts_type_status_publishedAt_idx";

-- AlterTable
ALTER TABLE "app_bookmarks" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "app_error_reports" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "resolved_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "app_notification_campaigns" ALTER COLUMN "scheduled_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "sent_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "app_push_subscriptions" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "app_reminder_dispatch_logs" ALTER COLUMN "sent_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "app_saved_searches" ALTER COLUMN "last_notified_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "app_site_settings" ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "app_tracked_applications" ALTER COLUMN "deadline" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "reminder_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "tracked_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "app_user_notifications" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "read_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "app_user_profiles" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "app_users" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "last_login" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "two_factor_verified_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "two_factor_backup_codes_updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "app_workflow_logs" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "subscriptions" ALTER COLUMN "last_digest_daily_sent_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "last_digest_weekly_sent_at" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "app_analytics_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "announcement_id" TEXT,
    "user_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_analytics_rollups" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "listing_views" INTEGER NOT NULL DEFAULT 0,
    "card_clicks" INTEGER NOT NULL DEFAULT 0,
    "category_clicks" INTEGER NOT NULL DEFAULT 0,
    "filter_applies" INTEGER NOT NULL DEFAULT 0,
    "search_count" INTEGER NOT NULL DEFAULT 0,
    "bookmark_adds" INTEGER NOT NULL DEFAULT 0,
    "bookmark_removes" INTEGER NOT NULL DEFAULT 0,
    "registrations" INTEGER NOT NULL DEFAULT 0,
    "subscriptions_verified" INTEGER NOT NULL DEFAULT 0,
    "subscriptions_unsubscribed" INTEGER NOT NULL DEFAULT 0,
    "saved_searches" INTEGER NOT NULL DEFAULT 0,
    "digest_previews" INTEGER NOT NULL DEFAULT 0,
    "digest_clicks" INTEGER NOT NULL DEFAULT 0,
    "deep_link_clicks" INTEGER NOT NULL DEFAULT 0,
    "alerts_viewed" INTEGER NOT NULL DEFAULT 0,
    "push_subscribe_attempts" INTEGER NOT NULL DEFAULT 0,
    "push_subscribe_successes" INTEGER NOT NULL DEFAULT 0,
    "push_subscribe_failures" INTEGER NOT NULL DEFAULT 0,
    "announcement_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_analytics_rollups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_security_logs" (
    "id" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "metadata" JSONB,
    "incident_status" TEXT NOT NULL DEFAULT 'new',
    "assignee_email" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_security_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_user_feedback" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_user_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_community_comments" (
    "id" TEXT NOT NULL,
    "post_id" TEXT,
    "user_id" TEXT,
    "username" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "moderated_at" TIMESTAMP(3),
    "moderated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_community_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_analytics_events_type_created_at_idx" ON "app_analytics_events"("type", "created_at");

-- CreateIndex
CREATE INDEX "app_analytics_events_announcement_id_type_created_at_idx" ON "app_analytics_events"("announcement_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "app_analytics_events_user_id_created_at_idx" ON "app_analytics_events"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "app_analytics_rollups_date_key" ON "app_analytics_rollups"("date");

-- CreateIndex
CREATE INDEX "app_analytics_rollups_date_idx" ON "app_analytics_rollups"("date");

-- CreateIndex
CREATE INDEX "app_security_logs_event_type_created_at_idx" ON "app_security_logs"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "app_security_logs_ip_address_created_at_idx" ON "app_security_logs"("ip_address", "created_at");

-- CreateIndex
CREATE INDEX "app_community_comments_status_created_at_idx" ON "app_community_comments"("status", "created_at");

-- CreateIndex
CREATE INDEX "app_community_comments_post_id_status_idx" ON "app_community_comments"("post_id", "status");

-- CreateIndex
CREATE INDEX "app_bookmarks_user_created_idx" ON "app_bookmarks"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "app_error_reports_status_created_idx" ON "app_error_reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "app_notification_campaigns_created_idx" ON "app_notification_campaigns"("created_at");

-- CreateIndex
CREATE INDEX "app_push_subscriptions_user_created_idx" ON "app_push_subscriptions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "app_reminder_dispatch_logs_user_sent_idx" ON "app_reminder_dispatch_logs"("user_id", "sent_at");

-- CreateIndex
CREATE INDEX "app_saved_searches_user_updated_idx" ON "app_saved_searches"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "app_tracked_applications_user_updated_idx" ON "app_tracked_applications"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "app_user_notifications_user_created_idx" ON "app_user_notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "app_users_created_idx" ON "app_users"("created_at");

-- CreateIndex
CREATE INDEX "app_workflow_logs_announcement_created_idx" ON "app_workflow_logs"("announcement_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "posts_status_publishedAt_idx" ON "posts"("status", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "posts_type_status_publishedAt_idx" ON "posts"("type", "status", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "posts_isFeatured_status_publishedAt_idx" ON "posts"("isFeatured", "status", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "posts_isUrgent_status_publishedAt_idx" ON "posts"("isUrgent", "status", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "posts_status_updatedAt_idx" ON "posts"("status", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "posts_organizationId_status_publishedAt_idx" ON "posts"("organizationId", "status", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "posts_institutionId_status_publishedAt_idx" ON "posts"("institutionId", "status", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "posts_examId_status_publishedAt_idx" ON "posts"("examId", "status", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "posts_programId_status_publishedAt_idx" ON "posts"("programId", "status", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "posts_createdAt_idx" ON "posts"("createdAt" DESC);
