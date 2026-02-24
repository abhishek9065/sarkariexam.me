# Sarkari Result Monorepo: Architecture Map (High Depth, Backend-First)

Generated on: 2026-02-24  
Repository root: `c:\Users\abhis\Downloads\sarkari-result-git-clean`

## 1) Scope and Outcome

This document is a decision-grade architecture map focused on:

1. Backend request lifecycle and control plane.
2. Auth/permission/step-up/approval security model.
3. Data model and indexing shape.
4. API surface ownership and contract parity.
5. Public frontend and admin vNext integration points.
6. Ingress, deployment, and governance guardrails.
7. Change-impact guidance for common engineering tasks.

Out of scope:

1. Behavior changes.
2. Refactors.
3. API contract redesign.

## 2) Runtime Topology

### 2.1 Monorepo shape

| Area | Path | Responsibility |
| --- | --- | --- |
| Backend API | `backend/` | Express 5 + TypeScript + Mongo/Cosmos API, auth, analytics, admin workflows |
| Public frontend | `frontend/` | React 19 user site plus legacy admin route (`/admin`) |
| Admin vNext frontend | `admin-frontend/` | React 19 modular admin console (`/admin-vnext`) |
| Edge proxy | `nginx/` | Route split between public frontend, admin-vNext, backend |
| Shared contract | `openapi.json` | API contract used by both frontends for generated types |
| Operational scripts | `scripts/` | Config consistency and admin UI guardrails |

### 2.2 Ingress and routing

Nginx route split from `nginx/nginx.conf`:

| Incoming path | Upstream | Notes |
| --- | --- | --- |
| `/api/*` | `backend:4000` | Backend API surface |
| `/admin-vnext/*` | `admin-frontend:80` | New admin app |
| `/admin/*` | `frontend:80` | Legacy admin embedded in public frontend |
| `/admin-legacy/*` | `frontend:80` | Explicit rollback alias |
| `/*` | `frontend:80` | Public site |

WebSocket:

1. Backend exposes `/ws/analytics`.
2. Vite dev proxy in both frontends forwards `/ws` to backend.

### 2.3 Process topology in compose

From `docker-compose.yml`:

1. `nginx` reverse proxy (ports 80/443).
2. `backend` (internal port 4000).
3. `frontend` (internal port 80).
4. `admin-frontend` (internal port 80).
5. `datadog-agent` for infra/APM/log collection.

## 3) Backend Runtime Flow

### 3.1 Startup sequence (`backend/src/server.ts`)

1. Initialize error tracking (`ErrorTracking.init()`).
2. If DB connection exists, connect to Mongo/Cosmos and start scheduled jobs.
3. Create HTTP server from Express app.
4. Attach analytics WebSocket server (`/ws/analytics`).
5. Listen on `config.port`.

Background jobs initialized only when DB is configured:

1. Analytics rollups.
2. Admin approvals cleanup.
3. Digest sender.
4. Tracker reminders.
5. Saved search alerts.
6. Automation jobs.

### 3.2 Middleware order (effective request pipeline)

Global order from `server.ts`:

1. `requestIdMiddleware` -> adds `X-Request-Id`.
2. `cloudflareMiddleware` -> guarded trust of `CF-Connecting-IP`.
3. `securityHeaders` (Helmet CSP hardening for API responses).
4. `blockSuspiciousAgents`.
5. `compression`.
6. Dynamic `cors` policy based on configured origins.
7. `cookieParser`.
8. `express.json` and `express.urlencoded`.
9. `validateContentType` for mutating methods.
10. `sanitizeRequestBody` recursive input sanitizer (excluding sensitive fields).
11. Swagger UI mount (`/api/docs`) if `openapi.json` exists.
12. Rate limits:
   - `/api` generic.
   - `/api/auth` stricter auth limit.
   - admin-critical prefixes + HTTPS/IP allowlist + admin limit.
13. `responseTimeLogger` (includes active-user tracking hook).
14. Route mounts.
15. API 404 fallback.
16. Global `errorHandler`.

### 3.3 Health and observability endpoints

