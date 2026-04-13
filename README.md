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
- Docker-based production deployment through prebuilt registry images

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
DOCR_REGISTRY_NAME=...
DOCR_ACCESS_TOKEN=...
DOCR_USERNAME=
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

GitHub Actions currently cover:
- backend lint, build, and tests
- public frontend lint and build
- npm audit for backend and frontend
- CodeQL analysis
- production image build and publish to DigitalOcean Container Registry
- production deploy over SSH after image publication succeeds

Workflow files live in [`.github/workflows`](./.github/workflows).

## Deployment

### Normal release path

```bash
git push origin main
```

`main` pushes trigger the production release pipeline:
- `Build and Publish Production Images`
- `Deploy to Production`

The build workflow runs CI and security checks, publishes immutable Docker images tagged with the commit SHA plus a stable `main` tag, and the deploy workflow SSHes into the droplet and restarts Docker with those prebuilt images.

### Manual fallback deploy

PowerShell:
```powershell
.\scripts\deploy-prod-remote.ps1
```

Bash:

```bash
bash scripts/deploy-prod-remote.sh
```

Both wrappers SSH into the droplet and invoke the same remote entrypoint (for example, `~/your-repo/scripts/deploy-live.sh`). Manual deploys default to `DEPLOY_MODE=fast` and use the current `main` checkout SHA, with `main` as the fallback image tag.

### Server-side deploy entrypoint

```bash
bash ~/your-repo/scripts/deploy-live.sh
```

`deploy-live.sh` is the canonical server-side deploy command. It resolves the active server checkout, syncs `main`, acquires a deploy lock, exports `COMPOSE_PROJECT_NAME=sarkari-result`, resolves the target image tag from the checked-out commit SHA, and then calls `scripts/deploy-fast.sh` by default or `scripts/deploy-prod.sh` when `DEPLOY_MODE=full`.

### Pull-only Docker deploy engines

Fast mode (default) pulls production images from DigitalOcean Container Registry and performs compact checks for backend health, key public pages, and admin availability:

```bash
cd ~/your-repo
COMPOSE_PROJECT_NAME=sarkari-result bash scripts/deploy-fast.sh
```

Full mode uses the same pull-only image path, then performs expanded public route and asset verification:

```bash
cd ~/your-repo
COMPOSE_PROJECT_NAME=sarkari-result bash scripts/deploy-prod.sh
```

Both scripts use [`docker-compose.production.yml`](./docker-compose.production.yml) and `docker compose up --no-build`, so the droplet no longer rebuilds application images during release.

### Required secrets and server env

GitHub Actions secrets:
- `DOCR_REGISTRY_NAME`
- `DOCR_TOKEN`
- `DO_HOST`
- `DO_USER`
- `DO_SSH_KEY`
- optional `DO_PORT`

Server root `.env`:
- `DOCR_REGISTRY_NAME`
- `DOCR_ACCESS_TOKEN`
- optional `DOCR_USERNAME`
- existing production app secrets such as `COSMOS_CONNECTION_STRING` and `JWT_SECRET`

### Security note

- Never commit real secret values to git.
- Keep production secrets only in secure stores and server-side `.env` files.
- If a token or key is ever exposed, rotate it immediately.

### Runtime model

Production runtime is Docker + Nginx only. Use the deploy scripts above for releases and avoid PM2-specific frontend startup paths.

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
