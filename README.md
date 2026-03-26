# SarkariExams.me

Public government jobs and exam updates platform.

## Apps
- `backend/`: Express 5 + TypeScript API
- `frontend-v2/`: Next.js public frontend
- `nginx/`: edge routing and production proxy config

## Core Features
- Jobs, results, admit cards, answer keys, syllabus, and admissions
- Search, filtering, bookmarks, profile utilities, and subscriptions
- MongoDB/Cosmos DB backed content APIs
- Docker-based production deployment

## Local Development

### Backend
```bash
cd backend
npm install
npm run dev
```

### Public Frontend
```bash
cd frontend-v2
npm install
npm run dev
```

## Environment

### Root `.env` for production deploys
```env
COSMOS_CONNECTION_STRING=...
JWT_SECRET=...
METRICS_TOKEN=
```

### Backend
```env
COSMOS_CONNECTION_STRING=mongodb://localhost:27017/sarkari_db
COSMOS_DATABASE_NAME=sarkari_db
JWT_SECRET=change-me
PORT=5000
CORS_ORIGINS=http://localhost:3000,https://your-domain.example,https://www.your-domain.example
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=200
AUTH_RATE_LIMIT_MAX=20
```

## Verification

### Backend
```bash
cd backend
npm run build
npm run lint
npm run test:ci
```

### Public Frontend
```bash
cd frontend-v2
npm run build
npm run lint
```

## Deployment

Recommended guarded deploy:

```bash
cd ~/your-repo
bash scripts/deploy-prod.sh
```

The script validates required production env vars, rebuilds the public services, checks backend health, purges Cloudflare cache when configured, and verifies the main public routes after startup.

## Repository Layout
```text
backend/        Express API
frontend-v2/  Next.js public frontend
docs/           deployment and ops docs
scripts/        deployment and maintenance scripts
nginx/          edge routing
```

## License
MIT
