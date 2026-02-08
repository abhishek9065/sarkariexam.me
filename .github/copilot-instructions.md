# Sarkari Result - Copilot Instructions

## Project Overview

This is a full-stack government jobs portal (Sarkari Result) built with TypeScript. It aggregates job listings, exam results, admit cards, and answer keys for Indian government positions.

## Architecture

- **Frontend**: React 18 + TypeScript + Vite (in `frontend/`)
- **Backend**: Node.js 20 + Express + TypeScript (in `backend/`)
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

## Key Directories

```
backend/src/
├── routes/        # Express route handlers (auth, jobs, admin, etc.)
├── models/        # MongoDB document schemas and mock data
├── middleware/     # Auth, security, rate limiting, caching, CSRF
├── services/      # Business logic (DB, email, analytics, RBAC, audit)
└── tests/         # Vitest unit tests

frontend/src/
├── pages/         # Page components (Home, Detail, Admin, etc.)
├── components/    # UI components organized by category
├── context/       # React Context providers (Auth, Theme, Language)
├── hooks/         # Custom hooks for data fetching and UI logic
└── tests/         # Playwright E2E test specs
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
- CI runs backend build + tests, frontend build, and Playwright smoke tests on PRs.

## Security Considerations

- Admin routes require JWT + optional 2FA (TOTP).
- Rate limiting is applied to auth and admin endpoints.
- CSRF protection is enabled for state-changing requests.
- Helmet middleware sets security headers.
- Admin features include dual-approval workflows, step-up authentication, and audit logging.
