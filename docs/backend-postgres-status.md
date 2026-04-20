# Backend PostgreSQL Transition Status

## Current State: Postgres Primary, Legacy Bridge Transitional
The backend runtime is Postgres-primary for content, editorial, admin, analytics, and user-facing domains. Legacy Mongo/Cosmos compatibility code still exists as a transitional boundary and is not yet fully removed.

## Postgres-Backed Runtime Paths
- `/api/content/*`, `/api/posts/*`, `/api/jobs/*`, `/api/announcements/*`
- `/api/editorial/*`, `/api/admin/*`
- `/api/auth/*`, `/api/bookmarks/*`, `/api/profile/*`
- `/api/community/*`, `/api/push/*`, `/api/support/*`, `/api/subscriptions/*`

## Transitional Legacy Coupling Still Present
- Legacy request guard list is now empty for active API routes.
- Legacy runtime bootstrap no longer starts Postgres schedulers.
- Legacy bridge remains for compatibility-only surfaces (backup metadata, security audit history, migration/backfill scripts).
- `dualWriteReconciliation.ts` still records transitional `mode: dual` semantics.
- Mongo/Cosmos bridge code remains available for compatibility paths.

## Operational Contract (Phase 1)
- PostgreSQL remains required for production runtime health.
- Mongo/Cosmos bridge is optional by default.
- Set `LEGACY_MONGO_REQUIRED=true` to fail preflight/startup when legacy bridge credentials are missing.

## Recommended Next Steps
1. Retire dual-write reconciliation semantics once bridge paths are removed.
2. Migrate backup/security audit collections to Postgres or durable alternative storage.
3. Remove bridge code and infra only after dependency reaches zero.