Direct app routes:

1. `/api/health` and `/api/healthz`.
2. `/api/health/deep` (DB readiness).
3. `/metrics` (Prometheus-like text output with optional token).
4. `/api/performance` (admin-permission gated performance stats).

## 4) API Surface Ownership

Inventory from route extraction (`router.<method>(...)`):

1. 15 backend route files.
2. 156 route method definitions.

Ownership matrix:

| Mount prefix | Route count | Source file | Domain |
| --- | ---: | --- | --- |
| `/api/admin` | 67 | `backend/src/routes/admin.ts` | Admin control plane (content ops, approvals, security, settings, reports) |
| `/api/profile` | 18 | `backend/src/routes/profile.ts` | User profile, saved searches, tracker, notifications |
| `/api/announcements` | 14 | `backend/src/routes/announcements.ts` | Public content listing/search/detail plus CRUD |
| `/api/auth` | 13 | `backend/src/routes/auth.ts` | User/admin login, 2FA, step-up, sessions, password reset |
| `/api/community` | 13 | `backend/src/routes/community.ts` | Forums, QA, groups, flags |
| `/api/admin-auth` | 11 | `backend/src/routes/admin-auth.ts` | Additive admin-auth namespace delegating to auth routes |
| `/api/bookmarks` | 4 | `backend/src/routes/bookmarks.ts` | Bookmark CRUD |
| `/api/analytics` | 3 | `backend/src/routes/analytics.ts` | Analytics overview/popular/export |
| `/api/subscriptions` | 3 | `backend/src/routes/subscriptions.ts` | Email subscription lifecycle |
| `/api/support` | 3 | `backend/src/routes/support.ts` | Error report ingest + admin triage |
| `/api/auth/admin` | 2 | `backend/src/routes/admin-setup.ts` | Bootstrap admin setup |
| `/api/push` | 2 | `backend/src/routes/push.ts` | VAPID key + push subscribe |
| `/api/graphql` | 1 | `backend/src/routes/graphql.ts` | GraphQL entrypoint |
| `/api/jobs` | 1 | `backend/src/routes/jobs.ts` | Matching endpoint |
| `/api/bulk` | 1 | `backend/src/routes/bulk.ts` | Bulk import path |

### 4.1 Admin route internals (`admin.ts`)

Key architecture traits:

1. Global guard on router: `authenticateToken` + `requirePermission('admin:read')`.
2. Per-endpoint permission tightening (`announcements:write`, `analytics:read`, `security:read`, etc).
3. Sensitive mutations layer `requireAdminStepUp`.
4. Mutation replay protection via `idempotency()`.
5. Optional dual-approval workflow for high-risk actions.
6. Audit logging and cache invalidation integrated in mutation flows.

Functional clusters:

| Cluster | Representative endpoints | Primary dependencies |
| --- | --- | --- |
| Dashboard and analytics | `/dashboard`, `/stats`, `/slo`, `/active-users`, `/reports` | `analytics`, `activeUsers`, rollups |
| Global admin search and saved views | `/search`, `/views` CRUD | `announcements`, `link_records`, `media_assets` |
| Draft/autosave/revision | `/announcements/draft`, `/:id/autosave`, `/:id/revisions` | `AnnouncementModelMongo`, version snapshots |
| Link/media/template/homepage ops | `/links*`, `/media*`, `/templates*`, `/homepage/sections` | dedicated collections + idempotency |
| Security/session ops | `/security`, `/security/logs`, `/sessions*` | `SecurityLogger`, `adminSessions` |
| Approval and workflow | `/approvals*`, `/workflow/overview`, `/review/preview` | `adminApprovals`, policy engine |
| Content CRUD/bulk actions | `/announcements*`, bulk preview/approve/reject/revert | `AnnouncementModelMongo`, step-up, dual approval |
| Role/settings governance | `/users`, `/users/:id/role`, `/settings/:key` | `users`, `admin_settings` |

## 5) Data Model and Indexing

Index topology from `createIndexes()` in `services/cosmosdb.ts`:

