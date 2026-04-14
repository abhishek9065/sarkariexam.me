# Project Guidelines

## Architecture

SarkariExams.me is a TypeScript monorepo with three app surfaces and an edge proxy:

- Public web app: Next.js 16 + React 19 in `frontend/`
- Admin console: Next.js 15 + React 19 in `admin-next/`
- API: Node.js + Express + TypeScript in `backend/`
- Edge/proxy: Nginx in `nginx/`

Data is stored in MongoDB locally and Azure Cosmos DB (MongoDB API) in production.

## Build and Test

Run commands from each package directory.

### Backend (`backend/`)

- `npm run dev` - API dev server (typically port 5000 locally)
- `npm run build` - compile TypeScript to `dist/`
- `npm start` - run production build
- `npm run lint` - ESLint
- `npm test` - Vitest
- `npm run test:ci` - Vitest + OpenAPI parity checks

### Public frontend (`frontend/`)

- `npm run dev` - Next.js dev server (port 3000)
- `npm run build`
- `npm start`
- `npm run lint`

### Admin frontend (`admin-next/`)

- `npm run dev` - Next.js dev server (port 3001)
- `npm run build`
- `npm start`
- `npm run lint`

For deployment/runtime details, prefer links over duplicating docs:

- Root setup: `README.md`
- Public frontend details: `frontend/README.md`
- Proxy config: `nginx/default.conf` (prod), `nginx/nginx-dev.conf` (dev)
- Deployment flow: `.github/workflows/build-publish-images.yml`, `.github/workflows/deploy.yml`
- Server-side deploy scripts used by GitHub Actions: `scripts/deploy-live.sh`, `scripts/deploy-prod.sh`, `scripts/deploy-fast.sh`

## Conventions

- Use TypeScript across backend and frontend code.
- Keep backend endpoints under `/api/`.
- Use Zod schemas to validate backend request input.
- Apply auth middleware for protected/admin routes (`authenticateToken`, `requireAdmin`).
- Keep CSRF protections enabled for state-changing routes.
- Keep docs aligned with the active stack (`backend`, `frontend`, `admin-next`, `nginx`) and avoid documenting removed legacy apps.

## Project-Specific Gotchas

- Frontend and admin call the same API base (`/api`), but run on different local ports (3000 and 3001).
- Backend port differs by environment (commonly 5000 in local dev vs 4000 in Docker/Nginx upstream).
- Next.js versions differ between apps (public app 16, admin app 15). Verify package-specific behavior before cross-app refactors.
- Keep shared domain enums/types in sync across backend and frontend/admin clients.

## Reference Docs

- `docs/CLOUDFLARE_SETUP.md` for DNS/SSL/edge setup
- `docs/GITHUB_GOVERNANCE_CHECKLIST.md` for repository governance
- `docs/changelogs/WEBSITE_FIXES_SUMMARY.md` and `docs/changelogs/BACKEND_FIXES.md` for historical fix context
- `frontend/AGENTS.md` for frontend-specific agent notes
