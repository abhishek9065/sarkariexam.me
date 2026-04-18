# Backend PostgreSQL Transition Status

## Current State
The backend has been refactored to treat **PostgreSQL (Neon)** as the primary content and domain database. Legacy MongoDB/Cosmos DB dependencies have been isolated and made optional for the core application to function.

## PostgreSQL-Backed Routes
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
- `/api/support/*` (Error Reports)
- `/api/editorial/*` (CMS Workflow)

## Remaining Legacy Dependencies (Mongo/Cosmos)
The following subsystems still utilize the legacy Mongo bridge if configured:
- **Security Logging:** `securityLogger.ts` (Isolated, optional persistence)
- **Rate Limiting:** `rate-limit.ts` (Isolated)
- **Performance Metrics:** `performance.ts` (Isolated)
- **Automation Jobs:** `automationJobs.ts` (Non-critical background tasks)
- **Analytics Rollups:** `analytics.ts` (Legacy analytics engine)
- **Dual Write Reconciliation:** `dualWriteReconciliation.ts` (Transitional tool)

## Infrastructure Updates
- **Neon Optimization:** Added support for `POSTGRES_DIRECT_URL` / `DIRECT_URL` in `config.ts` and `prisma.ts` to support Neon's connection pooling vs. migration requirements.
- **Health Checks:** The `/api/health` and `/api/health/deep` endpoints now prioritize PostgreSQL. The system will report as "healthy" if Postgres is up, even if Mongo is down (status "degraded").
- **Middleware:** Request middleware now validates PostgreSQL health for all content-related routes.

## Next Migration Steps
1.  **Refactor Analytics:** Move analytics persistence to PostgreSQL or a dedicated time-series provider.
2.  **Refactor Rate Limiting:** Switch rate-limit persistence to Redis (Upstash) entirely, removing the Mongo fallback.
3.  **Refactor Automation/Jobs:** Move background job state to PostgreSQL.
4.  **Legacy Teardown:** Once the above are complete, delete `cosmosdb.ts` and all `*.mongo.ts` proxy models.
