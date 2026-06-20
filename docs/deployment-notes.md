# Deployment Notes

This repository uses a strict deployment model for production delivery to a DigitalOcean droplet behind Cloudflare.

## Current Deployment Flow

1. `PR CI` runs path-filtered checks on pull requests; `Main CI` runs the full suite on pushes to `main` and publishes commit-tagged images to GHCR.
2. `Deploy to Production` runs only from `workflow_run` when Main CI succeeds for a `push` on `main`.
3. Runner executes `scripts/deploy-via-ssh.sh`.
4. Runner uploads and executes `scripts/deploy-live.sh` on droplet.
5. Droplet validates and checks out the target SHA, pulls its prebuilt images, runs migrations, restarts the API and campaign worker together, then verifies service health.

## CI/CD Performance Baseline

Measured from successful GitHub Actions runs immediately before the image-pull change on 2026-06-19:

| Area | Observed duration |
| --- | ---: |
| CI end-to-end | 81–87 seconds |
| Backend checks | 78–84 seconds |
| Admin checks | 70–76 seconds |
| Frontend checks | 41–48 seconds |
| Separate audit jobs | 17–26 seconds each |
| Production deploy end-to-end | 7 minutes 50 seconds–9 minutes |
| Sample deploy job | 8 minutes 52 seconds |

Use these values to compare the first three successful `Main CI` and image-pull deploy runs. The primary success criterion is a materially shorter production deploy; main CI may grow because it now builds and publishes images that were previously built on the droplet.
6. Deploy scripts validate Redis/PostgreSQL reachability, run Prisma migrations, then replace the backend container.

## Required GitHub Configuration

### Secrets

- `DO_HOST`: Droplet hostname or IP.
- `DO_USER`: SSH user.
- `DO_SSH_KEY`: Private key for deployment user.
- `DO_PORT`: SSH port (optional, defaults to `22`).

### Repository Variables

- `DO_REPO_DIR`: Absolute path to production repository checkout on droplet.
- `DO_HOST_FINGERPRINT`: Expected SSH host key fingerprint in `SHA256:<base64>` format.

### Environment Approval

The GitHub `production` environment must require manual reviewers. The deploy job uses `environment: production`; without reviewer protection, a successful push to `main` can still proceed directly to the droplet.

## Required Droplet State

- Docker Engine with Compose plugin (`docker compose`).
- `git`, `curl`, `flock`, and `tee` installed.
- Repository exists at `DO_REPO_DIR` with a valid `.git` folder.
- Root `.env` file exists in the repository checkout.
- Deployment user can run Docker and Git commands.
- Origin firewall should allow public HTTP/HTTPS traffic only from Cloudflare edge ranges; Nginx trusts `CF-Connecting-IP` only for configured Cloudflare CIDRs.

## Strict Safety Guarantees

- Deployment refuses to run if host key fingerprint does not match.
- Deployment refuses non-40-character SHAs.
- Deployment refuses SHAs not reachable from `origin/main`.
- Deployment refuses to proceed when remote working tree has tracked local modifications.
- Deployment refuses missing or unreachable Upstash Redis in production preflight.
- Production dependency audits run inside `Main CI`, so audit failures block the `workflow_run` deploy gate. The separate Security workflow is weekly/manual only.

Production deploys default to `image-pull`: the droplet pulls the four images tagged with the triggering commit SHA, runs migrations, restarts services, and verifies health. Because `campaign-worker` has no Docker healthcheck, all deploy modes instead require its container to remain running for a bounded eight-second window with zero restarts. The `fast` and `full` rebuild-on-droplet modes remain available as manual fallbacks. Normal deploy lock wait is 120 seconds.

Main CI publishes the immutable commit-SHA and mutable `main` GHCR tags only after repository hygiene, shell safety, deploy documentation, Compose, backend, frontend, and admin validation jobs succeed.

The GHCR packages must be public, or the droplet must already be authenticated to `ghcr.io` with read-package access. Set `GHCR_OWNER` in the production `.env` only if images are published under a different owner.

The SSH deploy wrapper prefers an explicit `DO_REPO_DIR` when it is provided, but if the value is missing it will try to auto-discover the production checkout from common droplet paths before failing. In either case, deploys still fail if the resolved path is not a valid repository clone.

