# SarkariExams.me

Government jobs and exam updates platform built with:
- Frontend: React 19 + TypeScript + Vite
- Backend: Express 5 + TypeScript + MongoDB/Cosmos DB
- Admin:
  - Robust legacy admin (desktop-only) on `/admin` (default)
  - Premium vNext preview on `/admin-vnext` (responsive)
  - Legacy rollback alias on `/admin-legacy`

## Highlights
- Latest jobs, results, admit cards, answer keys, syllabus, admissions
- Fast homepage + mobile tab UX
- Admin workflow with approvals, audit-friendly controls, and dedicated admin auth namespace
- PWA support
- E2E and backend contract test coverage
- Security workflows: `npm audit` + CodeQL

## Requirements
- Node.js 22+
- npm 10+
- MongoDB 6+ (or Azure Cosmos DB Mongo API)

## Local Setup

### 1) Backend
```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:5000`.

### 2) Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:4173`.

### 3) Admin Frontend (vNext)
```bash
cd admin-frontend
npm install
npm run dev
```

Admin frontend runs on `http://localhost:4174/admin-vnext`.

## Environment Variables

### Production Docker Compose (`./.env` at repo root)
```env
COSMOS_CONNECTION_STRING=...
JWT_SECRET=...
ADMIN_SETUP_KEY=...
TOTP_ENCRYPTION_KEY=...
ADMIN_EMAIL_ALLOWLIST=admin@example.com
# or
ADMIN_DOMAIN_ALLOWLIST=example.com
```
`ADMIN_SETUP_KEY`, `TOTP_ENCRYPTION_KEY`, and one of `ADMIN_EMAIL_ALLOWLIST`/`ADMIN_DOMAIN_ALLOWLIST` are required in production.
`ADMIN_BACKUP_CODE_SALT` is optional (if omitted, backend safely falls back to `JWT_SECRET`).

### Backend (`backend/.env`)
```env
COSMOS_CONNECTION_STRING=mongodb://localhost:27017/sarkari_db
COSMOS_DATABASE_NAME=sarkari_db
JWT_SECRET=change-me
PORT=5000

# Optional integrations
SENDGRID_API_KEY=
TELEGRAM_BOT_TOKEN=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# CORS
CORS_ORIGINS=http://localhost:4173,http://localhost:3000,https://sarkariexams.me,https://www.sarkariexams.me

# Rate limits
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=200
AUTH_RATE_LIMIT_MAX=20

# Admin hardening
ADMIN_SETUP_KEY=change-this-strong-key
ADMIN_REQUIRE_2FA=true
ADMIN_EMAIL_ALLOWLIST=admin@example.com
ADMIN_DOMAIN_ALLOWLIST=example.com
ADMIN_ENFORCE_HTTPS=true
TOTP_ENCRYPTION_KEY=change-this-strong-encryption-key
ADMIN_BACKUP_CODE_SALT=change-this-backup-salt
```

### Frontend (`frontend/.env`)
```env
# Optional: use direct API origin (without nginx)
VITE_API_BASE=

# Vite proxy target for /api and /ws in local dev
# Local backend mode (default): http://localhost:5000
# Docker+nginx mode: http://localhost
VITE_PROXY_TARGET=http://localhost:5000
```
If you run with reverse proxy and `/api` on the same host, leave `VITE_API_BASE` unset.

### Admin Frontend (`admin-frontend/.env`)
```env
VITE_API_BASE=http://localhost:5000
# Local router basename (dev default is /admin-vnext)
VITE_ADMIN_BASENAME=/admin-vnext
# Optional phased rollout gate for vNext modules
# Example: dashboard,announcements,review,approvals
VITE_ADMIN_VNEXT_MODULES=
# Test-only: bypass step-up interaction in mocked Playwright flows
VITE_ADMIN_E2E_STEPUP_BYPASS=false
```
If `/api` is proxied on the same host as `/admin-vnext`, you can also leave `VITE_API_BASE` unset.
If `VITE_ADMIN_VNEXT_MODULES` is empty or unset, all admin vNext modules are enabled.

## Quality Gates

```bash
node scripts/verify-config-consistency.mjs
```

### Backend
```bash
cd backend
npm run lint
npm run test:ci
npm audit --omit=dev --audit-level=high
```

### Frontend
```bash
cd frontend
npm run lint
npm run build
npm run test:e2e:ci
npm audit --omit=dev --audit-level=high
```

### Admin Frontend
```bash
cd admin-frontend
npm run lint
npm run guard:ui
npm run build
npm run test:e2e:ci
npm audit --omit=dev --audit-level=high
```

### Admin Real-Backend Integration (CI Gate)
```bash
cd admin-frontend
VITE_PROXY_TARGET=http://127.0.0.1:5000 npm run test:e2e:integration
```

## Admin Routing
- `/admin` and `/admin/*`: robust legacy admin route (default)
- `/admin-vnext` and `/admin-vnext/*`: premium vNext preview route
- `/admin-legacy` and `/admin-legacy/*`: explicit legacy rollback alias
- Legacy admin routes (`/admin`, `/admin-legacy`) are desktop-only (minimum viewport width: `1120px`)
- Admin vNext (`/admin-vnext`) is responsive
- `/api/admin-auth/*`: additive admin-auth namespace backed by shared auth logic
- Existing `/api/admin/*` and `/api/auth/admin/*` remain backward-compatible
- Cutover back to vNext on `/admin` is deferred until full parity is proven.

