# SarkariExams.me

Public government jobs and exam updates platform.

## Apps
- `backend/`: Express 5 + TypeScript API
- `frontend/`: Vite React frontend
- `frontend-next/`: Next.js public frontend
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

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Frontend Next
```bash
cd frontend-next
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
CORS_ORIGINS=http://localhost:4173,http://localhost:3000,https://your-domain.example,https://www.your-domain.example
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=200
AUTH_RATE_LIMIT_MAX=20
```

### Frontend
```env
VITE_API_BASE=
VITE_PROXY_TARGET=http://localhost:5000
```

### Frontend Next
```env
NEXT_PUBLIC_API_BASE=
```

## Verification

### Backend
```bash
cd backend
npm run build
npm run lint
```

### Frontend
```bash
cd frontend
npm run build
npm run lint
```

### Frontend Next
```bash
cd frontend-next
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
frontend/       Vite React frontend
frontend-next/  Next.js public frontend
docs/           deployment and ops docs
scripts/        deployment and maintenance scripts
nginx/          edge routing
```

## License
MIT
