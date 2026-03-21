# Sarkari Result - Copilot Instructions

## Project Overview

This is a full-stack government jobs portal (Sarkari Result) built with TypeScript. It aggregates job listings, exam results, admit cards, and answer keys for Indian government positions.

## Architecture

- **Frontend** (public-facing SPA): React 19 + TypeScript + Vite (in `frontend/`)
- **Frontend Next** (Next.js public-facing app): Next.js 16 + React 19 + TypeScript (in `frontend-next/`)
- **Admin Frontend** (admin SPA): React 19 + TypeScript + Vite (in `admin-frontend/`)
- **Backend**: Node.js 22 + Express + TypeScript (in `backend/`)
- **Database**: MongoDB for local development; Azure Cosmos DB (MongoDB API) in production
- **Reverse Proxy**: Nginx (in `nginx/`)
- **Deployment**: Docker + Docker Compose on DigitalOcean

## Development Commands

### Backend (`cd backend`)
- `npm run dev` — Start dev server with hot reload (tsx watch)
- `npm run build` — Compile TypeScript to `dist/`
- `npm start` — Run production server
- `npm run lint` — Run ESLint
- `npm test` — Run unit tests (Vitest)

### Frontend (`cd frontend`)
- `npm run dev` — Start Vite dev server (port 5173)
- `npm run build` — Production build to `dist/`
- `npm run preview` — Preview production build
- `npm run lint` — Run ESLint
- `npm run test:e2e` — Run Playwright E2E tests
- `npm run test:e2e:admin` — Run admin-specific E2E tests

### Admin Frontend (`cd admin-frontend`)
- `npm run dev` — Start Vite dev server
- `npm run build` — Production build to `dist/`
- `npm run preview` — Preview production build
- `npm run lint` — Run ESLint
- `npm run test:e2e:ci` — Run Playwright smoke tests (CI)
- `npm run test:e2e:full` — Run full Playwright E2E suite
- `npm run test:e2e:integration` — Run integration E2E tests

### Frontend Next (`cd frontend-next`)
- `npm run dev` — Start Next.js dev server
- `npm run build` — Production build
- `npm start` — Run production server
- `npm run lint` — Run ESLint

## Key Directories

```
backend/src/
├── routes/        # Express route handlers (auth, jobs, admin, etc.)
├── models/        # MongoDB document schemas and mock data
├── middleware/     # Auth, security, rate limiting, caching, CSRF
├── services/      # Business logic (DB, email, analytics, RBAC, audit)
└── tests/         # Vitest unit tests

backend/tests/      # Additional Vitest integration tests

frontend/src/
├── pages/         # Page components (Home, Detail, Admin, etc.)
├── components/    # UI components organized by category
├── context/       # React Context providers (Auth, Theme, Language)
└── hooks/         # Custom hooks for data fetching and UI logic

frontend/tests/     # Playwright E2E test specs

admin-frontend/src/
├── app/           # App-level providers and layout (AdminLayout, RequireAdminAuth)
├── modules/       # Feature modules (analytics, approvals, manage-posts, settings, etc.)
├── components/    # Shared admin UI components
├── routes/        # Route definitions (AppRoutes)
├── config/        # Module registry (adminModules.ts)
├── lib/           # Shared utilities and helpers
└── types/         # TypeScript type definitions

admin-frontend/tests/  # Playwright E2E test specs for admin

frontend-next/app/
├── components/    # Shared UI components (Header, Footer, etc.)
├── lib/           # Shared utilities
└── [route]/       # Next.js App Router page directories (jobs, results, admit-cards, etc.)
```

## Coding Conventions

- Use TypeScript for all source files (both frontend and backend).
- Use Zod for request validation in backend routes.
- Use React Query (TanStack) for data fetching on the frontend.
- Use React Context for global state (auth, theme, language).
- Follow existing ESLint configurations in each workspace.
- Backend API routes are prefixed with `/api/`.
- Use environment variables for all secrets and configuration (see `.env.example`).

## Testing

- **Backend**: Vitest for unit/integration tests in `backend/src/tests/` and `backend/tests/`.
- **Frontend**: Playwright for E2E tests in `frontend/tests/`.
- **Admin Frontend**: Playwright for E2E tests in `admin-frontend/tests/`.
- CI runs backend build + tests, frontend build, and Playwright smoke tests on PRs.

## Security Considerations

- Admin routes require JWT + optional 2FA (TOTP).
- Rate limiting is applied to auth and admin endpoints.
- CSRF protection is enabled for state-changing requests.
- Helmet middleware sets security headers.
- Admin features include dual-approval workflows, step-up authentication, and audit logging.
