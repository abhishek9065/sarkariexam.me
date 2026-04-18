# PostgreSQL (Neon) Cutover Plan

## Objective
Transition the Sarkari Result platform from a hybrid Mongo/Cosmos DB and PostgreSQL architecture to a clean, PostgreSQL-first architecture using Neon as the primary provider. The goal is to eliminate the legacy Mongo dependency entirely while ensuring zero data loss and maintaining all existing routes and slugs.

## 1. Cutover Strategy & Safety
We will employ a **Dual-Read/Single-Write (Postgres-Primary)** approach for the remaining legacy modules (Users, Bookmarks) during the final migration phase, followed by a hard cutover.

*   **Temporary Legacy:** `auditLogs.mongo.ts` (if any historical logs remain unmigrated), legacy bridging services (`cosmosdb.ts`) will remain *only* until the final cutover step.
*   **Must be Fully Migrated Before Cutover:** `Users` (Authentication, Sessions, Roles), `Bookmarks`, and `Admin User Management`.
*   **Rollback Approach:** Before the hard cutover, we will maintain the Mongo connection as a fallback. If the Postgres migration of Users/Bookmarks fails in production, we can revert the deployment, which will restore the hybrid mode and continue reading from/writing to Mongo.
*   **Slug Preservation Plan:** The Prisma schema already includes a `SlugAlias` model. All historical Mongo slugs must be inserted into `SlugAlias` pointing to the primary Postgres `Post` record to ensure zero broken links.

## 2. Exact Order of Fixes

### Phase 1: Backend Fixes (Data & Models)
1.  **Bookmarks Migration (`backend/src/models/bookmarks.postgres.ts`):**
    *   Create a Postgres implementation of the Bookmark model mapping to the `BookmarkEntry` Prisma model.
    *   Update `backend/src/routes/bookmarks.ts` to use the Postgres model.
2.  **Users & Auth Migration (`backend/src/models/users.postgres.ts`):**
    *   Create a Postgres implementation of the User model mapping to the `UserAccountEntry` Prisma model.
    *   Update `backend/src/routes/auth.ts` to use the new Postgres model for login, registration, and session checks.
3.  **Service Decoupling:**
    *   Remove `cosmosdb.ts` dependencies from all remaining services (e.g., `securityLogger.ts`, `rate-limit.ts`, `performance.ts`) and ensure they are wired to Postgres or Redis.
    *   Remove legacy mapping logic (`legacyAnnouncementMapper.ts`).

### Phase 2: Admin Fixes (Management & UI)
1.  **User Management:**
    *   Update `backend/src/routes/admin.ts` to use the Postgres models for fetching, creating, updating, and deleting users.
2.  **Admin UI Verification:**
    *   No frontend UI changes should be strictly necessary in `admin-next` if the REST API contract is maintained. However, we must test the Admin UI to ensure user management and content linking (which relies on user IDs) remain functional.

### Phase 3: Frontend Fixes (Public UI)
1.  **Verification Only:**
    *   The public frontend is already fetching content dynamically via Postgres-backed APIs.
    *   Verify that `frontend/lib/content-api.ts` handles all taxonomy, listing, and detail views correctly without relying on legacy Mongo fallback fields.

### Phase 4: Migration Script Fixes (Data Sync)
1.  **Final Sync Scripts:**
    *   Write `backend/scripts/migrate-users-to-postgres.ts` to transfer all user accounts, password hashes, and 2FA secrets from Cosmos to Neon.
    *   Write `backend/scripts/migrate-bookmarks-to-postgres.ts` to transfer all user bookmarks.
    *   Update `backend/scripts/verify-openapi-parity.ts` to ensure the Postgres API responses exactly match the expected legacy contracts.

### Phase 5: Local Dev & Infrastructure Fixes (The Cutover)
1.  **Teardown Legacy Code:**
    *   Delete all `*.mongo.ts` files from `backend/src/models/`.
    *   Delete `backend/src/services/cosmosdb.ts`.
    *   Remove the legacy bridge initialization from `backend/src/server.ts` and `backend/src/config.ts`.
2.  **Update Environment:**
    *   Remove `COSMOS_CONNECTION_STRING` and `MONGODB_URI` from `docker-compose.yml` and `docker-compose.dev.yml`.
    *   Remove the `mongo` service container from `docker-compose.dev.yml`.
3.  **Dependency Cleanup:**
    *   Uninstall `mongodb` and `mongodb-memory-server` from `backend/package.json`.

## 3. Data Validation & Parity Checks
*   **Pre-Cutover:** Run the data sync scripts against a staging Neon database. Use a parity script to compare total user counts, bookmark counts, and specific test user records between Cosmos and Neon.
*   **Content Verification:** Execute a script that fetches the top 100 most visited URLs (Jobs, Results, etc.) against the staging Postgres API and compares the JSON response against the production API to ensure no missing fields or altered slugs.
