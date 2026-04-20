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
- PostgreSQL for Prisma-backed content, editorial workflow, taxonomies, and SEO-facing data
- MongoDB / Cosmos DB only for legacy compatibility paths that are being phased out
- JWT auth, CSRF, rate limiting, caching, and OpenAPI documentation

## Requirements

- Node.js `22.x`
- npm `10+`
- PostgreSQL for the current backend content layer
- MongoDB only when rehearsing or maintaining legacy compatibility flows

## Local Development

### Backend

```bash
cd backend
npm install
npm run dev:db:start -- --seed
npm run dev
```

Runs on `http://localhost:5000`.

The backend expects PostgreSQL for Prisma-backed content, taxonomy, and editorial data. Make sure `backend/.env` includes `POSTGRES_PRISMA_URL` before starting the server or running the test suite.

If you only need the local Mongo-compatible database for migration rehearsal or backend work:

```bash
cd backend
npm run dev:db:start -- --seed
npm run dev:db:status
npm run dev:db:stop
```

This uses an in-memory development Mongo server and seeds sample legacy `announcements`. It is for local development only.
It does not replace the PostgreSQL database required by the current backend content layer.

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

- `POSTGRES_PRISMA_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `CORS_ORIGINS`
- `FRONTEND_REVALIDATE_URL`
- `FRONTEND_REVALIDATE_TOKEN`
- `METRICS_TOKEN`

Legacy-only production variables:

- `LEGACY_MONGO_REQUIRED` (set `true` only if a release still depends on transitional legacy bridge paths)
- `COSMOS_CONNECTION_STRING` or `MONGODB_URI`
- `COSMOS_DATABASE_NAME`

Recommended production variables:

- `SENDGRID_API_KEY`
- `SENTRY_DSN`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_ADMIN_URL`
- `CONTENT_CACHE_REVALIDATE_SECONDS`

Local app development uses app-specific env files instead of the server root `.env`:

- `backend`: `backend/.env` with `POSTGRES_PRISMA_URL` for Prisma-backed content data
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
- `Deploy to Production`

Manual reliability validation is also available via:

- `Deploy Preflight` (`workflow_dispatch`, no service restart)

Production deploys are GitHub Actions driven. The production deploy gate is the `CI` workflow only.
`Deploy to Production` runs as a `workflow_run` after `CI` succeeds for a `push` to `main`, checks out the exact triggering commit SHA on the runner, SSHes into the droplet, runs a remote preflight, and then deploys that exact SHA.
This is the current production topology, not the long-term target. The platform is being moved toward safer staging and promotion controls while retaining the existing release automation.
Security and CodeQL remain important validation workflows, but they do not currently gate the production deployment chain.
The backend health endpoints also expose non-secret runtime diagnostics for PostgreSQL readiness, legacy Mongo bridge presence, metrics endpoint protection, and frontend revalidation wiring.

## Deployment

GitHub Actions is the only supported production deploy path.
Push to `main` to trigger CI, release validation, and production deploy:

```bash
git push origin main
```

The server-side deploy scripts remain in the repo because GitHub Actions calls them over SSH on the droplet. They are internal deployment plumbing, not alternate developer deployment methods.

Production deploy entrypoint:

- local code change
- `git push origin main`
- GitHub Actions `CI`
- GitHub Actions `Deploy to Production`
- runner-side SSH validation and remote preflight
- droplet-side rebuild from `docker-compose.yml` at the triggering commit SHA
- live health verification

There is no supported manual production deploy trigger in the repository workflows.
Manual preflight checks against configured `staging` or `production` environments are supported via `Deploy Preflight`.

Detailed deploy notes live in [scripts/FAST_DEPLOY_README.md](./scripts/FAST_DEPLOY_README.md).

## Production Secrets

GitHub Actions secrets:

- `DO_HOST`
- `DO_USER`
- `DO_SSH_KEY`
- optional `DO_PORT`

GitHub Actions variables:

- `DO_HOST_FINGERPRINT`
- `DO_REPO_DIR`

Server `.env` values for production typically include:

- application secrets such as `POSTGRES_PRISMA_URL` and `JWT_SECRET`
- revalidation settings such as `FRONTEND_REVALIDATE_URL` and `FRONTEND_REVALIDATE_TOKEN`
- legacy bridge settings such as `COSMOS_CONNECTION_STRING` only if legacy flows still need them

## Production Prerequisites

Before `push to main` can deploy successfully, production must already have:

- a DigitalOcean droplet reachable at `DO_HOST`
- the deploy user from `DO_USER` able to SSH with `DO_SSH_KEY`
- the SSH host fingerprint stored in `DO_HOST_FINGERPRINT`
- the repository checked out on the droplet at `DO_REPO_DIR`
- `bash`, `git`, `docker`, Docker Compose plugin, `flock`, `curl`, `mktemp`, and `tee`
- a root `.env` file on the droplet checkout derived from `.env.example`
- a clean production checkout with no local modifications or untracked files

## Production Verification

After a successful deploy, the expected health checks are:

- `/`
- `/jobs`
- `/admin`
- `/api/livez`
- `/api/readyz`
- `/api/health`
- `/api/health/deep`

If a deploy fails, start with:

- the GitHub Actions run log
- `/tmp/sarkari-result-deploy.log` on the droplet
- `.deploy-state/last-release.env` on the droplet checkout (latest deploy/rollback metadata)
- `docker compose -f docker-compose.yml logs` on the droplet
- `/api/livez`, `/api/readyz`, `/api/health`, and `/api/health/deep` for non-secret runtime diagnostics after the rollout
- [docs/production-deploy-checklist.md](./docs/production-deploy-checklist.md)

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
