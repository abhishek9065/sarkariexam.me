# Repository Audit

## Overview
- The repository already has the right major surfaces for a serious platform: `backend`, `frontend`, `admin-next`, `nginx`, deploy scripts, and CI/CD.
- The core content system is no longer frontend-seeded in the old sense. The strongest path in the repo is already the Prisma/Postgres-backed editorial and public content layer.
- The main architectural risk is split truth: docs and some runtime seams still imply Mongo/Cosmos primary, while actual structured content and editorial workflows are already moving through Postgres.

## Keep
### Core platform foundation
- `backend/prisma` schema and migrations for content, workflow, taxonomies, versions, and audit
- Postgres-backed editorial/content routes and DTOs
- Public route vocabulary and backend-driven listing/detail flows
- `nginx`, deployment scripts, and GitHub Actions baseline
- Security middleware, health checks, request tracing, and cache revalidation endpoint

### Admin CMS core
- Admin shell, auth/session flow, and the editorial, taxonomy, subscribers, audit-log, and settings surfaces
- Compatibility endpoints only where they still help migration

## Replace
### Split architecture truth
- Replace Mongo/Cosmos-primary documentation and environment defaults
- Replace raw SQL `app_*` tables as the long-term home of operational runtime data
- Replace legacy `/admin` workflow semantics as the primary editorial contract
- Replace broad dynamic rendering in the public frontend with selective ISR and on-demand revalidation

### Transitional UI/runtime seams
- Replace fake nav counters, fake notifications, and placeholder operations dashboards
- Replace generic default SEO metadata and narrow sitemap coverage
- Replace primitive search ranking with a Postgres-first search layer behind a stable adapter

## Rebuild
### Operational systems
- Rebuild saved-search alerts and notification dispatch on a single Postgres + Redis pipeline
- Rebuild community moderation and ticker/links management only when live-data-backed workflows exist
- Rebuild analytics around actual platform signals instead of static UI demos

### Platform hardening
- Rebuild deployment strategy beyond direct production rebuild-on-host
- Rebuild staging, promotion, rollback, and release controls
- Rebuild observability around crawl health, content freshness, queue lag, and editorial throughput

## Current Risks
- Tracker reminders are now the highest-risk migration seam because scheduler logic and storage are still split across old and new systems.
- Most high-value operational tables now live behind Prisma, but the remaining scheduler/runtime seams still read Mongo-compatible collections and keep the migration incomplete.
- The public frontend has enough backend integration to avoid a rewrite, but blanket dynamic rendering is suppressing the value of cache tags and revalidation.
- Admin includes real CMS features, but some adjacent operations screens still present mock data as if it were live.

## Recommended Direction
- Keep the stack.
- Make Postgres/Prisma the explicit source of truth.
- Phase Mongo/Cosmos out of core runtime paths.
- Move operational slices into Prisma deliberately.
- Treat admin/editorial as the canonical CMS surface and quarantine anything still demo-grade.
- Keep legacy job ownership explicit in code so startup and health outputs show exactly which Mongo/Cosmos subsystems remain transitional.
- Finish migration by replacing legacy scheduler dependencies rather than re-opening already migrated Prisma-backed account/profile/content paths.
