# SarkariExams.me - Copilot Instructions

## Project Overview

This is a public government jobs and exam updates platform built with TypeScript. The live product surface is the Next.js app in `frontend-v2/`, backed by the Express API in `backend/`. The repository also contains an admin console in `admin-next/`.

## Architecture

- **Public frontend**: Next.js 16 + React 19 (in `frontend-v2/`)
- **Admin frontend**: Next.js 15 + React 19 (in `admin-next/`)
- **Backend**: Node.js 22 + Express + TypeScript (in `backend/`)
- **Database**: MongoDB locally; Azure Cosmos DB (MongoDB API) in production
- **Reverse proxy**: Nginx (in `nginx/`)
- **Deployment**: Docker Compose on DigitalOcean

## Development Commands

### Backend (`cd backend`)
- `npm run dev` — Start the API with hot reload
- `npm run build` — Compile TypeScript to `dist/`
- `npm start` — Run the production build
- `npm run lint` — Run ESLint
- `npm test` — Run Vitest
- `npm run test:ci` — Run Vitest plus OpenAPI parity checks

### Public Frontend (`cd frontend-v2`)
- `npm run dev` — Start the Next.js dev server
- `npm run build` — Production build
- `npm start` — Run the production server
- `npm run lint` — Run ESLint

### Admin Frontend (`cd admin-next`)
- `npm run dev` — Start the Next.js dev server on port 3001
- `npm run build` — Production build
- `npm start` — Run the production server on port 3001
- `npm run lint` — Run ESLint

## Key Directories

```text
backend/src/
├── routes/        # Express route handlers (auth, jobs, admin, etc.)
├── models/        # MongoDB/Cosmos data access
├── middleware/    # Auth, security, rate limiting, caching, CSRF
├── services/      # Business logic (analytics, notifications, workflow, AI)
└── tests/         # Vitest test suite

backend/tests/      # Additional test setup and integration coverage

frontend-v2/app/    # Public Next.js App Router pages
frontend-v2/components/
frontend-v2/lib/

admin-next/app/     # Admin Next.js App Router pages
admin-next/components/
admin-next/lib/

nginx/              # Proxy and edge config
scripts/            # Deploy and maintenance scripts
```

## Conventions

- Use TypeScript for all source files.
- Use Zod for backend request validation.
- Keep backend routes under `/api/`.
- Prefer same-origin API calls from frontend apps unless deployment requires otherwise.
- Keep repo docs and workflows aligned with the active `backend + frontend-v2 + admin-next + nginx` stack.
- Do not document removed legacy apps unless they still exist in the repository.

## Testing

- **Backend**: Vitest for unit and integration tests
- **Public frontend**: ESLint and Next production build
- **Admin frontend**: ESLint and Next production build
- CI runs backend lint/build/tests plus frontend lint/build on PRs and `main`

## Security Considerations

- Admin routes require JWT-based authentication and admin authorization
- Rate limiting is applied to auth and API endpoints
- CSRF protection is enabled for state-changing requests
- Security headers are applied in backend middleware
- Production deploys are expected to use environment variables from `.env` or GitHub secrets
