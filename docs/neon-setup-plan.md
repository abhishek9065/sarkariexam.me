# Neon Setup Plan

## Objective
Establish a robust, production-ready PostgreSQL connection architecture using Neon, optimized for Prisma and the Next.js/Express.js stack.

## 1. Required Neon Environment Variables
To operate cleanly, the backend and deployment scripts must be updated to expect the following variables:

*   **`DATABASE_URL`**: The primary connection string used by Prisma for migrations and standard connections.
*   **`POSTGRES_PRISMA_URL`**: (Optional but recommended) Explicit URL for Prisma, useful if distinguishing between pooled and direct connections.
*   **`DIRECT_URL`**: (Crucial for Neon + Prisma) The direct, non-pooled connection string used specifically for running Prisma migrations (`npx prisma migrate`).

*Note: We will remove `COSMOS_CONNECTION_STRING`, `COSMOS_DATABASE_NAME`, and `MONGODB_URI`.*

## 2. Connection-String Expectations
Neon provides both pooled and direct connection strings.

*   **Pooled Connection:** Looks like `postgres://[user]:[password]@[endpoint]-pooler.neon.tech/[dbname]?sslmode=require`. This uses Neon's built-in PgBouncer.
*   **Direct Connection:** Looks like `postgres://[user]:[password]@[endpoint].neon.tech/[dbname]?sslmode=require`.

## 3. Pooled vs. Direct Connection Guidance
*   **Application Runtime (Express/Next.js):** Must use the **Pooled Connection** (`DATABASE_URL`). Because serverless functions (if used in the frontend) and the Express backend can spawn many connections, Neon's connection pooling prevents connection exhaustion on the database.
*   **Prisma Migrations:** Must use the **Direct Connection** (`DIRECT_URL`). Prisma requires a direct connection to acquire advisory locks and apply schema changes safely.

**Prisma Schema Update:**
The `backend/prisma/schema.prisma` should be updated to reflect this:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## 4. Prisma Migration Expectations
*   **Source of Truth:** The `backend/prisma/schema.prisma` is the absolute source of truth.
*   **Workflow:**
    1.  Changes are made to `schema.prisma`.
    2.  `npx prisma migrate dev` is run locally to generate SQL migration files.
    3.  During deployment, `npx prisma migrate deploy` must run against the Neon database using the `DIRECT_URL`.

## 5. Environment Separation
We recommend a strict separation of Neon databases to match the deployment lifecycle:

*   **Local Development:**
    *   Continue using the local `postgres:16` Docker container (`postgresql://postgres:postgres@localhost:5432/sarkari_content?schema=public`). This ensures developers can work offline and without incurring Neon compute costs.
*   **Staging/Preview:**
    *   Use a Neon **Branch**. Neon's branching feature allows us to instantly clone the production database schema (and optionally data) for testing the migration scripts safely.
*   **Production:**
    *   The primary Neon branch (`main`).
    *   Strictly guarded; migrations are applied via automated CI/CD pipelines (GitHub Actions/Deploy Scripts), never manually from a local machine.
