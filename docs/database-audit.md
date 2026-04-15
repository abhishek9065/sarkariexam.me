# Database Audit

## Scope
This audit covers the content publishing domain across backend, public frontend, and admin CMS, with the target of making PostgreSQL the primary source of truth while preserving safe migration from Mongo/Cosmos.

## Current State Summary
- Current production-proven persistence is MongoDB API (Cosmos-compatible) through `backend/src/services/cosmosdb.ts`.
- Content domain already exists in Mongo collections (`posts`, `post_versions`, `audit_logs`, taxonomy collections, `alert_subscriptions`).
- PostgreSQL foundation has now been introduced with Prisma schema, generated migration, and initial runtime switching.
- Public content routes are now provider-driven and can read from PostgreSQL when `CONTENT_DB_MODE=postgres`.
- Editorial routes are now provider-driven and can run against PostgreSQL in `postgres` mode.

## What Was Found
### Backend persistence
- Mongo/Cosmos connection, health, and index creation are implemented centrally in `backend/src/services/cosmosdb.ts`.
- Content behavior in Mongo is mature and includes:
  - workflow state transitions
  - version snapshots
  - audit logging
  - taxonomy normalization
  - subscription preference matching

### Public API
- Public content routes are in `backend/src/routes/content.ts` and now use `backend/src/services/contentReadProvider.ts`.
- Read source is controlled by `CONTENT_DB_MODE` via `backend/src/services/contentDbMode.ts`.

### Editorial API
- Editorial routes are in `backend/src/routes/editorial.ts` and now use `backend/src/services/editorialDataProvider.ts`.
- PostgreSQL write path for posts/workflow/history is now implemented in `backend/src/models/posts.postgres.ts`.

### PostgreSQL foundation added
- Prisma schema: `backend/prisma/schema.prisma`.
- Baseline migration: `backend/prisma/migrations/202604140001_content_platform_init/migration.sql`.
- Search/index migration: `backend/prisma/migrations/202604140002_search_indexes/migration.sql`.
- Prisma client/health: `backend/src/services/postgres/prisma.ts`.
- Migration runner: `backend/scripts/migrate-content-to-postgres.ts`.

### Frontend hardcoded content surfaces still present
- Static content registry and page metadata structures remain in `frontend/app/lib/public-content.ts`.
- These should be progressively migrated into DB-backed content pages (modeled by `content_pages` in Prisma).

## Gaps and Risks
- Dual-write mode is intentionally conservative right now (editorial provider switches fully by mode; no automatic mirror write in `dual`).
- Full `content_pages` CMS surface is modeled but not yet fully wired into frontend/admin workflows.
- Operational reconciliation dashboards (row parity, checksum parity) are not yet fully automated.

## Readiness Assessment
- Architecture readiness: High (schema, providers, and migrations are in place).
- Migration safety readiness: Medium-high (dry-run script/report support exists, but production rehearsal and parity gates are still required).
- Cutover readiness: Medium (requires staged rehearsal and explicit rollout checklist execution).
