# Frontend E2E Test Matrix

Playwright suites are split into deterministic CI checks and opt-in production probes.

## CI deterministic suites
- `tests/ci.smoke.spec.ts`
- `tests/homepage.dense-layout.spec.ts`
- `tests/homepage.mobile-tabs.spec.ts`
- `tests/navigation.source-tags.spec.ts`
- `tests/mobile.header.spec.ts`
- `tests/site.regression.spec.ts`
- `tests/jobs.filters.spec.ts`
- `tests/admin.analytics.local.spec.ts`

## Local utility suites
- `tests/example.spec.ts`
- `tests/admin.analytics-ui.spec.ts`
- `tests/admin.lists-ui.spec.ts`

## Production probe suites (`@prod`)
- `tests/sarkari.prod.spec.ts`
- `tests/admin.smoke.prod.spec.ts`
- `tests/admin.auth-matrix.prod.spec.ts`

## Commands
- `npm run test:e2e` - local non-prod suites
- `npm run test:e2e:ci` - PR-blocking Chromium suite
- `npm run test:e2e:nightly` - deterministic Firefox + WebKit suite
- `npm run test:e2e:prod` - manual production probes

## Environment variables

### Local/CI
- `CI_BASE_URL` (default `http://127.0.0.1:4173`)
- `PLAYWRIGHT_BASE_URL` (optional fallback)

### Production probes
- `PROD_BASE_URL` (required)
- Admin credentials as needed:
  - `ADMIN_TEST_EMAIL`, `ADMIN_TEST_PASSWORD`
  - `ADMIN_TEST_TOTP` or `ADMIN_TEST_BACKUP_CODE`
  - optional role matrix variables:
    - `ADMIN_EDITOR_EMAIL`, `ADMIN_EDITOR_PASSWORD`, `ADMIN_EDITOR_TOTP` or `ADMIN_EDITOR_BACKUP_CODE`
    - `ADMIN_REVIEWER_EMAIL`, `ADMIN_REVIEWER_PASSWORD`, `ADMIN_REVIEWER_TOTP` or `ADMIN_REVIEWER_BACKUP_CODE`
    - `ADMIN_VIEWER_EMAIL`, `ADMIN_VIEWER_PASSWORD`, `ADMIN_VIEWER_TOTP` or `ADMIN_VIEWER_BACKUP_CODE`
    - `ADMIN_NON_ADMIN_EMAIL`, `ADMIN_NON_ADMIN_PASSWORD`
    - `USER_TEST_EMAIL`, `USER_TEST_PASSWORD`

## Selector policy
- Prefer `data-testid` for stable shell anchors.
- Prefer ARIA role/name selectors for interactive controls.
- Avoid raw style selectors unless no stable semantic locator exists.
