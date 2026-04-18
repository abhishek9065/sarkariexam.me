# Fast Deploy Runbook

This document explains the fast production deploy path used by the GitHub Actions deployment workflow and the droplet helper scripts.

## Goal

Fast deploy minimizes downtime by rebuilding images and restarting backend first, then restarting frontend/admin/nginx.

## Deploy Entry Points

- GitHub Actions runner helper: `scripts/deploy-via-ssh.sh`
- Remote droplet helper: `scripts/deploy-live.sh`
- Fast mode executor: `scripts/deploy-fast.sh`
- Shared deploy library: `scripts/deploy-common.sh`

## Required GitHub Configuration

### Secrets

- `DO_HOST`
- `DO_USER`
- `DO_SSH_KEY`
- `DO_PORT` (optional, defaults to `22`)

### Repository Variables

- `DO_REPO_DIR` (absolute path on droplet)
- `DO_HOST_FINGERPRINT` (exact `SHA256:<base64>` host key fingerprint)

Deploy fails closed when required values are missing.

## Security Model

- No repository path auto-discovery.
- No trust-on-first-use host key behavior.
- Host key fingerprint must match exactly.
- Target commit SHA must be a 40-character SHA and reachable from `origin/main`.

## What Fast Deploy Does

1. Validates server prerequisites and deployment configuration.
2. Validates root `.env` contains required production variables.
3. Renders Docker Compose config.
4. Rebuilds backend/frontend/admin/nginx images.
5. Restarts backend and waits for backend health.
6. Restarts nginx/admin/frontend (and Datadog if configured).
7. Runs public endpoint checks and optional revalidation smoke check.

## Manual Invocation On Droplet

```bash
cd /absolute/path/to/repo
DO_REPO_DIR=/absolute/path/to/repo bash scripts/deploy-live.sh --mode fast --sha <40-char-sha>
```

## Post-Deploy Verification

Use:

```bash
bash scripts/verify-deployment.sh
```

or set a custom URL:

```bash
PUBLIC_BASE_URL=https://sarkariexams.me bash scripts/verify-deployment.sh
```

## Rollback

`deploy-fast.sh` prints a rollback hint with the previous commit SHA. Use that SHA with `deploy-live.sh`.
