# Neon Serverless PostgreSQL Local Development

For developers who prefer not to run Docker locally or want to develop against a shared/preview database branch, the Sarkari Result backend fully supports [Neon](https://neon.tech/) Serverless PostgreSQL.

Neon provides branching (similar to Git) for databases, which makes schema migrations and testing incredibly safe and easy.

## 1. Get Your Neon Connection String

1. Log into your Neon console.
2. Select your project and choose your desired branch (e.g., `main` or a specific feature branch).
3. Copy the connection string. It will look something like this:
   `postgresql://username:password@ep-cool-darkness-123456.us-east-2.aws.neon.tech/dbname?sslmode=require`

## 2. Configure Environment Variables

In your `backend/.env` file, replace the local connection string with the Neon connection strings. Prisma requires both a pooled connection (for the app) and a direct connection (for migrations).

Neon provides a pooled connection by default if `-pool` is in the hostname. If not, verify in the Neon dashboard.

```env
# The pooled connection string for runtime queries
POSTGRES_PRISMA_URL=postgresql://username:password@ep-cool-darkness-123456-pool.us-east-2.aws.neon.tech/dbname?sslmode=require

# The direct connection string for schema migrations
POSTGRES_DIRECT_URL=postgresql://username:password@ep-cool-darkness-123456.us-east-2.aws.neon.tech/dbname?sslmode=require
```

## 3. Migrating and Generating

When using Neon, applying migrations is exactly the same as local, but it affects your Neon branch:

```bash
# In the backend directory:
npx prisma migrate dev
npx prisma generate
```

*Because you are using Neon branching, if you make a mistake, you can simply delete the branch in the Neon console and create a new one from `main`.*

## 4. Startup Flow

Run the development server as usual:

```bash
npm run dev
```

The backend health check (`/api/health/deep`) will automatically verify the connection to your Neon database upon startup.

## Why Neon?

- **Zero Local Setup**: No Docker required.
- **Branching**: Test destructive schema changes on a branch without affecting your local standard dataset.
- **Scale to Zero**: Cost-effective for dev environments.

If you experience latency issues when starting the app after a period of inactivity, note that Neon's "Scale to Zero" feature might take 1-2 seconds to wake the compute node. This is expected behavior for dev branches.
