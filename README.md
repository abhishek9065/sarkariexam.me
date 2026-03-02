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

## Security Doc Guardrails
- This public README uses placeholder values and avoids publishing secrets.
- Keep full privileged API inventories and sensitive operational details in internal runbooks.
- Rotate all production secrets if they were ever pasted into docs, issues, or terminal history.
- Keep production secrets in a secret manager; do not store plaintext secrets in tickets/chat logs.

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
ADMIN_EMAIL_ALLOWLIST=ops-team@example.com
# or
ADMIN_DOMAIN_ALLOWLIST=example.com
ADMIN_BACKUP_CODE_SALT=...
```
`ADMIN_SETUP_KEY`, `TOTP_ENCRYPTION_KEY`, and one of `ADMIN_EMAIL_ALLOWLIST`/`ADMIN_DOMAIN_ALLOWLIST` are required in production.
`ADMIN_BACKUP_CODE_SALT` is strongly recommended in production and should be unique (do not reuse any other secret).
Restrict `.env` permissions on servers (for example: `chmod 600 .env`).

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
CORS_ORIGINS=http://localhost:4173,http://localhost:3000,https://your-domain.example,https://www.your-domain.example

# Rate limits
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=200
AUTH_RATE_LIMIT_MAX=20

# Admin hardening
ADMIN_SETUP_KEY=change-this-strong-key
ADMIN_REQUIRE_2FA=true
ADMIN_EMAIL_ALLOWLIST=ops-team@example.com
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
- Admin auth namespace and compatibility aliases are maintained (details in internal runbook).
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

## Admin API Surface
- Full admin endpoint inventory is intentionally omitted from this public README.
- Contract source of truth: `openapi.json` and authorized environment docs.
- Operational references: `docs/ADMIN_CUTOVER_RUNBOOK.md` and `docs/GITHUB_GOVERNANCE_CHECKLIST.md`.

### Route Verification
After deploy, verify edge routing headers:
```bash
PUBLIC_BASE_URL="https://your-domain.example"
curl -I "$PUBLIC_BASE_URL/admin/" | grep -i x-sarkari-app
curl -I "$PUBLIC_BASE_URL/admin-vnext/" | grep -i x-sarkari-app
curl -I "$PUBLIC_BASE_URL/admin-legacy/" | grep -i x-sarkari-app
```

## Admin Stabilization Policy
- `/admin` is the primary robust admin URL (legacy surface).
- `/admin-vnext` remains preview until parity + ops signoff.
- `/admin-legacy` remains available as explicit rollback alias.
- Desktop-only policy remains fixed at `1120px` for legacy admin entrypoints (`/admin`, `/admin-legacy`).
- vNext (`/admin-vnext`) remains responsive.

## Admin Rollback Procedure
For emergency rollback procedures, follow `docs/ADMIN_CUTOVER_RUNBOOK.md`.
Keep edge proxy mapping details and rollback internals in controlled operational docs only.

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
cd ~/your-repo
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
