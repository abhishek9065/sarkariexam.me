# SarkariExams.me

Government jobs and exam updates platform.

## Apps
- `backend/`: Express 5 + TypeScript API
- `frontend/`: Next.js 16 public frontend
- `admin-next/`: Next.js admin console
- `nginx/`: reverse proxy and edge config

## Core Features
- Jobs, results, admit cards, answer keys, syllabus, and admissions
- Admin workflows for announcements, analytics, subscribers, notifications, SEO, and moderation
- MongoDB locally and Azure Cosmos DB (MongoDB API) in production
- JWT auth, CSRF, rate limiting, caching, and OpenAPI docs
- Docker-based production deployment and PM2 support for direct VM deploys

## Requirements
- Node.js `22.x`
- npm `10+`
- MongoDB for local backend data

## Local Development

### Backend
```bash
cd backend
npm install
npm run dev
```

Runs on `http://localhost:5000`.

### Public Frontend
```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:3000`.

### Admin Console
```bash
cd admin-next
npm install
npm run dev
```

Runs on `http://localhost:3001`.

## Environment

### Root `.env` for production deploys
```env
COSMOS_CONNECTION_STRING=...
JWT_SECRET=...
METRICS_TOKEN=
```

### Backend
```env
COSMOS_CONNECTION_STRING=mongodb://localhost:27017/sarkari_db
COSMOS_DATABASE_NAME=sarkari_db
JWT_SECRET=change-me
PORT=5000
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=200
AUTH_RATE_LIMIT_MAX=20
```

### Public Frontend
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

### Admin Console
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Verification

### Backend
```bash
cd backend
npm run lint
npm run build
npm run test:ci
```

### Public Frontend
```bash
cd frontend
npm run lint
npm run build
```

### Admin Console
```bash
cd admin-next
npm run lint
npm run build
```

## CI

GitHub Actions currently run:
- backend lint, build, and tests
- public frontend lint and build
- npm audit for backend and frontend
- CodeQL analysis

Workflow files live in [`.github/workflows`](./.github/workflows).

## Deployment

### Canonical production deploy

PowerShell:

```powershell
.\scripts\deploy-prod-remote.ps1
```

Bash:

```bash
bash scripts/deploy-prod-remote.sh
```

Both wrappers SSH into the droplet and invoke the same remote entrypoint, preferring `~/sarkari-result/scripts/deploy-live.sh` and falling back to `~/sarkariexam.me/scripts/deploy-live.sh`.

### Server-side deploy entrypoint

```bash
bash ~/sarkari-result/scripts/deploy-live.sh
```

`deploy-live.sh` is the canonical server-side deploy command. It resolves the active server checkout (`~/sarkari-result` first, then `~/sarkariexam.me`), syncs `main`, acquires a deploy lock, exports `COMPOSE_PROJECT_NAME=sarkari-result`, and then calls `scripts/deploy-prod.sh`.

### Guarded Docker deploy engine

```bash
cd ~/sarkari-result
COMPOSE_PROJECT_NAME=sarkari-result bash scripts/deploy-prod.sh
```

`deploy-prod.sh` is the guarded compose deploy engine for the current checkout only. It validates required production env vars, rebuilds services, checks backend health, and verifies public routes after startup.

### PM2 frontend runtime

For non-Docker VM deployments, use the committed PM2 config:

```bash
cd ~/sarkari-result
npm --prefix frontend run build
pm2 delete frontend || true
pm2 start ecosystem.config.cjs --only frontend
pm2 save
```

This ensures PM2 starts the app from the correct `frontend` working directory.

## Repository Layout

```text
backend/         Express API
frontend/        Next.js public frontend
admin-next/      Next.js admin console
nginx/           reverse proxy config
scripts/         deployment and maintenance scripts
docs/            ops and project documentation
.github/         CI, security, and deploy workflows
```

## License
MIT
