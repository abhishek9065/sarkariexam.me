# SarkariExams.me

Government jobs and exam updates platform built with:
- Frontend: React 19 + TypeScript + Vite
- Backend: Express 5 + TypeScript + MongoDB/Cosmos DB
- Admin:
  - Premium vNext admin (desktop-only) on `/admin`
  - Preview alias on `/admin-vnext`
  - Legacy rollback on `/admin-legacy`

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

Admin frontend runs on `http://localhost:4174/admin`.

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
# Local router basename (dev default is /admin)
VITE_ADMIN_BASENAME=/admin
# Optional phased rollout gate for vNext modules
# Example: dashboard,announcements,review,approvals
VITE_ADMIN_VNEXT_MODULES=
# Test-only: bypass step-up interaction in mocked Playwright flows
VITE_ADMIN_E2E_STEPUP_BYPASS=false
```
If `/api` is proxied on the same host as `/admin`, you can also leave `VITE_API_BASE` unset.
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

## Admin Routing
- `/admin` and `/admin/*`: `admin-frontend` (premium vNext) default route
- `/admin-vnext` and `/admin-vnext/*`: temporary vNext alias route
- `/admin-legacy` and `/admin-legacy/*`: legacy admin rollback route
- Admin routes are desktop-only (minimum viewport width: `1120px`)
- `/api/admin-auth/*`: additive admin-auth namespace backed by shared auth logic
- Existing `/api/admin/*` and `/api/auth/admin/*` remain backward-compatible

## Admin Stabilization Policy
- `/admin` stays the only primary admin URL.
- Keep `/admin-vnext` as transition alias for 30 days after production cutover.
- Keep `/admin-legacy` rollback path for at least 90 days after production cutover.
- Desktop-only policy for all admin entrypoints remains fixed at `1120px`.

## Admin Rollback Procedure
If a production rollback is required, switch `/admin` back to legacy frontend routing and redeploy:

```bash
# 1) Edit nginx mapping:
#    in nginx/default.conf change /admin and /admin/* proxy target from:
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
- `/admin-legacy` still serves legacy admin.
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

## Notes
- Mainline branch is `main`.
- Contributor identities are normalized via `.mailmap`.

## License
MIT
