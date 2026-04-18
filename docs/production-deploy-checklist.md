# Production Deploy Checklist

Use this checklist for every production deployment.

## 1. Before Deploy

- Confirm the target commit is merged to `main`.
- Confirm `CI` passed for the target commit.
- Confirm GitHub secrets are present:
  - `DO_HOST`
  - `DO_USER`
  - `DO_SSH_KEY`
  - optional `DO_PORT`
- Confirm GitHub repository variables are present:
  - `DO_REPO_DIR`
  - `DO_HOST_FINGERPRINT`
- Confirm droplet path in `DO_REPO_DIR` is correct and absolute.
- Confirm droplet root `.env` exists and contains required production values.

## 2. Trigger Deploy

- Push to `main` (normal path) and wait for workflow-run deploy.
- Or run manual command on droplet for emergency controlled deploy:

```bash
DO_REPO_DIR=/absolute/path/to/repo bash scripts/deploy-live.sh --mode fast --sha <40-char-sha>
```

## 3. During Deploy

- Watch GitHub Actions logs for stage progression:
  - `validate-config`
  - `prepare-ssh`
  - `remote-preflight`
  - `remote-deploy`
- If deploy fails, collect:
  - workflow summary
  - `/tmp/sarkari-result-deploy.log`
  - service logs for backend/frontend/nginx

## 4. Post Deploy Validation

- Verify endpoints:
  - `/api/health` returns `200`
  - `/api/health/deep` returns `200`
  - `/` loads
  - `/jobs` loads
  - `/results` loads
  - `/admin` loads
- Run verification script:

```bash
bash scripts/verify-deployment.sh
```

## 5. Rollback Plan

- Use the `previous_sha` printed in deploy summary.
- Execute rollback:

```bash
DO_REPO_DIR=/absolute/path/to/repo bash scripts/deploy-live.sh --mode fast --sha <previous_sha>
```

- Re-run `bash scripts/verify-deployment.sh` after rollback.

## 6. If Cloudflare Shows 521

- Confirm `nginx` container is running and healthy.
- Confirm droplet firewall allows inbound `80/443`.
- Confirm Cloudflare DNS points to correct droplet IP.
- Confirm reverse proxy upstreams are reachable.
- Re-run deploy preflight to validate config:

```bash
DO_REPO_DIR=/absolute/path/to/repo bash scripts/deploy-live.sh --mode fast --sha <target-sha> --preflight-only
```