## Admin vNext Operational Modules (`/admin-vnext`)
Grouped IA (8 top-level):
- Dashboard
- Posts
- Review
- Homepage
- Assets
- Team
- Logs
- Settings

Key module coverage:
- `Posts`: All Posts, New Post, Quick Add, Detailed Post, Job, Result, Admit Card, Answer Key, Syllabus, Admission
- `Review`: Review Queue, Approvals, Queue, Bulk Import
- `Homepage`: Homepage Sections
- `Assets`: Links, Media/PDFs, Templates, SEO Tools
- `Team`: Users & Roles
- `Logs`: Alerts, Security, Sessions, Audit, Reports, Community Moderation, Error Reports

Premium operator features shipped in vNext:
- Server-driven post table pagination + saved views
- Bulk actions lane (review/publish/expire/pin)
- Global admin search (`/` hotkey)
- Detailed editor autosave (~10s cadence) + revision timeline

## New Additive Admin APIs
- `GET /api/admin/search`
- `GET/POST /api/admin/views`
- `PATCH/DELETE /api/admin/views/{id}`
- `POST /api/admin/announcements/draft`
- `PATCH /api/admin/announcements/{id}/autosave`
- `GET /api/admin/announcements/{id}/revisions`
- `GET /api/admin/links/health/summary`
- `GET/PUT /api/admin/homepage/sections`
- `GET/POST/PATCH /api/admin/links`
- `POST /api/admin/links/check`
- `POST /api/admin/links/replace`
- `GET/POST/PATCH /api/admin/media`
- `GET/POST/PATCH /api/admin/templates`
- `GET/POST/PATCH /api/admin/alerts`
- `GET/PUT /api/admin/settings/{key}` where `{key}` in `states|boards|tags`
- `GET /api/admin/users`
- `PATCH /api/admin/users/{id}/role`
- `GET /api/admin/reports`
- `PATCH /api/admin/announcements/{id}/seo`

### Route Verification
After deploy, verify edge routing headers:
```bash
curl -I https://sarkariexams.me/admin/ | grep -i x-sarkari-app
curl -I https://sarkariexams.me/admin-vnext/ | grep -i x-sarkari-app
curl -I https://sarkariexams.me/admin-legacy/ | grep -i x-sarkari-app
```

## Admin Stabilization Policy
- `/admin` is the primary robust admin URL (legacy surface).
- `/admin-vnext` remains preview until parity + ops signoff.
- `/admin-legacy` remains available as explicit rollback alias.
- Desktop-only policy remains fixed at `1120px` for legacy admin entrypoints (`/admin`, `/admin-legacy`).
- vNext (`/admin-vnext`) remains responsive.

## Admin Rollback Procedure
If vNext preview routing needs emergency fallback, map `/admin-vnext` to legacy frontend and redeploy:

```bash
# 1) Edit nginx mapping:
#    in nginx/default.conf change /admin-vnext and /admin-vnext/* proxy target from:
#    proxy_pass http://admin_frontend/;
#    to:
#    proxy_pass http://frontend/;

# 2) Deploy updated routing and services
cd ~/sarkari-result
git pull --ff-only origin main
docker compose up -d --build nginx backend frontend admin-frontend
```

Then verify:
- `/admin` serves legacy admin.
- `/admin-vnext` falls back to legacy admin.
- `/admin-legacy` serves legacy admin.
- `/api/health` is healthy.

## Migration
- Backfill admin identity records:
```bash
cd backend
npm run migrate:admin-accounts
```

## Repository Layout
```text
docs/                      Deployment and governance docs
backend/                   Express API
backend/src/tests/         Vitest suites
frontend/                  React app
frontend/tests/            Playwright suites
admin-frontend/            Admin vNext app
admin-frontend/tests/      Admin Playwright smoke suite
.github/workflows/         CI, security, e2e workflows
```

## Deployment Docs
- `docs/CLOUDFLARE_SETUP.md`
- `docs/DIGITALOCEAN_DEPLOY.md`
- `docs/GITHUB_GOVERNANCE_CHECKLIST.md`
- `docs/ADMIN_CUTOVER_RUNBOOK.md`
- `docs/ADMIN_STYLE_AUDIT_CHECKLIST.md`

## Production Deploy (Recommended)
Use the guarded deploy script on server:
```bash
cd ~/sarkari-result
bash scripts/deploy-prod.sh
```
It validates required production env vars before deploy and checks API health after startup.
It also verifies public route health for `/admin`, `/admin-vnext`, and `/admin-legacy`.
It automatically runs `backend` migration `migrate:admin-accounts` and fails deploy if migration fails.

Optional:
- Set `DEPLOY_SKIP_ADMIN_MIGRATION=true` only for emergency rollback deploys.

## Notes
- Mainline branch is `main`.
- Contributor identities are normalized via `.mailmap`.

## License
MIT
