# Admin vNext Cutover Runbook

This runbook locks operational policy for admin routing, rollback, and post-deploy validation.

## Route Contract
- `/admin` and `/admin/*` -> `admin-frontend` (vNext default, desktop-only).
- `/admin-vnext` and `/admin-vnext/*` -> `admin-frontend` transition alias.
- `/admin-legacy` and `/admin-legacy/*` -> `frontend` rollback path.

## Stabilization Windows
- Keep `/admin-vnext` alias for 30 days after production cutover.
- Keep `/admin-legacy` rollback path for at least 90 days.

## Deploy Verification Checklist
After each production deploy:
1. Verify `/admin` loads vNext on desktop viewport.
2. Verify `/admin` shows Desktop Required below `1120px`.
3. Verify `/admin-legacy` is reachable.
4. Verify `/api/health` responds healthy.
5. Verify admin login flow works end-to-end.

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

## Rollback Procedure
Use this if `/admin` must be returned to legacy quickly.

1. Edit `nginx/default.conf` and change `/admin` + `/admin/*` proxy target to `frontend`.
2. Redeploy:

```bash
cd ~/sarkari-result
git pull --ff-only origin main
docker compose up -d --build nginx backend frontend admin-frontend
```

3. Re-validate:
   - `/admin` now serves legacy.
   - `/admin-legacy` still serves legacy.
   - `/api/health` remains healthy.

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
