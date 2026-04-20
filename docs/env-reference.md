# Environment Variable Reference

This document outlines the environment variables used across the Sarkari Result platform. 

## Backend Configuration (`backend/.env`)

### Core Application Settings

| Variable | Description | Default | Required? |
|----------|-------------|---------|-----------|
| `PORT` | The port the backend server listens on. | `4000` | No |
| `NODE_ENV` | Environment mode (`development`, `production`, `test`). | `development` | No |
| `FRONTEND_URL` | Base URL of the frontend app (used for CORS and emails). | `http://localhost:3000` | Yes |

### Database Connections (PostgreSQL First)

| Variable | Description | Example | Required? |
|----------|-------------|---------|-----------|
| `POSTGRES_PRISMA_URL` | **Primary** database connection string for Prisma. | `postgresql://postgres:postgres@localhost:5432/sarkari_content?schema=public` | **Yes** |
| `POSTGRES_DIRECT_URL` | Direct connection string for Prisma migrations (often needed for Neon). | `postgresql://...` | No (unless using Neon/PgBouncer) |
| `DATABASE_URL` | Fallback alias for `POSTGRES_PRISMA_URL`. | | No |

### Legacy Database Connections (Deprecation Path)

*These variables are only required if you are actively working on legacy compatibility routes or old automated background jobs. For core content development, they can be omitted.*

| Variable | Description | Required? |
|----------|-------------|-----------|
| `COSMOS_CONNECTION_STRING` | Connection string for Azure Cosmos DB (Mongo API) or standard MongoDB. | No |
| `MONGODB_URI` | Alias/fallback for standard MongoDB connection. | No |
| `COSMOS_DATABASE_NAME` | Database name for the legacy system. | No |

### Security & Authentication

| Variable | Description | Required? |
|----------|-------------|-----------|
| `JWT_SECRET` | Secret key used to sign JSON Web Tokens. | **Yes** |
| `JWT_EXPIRY` | Duration until JWT expires (e.g., `1d`, `12h`). | No (default: `1d`) |
| `CORS_ORIGINS` | Comma-separated list of allowed origins. | No |
| `RATE_LIMIT_MAX` | Max requests per IP within the window. | No (default: `200`) |
| `AUTH_RATE_LIMIT_MAX` | Max auth-specific requests per IP. | No (default: `20`) |

### Third-Party Services (Optional in Dev)

| Variable | Description | Required? |
|----------|-------------|-----------|
| `SENDGRID_API_KEY` | API key for sending emails via SendGrid. | No |
| `SENTRY_DSN` | DSN for error tracking in Sentry. | No |
| `DD_API_KEY` | Datadog API key for metrics and logging. | No |
| `UPSTASH_REDIS_REST_URL` | URL for Upstash Redis (caching/rate limiting). | No |
| `UPSTASH_REDIS_REST_TOKEN` | Token for Upstash Redis. | No |

### Feature Flags & Observability

| Variable | Description | Required? |
|----------|-------------|-----------|
| `METRICS_TOKEN` | Bearer token to protect the `/metrics` endpoint. If omitted in prod, metrics are disabled. | No |
| `FRONTEND_REVALIDATE_URL` | Endpoint to trigger Next.js cache revalidation. | No |
| `FRONTEND_REVALIDATE_TOKEN` | Secret token to authenticate revalidation requests. | No |

---

## Frontend Configuration (`frontend/.env.local`)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | The public URL of the backend API. | `http://localhost:4000/api` |
| `NEXT_PUBLIC_ADMIN_URL` | The public URL of the admin panel. | `http://localhost:3001/admin` |
| `CONTENT_CACHE_REVALIDATE_SECONDS` | How long Next.js caches content from the DB API. | `300` |
| `REVALIDATE_TOKEN` | Secret token required by the backend to purge frontend caches. | `secret-token-123` |
