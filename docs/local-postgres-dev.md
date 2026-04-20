# Local PostgreSQL Development

This guide explains how to set up the Sarkari Result application for local development using a PostgreSQL-first architecture. We have removed the legacy MongoDB dependency for the core runtime, making the setup significantly lighter and strictly relational.

## Prerequisites

- **Node.js**: v22 or higher
- **Docker**: For running the local PostgreSQL database
- **npm**: Or your preferred package manager

## 1. Start the Local Database

We use Docker Compose to spin up a local PostgreSQL instance isolated for development.

```bash
docker compose -f docker-compose.dev.yml up -d postgres
```

*This will start a PostgreSQL 16 container exposed on port `5432` with the database `sarkari_content`.*

## 2. Environment Configuration

In the `backend` directory, create or update your `.env` file to point to the local database:

```env
PORT=4000
NODE_ENV=development
POSTGRES_PRISMA_URL=postgresql://postgres:postgres@localhost:5432/sarkari_content?schema=public
JWT_SECRET=dev-secret-123
```

*(Note: `COSMOS_CONNECTION_STRING` or `MONGODB_URI` are no longer required for starting the backend. If omitted, the server still starts normally and only compatibility-only legacy surfaces (backup metadata, security audit history, migration scripts) become unavailable.)*

## 3. Database Migration and Generation

Before starting the server, apply the database schema to your local PostgreSQL instance and generate the Prisma Client.

Run the following inside the `backend` directory:

```bash
# Apply migrations to your local database
npm run prisma:migrate:dev

# Generate the TypeScript Prisma client
npm run prisma:generate
```

## 4. Seeding Data (Optional)

If you need mock data for development, you can use the Prisma studio or custom seed scripts.

```bash
# Open Prisma Studio to manually insert or view data
npm run prisma:studio
```

## 5. Start the Application

Start the backend API:

```bash
npm run dev
```

The server should log that it is connected to PostgreSQL and bypass the legacy Cosmos/Mongo bridge. 

## Legacy MongoDB Transition

The application is in the process of fully migrating off MongoDB. The following compatibility-only surfaces still use the legacy bridge when configured:
- Admin backup metadata collection access
- Security audit history collection access
- Migration and backfill scripts that read legacy Mongo/Cosmos collections

For 95% of frontend and backend content development, **PostgreSQL is all you need.**
