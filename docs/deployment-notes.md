# Deployment Notes

This repository uses a strict deployment model for production delivery to a DigitalOcean droplet behind Cloudflare.

## Current Deployment Flow

1. `CI` workflow runs on pushes and pull requests.
2. `Deploy to Production` workflow runs only from `workflow_run` when CI succeeds for a `push` on `main`.
3. Runner executes `scripts/deploy-via-ssh.sh`.
4. Runner uploads and executes `scripts/deploy-live.sh` on droplet.
5. Droplet validates target SHA, checks out that SHA, and executes `scripts/deploy-fast.sh` (or full mode if requested).

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
- Deployment refuses non-40-character SHAs.
- Deployment refuses SHAs not reachable from `origin/main`.
- Deployment auto-restores allowlisted tracked drift (`backend/package-lock.json` by default) before preflight; any other tracked local modification still aborts deploy.

## Root .env Requirements

Minimum required values:

- `JWT_SECRET`
- `POSTGRES_PRISMA_URL` or `DATABASE_URL`
- `COSMOS_CONNECTION_STRING` or `MONGODB_URI`

Optional but recommended values are logged when missing.

## Validation and Health Checks

Deployment validates:

- Docker Compose config rendering.
- Backend container health.
- Public endpoints:
  - `/api/health`
  - `/api/health/deep`
  - `/`
  - `/jobs`
  - `/results`
  - `/admin`
- Optional frontend revalidation smoke check when revalidation token is configured.

## Useful Commands

### Manual preflight only

```bash
DO_REPO_DIR=/absolute/path/to/repo bash scripts/deploy-live.sh --mode fast --sha <40-char-sha> --preflight-only
```

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
