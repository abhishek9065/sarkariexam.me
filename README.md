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

Production Docker deploys use the repository root `.env` on the server.
Start from the root example file when preparing production:

```bash
cp .env.example .env
```

Root `.env` is the production source of truth for:
- `scripts/deploy-common.sh`
- `scripts/deploy-fast.sh`
- `scripts/deploy-prod.sh`
- `docker-compose.yml`

Important production variables:

- `COSMOS_CONNECTION_STRING`
- `COSMOS_DATABASE_NAME`
- `JWT_SECRET`
- `FRONTEND_URL`
- `CORS_ORIGINS`
- `FRONTEND_REVALIDATE_URL`
- `FRONTEND_REVALIDATE_TOKEN`
- `METRICS_TOKEN`

Recommended production variables:

- `SENDGRID_API_KEY`
- `SENTRY_DSN`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_ADMIN_URL`
- `CONTENT_CACHE_REVALIDATE_SECONDS`

Local app development uses app-specific env files instead of the server root `.env`:

- `backend`: `backend/.env`
- `frontend`: `frontend/.env.local`
- `frontend` local API base: `NEXT_PUBLIC_API_URL=http://localhost:5000`
- `admin-next`: `admin-next/.env.local` when needed
- `admin-next` local API base: `NEXT_PUBLIC_API_URL=http://localhost:5000/api`

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
- `Production Release Validation`
- `Deploy to Production`

Production deploys are GitHub Actions driven. After CI and security pass, the deploy workflow SSHes into the droplet, pulls `main`, rebuilds the Docker services from the checked-out repo, and restarts the stack.

## Deployment

GitHub Actions is the only supported production deploy path.
Push to `main` to trigger CI, release validation, and production deploy:

```bash
git push origin main
```

The server-side deploy scripts remain in the repo because GitHub Actions calls them over SSH on the droplet. They are internal deployment plumbing, not the supported developer release path.

Detailed deploy notes live in [scripts/FAST_DEPLOY_README.md](./scripts/FAST_DEPLOY_README.md).

## Production Secrets

GitHub Actions secrets:

- `DO_HOST`
- `DO_USER`
- `DO_SSH_KEY`
- optional `DO_PORT`

Server `.env` values for production typically include:

- application secrets such as `COSMOS_CONNECTION_STRING` and `JWT_SECRET`
- revalidation settings such as `FRONTEND_REVALIDATE_URL` and `FRONTEND_REVALIDATE_TOKEN`

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
