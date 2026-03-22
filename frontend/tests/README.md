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

## Local utility suites
- `tests/example.spec.ts`
- `tests/api.integration.spec.ts`
- `tests/error-boundary.spec.ts`

## Production probe suites (`@prod`)
- `tests/sarkari.prod.spec.ts`

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

## Selector policy
- Prefer `data-testid` for stable shell anchors.
- Prefer ARIA role/name selectors for interactive controls.
- Avoid raw style selectors unless no stable semantic locator exists.
