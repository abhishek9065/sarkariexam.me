# Deployment Notes

## Services
- `backend`: Express + TypeScript API, editorial workflow, content APIs, migration scripts.
- `frontend`: Next.js public site, API-driven rendering, sitemap and robots generation, revalidation endpoint, and live email subscription forms.
- `admin-next`: Next.js editorial CMS with taxonomy management and alert subscriber operations.
- `nginx`: reverse proxy and public ingress.

## Important Environment Variables

The production runtime source of truth is the repository root `.env` on the server checkout.
Do not rely on `backend/.env` or `frontend/.env.local` for Docker production deploys. Those files are for local development only.

### Backend
- `POSTGRES_PRISMA_URL` or `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `FRONTEND_REVALIDATE_URL`
- `FRONTEND_REVALIDATE_TOKEN`
- `CORS_ORIGINS`
- `METRICS_TOKEN`
- legacy only: `COSMOS_CONNECTION_STRING` or `MONGODB_URI`
- legacy only: `COSMOS_DATABASE_NAME`

### Frontend
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_ADMIN_URL`
- `REVALIDATE_TOKEN`
- `CONTENT_CACHE_REVALIDATE_SECONDS`

### Production Root `.env`

Required for deploy:
- `POSTGRES_PRISMA_URL` or `DATABASE_URL`
- `JWT_SECRET`
- legacy only while compatibility routes/jobs still exist: `COSMOS_CONNECTION_STRING` or `MONGODB_URI`

Strongly recommended for runtime:
- `COSMOS_DATABASE_NAME`
- `FRONTEND_URL`
- `CORS_ORIGINS`
- `FRONTEND_REVALIDATE_URL`
- `FRONTEND_REVALIDATE_TOKEN`
- `METRICS_TOKEN`
- `SENDGRID_API_KEY`
- `SENTRY_DSN`

## Revalidation Flow
- The frontend now includes a protected `/api/revalidate` endpoint plus shared content-tag conventions.
- Editorial publish, unpublish, archive, restore, and live-content edits call the frontend revalidation endpoint when backend revalidation env vars are configured.
- Default production Docker wiring points the backend to `http://frontend:3000/api/revalidate`.
- `docker-compose.yml` maps the same root `.env` secret into both:
  - backend `FRONTEND_REVALIDATE_TOKEN`
  - frontend `REVALIDATE_TOKEN`
- Stable public surfaces now use a mixed strategy: homepage, sitemap, and lightweight taxonomy directories can use bounded ISR, while backend-sensitive listings and detail pages still remain dynamic where that is safer today.
- The tag-based revalidation hook is already active for the current selective ISR surfaces and remains the migration path for broader cache rollout later.

## Migration And Backfill
- Legacy `Announcement` data remains available during transition.
- Use `backend/scripts/backfill-posts.ts` to map legacy announcements into `posts`.
- Use `backend/scripts/audit-content-migration.ts` after migration to verify coverage and content quality.
- Safe check:
  `npm run backfill:posts -- --dry-run`
- Real import:
  `npm run backfill:posts`

The migration commands now also accept:
- `--uri <mongodb-uri>`
- `--db-name <database>`
- `--report <path>` or `--out <path>` for JSON reports

Run the dry run first in staging, confirm counts, then execute the live import.
See `docs/migration-runbook.md` for the full sequence.

## Validation Commands

### Backend
```bash
npm run build
npm run test:ci
npm run lint
```

### Frontend
```bash
npm run build
npm run lint
```

### Admin
```bash
npm run build
npm run lint
```

## CI
- `.github/workflows/ci.yml` runs backend lint/build/tests, frontend lint/build, and admin lint/build.
- The CI workflow also validates production and dev compose rendering so obvious deploy YAML regressions fail before merge.
- `.github/workflows/security.yml` runs reusable npm audit checks.
- `.github/workflows/codeql.yml` runs standalone CodeQL scanning for pull requests and the scheduled weekly scan.
- `.github/workflows/deploy.yml` deploys automatically after `CI` succeeds on a `push` to `main`, using native OpenSSH from the runner instead of a third-party SSH action wrapper.

Release gating detail:
- Production deploy gating is currently the `CI` workflow only.
- `Security` and `CodeQL` continue to run, but they are not part of the `workflow_run` chain that triggers production deploys.
- The deploy workflow checks out the exact triggering commit SHA, performs runner-side SSH validation, uploads the current remote deploy entrypoint, runs a remote preflight that validates compose rendering against that exact target SHA, and then deploys the same SHA on the droplet.

## Health And Readiness
- Backend health:
  `/api/health`
- Backend readiness alias:
  `/api/healthz`
- Backend deep readiness:
  `/api/health/deep`
- Edge or proxy health:
  `/healthz`

Health responses now include non-secret runtime diagnostics for:
- Prisma/PostgreSQL readiness
- legacy Mongo/Cosmos bridge presence
- metrics endpoint protection
- frontend revalidation wiring
- startup warnings for incomplete production wiring

Deployment scripts now verify:
- `/api/health`
- `/api/health/deep`
- `/`
- `/jobs`
- `/results`
- `/admin`
- optional authenticated internal frontend `/api/revalidate` smoke check when `FRONTEND_REVALIDATE_TOKEN` is configured

## Rollback Guidance
- Application rollback: revert the offending commit on `main` and let GitHub Actions redeploy, or use the `previous_sha` printed in the deploy summary to restore the prior checkout and rerun the remote deploy flow.
- Content rollback: use post history plus version notes, update or unpublish the affected post, then republish after verification.
- Cache rollback: frontend revalidation can be called again after restoring a previous content state.

## Production Notes
- Do not run production with the default `JWT_SECRET`.
- Do not treat missing `POSTGRES_PRISMA_URL` as recoverable. The current structured content/editorial runtime is Postgres-first.
- Keep frontend and backend revalidation tokens aligned.
- Keep the public and admin URLs consistent with Nginx and deployment environment variables.
- Prefer staging validation after schema or editorial workflow changes before promoting to production.
- The server root `.env` is the only supported source of production runtime secrets. The deploy workflow no longer injects application env values from GitHub.
- `DO_HOST_FINGERPRINT` and `DO_REPO_DIR` are required GitHub variables for production deploys.
- The production checkout must already exist and remain clean. Deploy will not clone, discover alternate paths, create `.env`, or recover env values from running containers.
