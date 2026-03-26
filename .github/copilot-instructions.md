# SarkariExams.me - Copilot Instructions

## Project Overview

This is a public government jobs and exam updates platform built with TypeScript. The live product surface is the Next.js app in `frontend-v2/`, backed by the Express API in `backend/`.

## Architecture

- **Public frontend**: Next.js 16 + React 19 (in `frontend-v2/`)
- **Backend**: Node.js 22 + Express + TypeScript (in `backend/`)
- **Database**: MongoDB locally; Azure Cosmos DB (MongoDB API) in production
- **Reverse Proxy**: Nginx (in `nginx/`)
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

## Key Directories

```text
backend/src/
frontend-v2/app/
nginx/
scripts/
```

## Conventions

- Use TypeScript for all source files.
- Use Zod for backend request validation.
- Keep backend routes under `/api/`.
- Prefer relative same-origin API calls from the frontend unless there is a clear deployment reason not to.
- Keep repo docs and workflows aligned with the active `backend + frontend-v2 + nginx` stack.
