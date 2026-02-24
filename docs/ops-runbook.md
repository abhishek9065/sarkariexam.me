# SarkariExams Ops Runbook

This runbook is the single triage entrypoint for backend/frontend telemetry and runtime integrity incidents.
For admin routing cutover checks and rollback policy, also use `docs/ADMIN_CUTOVER_RUNBOOK.md`.

## Fast Path (under 15 minutes)

1. Verify API and health endpoints:
```bash
curl -fsS http://localhost:5000/api/health
curl -fsS http://localhost:5000/api/health/deep
```
2. Verify analytics health flags:
```bash
cd backend
npm run check:analytics-health
```
3. Verify contract/build baseline:
```bash
cd backend
npm run build
npm run verify:openapi-parity
npm test -- src/tests/adminPostLogin.contract.test.ts
npm test

cd ../frontend
npm run build
npm run test:e2e:ci
```
4. If production issue is frontend proxy related, validate from frontend runtime:
```bash
curl -fsS http://localhost:4173/api/health
curl -fsS "http://localhost:4173/api/announcements/v3/cards?type=job&limit=1"
```

## Incident Playbooks

### 1) API Proxy Errors (`[vite] http proxy error: /api/...`)

Symptoms:
- Local UI shows network failures for `/api/announcements`.
- Vite console logs proxy target errors.

Checks:
1. Confirm backend is running on expected local port:
```bash
curl -fsS http://localhost:5000/api/health
```
2. Confirm frontend proxy target settings:
- `frontend/vite.config.ts`
- `frontend/.env.example`
3. Confirm dev mode:
- Local backend mode: `VITE_PROXY_TARGET=http://localhost:5000`
- Docker + nginx mode: `VITE_PROXY_TARGET=http://localhost`

Actions:
1. Restart frontend with explicit proxy target if needed.
2. Keep `VITE_API_BASE` unset for proxy-based dev.
3. Re-check `http://localhost:4173/api/health`.

### 2) Homepage Fallback Mode Spikes

Symptoms:
- Homepage shows `Fallback mode` status frequently.
- Admin support error reports increase (`/api/support/error-reports`).

Checks:
1. Inspect frontend runtime errors in support reports:
```bash
curl -H "Authorization: Bearer <admin-token>" \
  "http://localhost:5000/api/support/error-reports?status=new&limit=20"
```
2. Confirm backend list endpoints respond:
```bash
curl -fsS "http://localhost:5000/api/announcements/v3/cards?type=job&limit=5"
```
3. Check frontend API helper behavior in `frontend/src/utils/api.ts` and `frontend/src/utils/reportClientError.ts`.

Actions:
1. Fix failing API route or network path.
2. Re-test homepage retry action.
3. Triage recurring deduped client error IDs first.

### 3) Flaky Mongo/Vitest Hooks (teardown timeouts)

Symptoms:
- `afterAll`/hook timeout failures in backend tests.
- Reconnect noise during teardown.

Checks:
1. Verify test harness settings:
- `backend/vitest.config.ts` (`hookTimeout`, `retry`)
- `backend/tests/setup.ts` (`DISABLE_DB_RECONNECT`, teardown path)
2. Verify DB service guard behavior:
- `backend/src/services/cosmosdb.ts` (`isClosing`, idempotent `closeConnection`)

Actions:
1. Run CI-mode backend tests locally:
```bash
cd backend
npm run test:ci
```
2. If local MongoMemoryServer fails, set explicit `MONGODB_URI`.
3. Capture failing suite logs before retrying.

### 4) Analytics Health Alerts

Source:
- `backend/scripts/check-analytics-health.ts`
- Scheduled security workflow probe.

Flags:
- `zeroListingEvents`
- `staleRollups`
- `inAppClickCollapse`

Checks:
```bash
curl -H "Authorization: Bearer <admin-token>" \
  "http://localhost:5000/api/analytics/overview?days=30&nocache=1"
```

Actions:
1. If `zeroListingEvents=true`: validate `listing_view` instrumentation in announcements routes.
2. If `staleRollups=true`: verify scheduler startup and DB connectivity.
3. If `inAppClickCollapse=true`: validate attribution source propagation and in-app click events.

### 5) Rollback Commands

Use only after confirming rollback necessity.

App rollback (server repo):
```bash
cd ~/sarkari-result
git fetch --all --prune
git log --oneline -n 5
# choose <stable_sha>
git checkout <stable_sha>
bash scripts/deploy-prod.sh
```

Patch rollback (revert a bad commit on branch):
```bash
git revert <bad_commit_sha>
git push origin main
```

After rollback:
1. Re-run health checks (`/api/health`, `/api/health/deep`).
2. Re-run analytics health probe.
3. Validate frontend runtime API proxy path.

### 6) Admin Mutations Stuck On `approval_required`

Symptoms:
- Admin create/edit/delete/publish returns `approval_required`.
- Action appears queued but never executes.

Checks:
1. Confirm dual-approval policy is enabled:
```bash
echo "$ADMIN_DUAL_APPROVAL_REQUIRED"
```
2. Confirm whether a second approver is available.
3. Inspect pending approvals:
```bash
curl -H "Authorization: Bearer <admin-token>" \
  "http://localhost:5000/api/admin/approvals?status=pending&limit=20"
```
4. For execution replay, confirm request includes:
- `X-Admin-Approval-Id`
- `X-Admin-Step-Up-Token` (for sensitive routes)

Single-operator emergency path (break-glass):
1. Enable emergency mode:
```bash
ADMIN_BREAK_GLASS_ENABLED=true
ADMIN_BREAK_GLASS_MIN_REASON_LENGTH=12
```
2. Provide a reason in admin UI:
- Legacy `/admin`: reason prompt appears on blocked mutation retry.
- `/admin-vnext`: set once in browser console:
```js
localStorage.setItem('admin_break_glass_reason', 'Emergency reason with enough detail')
```
3. Retry the blocked mutation with:
- `X-Admin-Break-Glass-Reason: <clear incident reason>`
- Valid step-up token.
4. Verify audit trail:
- `admin_audit_logs.metadata.breakGlassUsed=true`
- `admin_audit_logs.metadata.breakGlassReason=<reason>`

Return to strict mode:
1. Set `ADMIN_BREAK_GLASS_ENABLED=false`.
2. Confirm two-operator approval flow is functioning.
3. Review break-glass events in audit/security logs for post-incident signoff.

## CI/Contract Guardrails

Before merge:
```bash
node scripts/verify-config-consistency.mjs

cd backend
npm run build
npm run verify:openapi-parity
npm run test:ci

cd ../frontend
npm run build
npm run check:bundle-size
npm run test:e2e:ci
```

If a check fails, do not deploy until the failing contract is resolved.
