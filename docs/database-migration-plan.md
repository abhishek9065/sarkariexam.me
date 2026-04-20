# Database Migration Plan

## Goal
Complete the remaining transition from legacy Mongo/Cosmos coupling to a fully Postgres-primary runtime with deterministic rollback.

## Pre-Migration Checklist
- Confirm PostgreSQL connectivity (`POSTGRES_PRISMA_URL`).
- Apply Prisma migrations:
  - `npm run prisma:generate`
  - `npm run prisma:migrate:deploy`
- Verify backend health endpoints in current runtime.
- Take Mongo/Cosmos snapshot/backup and PostgreSQL backup checkpoint.

## Phase 1: Data Rehearsal (if any legacy data still needs import)
- Execute:
  - `npm run migrate:postgres:content -- --dry-run --report ../docs/migration-postgres-dry-run.json`
- Validate report totals for:
  - taxonomies
  - posts
  - versions
  - audit logs
  - subscriptions

## Phase 2: Staging Live Import and Validation
- Execute live import on staging:
  - `npm run migrate:postgres:content -- --report ../docs/migration-postgres-staging.json`
- Run backend validation suite after import:
  - `npm run build`
  - `npm run lint`
  - `npm test`
- Run parity checks for public/editorial/admin endpoints in the Postgres-primary runtime.

## Phase 3: Production Rehearsal and Import
- Freeze editorial changes for migration window (short lock recommended).
- Run live import with report capture.
- Verify counts and sampled row parity before traffic switch.

## Phase 4: Runtime Decoupling Cutover
- Keep Postgres as the primary runtime store.
- Remove or narrow legacy Mongo/Cosmos guardrails only after each path is verified bridge-free.
- Move scheduler startup to Postgres-native bootstrap flow.
- Validate:
  - `/api/health`
  - `/api/health/deep`
  - representative content and editorial endpoints
  - admin create -> submit -> approve -> publish workflow

## Phase 5: Stabilization
- Monitor API errors, latency, and data quality signals.
- Keep rollback path active during stabilization window.
- Resolve mismatches using rerunnable migration scripts and targeted backfills.

## Rollback Plan
- Immediate rollback trigger conditions:
  - elevated 5xx on content/editorial APIs
  - severe content mismatch
  - migration data integrity defects
- Rollback actions:
  - redeploy previous known-good backend commit
  - restore pre-cutover route guard list and scheduler bootstrap wiring if needed
  - keep PostgreSQL data for forensic comparison

## Data Integrity Gates
- Slug uniqueness and alias continuity.
- Workflow status parity.
- Version count parity for sampled posts.
- Audit trail continuity for sampled workflows.
- Subscription preference parity.

## Post-Cutover Tasks
- Migrate remaining hardcoded frontend page metadata into `content_pages`.
- Retire dual-write reconciliation semantics once bridge dependency is removed.
- Decommission legacy collections only after retention and compliance windows close.
