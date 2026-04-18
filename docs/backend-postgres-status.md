# Backend PostgreSQL Transition Status

## Current State: COMPLETE
The backend has been fully refactored to use **PostgreSQL (Neon)** as the primary source of truth for all domain entities, telemetry, and administrative data. The legacy MongoDB/Cosmos DB bridge is now entirely optional and only supports non-critical background automation link-health checks.

## PostgreSQL-Backed Routes (100% Migrated)
The following routes are now fully backed by PostgreSQL (Prisma):
- `/api/content/*` (Listing, Details, Pages, Taxonomies)
- `/api/posts/*` (Core Content CRUD)
- `/api/announcements/*`
- `/api/jobs/*`
- `/api/auth/*` (Login, Register, Session via `userAccountEntry`)
- `/api/bookmarks/*` (User Bookmarks via `bookmarkEntry`)
- `/api/admin/*` (Content Management & User Management)
- `/api/subscriptions/*`
- `/api/push/*`
- `/api/profile/*`
- `/api/community/*`
- `/api/support/*` (Error Reports via `errorReportEntry`)
- `/api/editorial/*` (CMS Workflow)
- `/api/analytics/*` (Events, Aggregates, and Daily Rollups)

## Refactored Services
- **Analytics:** Fully Postgres-native. Aggregation logic uses raw SQL for efficient JSON metadata processing.
- **Security Logger:** Fully Postgres-native for persistence; memory-buffered for recent events.
- **Rate Limiting:** Decoupled from Mongo; now uses optimized In-Memory storage (Redis-ready).
- **Performance Metrics:** Decoupled from Mongo; now uses optimized In-Memory storage.
- **Engagement:** User Feedback and Community Comments migrated to Postgres models.

## Remaining Legacy Bridge
- **Automation Jobs:** `automationJobs.ts` still uses the legacy bridge for persisting link-health records. This does not impact core site functionality.
- **Teardown Readiness:** The application can now boot and function perfectly with only a PostgreSQL connection.

## Infrastructure Updates
- **Neon Optimization:** Supports `POSTGRES_DIRECT_URL` for migrations and pooled `DATABASE_URL` for runtime.
- **Health Checks:** The `/api/health` system correctly prioritizes Postgres health.

## Recommended Final Step
- **Delete `cosmosdb.ts` and Mongo Containers:** After verifying the data migration from production Cosmos to Neon using the provided scripts, the Mongo dependency can be physically removed from the repository.