1. 21 collections with indexes.
2. 56 index definitions.

Top indexed collections:

| Collection | Index count | Why |
| --- | ---: | --- |
| `announcements` | 11 | High-volume listing/search/sort workloads |
| `subscriptions` | 6 | Verification and digest dispatch |
| `admin_accounts` | 4 | Admin identity and governance |
| `saved_searches` | 3 | Alert scheduler scans |
| `analytics_events` | 3 | Event rollups and time-window queries |
| `admin_audit_logs` | 3 | Admin timeline queries |
| `admin_approval_requests` | 3 | Approval queue + expiry |
| `tracked_applications` | 3 | Tracker UI and reminders |
| `error_reports` | 3 | Support triage |

### 5.1 Core entity lifecycle highlights

`announcements` model:

1. Canonical content type union: job/result/admit-card/syllabus/answer-key/admission.
2. Status lifecycle: draft -> pending/scheduled/published -> archived.
3. Live query logic includes scheduled posts whose `publishAt <= now`.
4. Version snapshots kept for rollback/revision timeline.

`admin_approval_requests`:

1. Stores hashed action fingerprint (`requestHash`) for execution integrity.
2. Status machine: pending/approved/rejected/executed/expired.

`security_logs`:

1. In-memory + optional persisted mode.
2. Background retention cleanup.

## 6) Security Control Plane

### 6.1 Auth and role model

Backend role model (`services/adminPermissions.ts` + `services/rbac.ts`):

1. Admin portal roles: `admin`, `editor`, `contributor`, `reviewer`, `viewer`.
2. Permission checks centralized via `hasPermission`.

Token/cookie model:

1. User cookie: `auth_token`.
2. Admin cookie: `admin_auth_token` (configurable).
3. Token blacklist in Redis/memory for logout revocation.
4. Admin sessions tracked separately with idle/absolute timeout rules.

### 6.2 CSRF model (`middleware/csrf.ts`)

CSRF enforced only when all are true:

1. Mutating method (POST/PUT/PATCH/DELETE).
2. Request is not exempt path.
3. Request is cookie-auth based (no Bearer token).
4. Protected auth cookie exists.

Validation:

1. `csrf_token` cookie must equal header (`X-CSRF-Token` or `X-XSRF-Token`).

### 6.3 Idempotency model (`middleware/idempotency.ts`)

For endpoints wrapped with `idempotency()`:

1. Keyed by `Idempotency-Key` + userId.
2. `pending` lock prevents duplicate in-flight execution.
3. Completed response cached and replayed for retries.
4. Returns HTTP 409 with `Retry-After` while in-progress.

### 6.4 Step-up model

1. Step-up token issued by `/api/auth/admin/step-up`.
2. Token includes `stepUp=true`, short TTL, and Redis grant record.
3. Sensitive endpoints require `X-Admin-Step-Up-Token`.
4. Validation checks token integrity, subject match, and Redis grant.

### 6.5 Dual approval model

1. Policy engine evaluates action risk and threshold.
2. If approval required and missing, endpoint returns `202` with queued approval.
3. Execution requires matching `X-Admin-Approval-Id` and fingerprint hash.
4. Post-execution marks approval as `executed`.

## 7) API Contract Parity and Hygiene

OpenAPI snapshot (`openapi.json`):

1. `pathCount = 135`.
2. `operationCount = 157`.
3. Tag distribution includes `untagged = 32` operations.

Parity command (`backend/npm run verify:openapi-parity`) result:

1. Contract mismatch detected.
2. Implemented but undocumented: `POST /api/admin/announcements/{id}/revert/{version}`.

Route hygiene finding:

There are exact duplicate route definitions in `backend/src/routes/admin.ts`:

1. `GET /api/admin/users`.
2. `PATCH /api/admin/users/:id/role`.
3. `GET /api/admin/settings/:key`.
4. `PUT /api/admin/settings/:key`.

These exist in two separate blocks in the same file. In Express, earlier handlers win unless they call `next()`, so downstream duplicates are operationally risky and confusing.

## 8) Async, Scheduled, and Realtime Flows

