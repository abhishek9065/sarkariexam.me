# Admin Console CI and Deploy Gates

This repository protects admin-console changes with pull-request checks, full main-branch CI, image builds, and a production deploy gate.

## Blocking Checks

`PR CI` runs on pull requests. Admin-console changes under `admin-next/**` run:

- `git diff --check` against the pull request diff.
- Repository hygiene checks for generated artifacts.
- `admin-next` dependency install with `npm ci`.
- Production dependency audit with `npm audit --omit=dev --audit-level=high`.
- ESLint with `npm run lint`.
- TypeScript/Next.js production build with `npm run build`.
- Admin Playwright smoke tests with `npm run test:e2e:admin`.

Backend changes run `backend` install, audit, Prisma generation/migrations, OpenAPI parity, ESLint, TypeScript build, `dist/campaignWorker.js` artifact verification, and `npm run test:ci`.

Public frontend changes run `frontend` install, audit, ESLint, and `npm run build`.

Deploy-control changes additionally validate shell script syntax and Docker Compose rendering.

## Main CI and Production Deploy

`Main CI` runs on pushes to `main` and is the production deployment gate. It blocks image publishing unless all of these jobs succeed:

- `git diff --check`.
- Repository hygiene.
- Shell safety checks.
- Deploy documentation consistency.
- Docker Compose config validation.
- Backend audit, ESLint, TypeScript build, campaign-worker artifact check, and tests.
- Public frontend audit, ESLint, and build.
- Admin app audit, ESLint, and build.
- Admin Playwright smoke tests.

The `Deploy to Production` workflow is triggered only by a completed `Main CI` workflow. Its gate allows deployment only when `Main CI` succeeded for a `push` to `main` with a valid commit SHA.

## Docker Coverage

`Main CI` publishes GHCR images only after all blocking checks pass:

- `sarkariexam-backend` from `backend/Dockerfile`.
- `sarkariexam-frontend` from `frontend/Dockerfile`.
- `sarkariexam-admin` from `admin-next/Dockerfile`.
- `sarkariexam-nginx` from `nginx/Dockerfile`.

The production `campaign-worker` Compose service uses the backend image and starts `node dist/campaignWorker.js`. CI verifies that artifact after the backend TypeScript build, so a missing worker build output blocks image publishing and deployment.

## Playwright Notes

Admin E2E tests use `admin-next/playwright.config.ts`, start the admin Next.js dev server on port `3001`, and mock browser API calls under `/api-e2e`. They do not require production secrets and should stay safe for pull-request CI.
