# Frontend E2E Test Matrix

This folder contains Playwright suites split into deterministic CI checks and opt-in production probes.

## Suites

- Deterministic local suites (default, non-prod):
  - `tests/ci.smoke.spec.ts`
  - `tests/homepage.dense-layout.spec.ts`
  - `tests/navigation.source-tags.spec.ts`
  - `tests/mobile.header.spec.ts`
  - `tests/site.regression.spec.ts`
  - `tests/example.spec.ts`
- Production probe suites (`@prod`, opt-in):
  - `tests/sarkari.prod.spec.ts`
  - `tests/admin.smoke.prod.spec.ts`
  - `tests/admin.auth-matrix.prod.spec.ts`

## Commands

- Local non-prod full suite:
  - `npm run test:e2e`
- CI blocking suite (Chromium only):
  - `npm run test:e2e:ci`
- Nightly cross-browser deterministic suite (Firefox + WebKit):
  - `npm run test:e2e:nightly`
- Manual production probes (`@prod`, Chromium):
  - `npm run test:e2e:prod`

## Environment Variables

### Deterministic local/CI

- `CI_BASE_URL` (optional, default `http://127.0.0.1:4173`)
- `PLAYWRIGHT_BASE_URL` (optional fallback for local runs)

### Production probes

- `PROD_BASE_URL` (required)
- Admin probe credentials as needed:
  - `ADMIN_TEST_EMAIL`, `ADMIN_TEST_PASSWORD`
  - `ADMIN_TEST_TOTP` or `ADMIN_TEST_BACKUP_CODE`
  - Optional role-matrix credentials:
    - `ADMIN_EDITOR_EMAIL`, `ADMIN_EDITOR_PASSWORD`, `ADMIN_EDITOR_TOTP` or `ADMIN_EDITOR_BACKUP_CODE`
    - `ADMIN_REVIEWER_EMAIL`, `ADMIN_REVIEWER_PASSWORD`, `ADMIN_REVIEWER_TOTP` or `ADMIN_REVIEWER_BACKUP_CODE`
    - `ADMIN_VIEWER_EMAIL`, `ADMIN_VIEWER_PASSWORD`, `ADMIN_VIEWER_TOTP` or `ADMIN_VIEWER_BACKUP_CODE`
    - `ADMIN_NON_ADMIN_EMAIL`, `ADMIN_NON_ADMIN_PASSWORD`
    - `USER_TEST_EMAIL`, `USER_TEST_PASSWORD`

## Selector Stability Policy

- Prefer `data-testid` for persistent shell and layout anchors.
- Prefer ARIA role/name selectors (`getByRole`, `getByLabel`) for interactive controls.
- Avoid styling selectors (`.class-name`) unless no stable semantic/test id exists.
- Do not couple tests to decorative text or layout-only class names.

## CI Strategy

- PR blocking: Chromium deterministic suite only.
- Nightly: Firefox + WebKit deterministic suite.
- Production probes: manual workflow only; never PR-blocking.