| Component | Trigger | Default interval | Side effects |
| --- | --- | --- | --- |
| Analytics rollups (`analytics.ts`) | startup + timer | 15 min | Aggregates event rows into `analytics_rollups` |
| Admin approvals cleanup (`adminApprovals.ts`) | startup + timer | config default 60 min | Expires overdue approvals and purges old terminal records |
| Digest scheduler (`digestScheduler.ts`) | startup + timer | 15 min | Sends daily/weekly digest emails and marks sent fields |
| Saved search alerts (`savedSearchAlerts.ts`) | startup + timer | 30 min | Creates in-app notifications and digest-style emails |
| Tracker reminders (`trackerReminders.ts`) | startup + timer | 30 min | Dedupe reserve + in-app reminders + email reminders |
| Automation jobs (`automationJobs.ts`) | 1-min delayed startup + timer | 60 min | Link health checks, auto-publish scheduled, auto-archive old |
| Security log cleanup (`securityLogger.ts`) | timer | config default 60 min | In-memory and DB retention cleanup |
| Analytics WebSocket (`analyticsStream.ts`) | connection loop | 30 sec push | Live analytics overview updates on `/ws/analytics` |

## 9) Frontend Integration Map

### 9.1 Public frontend (`frontend/`)

Routing and auth:

1. `AppRouter.tsx` wires public content routes and legacy admin routes.
2. `/admin/*` and `/admin-legacy/*` render legacy `AdminPage.tsx`.
3. `ProtectedRoute` requires authenticated user and admin-portal role for admin paths.
4. `AdminDesktopOnlyGate` enforces minimum width 1120px for legacy admin UI.

API client behavior (`utils/api.ts`):

1. Base fallback: configured `VITE_API_BASE` then `/api`.
2. CSRF bootstrap via `/auth/csrf` and automatic retry on `csrf_invalid`.
3. Sends Bearer token from local storage when present.
4. Reports repeated API failures via `reportClientError`.

### 9.2 Admin vNext (`admin-frontend/`)

Shell and auth:

1. `main.tsx` computes router basename and runs legacy SW cleanup.
2. `AppRoutes.tsx` lazy-loads module routes and supports module gating via `VITE_ADMIN_VNEXT_MODULES`.
3. `AdminAuthProvider.tsx` is cookie-session based; no local token storage.
4. Step-up grant stored client-side in memory and attached to sensitive admin calls.

API client behavior (`admin-frontend/src/lib/api/client.ts`):

1. Uses `/api/admin-auth/*` for auth namespace.
2. Uses `/api/admin/*` and related API endpoints for operations.
3. Mutation helpers auto-attach `Idempotency-Key`.
4. CSRF token added for non-GET operations.

### 9.3 Cross-frontend auth contract mismatch

Role mismatch risk:

1. Backend treats `contributor` as admin-portal role.
2. Legacy public frontend role union excludes `contributor`.
3. Admin vNext `RequireAdminAuth` also excludes `contributor` in its explicit allow list.

Operational result: backend can authenticate a contributor, but frontend gate can reject access.

## 10) Deployment and Governance Guardrails

### 10.1 CI gates (`.github/workflows/ci.yml`)

Build/test pipeline includes:

1. Backend lint/build/test/openapi-parity.
2. Frontend lint/build/bundle-budget + Playwright smoke.
3. Frontend API integration against real backend service.
4. Admin frontend lint/UI guard/build + Playwright smoke + admin API integration.

### 10.2 Security workflow (`.github/workflows/security.yml`)

1. `npm audit --omit=dev --audit-level=high` across all apps.
2. Scheduled analytics health probe.
3. CodeQL analysis.

### 10.3 Deploy workflow (`.github/workflows/deploy.yml`)

1. SSH deploy to DigitalOcean host.
2. Runs guarded production script.
3. Optional Cloudflare full cache purge.
4. Post-deploy health checks for `/api/health`, `/`, `/admin`.

### 10.4 Local guard scripts

