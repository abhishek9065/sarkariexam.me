# Backend PostgreSQL Transition Status

## Current State: COMPLETE
The backend has been fully refactored to use **PostgreSQL (Neon)** as the primary and exclusive source of truth for all domain entities, telemetry, administrative data, and background jobs. The legacy MongoDB/Cosmos DB bridge is completely decoupled from the runtime.

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

## Refactored Services (100% Decoupled)
- **Analytics:** Fully Postgres-native. Aggregation logic uses raw SQL for efficient JSON metadata processing.
- **Security Logger:** Fully Postgres-native for persistence; memory-buffered for recent events.
- **Rate Limiting:** Decoupled from Mongo; now uses optimized In-Memory storage (Redis-ready).
- **Performance Metrics:** Decoupled from Mongo; now uses optimized In-Memory storage.
- **Engagement:** User Feedback and Community Comments migrated to Postgres models.
- **Automation Jobs:** Link health checks and expiry automations now utilize Prisma and Postgres `officialSource` and `post` tables directly, abandoning the legacy `automationStore.mongo.ts`.

## Remaining Legacy Bridge
- **None.**

## Infrastructure Updates
- **Neon Optimization:** Supports `POSTGRES_DIRECT_URL` for migrations and pooled `DATABASE_URL` for runtime.
- **Health Checks:** The `/api/health` system correctly prioritizes Postgres health.

## Recommended Final Step
- **Delete `cosmosdb.ts` and Mongo Containers:** After verifying the data migration from production Cosmos to Neon using the provided sync scripts, the legacy `*.mongo.ts` files, `cosmosdb.ts`, and the Mongo docker container can be safely deleted.