## Root .env Requirements

Minimum required values:

- `JWT_SECRET`
- `POSTGRES_PRISMA_URL` or `DATABASE_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `COSMOS_CONNECTION_STRING` or `MONGODB_URI` only when `LEGACY_MONGO_REQUIRED=true`

Push notification delivery also requires `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`; `docker-compose.yml` passes these through to the backend container from the root `.env` file when configured.

For DigitalOcean Managed PostgreSQL, use a standard PostgreSQL connection string with `sslmode=require`. `POSTGRES_DIRECT_URL` and `DIRECT_URL` are only needed for providers that require a separate direct migration URL; leave them blank for DigitalOcean unless a separate target URL is intentionally provisioned.

Optional but recommended values are logged when missing.

## Validation and Health Checks

Deployment validates:

- Docker Compose config rendering.
- Upstash Redis REST `PING` from the deploy host.
- PostgreSQL network and Prisma connectivity from the backend image.
- Prisma migrations before backend replacement.
- Backend container health.
- Public endpoints:
  - `/api/health`
  - `/api/health/deep` with `METRICS_TOKEN` when configured
  - `/`
  - `/jobs`
  - `/results`
  - `/admin`
- Optional frontend revalidation smoke check when revalidation token is configured.

## 2026-06-19

- Campaign send and retry requests are persisted in PostgreSQL before the API returns `202 Accepted`.
- The campaign worker uses database leases and `FOR UPDATE SKIP LOCKED`, so multiple backend instances can poll safely and interrupted jobs can be reclaimed.
- Production Compose runs campaign scheduling and delivery in the dedicated `campaign-worker` service; the API container sets `CAMPAIGN_WORKER_ENABLED=false` and only enqueues jobs.
- Optional tuning variables are `CAMPAIGN_JOB_POLL_INTERVAL_MS`, `CAMPAIGN_JOB_LEASE_MS`, and `CAMPAIGN_JOB_HEARTBEAT_MS`. Defaults are 1 second, 15 minutes, and 30 seconds respectively.
- Deploy migration `202606190002_campaign_jobs` before accepting campaign send requests from the updated backend.

## 2026-06-17

- Backend production containers now receive `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` from the root `.env` so web push sending can use configured VAPID credentials.
- Frontend production build and runtime public URLs now read `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_ADMIN_URL` from `.env`, with the existing production URLs retained as defaults.

## 2026-06-02

- Deployment preflight now runs a DNS/TCP reachability check from the backend container before Prisma executes. If this fails, verify `POSTGRES_PRISMA_URL`/`DATABASE_URL`, `sslmode=require`, and Neon trusted sources/egress rules.
- Runtime Prisma connections now prefer the pooler URL when present; direct URLs remain available for migration/CLI usage.
- Backend containers no longer run `prisma migrate deploy` during process startup. Deploy scripts run migrations explicitly before replacing the backend service.
- `/api/health/deep` is protected by `METRICS_TOKEN`; use `/api/livez`, `/api/readyz`, and `/api/health` for unauthenticated health checks.

## Useful Commands

### Manual preflight only

```bash
DO_REPO_DIR=/absolute/path/to/repo bash scripts/deploy-live.sh --mode fast --sha <40-char-sha> --preflight-only
```

If `DO_REPO_DIR` is omitted, the remote helper will try the same auto-discovery path used by GitHub Actions.

### Manual deployment

```bash
DO_REPO_DIR=/absolute/path/to/repo bash scripts/deploy-live.sh --mode fast --sha <40-char-sha>
```

### Full verification

```bash
bash scripts/verify-deployment.sh
```

## Incident Triage Pointers

- Read CI/CD job summary from GitHub Actions first.
- On droplet, inspect `/tmp/sarkari-result-deploy.log`.
- Check service logs:
  - `docker compose --project-name sarkari-result --env-file .env logs --tail 200 backend`
  - `docker compose --project-name sarkari-result --env-file .env logs --tail 200 frontend`
  - `docker compose --project-name sarkari-result --env-file .env logs --tail 200 nginx`
- If needed, rerun deploy in `--preflight-only` mode to isolate configuration errors.
