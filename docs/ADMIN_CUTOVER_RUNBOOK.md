# Admin Routing Runbook

This runbook locks operational policy for admin routing, rollback, and post-deploy validation.

## Route Contract
- `/admin` and `/admin/*` -> `frontend` robust legacy admin (default, desktop-only).
- `/admin-vnext` and `/admin-vnext/*` -> `admin-frontend` premium preview.
- `/admin-legacy` and `/admin-legacy/*` -> `frontend` explicit rollback alias.

## Stabilization Windows
- Keep `/admin-vnext` preview route active until full parity signoff.
- Keep `/admin-legacy` rollback alias active for long-tail recovery.

## Deploy Verification Checklist
After each production deploy:
1. Verify `/admin` loads legacy admin on desktop viewport.
2. Verify `/admin` shows Desktop Required below `1120px`.
3. Verify `/admin-vnext` is reachable for preview validation.
4. Verify `/admin-legacy` is reachable.
5. Verify `/api/health` responds healthy.
6. Verify admin login flow works end-to-end.

## Hard Gate Script
Use:

```bash
cd ~/sarkari-result
bash scripts/deploy-prod.sh
```

The script enforces required env vars, waits for backend readiness, checks public health, and validates:
- `/admin`
- `/admin-vnext`
- `/admin-legacy`
- Runs `backend` migration `migrate:admin-accounts` (idempotent) and aborts deploy on migration failure.

## Rollback Procedure
Use this if `/admin-vnext` preview must be returned to legacy quickly.

1. Edit `nginx/default.conf` and change `/admin-vnext` + `/admin-vnext/*` proxy target to `frontend`.
2. Redeploy:

```bash
cd ~/sarkari-result
git pull --ff-only origin main
docker compose up -d --build nginx backend frontend admin-frontend
```

3. Re-validate:
   - `/admin` serves legacy.
   - `/admin-vnext` now serves legacy.
   - `/admin-legacy` still serves legacy.
   - `/api/health` remains healthy.

If rollback speed is critical, you can temporarily skip migration during redeploy:
- `DEPLOY_SKIP_ADMIN_MIGRATION=true bash scripts/deploy-prod.sh`

## 24h Post-Deploy Monitoring Checklist
Track during first 24 hours:
1. Admin auth error spikes (`401/403`) on login and privileged actions.
2. Admin backend 5xx rate changes.
3. Failures on risky actions (bulk, review execute, approval decisions, session termination).
4. UI login error signals ("Failed to fetch", step-up failures, CSRF failures).

## Cutover Completion Criteria
Cutover is considered stable when all conditions pass:
1. Required CI checks are green.
2. Staging smoke is green.
3. One rollback drill is executed successfully.
4. No unresolved high-severity admin incident in stabilization window.
