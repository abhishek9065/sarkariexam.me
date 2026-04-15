# Database Architecture

## Objective
Establish Azure-first, PostgreSQL-primary architecture for Sarkari content while preserving safe rollback and zero-downtime migration from Mongo/Cosmos.

## Core Principles
- PostgreSQL is the canonical store for live content.
- Mongo/Cosmos remains transitional for legacy and non-content modules.
- Route-level providers control read/write source to avoid big-bang rewrites.
- Slug and legacy alias continuity is mandatory.
- Migration must be idempotent and rerunnable.

## Runtime Modes
Configured via `CONTENT_DB_MODE`:
- `mongo`: read/write via existing Mongo models.
- `postgres`: read/write via Prisma-backed PostgreSQL models.
- `dual`: currently kept conservative for rollout safety (Mongo remains operational primary until explicit mirror/cutover gate).

## Logical Architecture
- API entry: Express routes in `backend/src/routes`.
- Data source selector:
  - public read path: `backend/src/services/contentReadProvider.ts`
  - editorial path: `backend/src/services/editorialDataProvider.ts`
- PostgreSQL client and health: `backend/src/services/postgres/prisma.ts`.
- Health/metrics exposure now includes content DB mode and PG readiness in `backend/src/server.ts`.

## Data Domains
- Canonical content: posts, taxonomies, workflow, version history, audit history.
- Discovery and UX metadata: SEO fields, trust tags, official sources, date blocks, eligibility, fee tables, vacancy rows.
- Subscription domain: subscriber + preference pivots + dispatch logs.
- Static-page replacement target: `content_pages` table for auxiliary/info/community/category metadata.

## Azure Deployment Target
- Primary DB: Azure Database for PostgreSQL Flexible Server.
- Recommended production setup:
  - Zone-redundant HA where available.
  - PITR enabled with retention aligned to rollback window.
  - Read replica for heavy analytics/search workloads (optional phase).
  - Connection pooling via PgBouncer or managed equivalent.
- Secret/config management through environment variables:
  - `POSTGRES_PRISMA_URL`
  - `CONTENT_DB_MODE`

## Operational Controls
- Build-time: Prisma schema validate + migration generation/deploy.
- Runtime health:
  - `/api/health` and `/api/health/deep` report Mongo and PG readiness.
  - `/api/metrics` exposes content DB mode and PG configuration gauges.
- Migration observability:
  - `backend/scripts/migrate-content-to-postgres.ts` supports dry-run and report outputs.

## Cutover Strategy
- Stage 1: Mongo primary, Postgres schema + importer rehearsals.
- Stage 2: Postgres enabled in lower environments with editorial + public parity checks.
- Stage 3: Production switch to `CONTENT_DB_MODE=postgres` after reconciliation gates pass.
- Stage 4: Retain rollback path for a stabilization window, then retire dual-path complexity.
