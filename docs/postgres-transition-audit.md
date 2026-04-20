# PostgreSQL Transition Audit

## Overview
The repository is now Postgres-primary for active product behavior. Remaining Mongo/Cosmos code is transitional and mainly tied to compatibility guards and startup coupling.

## What Is Already Postgres-Backed
- Content, taxonomies, pages, and editorial workflow.
- Admin content operations and dashboard data.
- Push, subscriptions, community, support, and analytics data paths.
- Auth and bookmarks compatibility imports now resolve to Postgres-backed implementations.

## Transitional Legacy Areas Still Present
- Legacy bridge service and readiness checks remain in runtime wiring.
- Guarded API prefix list is now empty for active API routes.
- Analytics/automation scheduler startup is now owned by Postgres-primary bootstrap.
- Dual-write reconciliation logs still carry historical `primary: mongo` semantics.

## Component Matrix

| Domain/Component | Current State | Notes |
| :--- | :--- | :--- |
| Content and Editorial | Postgres Primary | Prisma-backed read/write paths |
| Admin Content Operations | Postgres Primary | Active admin workflows are Postgres-backed |
| Auth and Bookmarks | Postgres via compatibility exports | Import names still include `.mongo.ts` for compatibility |
| Community, Push, Support | Postgres Primary | Route implementations use Postgres models |
| Legacy Runtime Guardrails | Transitional | Prefix guard list currently empty; bridge retained for compatibility surfaces |
| Dual-Write Reconciliation | Transitional | Historical semantics not yet retired |

## Current Risks
1. Legacy compatibility services (backup metadata/security audit history/migration scripts) still rely on Mongo/Cosmos availability.
2. Dual-write reconciliation semantics can drift from runtime reality if not retired.
3. Documentation can drift if transition boundaries are not updated with each reduction step.

## Recommended Next Order of Work
1. Retire dual-write reconciliation semantics.
2. Port remaining compatibility surfaces to Postgres or dedicated durable storage.
3. Remove bridge code and optional infra only after dependency reaches zero.