# Deployment Notes

## Services
- `backend`: Express + TypeScript API, editorial workflow, content APIs, migration scripts.
- `frontend`: Next.js public site, API-driven rendering, sitemap and robots generation, revalidation endpoint, and live email subscription forms.
- `admin-next`: Next.js editorial CMS with taxonomy management and alert subscriber operations.
- `nginx`: reverse proxy and public ingress.

## Important Environment Variables

### Backend
- `COSMOS_CONNECTION_STRING` or `MONGODB_URI`
- `COSMOS_DATABASE_NAME`
- `JWT_SECRET`
- `FRONTEND_URL`
- `FRONTEND_REVALIDATE_URL`
- `FRONTEND_REVALIDATE_TOKEN`
- `CORS_ORIGINS`
- `METRICS_TOKEN`

### Frontend
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_ADMIN_URL`
- `REVALIDATE_TOKEN`
- `CONTENT_CACHE_REVALIDATE_SECONDS`

## Revalidation Flow
- The frontend now includes a protected `/api/revalidate` endpoint plus shared content-tag conventions.
- Editorial publish, unpublish, archive, restore, and live-content edits call the frontend revalidation endpoint when backend revalidation env vars are configured.
- Default docker wiring points the backend to `http://frontend:3000/api/revalidate`.
- Public pages remain request-time rendered today because the current Docker and CI build topology does not guarantee a live backend during frontend compilation.
- The tag-based revalidation hook is therefore scaffolded and ready for a later selective ISR rollout after build and runtime networking are separated cleanly.

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
- `.github/workflows/security.yml` runs npm audit and CodeQL.
- `.github/workflows/deploy.yml` deploys only after production image publication succeeds or via explicit manual dispatch on `main`.

## Health And Readiness
- Backend health:
  `/api/health`
- Backend deep readiness:
  `/api/health/deep`
- Edge or proxy health:
  `/healthz`

Deployment scripts already wait for backend health and perform basic public-page readiness checks.

## Rollback Guidance
- Application rollback: redeploy the previous image tag.
- Content rollback: use post history plus version notes, update or unpublish the affected post, then republish after verification.
- Cache rollback: frontend revalidation can be called again after restoring a previous content state.

## Production Notes
- Do not run production with the default `JWT_SECRET`.
- Keep frontend and backend revalidation tokens aligned.
- Keep the public and admin URLs consistent with Nginx and deployment environment variables.
- Prefer staging validation after schema or editorial workflow changes before promoting to production.
