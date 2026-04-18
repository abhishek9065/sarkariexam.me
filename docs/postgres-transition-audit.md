# PostgreSQL Transition Audit

## Overview
This document serves as an audit of the current state of the database transition from MongoDB/Cosmos DB to PostgreSQL (Neon). The repository is in a hybrid state, with a significant portion of the application already successfully running on PostgreSQL.

## 1. What already uses PostgreSQL?
- **Core Content Domain:** All primary content types (Jobs, Results, Admit Cards, Admissions, Answer Keys, Syllabus) use PostgreSQL via Prisma.
- **Backend Routes:** `/api/announcements`, `/api/jobs`, `/api/community`, `/api/support`, `/api/subscriptions`, `/api/push`, `/api/profile`, and `/api/editorial` are fully wired to Postgres models (`*.postgres.ts`).
- **Admin/Editorial Workflow:** The CMS and editorial dashboards write to and read from Postgres.
- **Public Frontend:** The Next.js frontend (`frontend/lib/content-api.ts`) dynamically fetches all listings, details, and taxonomies from the backend REST API, which reads from Postgres. (Note: The `README.md` referencing "hardcoded/mock data" is outdated).
- **Prisma Schema:** A comprehensive, well-structured schema exists (`backend/prisma/schema.prisma`), covering not just content, but also users, bookmarks, and notifications.

## 2. What still uses Mongo/Cosmos?
- **Authentication & Users:** The `auth.ts` and `admin.ts` routes still rely on `users.mongo.ts`. User registration, roles, passwords, and 2FA are still tied to Mongo.
- **User Bookmarks:** The `bookmarks.ts` route utilizes `bookmarks.mongo.ts`.
- **Legacy Bridging:** Services like `cosmosdb.ts`, `legacyRuntime.ts`, and `dualWriteReconciliation.ts` are still present and instantiated on startup if `COSMOS_CONNECTION_STRING` is provided.

## 3. Is PostgreSQL actually functional end-to-end?
**Yes.** The public frontend, the admin content management system, and the core backend REST APIs are functionally operating on PostgreSQL.

## 4. Broken or Incomplete Migration Logic
- **Users & Auth:** Despite `UserAccountEntry` and `BookmarkEntry` existing in the `schema.prisma`, the backend code still explicitly imports and executes logic from `.mongo.ts` models for these entities.
- **Dual-Writes:** Some background schedulers and legacy runtime systems may still attempt to write to Mongo if the bridge is connected.

## 5. Do Admin writes still depend on Mongo/Cosmos?
- **Content Writes:** **No.** Content management (creating, approving, publishing posts) is fully migrated to PostgreSQL.
- **User Writes:** **Yes.** Admin endpoints for creating, updating, or deleting users still interact with Mongo.

## 6. Does the public frontend still depend on hardcoded content?
**No.** The frontend uses `frontend/lib/content-api.ts` to dynamically fetch data from the `/api/content/...` and `/api/posts` backend endpoints.

## 7. Is local development still Mongo-based?
**It is hybrid.** `docker-compose.dev.yml` spins up both `postgres:16` and `mongo:latest`. The backend expects both `POSTGRES_PRISMA_URL` and `COSMOS_CONNECTION_STRING` to run without warnings.

## 8. Key Infrastructure Details
- **Prisma Usage:** Centrally managed in `backend/src/services/postgres/prisma.ts`.
- **Migration Scripts:** Located in `backend/scripts/` (`audit-content-migration.ts`, `backfill-posts.ts`, `migrate-content-to-postgres.ts`).
- **Connection Paths:** `backend/src/config.ts` attempts to resolve both Postgres and Mongo variables.

---

## Component Matrix

| Domain/Component | Status | Notes |
| :--- | :--- | :--- |
| Content (Posts, Announcements) | **Already Postgres** | Managed via Prisma (`posts.postgres.ts`) |
| Taxonomies & Pages | **Already Postgres** | Managed via Prisma (`contentTaxonomies.postgres.ts`) |
| Subscriptions & Push | **Already Postgres** | Managed via Prisma (`alertSubscriptions.postgres.ts`) |
| Community & Error Reports | **Already Postgres** | Managed via Prisma |
| Users & Auth | **Still Mongo/Cosmos** | `users.mongo.ts` still in active use |
| Bookmarks | **Still Mongo/Cosmos** | `bookmarks.mongo.ts` still in active use |
| Public Frontend Data | **Already Postgres** | Fully dynamic; no mock data used for real paths |
| Audit Logs | **Already Postgres** | Mapped to `auditLogs.postgres.ts` |

## Critical Blockers for Full Postgres Transition
1. **User & Auth Migration:** The user accounts, passwords, and sessions must be migrated from Mongo to Postgres, and `users.mongo.ts` must be replaced.
2. **Bookmarks Migration:** User bookmarks need to point to the `BookmarkEntry` Postgres model instead of Mongo.
3. **Legacy Teardown:** Once users and bookmarks are migrated, `cosmosdb.ts` and the legacy bridge in `config.ts` and `server.ts` must be fully excised.

## Recommended Order of Fixes
1. Migrate `bookmarks` routes/models to PostgreSQL.
2. Migrate `users` and `auth` routes/models to PostgreSQL.
3. Execute a final data sync for users/bookmarks from production Cosmos to Neon Postgres.
4. Remove `*.mongo.ts` files, `cosmosdb.ts`, and legacy bridge initializations.
5. Remove Mongo containers from `docker-compose.yml` and `docker-compose.dev.yml`.

## Neon-Specific Environment Variables
To run cleanly on Neon as the primary, the following variables should exist (and replacing old defaults):
- `DATABASE_URL` or `POSTGRES_PRISMA_URL` (e.g., `postgresql://user:pass@ep-cool-snowflake-123456.us-east-2.aws.neon.tech/neondb?sslmode=require`)
- *(Optional Neon features)* Connection pooling params, though Prisma handles standard URLs well.

## Can the repo run functionally with Neon as primary today?
**Partially.** Content browsing, reading, and CMS authoring can run entirely on Neon. However, because authentication still strictly requires Mongo to function, a Neon-only deployment would fail at user login and session verification until the `users.mongo.ts` module is replaced.