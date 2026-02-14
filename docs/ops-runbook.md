# Backend Analytics Ops Runbook

This runbook covers telemetry failures and contract integrity checks for backend analytics.

## Scope

- API surface: `/api/analytics/overview`, `/api/analytics/popular`, `/api/analytics/export/csv`
- Core sources: `backend/src/services/analyticsOverview.ts`, `backend/src/services/analytics.ts`
- Related cache path: `backend/src/middleware/cache.ts`, `backend/src/services/redis.ts`

## Fast Triage Checklist

1. Check overview health flags with fresh data:
```bash
curl -H "Authorization: Bearer <admin-token>" "http://localhost:5000/api/analytics/overview?days=30&nocache=1"
```
2. Inspect:
   - `data.insights.healthFlags.zeroListingEvents`
   - `data.insights.healthFlags.staleRollups`
   - `data.insights.healthFlags.inAppClickCollapse`
   - `data.insights.rollupAgeMinutes`
3. Validate runtime integrity:
```bash
cd backend
npm run build
npm run verify:openapi-parity
npm test -- src/tests/adminPostLogin.contract.test.ts
npm test
```

## Failure Playbooks

### 1) Zero Listing Events (`zeroListingEvents=true`)

Meaning:
- Listing events are not being persisted for the active window (`listingViews === 0`).

Checks:
1. Confirm listing routes are receiving traffic:
   - `backend/src/routes/announcements.ts` (`/v3/cards`, `/search`, category/list routes).
2. Confirm analytics event writes for `listing_view`:
   - `recordListingAnalytics` in `backend/src/routes/announcements.ts`.
3. Confirm DB write path:
   - `recordAnalyticsEvent` in `backend/src/services/analytics.ts`.
4. Verify filters are not suppressing events:
   - Ignore prefetch requests only (`isPrefetchRequest` in announcements routes).

Actions:
1. Reproduce with a direct request to `/api/announcements/v3/cards?source=home`.
2. Query `analytics_events` for recent `listing_view`.
3. If absent, patch route instrumentation.
4. If present but summary is zero, inspect rollup read path (`getRollupSummary`) and window boundaries.

### 2) Stale Rollups (`staleRollups=true`)

Meaning:
- `rollupAgeMinutes` exceeds `staleThresholdMinutes` from `analyticsOverview`.

Checks:
1. Ensure scheduler starts at boot:
   - `scheduleAnalyticsRollups()` in `backend/src/server.ts`.
2. Verify DB connectivity:
   - `/api/health/deep`
   - `healthCheck` in `backend/src/services/cosmosdb.ts`.
3. Confirm `analytics_rollups` has fresh entries.

Actions:
1. Restart backend and verify scheduler logs.
2. Validate DB credentials and connectivity.
3. Run a manual rollup in a controlled environment if needed.
4. Keep `nocache=1` while validating recovery.

### 3) In-App Click Collapse (`inAppClickCollapse=true`)

Meaning:
- In-app click signal is degraded relative to detail views, usually with unattributed/direct-heavy traffic.

Checks:
1. Validate source tagging and attribution normalization:
   - `backend/src/services/attribution.ts`
   - `backend/src/routes/announcements.ts` (query param normalization).
2. Confirm `card_click` events still emit on detail reads.
3. Inspect funnel split:
   - `getFunnelAttributionSplit` in `backend/src/services/analytics.ts`.

Actions:
1. Sample recent `card_click` metadata source distribution.
2. Verify in-app links still pass canonical `source`.
3. If direct traffic dominates by design, classify as expected and monitor trend.
4. If not expected, treat as instrumentation regression and patch source propagation.

### 4) Redis Fallback Mode

Signal:
- Logs show Redis unavailable and in-memory fallback active.

Checks:
1. Verify Redis env/config values.
2. Confirm fallback operation:
   - `backend/src/services/redis.ts`
   - `backend/src/utils/cache.ts`

Actions:
1. Restore Redis connectivity for stable distributed caching/rate limiting.
2. While degraded, expect weaker multi-instance cache consistency.
3. Re-check key API paths (`/api/announcements/v3/cards`, `/api/analytics/overview`) after recovery.

## Contract and Parity Guardrails

Run these before merge/deploy:

```bash
cd backend
npm run build
npm run verify:openapi-parity
npm test -- src/tests/adminPostLogin.contract.test.ts
npm test
```

If parity fails:
1. Compare route mounts in `backend/src/server.ts`.
2. Compare router methods in `backend/src/routes/*.ts`.
3. Update `openapi.json` for missing/additive endpoints and rerun parity.