1. `scripts/verify-config-consistency.mjs` enforces env/port/proxy consistency.
2. `scripts/admin-ui-guard.mjs` enforces admin UI safety conventions.

## 11) Design-Level Scenario Validation

Validated against repository state:

1. Route inventory completeness: extracted all `router.<method>` entries in `backend/src/routes`.
2. OpenAPI coverage: validated with backend parity script.
3. Public read flow trace:
   - `/api/announcements/v3/cards` uses cache middleware + analytics hooks.
4. Admin auth flow trace:
   - `/api/admin-auth/login` delegates to hardened auth route.
   - Permissions from `/api/admin-auth/permissions`.
   - Step-up from `/api/admin-auth/step-up`.
5. Admin mutation safety flow trace:
   - CSRF + idempotency + step-up + optional dual approval.
6. Health/metrics flow trace:
   - `/api/health`, `/api/health/deep`, `/metrics`.
7. Ingress mapping trace:
   - `/api` -> backend.
   - `/admin-vnext` -> admin frontend.
   - `/admin` and `/admin-legacy` -> legacy frontend admin.

## 12) Change-Impact Quick Reference

### 12.1 Add a new backend endpoint

| Step | Primary files | Also verify |
| --- | --- | --- |
| Define handler | `backend/src/routes/<domain>.ts` | Permission, CSRF scope, rate limit implications |
| Wire router (if new domain) | `backend/src/server.ts` | Middleware order and prefix rules |
| Data access | `backend/src/models/*` and `backend/src/services/*` | Index impact in `services/cosmosdb.ts` |
| Contract | `openapi.json` | `backend/npm run verify:openapi-parity` |
| Client integration | `frontend/src/utils/api.ts` or `admin-frontend/src/lib/api/client.ts` | Feature flag/gate and UI error handling |
| Tests | backend vitest + relevant Playwright suites | CI parity with existing jobs |

### 12.2 Add a new admin vNext module

| Step | Primary files | Also verify |
| --- | --- | --- |
| Module implementation | `admin-frontend/src/modules/<module>/...` | Query/mutation patterns and step-up handling |
| Route registration | `admin-frontend/src/routes/AppRoutes.tsx` | Auth gate and lazy-load fallback |
| Navigation wiring | `admin-frontend/src/config/adminModules.ts` | Group placement and feature gating |
| API client methods | `admin-frontend/src/lib/api/client.ts` | Idempotency headers for writes |
| CI guard | `scripts/admin-ui-guard.mjs` dependent patterns | `npm run guard:ui` and Playwright |

### 12.3 Change auth/security policy

| Change type | Primary files | High-risk coupling |
| --- | --- | --- |
| Role/permission policy | `backend/src/services/adminPermissions.ts`, `backend/src/services/rbac.ts` | Frontend role unions and route guards |
| JWT/session behavior | `backend/src/routes/auth.ts`, `backend/src/middleware/auth.ts`, `backend/src/services/adminSessions.ts` | Admin-auth namespace delegation and session termination endpoints |
| CSRF semantics | `backend/src/middleware/csrf.ts` + frontend API clients | Cookie-auth mutation flows |
| Step-up semantics | `backend/src/services/adminStepUp.ts`, `backend/src/middleware/auth.ts` | Admin clients that attach step-up headers |
| Dual approval policy | `backend/src/services/adminApprovalPolicy.ts`, `backend/src/routes/admin.ts` | Approval queues and execution fingerprint match |

## 13) Key Risks (Current State)

1. Duplicate admin routes in `admin.ts` for users/settings endpoints increase maintenance and behavior ambiguity.
2. OpenAPI parity has one concrete drift (`revert` endpoint undocumented).
3. Role contract mismatch around `contributor` between backend and frontend gates can cause auth/access inconsistencies.
4. `admin.ts` is a large multi-domain monolith (nearly 4k lines), increasing merge conflict and regression risk for admin changes.

## 14) Assumptions and Defaults Applied

1. Output optimized for engineers implementing features safely.
2. Backend-first sequencing with frontend and ops integration follow-through.
3. High-depth analysis level.
4. No behavior-changing edits were performed.
