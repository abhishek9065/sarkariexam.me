# Admin CMS PostgreSQL Migration

## Overview
The Admin CMS workflows have been successfully refactored and verified to operate exclusively against Neon PostgreSQL. The legacy bridge layer using CosmosDB/MongoDB has been fully bypassed for editorial operations.

## Completed Workflows
The following administrative workflows now natively map to Prisma and PostgreSQL with full transactional safety:
- **Core Post CRUD:** Creating, reading, updating, and listing posts.
- **Workflow Transitions:** Moving content between `draft`, `in_review`, `approved`, `published`, and `archived` states.
- **Sub-Component Mapping:** Native relational inserts/updates for:
  - `officialSources`
  - `importantDates`
  - `eligibility` (Eligibility Rules)
  - `feeRules`
  - `vacancyRows`
  - `admissionPrograms` (Mapped dynamically to `AdmissionDetail` and `Program`)
- **Taxonomies:** `organizations`, `states`, `categories`, `qualifications`, and `exams` are implicitly upserted and linked during post creation.
- **Slug Management:** Changes to a post's slug now automatically generate a 301 `SlugAlias` record for the old route to prevent dead links.
- **Trust & Metadata:**
  - Full SEO metadata (`seoTitle`, `seoDescription`, `seoCanonicalPath`).
  - Tags like `new`, `hot`, `update`, `last-date`.
  - Missing legacy fields **`sourceNote`**, **`correctionNote`**, and **`contentJson`** were added to the API payload, types, and persistence layer to prevent silent data drops during updates.
- **Audit & Versioning:** Every CRUD or workflow action now creates a `PostVersion` snapshot and an `AuditLog` entry securely linked via relational keys.

## Remaining Work
- **Legacy Analytics:** `analyticsStore.mongo.ts` and some live analytics tools may still read traffic events from legacy MongoDB structures if enabled, though editorial writes do not depend on it.
- **Scheduler Fallback:** Several cron jobs/schedulers (`send-digest.ts`, `automationJobs.ts`) still contain structural dependencies on Mongo models. They must be ported to Prisma before dropping the `MONGODB_URI` environment variable.

## Manual QA Verification Steps
To verify publishing works securely on PostgreSQL:
1. Open the Admin CMS at `/announcements/new`.
2. Draft a new `Job` post, filling out the title, summary, and explicitly adding an **Official Source** (mark as Primary).
3. Add a **Source Note** and **Correction Note** in the Trust section to verify the new payload mapping.
4. Save as Draft, then transition it via the Submit -> Approve -> Publish workflow.
5. In PostgreSQL (e.g. Neon Console), verify the `posts` table shows `status = 'PUBLISHED'` and the timestamp is set.
6. Verify the `post_versions` table successfully captured the `contentJson` and snapshots of the post across each state change.
7. Attempt to alter the post's slug and verify that the `slug_aliases` table captured the old route.
