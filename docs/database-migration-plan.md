# Database Migration Plan

## Goal
Migrate content publishing domain from Mongo/Cosmos to PostgreSQL with minimal risk and deterministic rollback.

## Pre-Migration Checklist
- Confirm PostgreSQL connectivity (`POSTGRES_PRISMA_URL`).
- Apply Prisma migrations:
  - `npm run prisma:generate`
  - `npm run prisma:migrate:deploy`
- Verify backend health endpoints in current mode.
- Take Mongo/Cosmos snapshot/backup and PostgreSQL backup checkpoint.

## Phase 1: Dry Run
- Execute:
  - `npm run migrate:postgres:content -- --dry-run --report ../docs/migration-postgres-dry-run.json`
- Validate report totals for:
  - taxonomies
  - posts
  - versions
  - audit logs
  - subscriptions

## Phase 2: Staging Live Import
- Execute live import on staging:
  - `npm run migrate:postgres:content -- --report ../docs/migration-postgres-staging.json`
- Run backend validation suite after import:
  - `npm run build`
  - `npm run lint`
  - `npm test`
- Run parity checks for public/editorial endpoints under `mongo` and `postgres` modes.

## Phase 3: Production Rehearsal and Import
- Freeze editorial changes for migration window (short lock recommended).
- Run live import with report capture.
- Verify counts and sampled row parity before traffic switch.

## Phase 4: Controlled Cutover
- Switch runtime mode:
  - `CONTENT_DB_MODE=postgres`
- Validate:
  - `/api/health`
  - `/api/health/deep`
  - representative content and editorial endpoints
  - admin create -> submit -> approve -> publish workflow

## Phase 5: Stabilization
- Monitor API errors, latency, and data quality signals.
- Keep rollback path active during stabilization window.
- Resolve mismatches using rerunnable migration script.

## Rollback Plan
- Immediate rollback trigger conditions:
  - elevated 5xx on content/editorial APIs
  - severe content mismatch
  - migration data integrity defects
- Rollback actions:
  - set `CONTENT_DB_MODE=mongo`
  - redeploy backend with previous mode
  - keep PostgreSQL data for forensic comparison

## Data Integrity Gates
- Slug uniqueness and alias continuity.
- Workflow status parity.
- Version count parity for sampled posts.
- Audit trail continuity for sampled workflows.
- Subscription preference parity.

## Post-Cutover Tasks
- Migrate remaining hardcoded frontend page metadata into `content_pages`.
- Enable dual-write or retire Mongo writes based on final operating model.
- Decommission legacy collections only after retention and compliance windows close.
