# Frontend (`frontend/`)

React 19 + TypeScript + Vite application for SarkariExams.me.

## Stack
- React 19
- React Router 7
- TanStack Query 5
- Vite 7
- Playwright 1.58
- PWA via `vite-plugin-pwa`

## Prerequisites
- Node.js 22+
- npm 10+

## Scripts
```bash
npm run dev            # Local dev server on http://localhost:4173
npm run build          # Production build to dist/
npm run preview        # Preview built app
npm run lint           # ESLint (0 warnings allowed)

npm run test:e2e       # Non-prod e2e
npm run test:e2e:ci    # CI deterministic Chromium suite
npm run test:e2e:nightly
npm run test:e2e:prod
```

## Configuration

### API and proxy
- `VITE_API_BASE`:
  - If set, frontend calls `${VITE_API_BASE}/api` directly.
- `VITE_PROXY_TARGET`:
  - Used by Vite dev proxy for `/api` and `/ws`.
  - Default: `http://localhost:5000`.

### Example `.env`
```env
VITE_API_BASE=http://localhost:5000
```

## Development flow
1. Start backend on `http://localhost:5000`.
2. In `frontend/`, run:
```bash
npm install
npm run dev
```
3. Open `http://localhost:4173`.

## Directory map
- `src/components/` UI components
- `src/pages/` route pages
- `src/context/` app contexts + hooks
- `src/utils/` API and shared helpers
- `src/types/` TypeScript models
- `tests/` Playwright test suites

## Notes
- Frontend includes fallback data behavior when backend is unavailable.
- Stable test selectors use `data-testid` and ARIA roles.
