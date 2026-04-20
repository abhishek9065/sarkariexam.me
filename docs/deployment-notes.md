# Deployment Notes

This repository uses a strict deployment model for production delivery to a DigitalOcean droplet behind Cloudflare.

## Current Deployment Flow

1. `CI` workflow runs on pushes and pull requests.
2. `Deploy to Production` workflow runs only from `workflow_run` when CI succeeds for a `push` on `main`.
3. Runner executes `scripts/deploy-via-ssh.sh`.
4. Runner uploads and executes `scripts/deploy-live.sh` on droplet.
5. Droplet validates target SHA, checks out that SHA, and executes `scripts/deploy-fast.sh` (or full mode if requested).

## Staging/Environment Readiness Path

- `Deploy Preflight` workflow (`workflow_dispatch`) runs remote preflight checks without restarting services.
- It supports GitHub environment selection (`staging` or `production`) so `DO_*` values stay environment-scoped.
- It is the preferred path for validating new environment wiring, host key rotations, and root `.env` changes before live deploy.

## Required GitHub Configuration

### Secrets

- `DO_HOST`: Droplet hostname or IP.
- `DO_USER`: SSH user.
- `DO_SSH_KEY`: Private key for deployment user.
- `DO_PORT`: SSH port (optional, defaults to `22`).

### Repository Variables

- `DO_REPO_DIR`: Absolute path to production repository checkout on droplet.
- `DO_HOST_FINGERPRINT`: Expected SSH host key fingerprint in `SHA256:<base64>` format.

## Required Droplet State

- Docker Engine with Compose plugin (`docker compose`).
- `git`, `curl`, `flock`, and `tee` installed.
- Repository exists at `DO_REPO_DIR` with a valid `.git` folder.
- Root `.env` file exists in the repository checkout.
- Deployment user can run Docker and Git commands.

## Strict Safety Guarantees

- Deployment refuses to run without explicit `DO_REPO_DIR`.
- Deployment refuses to run if host key fingerprint does not match.
- Deployment requires `DO_HOST_FINGERPRINT`; trust-on-first-use is not allowed.
- Deployment refuses non-40-character SHAs.
- Deployment refuses SHAs not reachable from `origin/main`.
- Deployment auto-restores allowlisted tracked drift (`backend/package-lock.json` by default) before preflight; any other tracked local modification still aborts deploy.

## Root .env Requirements

Minimum required values:

- `JWT_SECRET`
- `POSTGRES_PRISMA_URL` or `DATABASE_URL`

Conditionally required values:

- `COSMOS_CONNECTION_STRING` or `MONGODB_URI` only when `LEGACY_MONGO_REQUIRED=true`
- `COSMOS_DATABASE_NAME` only when legacy bridge variables are configured

Optional but recommended values are logged when missing.

## Validation and Health Checks

Deployment validates:

- Docker Compose config rendering.
- Backend container health.
- Public endpoints:
  - `/api/livez`
  - `/api/readyz`
  - `/api/health`
  - `/api/health/deep`
  - `/`
  - `/jobs`
  - `/results`
  - `/admin`
- Optional frontend revalidation smoke check when revalidation token is configured.
- Optional metrics endpoint verification via `scripts/verify-deployment.sh` when `METRICS_TOKEN` is configured.

## Rollback Metadata

- Successful deploys write `.deploy-state/last-release.env` in the production checkout.
- This file includes `DEPLOYED_SHA`, `PREVIOUS_SHA`, deploy mode, and timestamp.
- Use `scripts/rollback-last.sh` for a safer rollback flow based on recorded metadata.

## Useful Commands

### Manual preflight only

```bash
DO_REPO_DIR=/absolute/path/to/repo bash scripts/deploy-live.sh --mode fast --sha <40-char-sha> --preflight-only
```

### Workflow preflight only

- Trigger `Deploy Preflight` in GitHub Actions and select `staging` or `production`.
- Provide a full 40-character SHA and desired mode (`fast` or `full`).

### Manual deployment

```bash
DO_REPO_DIR=/absolute/path/to/repo bash scripts/deploy-live.sh --mode fast --sha <40-char-sha>
```

### Manual rollback helper

```bash
bash scripts/rollback-last.sh
bash scripts/rollback-last.sh --yes
```

### Full verification

```bash
bash scripts/verify-deployment.sh
```

## Incident Triage Pointers

- Read CI/CD job summary from GitHub Actions first.
- On droplet, inspect `/tmp/sarkari-result-deploy.log`.
- Use [docs/deploy-incident-faq.md](./deploy-incident-faq.md) for common failure-mode playbooks.
- Check service logs:
  - `docker compose --project-name sarkari-result --env-file .env logs --tail 200 backend`
  - `docker compose --project-name sarkari-result --env-file .env logs --tail 200 frontend`
  - `docker compose --project-name sarkari-result --env-file .env logs --tail 200 nginx`
- If needed, rerun deploy in `--preflight-only` mode to isolate configuration errors.
