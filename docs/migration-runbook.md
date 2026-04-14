# Migration Runbook

## Purpose
This runbook covers the remaining operational rollout for the new `posts` platform:
- backfill legacy `announcements` into `posts`
- audit migration coverage and content quality
- review and normalize migrated editorial data before scale publishing

## Preconditions
- A reachable MongoDB or Cosmos Mongo-compatible database with the current production or staging data.
- Backend environment values for:
  - `COSMOS_CONNECTION_STRING` or `MONGODB_URI`
  - `COSMOS_DATABASE_NAME`
- Backend dependencies installed.
- The application deploy has already been completed with the production root `.env` in place on the target server.

The repo now supports direct CLI overrides, so you do not need to rewrite `backend/.env` for staged runs.

## Local Fallback Without Docker
If Docker and local MongoDB are unavailable, the backend now includes a development-only in-memory Mongo helper based on `mongodb-memory-server`.

From `backend/`:

```bash
npm run dev:db:start -- --seed
```

This will:
- start a local Mongo-compatible server on `mongodb://127.0.0.1:27017/sarkari_db`
- seed development-only sample `announcements`
- keep the local database process running until stopped

Status:

```bash
npm run dev:db:status
```

Stop:

```bash
npm run dev:db:stop
```

This local fallback is for development and migration rehearsal only. It does not replace staging or production data.

## Safe Dry Run
From `backend/`:

```bash
npm run backfill:posts -- --dry-run --report ../docs/backfill-dry-run-report.json --uri "<mongo-uri>" --db-name "<database>"
```

What this does:
- reads all legacy `announcements`
- checks whether each record already exists in `posts`
- maps each record into the new `Post` shape without writing it
- writes a JSON report with coverage and quality-signal counts

Review `docs/backfill-dry-run-report.json` before any live import.
For rollout, do this on staging first and only proceed to production after the staging report and editorial QA are accepted.

## Live Backfill
After the dry run is reviewed:

```bash
npm run backfill:posts -- --report ../docs/backfill-live-report.json --uri "<mongo-uri>" --db-name "<database>"
```

Expected behavior:
- already migrated records are skipped
- newly mapped records are created in `posts`
- the script writes a summary report with create/skip totals and sample quality issues

## Post-Backfill Audit
Run the audit immediately after the backfill:

```bash
npm run audit:migration -- --out ../docs/migration-audit-report.json --uri "<mongo-uri>" --db-name "<database>"
```

The audit report includes:
- total `announcements` vs total `posts`
- records still missing from `posts`
- duplicate slug detection
- missing official sources
- missing verification notes
- published posts missing SEO fields
- missing state, qualification, organization, or category tagging
- taxonomy collection counts

## Editorial QA Sequence
1. Open the admin CMS and review migrated `draft`, `approved`, `published`, and `archived` items.
2. Normalize duplicate or messy taxonomies in the taxonomy manager:
   - states
   - organizations
   - categories
   - qualifications
   - institutions
   - exams
3. Fix the high-signal issues from `migration-audit-report.json` first:
   - missing official source
   - missing verification note
   - missing SEO on published items
   - broken taxonomy coverage
4. Confirm canonical slugs for high-traffic items before republishing corrections.
5. Use version notes for every material QA correction.

## Failure Handling
- If the dry run fails to connect, supply explicit CLI overrides with `--uri` and `--db-name`.
- If the live run is interrupted, rerun it. Existing migrated records are skipped by `legacyAnnouncementId` or matching slug.
- If a mapping issue is found after import, fix the post in the editorial CMS rather than re-creating it.

## Current Local Limitation
In the checked-in local development setup, `backend/.env` points to `mongodb://localhost:27017/sarkari_db`. If local Mongo is not running, dry runs and audits will fail until you either:
- start a local Mongo instance with the expected data, or
- pass a reachable staging or production-compatible URI through `--uri`
