# SarkariExams.me

SarkariExams.me is a government jobs and exam updates platform with a public site, admin console, backend API, and Docker-based production deployment.

## Stack

- `frontend/`: Next.js 16 public website
- `admin-next/`: Next.js admin console
- `backend/`: Express 5 + TypeScript API
- `nginx/`: reverse proxy and edge config

Core platform areas:

- Jobs, results, admit cards, answer keys, syllabus, and admissions
- Admin tools for content, SEO, analytics, subscribers, notifications, and moderation
- MongoDB in local development and Azure Cosmos DB (MongoDB API) in production
- JWT auth, CSRF, rate limiting, caching, and OpenAPI documentation

## Requirements

- Node.js `22.x`
- npm `10+`
- MongoDB for local backend development

## Local Development

### Backend

```bash
cd backend
npm install
npm run dev:db:start -- --seed
npm run dev
```

Runs on `http://localhost:5000`.

If you only need the local Mongo-compatible database for migration rehearsal or backend work:

```bash
cd backend
npm run dev:db:start -- --seed
npm run dev:db:status
npm run dev:db:stop
```

This uses an in-memory development Mongo server and seeds sample legacy `announcements`. It is for local development only.

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

Start from the root example file:

```bash
cp .env.example .env
```

Important variables you will typically need:

- `COSMOS_CONNECTION_STRING`
- `COSMOS_DATABASE_NAME`
- `JWT_SECRET`
- `CORS_ORIGINS`
- `FRONTEND_URL`
- `SENDGRID_API_KEY`
- `SENTRY_DSN`

App-specific local variables:

- `backend`: backend API and database settings
- `frontend`: `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api`
- `admin-next`: `NEXT_PUBLIC_API_URL=http://localhost:5000/api`

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

## CI and Release Flow

Main branch pushes trigger:

- `CI`
- `Security`
- `Build and Publish Production Images`
- `Deploy to Production`

Production uses prebuilt Docker images from DigitalOcean Container Registry. The server pulls images and restarts containers; it does not rebuild the app on the droplet during release.

## Deployment

### Normal release

```bash
git push origin main
```

This is the default release path.

### Manual fallback from your machine

PowerShell:

```powershell
.\scripts\deploy-prod-remote.ps1
```

Bash:

```bash
bash scripts/deploy-prod-remote.sh
```

### Server-side entrypoint

```bash
bash ~/sarkari-result/scripts/deploy-live.sh
```

If that path does not exist on the droplet, the fallback repo path used by the workflows is:

```bash
bash ~/sarkariexam.me/scripts/deploy-live.sh
```

Detailed deploy notes live in [scripts/FAST_DEPLOY_README.md](./scripts/FAST_DEPLOY_README.md).

## Production Secrets

GitHub Actions secrets:

- `DOCR_REGISTRY_NAME`
- `DOCR_TOKEN`
- `DO_HOST`
- `DO_USER`
- `DO_SSH_KEY`
- optional `DO_PORT`

Server `.env` values for production typically include:

- `DOCR_REGISTRY_NAME`
- `DOCR_ACCESS_TOKEN`
- optional `DOCR_USERNAME`
- application secrets such as `COSMOS_CONNECTION_STRING` and `JWT_SECRET`

## Repository Layout

```text
backend/         Express API
frontend/        Next.js public frontend
admin-next/      Next.js admin console
nginx/           reverse proxy config
scripts/         deployment and maintenance scripts
docs/            project and ops documentation
.github/         CI, security, and deploy workflows
```

## Security

- Never commit real secrets.
- Keep production credentials only in GitHub secrets and server-side `.env` files.
- Rotate any exposed token or key immediately.

## License

MIT
