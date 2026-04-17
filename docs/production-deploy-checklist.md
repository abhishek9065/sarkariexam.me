# Production Deploy Checklist

## Required GitHub Configuration

Secrets:
- `DO_HOST`
- `DO_USER`
- `DO_SSH_KEY`
- optional `DO_PORT`

Variables:
- `DO_HOST_FINGERPRINT`
- `DO_REPO_DIR`

## Required Server Prerequisites

- A reachable DigitalOcean droplet at `DO_HOST`
- The deploy user from `DO_USER` can SSH with `DO_SSH_KEY`
- The host key fingerprint matches `DO_HOST_FINGERPRINT`
- The production checkout already exists at `DO_REPO_DIR`
- The checkout is clean: no local modifications and no untracked files
- The checkout contains:
  - `docker-compose.yml`
  - `scripts/deploy-live.sh`
  - `scripts/deploy-common.sh`
  - `scripts/deploy-fast.sh`
  - `scripts/deploy-prod.sh`
  - root `.env`
- Installed commands:
  - `bash`
  - `git`
  - `docker`
  - Docker Compose plugin (`docker compose`)
  - `flock`
  - `curl`
  - `mktemp`
  - `tee`

## Required Server Root `.env`

- `JWT_SECRET`
- `POSTGRES_PRISMA_URL` or `DATABASE_URL`
- `COSMOS_CONNECTION_STRING` or `MONGODB_URI` while the production backend still requires the legacy bridge

Recommended:
- `FRONTEND_URL`
- `CORS_ORIGINS`
- `FRONTEND_REVALIDATE_URL`
- `FRONTEND_REVALIDATE_TOKEN`
- `METRICS_TOKEN`
- `SENDGRID_API_KEY`
- `SENTRY_DSN`
- optional `CF_ZONE_ID`
- optional `CF_API_TOKEN`
- optional `DD_API_KEY`

## Safe Test Procedure

1. Merge the deploy changes to `main`.
2. Confirm the production variables `DO_HOST_FINGERPRINT` and `DO_REPO_DIR` exist in GitHub.
3. Confirm the root `.env` already exists at `DO_REPO_DIR` on the droplet.
4. SSH to the droplet and verify the checkout is clean:

```bash
cd "$DO_REPO_DIR"
git status --short --untracked-files=all
```

5. Run the remote preflight only:

```bash
cd "$DO_REPO_DIR"
DO_REPO_DIR="$DO_REPO_DIR" bash scripts/deploy-live.sh --preflight-only --mode fast --sha <main-sha>
```

6. Fix any reported prerequisite failure before attempting a live deploy.
7. Push a known-safe commit to `main` and let GitHub Actions run `CI`.
8. Confirm `Deploy to Production` runs from the successful `CI` workflow_run for that push.
9. After completion, verify:
  - `/api/health`
  - `/api/health/deep`
  - `/`
  - `/jobs`
  - `/results/upsc-civil-services-2025-final-result`
  - `/admin`

## Failure Triage

Start with:
- the GitHub Actions deploy job summary
- `/tmp/sarkari-result-deploy.log`
- `docker compose -f docker-compose.yml logs`

Common actionable failures:
- Missing `DO_HOST_FINGERPRINT`: fix the GitHub variable and rerun.
- Invalid `DO_SSH_KEY`: replace the private key secret with a valid key.
- Wrong `DO_HOST`, `DO_USER`, or `DO_PORT`: fix SSH connectivity before rerunning.
- Missing checkout at `DO_REPO_DIR`: provision the repo on the droplet first.
- Missing root `.env`: create it from `.env.example` and fill required production values.
- Docker or Docker Compose missing: install them for the deploy user.

## Rollback

- Preferred rollback: revert the bad commit on `main` and let GitHub Actions redeploy.
- Manual rollback: use the `previous_sha` printed in the deploy summary.

```bash
cd "$DO_REPO_DIR"
DO_REPO_DIR="$DO_REPO_DIR" bash scripts/deploy-live.sh --mode fast --sha <previous_sha>
```
