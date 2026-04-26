# Fast Deploy Runbook

This document explains the fast production deploy path used by the GitHub Actions deployment workflow and the droplet helper scripts.

## Goal

Fast deploy minimizes downtime by rebuilding images and restarting backend first, then restarting frontend/admin/nginx.

## Deploy Entry Points

- GitHub Actions runner helper: `scripts/deploy-via-ssh.sh`
- Remote droplet helper: `scripts/deploy-live.sh`
- Fast mode executor: `scripts/deploy-fast.sh`
- Shared deploy library: `scripts/deploy-common.sh`
- Rollback helper: `scripts/rollback-last.sh`

## Staging/Preflight Path

- Use GitHub Actions `Deploy Preflight` (`workflow_dispatch`) with `target_environment=staging` for remote safety checks without restarting services.
- Use `target_environment=production` for production preflight-only checks when validating secrets/config before a release window.

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

Public checks include `/api/livez`, `/api/readyz`, `/api/health`, and `/api/health/deep`.

Image builds run one service at a time so the small production droplet does not build backend, frontend, and admin images concurrently. If the droplet SSH connection is interrupted, rerun the workflow after the remote build/lock clears.

```bash
DO_REPO_DIR=/absolute/path/to/repo bash scripts/deploy-live.sh --mode fast --sha <40-char-sha>
```

After a successful deploy, release metadata is written to `.deploy-state/last-release.env` in the repository checkout.

## Preflight Only On Droplet

```bash
cd /absolute/path/to/repo
DO_REPO_DIR=/absolute/path/to/repo bash scripts/deploy-live.sh --mode fast --sha <40-char-sha> --preflight-only
```

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

For a safer operator flow, use the rollback helper:

```bash
cd /absolute/path/to/repo
bash scripts/rollback-last.sh
bash scripts/rollback-last.sh --yes
```
