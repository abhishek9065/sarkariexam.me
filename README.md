# SarkariExams.me

Government jobs and exam updates platform built with:
- Frontend: React 19 + TypeScript + Vite
- Backend: Express 5 + TypeScript + MongoDB/Cosmos DB

## Highlights
- Latest jobs, results, admit cards, answer keys, syllabus, admissions
- Fast homepage + mobile tab UX
- Admin workflow with approvals and audit-friendly controls
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

## Environment Variables

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
VITE_API_BASE=http://localhost:5000
```

## Quality Gates

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

## Repository Layout
```text
docs/                      Deployment and governance docs
backend/                   Express API
backend/src/tests/         Vitest suites
frontend/                  React app
frontend/tests/            Playwright suites
.github/workflows/         CI, security, e2e workflows
```

## Deployment Docs
- `docs/CLOUDFLARE_SETUP.md`
- `docs/DIGITALOCEAN_DEPLOY.md`
- `docs/GITHUB_GOVERNANCE_CHECKLIST.md`

## Notes
- Mainline branch is `main`.
- Contributor identities are normalized via `.mailmap`.

## License
MIT
