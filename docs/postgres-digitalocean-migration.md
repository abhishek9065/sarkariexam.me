# PostgreSQL Migration: Neon to DigitalOcean Managed PostgreSQL

This runbook moves the production Prisma PostgreSQL database from Neon to DigitalOcean Managed PostgreSQL during a maintenance window.

## Prerequisites

- DigitalOcean Managed PostgreSQL cluster is created in the same region as the production droplet when possible.
- Production droplet and migration workstation are added to the database trusted sources.
- DigitalOcean target connection string starts with `postgresql://` and includes `sslmode=require`.
- Admin/editorial writes are frozen for the maintenance window.
- `pg_dump`, `pg_restore`, `psql`, Node.js, and npm are installed on the migration host.

## Preflight

- Confirm the current production SHA is healthy aside from database work.
- Confirm DigitalOcean connectivity from the droplet or migration host:

```bash
psql "postgresql://USER:PASSWORD@HOST:25060/DB?sslmode=require" -c "select version();"
```

- Confirm the Neon source is reachable:

```bash
psql "$NEON_URL" -c "select now();"
```

## Maintenance Window

- Enable maintenance mode or disable admin/editorial writes.
- Pause deploys until the migration completes.
- Keep Neon available until the rollback window closes.

## Migration (Scripted)

Run from the repository root:

```bash
NEON_URL='postgresql://source-user:source-password@source-host/source-db?sslmode=require' \
DO_POSTGRES_URL='postgresql://target-user:target-password@target-host:25060/target-db?sslmode=require' \
bash scripts/migrate-postgres-neon-to-digitalocean.sh --confirm-maintenance
```

The script:

- checks source and target connectivity without printing credentials;
- creates a custom-format dump from Neon;
- restores it into DigitalOcean with `--clean --if-exists --no-owner --no-acl`;
- compares public table row counts before and after restore;
- runs `prisma migrate deploy` and `prisma validate` against the DigitalOcean URL.

To retry from an existing dump:

```bash
NEON_URL='postgresql://source...' \
DO_POSTGRES_URL='postgresql://target...' \
bash scripts/migrate-postgres-neon-to-digitalocean.sh \
  --confirm-maintenance \
  --skip-dump \
  --dump-file .data/postgres-migration/neon-to-digitalocean-YYYYMMDDTHHMMSSZ.dump
```

## Migration (Manual pg_dump/pg_restore)

Dump Neon at a point in time:

```bash
pg_dump "$NEON_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file=neon-to-do-$(date +%Y%m%d%H%M%S).dump
```

Restore into DigitalOcean:

```bash
pg_restore \
  --dbname "$DO_POSTGRES_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --verbose \
  neon-to-do-*.dump
```

Validate Prisma migrations against DigitalOcean:

```bash
cd /var/www/sarkariexam.me/backend
POSTGRES_PRISMA_URL="$DO_POSTGRES_URL" DATABASE_URL="$DO_POSTGRES_URL" \
  POSTGRES_DIRECT_URL="" DIRECT_URL="" npm run prisma:migrate:deploy
POSTGRES_PRISMA_URL="$DO_POSTGRES_URL" DATABASE_URL="$DO_POSTGRES_URL" \
  POSTGRES_DIRECT_URL="" DIRECT_URL="" npm run prisma:validate
```

## Cutover

After the script succeeds, update `/var/www/sarkariexam.me/.env` on the production droplet:

```dotenv
POSTGRES_PRISMA_URL=postgresql://target-user:target-password@target-host:25060/target-db?sslmode=require
DATABASE_URL=postgresql://target-user:target-password@target-host:25060/target-db?sslmode=require
POSTGRES_DIRECT_URL=
DIRECT_URL=
```

Leave `POSTGRES_DIRECT_URL` and `DIRECT_URL` blank for DigitalOcean unless you intentionally provision a separate direct URL.

Then run:

```bash
cd /var/www/sarkariexam.me
DO_REPO_DIR=/var/www/sarkariexam.me bash scripts/deploy-live.sh --mode fast --sha <target-sha> --preflight-only
DO_REPO_DIR=/var/www/sarkariexam.me bash scripts/deploy-live.sh --mode fast --sha <target-sha>
bash scripts/verify-deployment.sh
```

## Verification

- Compare `select count(*)` on key tables before and after restore.
- Confirm `_prisma_migrations` exists and `prisma migrate deploy` is a no-op or succeeds.
- Check public health endpoints: `/api/livez`, `/api/readyz`, `/api/health`, `/api/health/deep`.
- Smoke test `/`, `/jobs`, `/results`, `/admin`.
- Log into admin and perform a low-risk read/write if maintenance policy allows.
- Confirm no `P1013`, `P1001`, or backend 502 errors post-deploy.

## Rollback

If restore or deployment fails before writes resume, restore the previous Neon values in `.env` and redeploy the previous known-good SHA.

If writes have already resumed on DigitalOcean, do not roll back blindly. First decide whether to preserve new writes or repeat migration.
