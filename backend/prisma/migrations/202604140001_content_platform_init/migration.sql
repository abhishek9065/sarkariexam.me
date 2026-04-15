-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('job', 'result', 'admit_card', 'answer_key', 'admission', 'scholarship', 'board_result', 'syllabus');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('draft', 'in_review', 'approved', 'published', 'archived');

-- CreateEnum
CREATE TYPE "ImportantDateKind" AS ENUM ('application_start', 'last_date', 'exam_date', 'result_date', 'admit_card', 'counselling', 'other');

-- CreateEnum
CREATE TYPE "TrustTag" AS ENUM ('new', 'hot', 'update', 'last_date');

-- CreateEnum
CREATE TYPE "SubscriptionFrequency" AS ENUM ('instant', 'daily', 'weekly');

-- CreateEnum
CREATE TYPE "ContentPageType" AS ENUM ('auxiliary', 'info', 'community', 'category_meta', 'resource_meta', 'state_directory');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" TEXT,
    "shortName" TEXT,
    "officialWebsite" TEXT,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "states" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT,
    "region" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qualifications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "level" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "level" TEXT,
    "organizationId" TEXT,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colleges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortName" TEXT,
    "stateCode" TEXT,
    "collegeType" TEXT,
    "officialWebsite" TEXT,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "colleges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "level" TEXT,
    "department" TEXT,
    "durationLabel" TEXT,
    "mode" TEXT,
    "intake" TEXT,
    "description" TEXT,
    "collegeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "legacyAnnouncementId" TEXT,
    "legacyId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legacySlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "type" "PostType" NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'draft',
    "summary" TEXT NOT NULL,
    "shortInfo" TEXT,
    "body" TEXT,
    "contentJson" JSONB,
    "organizationId" TEXT,
    "institutionId" TEXT,
    "examId" TEXT,
    "programId" TEXT,
    "location" TEXT,
    "salary" TEXT,
    "postCount" TEXT,
    "applicationStartDate" TEXT,
    "lastDate" TEXT,
    "examDate" TEXT,
    "resultDate" TEXT,
    "expiresAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "approvedBy" TEXT,
    "publishedBy" TEXT,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "searchText" TEXT NOT NULL DEFAULT '',
    "sourceNote" TEXT,
    "verificationNote" TEXT,
    "updatedLabel" TEXT,
    "correctionNote" TEXT,
    "tag" "TrustTag",
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "isLastDate" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "homeSection" TEXT,
    "stickyRank" INTEGER,
    "highlight" BOOLEAN NOT NULL DEFAULT false,
    "trendingScore" INTEGER,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoCanonicalPath" TEXT,
    "seoIndexable" BOOLEAN NOT NULL DEFAULT true,
    "seoOgImage" TEXT,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_categories" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_states" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_qualifications" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_tags" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "official_sources" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sourceType" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "capturedAt" TIMESTAMP(3),
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "official_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "important_dates" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "kind" "ImportantDateKind",
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortDate" TIMESTAMP(3),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "important_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eligibility_rules" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "qualificationId" TEXT,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "relaxationNote" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eligibility_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_rules" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "currency" TEXT DEFAULT 'INR',
    "paymentNote" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacancy_rows" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "postName" TEXT NOT NULL,
    "department" TEXT,
    "category" TEXT,
    "vacancies" TEXT NOT NULL,
    "payLevel" TEXT,
    "salaryNote" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacancy_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admission_details" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "collegeId" TEXT,
    "programId" TEXT,
    "intake" TEXT,
    "counsellingRounds" JSONB,
    "applicationWindow" JSONB,
    "domicilePolicy" TEXT,
    "reservationPolicy" TEXT,
    "seatMatrix" JSONB,
    "scholarshipNote" TEXT,
    "hostelInfo" TEXT,
    "correctionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admission_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_versions" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "note" TEXT,
    "reason" TEXT,
    "actorId" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "postId" TEXT,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slug_aliases" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isLegacy" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slug_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_pages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "pageType" "ContentPageType" NOT NULL,
    "title" TEXT NOT NULL,
    "eyebrow" TEXT,
    "description" TEXT,
    "headerColor" TEXT,
    "layoutVariant" TEXT,
    "payload" JSONB NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'draft',
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoCanonicalPath" TEXT,
    "seoIndexable" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "content_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "frequency" "SubscriptionFrequency" NOT NULL DEFAULT 'daily',
    "verificationToken" TEXT,
    "unsubscribeToken" TEXT NOT NULL,
    "source" TEXT,
    "alertCount" INTEGER NOT NULL DEFAULT 0,
    "lastAlertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_categories" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "subscription_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_states" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,

    CONSTRAINT "subscription_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_organizations" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "subscription_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_qualifications" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,

    CONSTRAINT "subscription_qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_post_types" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "postType" "PostType" NOT NULL,

    CONSTRAINT "subscription_post_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_dispatch_logs" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "postId" TEXT,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "messageId" TEXT,
    "metadata" JSONB,
    "dispatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_dispatch_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_name_idx" ON "organizations"("name");

