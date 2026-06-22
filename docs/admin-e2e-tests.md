# Admin Console E2E tests

The Admin Console browser tests live in `admin-next/e2e` and use Playwright with Chromium. They cover unauthenticated access, the login screen, an API-mocked admin session, critical sidebar navigation, analytics data provenance, destructive user-action confirmation, and the unavailable password-change state.

## Run locally

From `admin-next`:

```bash
npm install
npx playwright install chromium
npm run test:e2e:admin
```

`npm run test:e2e` runs every Playwright project; currently that is the same admin Chromium suite. Playwright starts the Next.js admin development server on port `3001`. Stop any existing process on that port if it was started with different environment variables.

HTML results are written to `admin-next/playwright-report` and failure artifacts to `admin-next/test-results`. Both directories are ignored by Git.

## Authentication and environment

No credentials, secrets, or production session cookies are required. Authenticated tests intercept the Admin Console API in the browser and return a synthetic `superadmin` session plus per-test API fixtures. Unauthenticated tests return `401` from the same mocked session endpoint.

The Playwright web server sets `NEXT_PUBLIC_API_URL=http://127.0.0.1:3001/api-e2e` only for the test process, so API requests cannot reach the production backend. No `.env` file is required for this suite.

To test real authentication separately, provide a disposable non-production environment and implement a Playwright setup project that writes `storageState`. Keep usernames, passwords, tokens, and generated storage-state files outside Git; do not replace the deterministic mock-session coverage with production credentials.