-- CreateIndex
CREATE INDEX "organizations_priority_name_idx" ON "organizations"("priority", "name");

-- CreateIndex
CREATE UNIQUE INDEX "states_slug_key" ON "states"("slug");

-- CreateIndex
CREATE INDEX "states_name_idx" ON "states"("name");

-- CreateIndex
CREATE INDEX "states_priority_name_idx" ON "states"("priority", "name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_name_idx" ON "categories"("name");

-- CreateIndex
CREATE INDEX "categories_priority_name_idx" ON "categories"("priority", "name");

-- CreateIndex
CREATE UNIQUE INDEX "qualifications_slug_key" ON "qualifications"("slug");

-- CreateIndex
CREATE INDEX "qualifications_name_idx" ON "qualifications"("name");

-- CreateIndex
CREATE INDEX "qualifications_priority_name_idx" ON "qualifications"("priority", "name");

-- CreateIndex
CREATE UNIQUE INDEX "exams_slug_key" ON "exams"("slug");

-- CreateIndex
CREATE INDEX "exams_name_idx" ON "exams"("name");

-- CreateIndex
CREATE INDEX "exams_organizationId_name_idx" ON "exams"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "colleges_slug_key" ON "colleges"("slug");

-- CreateIndex
CREATE INDEX "colleges_name_idx" ON "colleges"("name");

-- CreateIndex
CREATE INDEX "colleges_priority_name_idx" ON "colleges"("priority", "name");

-- CreateIndex
CREATE UNIQUE INDEX "programs_slug_key" ON "programs"("slug");

-- CreateIndex
CREATE INDEX "programs_name_idx" ON "programs"("name");

-- CreateIndex
CREATE INDEX "programs_collegeId_name_idx" ON "programs"("collegeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "tags_name_idx" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "posts_slug_key" ON "posts"("slug");

-- CreateIndex
CREATE INDEX "posts_type_status_publishedAt_idx" ON "posts"("type", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "posts_status_updatedAt_idx" ON "posts"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "posts_organizationId_status_publishedAt_idx" ON "posts"("organizationId", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "posts_institutionId_status_publishedAt_idx" ON "posts"("institutionId", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "posts_examId_status_publishedAt_idx" ON "posts"("examId", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "posts_programId_status_publishedAt_idx" ON "posts"("programId", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "posts_expiresAt_idx" ON "posts"("expiresAt");

-- CreateIndex
CREATE INDEX "posts_createdAt_idx" ON "posts"("createdAt");

-- CreateIndex
CREATE INDEX "post_categories_categoryId_postId_idx" ON "post_categories"("categoryId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "post_categories_postId_categoryId_key" ON "post_categories"("postId", "categoryId");

-- CreateIndex
CREATE INDEX "post_states_stateId_postId_idx" ON "post_states"("stateId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "post_states_postId_stateId_key" ON "post_states"("postId", "stateId");

-- CreateIndex
CREATE INDEX "post_qualifications_qualificationId_postId_idx" ON "post_qualifications"("qualificationId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "post_qualifications_postId_qualificationId_key" ON "post_qualifications"("postId", "qualificationId");

-- CreateIndex
CREATE INDEX "post_tags_tagId_postId_idx" ON "post_tags"("tagId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "post_tags_postId_tagId_key" ON "post_tags"("postId", "tagId");

-- CreateIndex
CREATE INDEX "official_sources_postId_isPrimary_position_idx" ON "official_sources"("postId", "isPrimary", "position");

-- CreateIndex
CREATE INDEX "official_sources_url_idx" ON "official_sources"("url");

-- CreateIndex
CREATE INDEX "important_dates_postId_kind_sortDate_idx" ON "important_dates"("postId", "kind", "sortDate");

-- CreateIndex
CREATE INDEX "important_dates_sortDate_idx" ON "important_dates"("sortDate");

-- CreateIndex
CREATE INDEX "eligibility_rules_postId_position_idx" ON "eligibility_rules"("postId", "position");

-- CreateIndex
CREATE INDEX "eligibility_rules_qualificationId_idx" ON "eligibility_rules"("qualificationId");

-- CreateIndex
CREATE INDEX "fee_rules_postId_position_idx" ON "fee_rules"("postId", "position");

-- CreateIndex
CREATE INDEX "vacancy_rows_postId_position_idx" ON "vacancy_rows"("postId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "admission_details_postId_key" ON "admission_details"("postId");

-- CreateIndex
CREATE INDEX "admission_details_collegeId_idx" ON "admission_details"("collegeId");

-- CreateIndex
CREATE INDEX "admission_details_programId_idx" ON "admission_details"("programId");

-- CreateIndex
CREATE INDEX "post_versions_postId_createdAt_idx" ON "post_versions"("postId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "post_versions_postId_version_key" ON "post_versions"("postId", "version");

-- CreateIndex
CREATE INDEX "audit_logs_postId_createdAt_idx" ON "audit_logs"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_createdAt_idx" ON "audit_logs"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "slug_aliases_slug_key" ON "slug_aliases"("slug");

-- CreateIndex
CREATE INDEX "slug_aliases_postId_createdAt_idx" ON "slug_aliases"("postId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "content_pages_slug_key" ON "content_pages"("slug");

-- CreateIndex
CREATE INDEX "content_pages_pageType_status_updatedAt_idx" ON "content_pages"("pageType", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "content_pages_expiresAt_idx" ON "content_pages"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_email_key" ON "subscriptions"("email");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_unsubscribeToken_key" ON "subscriptions"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "subscriptions_isActive_verified_frequency_idx" ON "subscriptions"("isActive", "verified", "frequency");

-- CreateIndex
CREATE INDEX "subscription_categories_categoryId_subscriptionId_idx" ON "subscription_categories"("categoryId", "subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_categories_subscriptionId_categoryId_key" ON "subscription_categories"("subscriptionId", "categoryId");

-- CreateIndex
CREATE INDEX "subscription_states_stateId_subscriptionId_idx" ON "subscription_states"("stateId", "subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_states_subscriptionId_stateId_key" ON "subscription_states"("subscriptionId", "stateId");

-- CreateIndex
CREATE INDEX "subscription_organizations_organizationId_subscriptionId_idx" ON "subscription_organizations"("organizationId", "subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_organizations_subscriptionId_organizationId_key" ON "subscription_organizations"("subscriptionId", "organizationId");

-- CreateIndex
CREATE INDEX "subscription_qualifications_qualificationId_subscriptionId_idx" ON "subscription_qualifications"("qualificationId", "subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_qualifications_subscriptionId_qualificationId_key" ON "subscription_qualifications"("subscriptionId", "qualificationId");

-- CreateIndex
CREATE INDEX "subscription_post_types_postType_subscriptionId_idx" ON "subscription_post_types"("postType", "subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_post_types_subscriptionId_postType_key" ON "subscription_post_types"("subscriptionId", "postType");

-- CreateIndex
CREATE INDEX "alert_dispatch_logs_subscriptionId_dispatchedAt_idx" ON "alert_dispatch_logs"("subscriptionId", "dispatchedAt");

-- CreateIndex
CREATE INDEX "alert_dispatch_logs_postId_dispatchedAt_idx" ON "alert_dispatch_logs"("postId", "dispatchedAt");

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "colleges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_states" ADD CONSTRAINT "post_states_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_states" ADD CONSTRAINT "post_states_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_qualifications" ADD CONSTRAINT "post_qualifications_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_qualifications" ADD CONSTRAINT "post_qualifications_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "qualifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_sources" ADD CONSTRAINT "official_sources_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "important_dates" ADD CONSTRAINT "important_dates_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_rules" ADD CONSTRAINT "eligibility_rules_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_rules" ADD CONSTRAINT "eligibility_rules_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "qualifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_rules" ADD CONSTRAINT "fee_rules_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancy_rows" ADD CONSTRAINT "vacancy_rows_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_details" ADD CONSTRAINT "admission_details_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_details" ADD CONSTRAINT "admission_details_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_details" ADD CONSTRAINT "admission_details_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_versions" ADD CONSTRAINT "post_versions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slug_aliases" ADD CONSTRAINT "slug_aliases_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_categories" ADD CONSTRAINT "subscription_categories_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_categories" ADD CONSTRAINT "subscription_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_states" ADD CONSTRAINT "subscription_states_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_states" ADD CONSTRAINT "subscription_states_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_organizations" ADD CONSTRAINT "subscription_organizations_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_organizations" ADD CONSTRAINT "subscription_organizations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_qualifications" ADD CONSTRAINT "subscription_qualifications_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_qualifications" ADD CONSTRAINT "subscription_qualifications_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "qualifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_post_types" ADD CONSTRAINT "subscription_post_types_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_dispatch_logs" ADD CONSTRAINT "alert_dispatch_logs_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_dispatch_logs" ADD CONSTRAINT "alert_dispatch_logs_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

