# Deploy Incident FAQ

A compact operator guide for common deployment failures and first-response actions.

## 1) Host fingerprint mismatch

Symptoms:
- Deploy fails in `prepare-ssh` or `validate-config`.
- Error references `DO_HOST_FINGERPRINT` mismatch.

What to do:
- Re-verify droplet host key fingerprint on the server.
- Update `DO_HOST_FINGERPRINT` in the relevant GitHub environment (`staging` or `production`).
- Re-run `Deploy Preflight` before running production deploy.

## 2) Missing or wrong DO_REPO_DIR

Symptoms:
- Deploy fails before remote preflight.
- Error references missing or invalid `DO_REPO_DIR`.

What to do:
- Set absolute repo path in environment variable `DO_REPO_DIR`.
- Confirm path contains `.git`, `docker-compose.yml`, and deploy scripts.
- Re-run `Deploy Preflight` to validate only.

## 3) Root .env validation failure

Symptoms:
- Deploy fails in `validate-env`.
- Errors reference missing required vars or placeholder values.

What to do:
- Fix root `.env` in target checkout.
- Ensure required values are real production values:
  - `JWT_SECRET`
  - `POSTGRES_PRISMA_URL` or `DATABASE_URL`
- If legacy bridge is required, ensure `LEGACY_MONGO_REQUIRED=true` has matching legacy DB vars.
- Re-run preflight:

```bash
DO_REPO_DIR=/absolute/path/to/repo bash scripts/deploy-live.sh --mode fast --sha <40-char-sha> --preflight-only
```

## 4) Readiness/liveness failing after restart

Symptoms:
- `/api/readyz` or `/api/health/deep` fails during `public-checks`.

What to do:
- Check backend logs first:

```bash
docker compose --project-name sarkari-result --env-file .env logs --tail 200 backend
```

- Verify PostgreSQL connectivity and migration state.
- Validate runtime diagnostics via:
  - `/api/livez`
  - `/api/readyz`
  - `/api/health`
  - `/api/health/deep`

## 5) Need immediate rollback

Preferred helper path:

```bash
cd /absolute/path/to/repo
bash scripts/rollback-last.sh
bash scripts/rollback-last.sh --yes
```

Manual SHA rollback:

```bash
DO_REPO_DIR=/absolute/path/to/repo bash scripts/deploy-live.sh --mode fast --sha <previous_sha>
```

Rollback source of truth:
- `.deploy-state/last-release.env`

## 6) Which workflow should I run?

- `Deploy Preflight`: validate target SHA + env + compose wiring without restart.
- `Deploy to Production`: live rollout path, triggered only after CI success on push to main.

## 7) Lost admin credentials

Use password recovery first (preferred):
- Open admin login and request password recovery for the account email.
- If email delivery is unavailable, use the token path in the login UI (`Have recovery token?`).

Break-glass account recovery (last resort):

```bash
cd /absolute/path/to/repo/backend
npm run recover:admin -- --email <admin-email> --actor <operator-id> --reason "incident recovery" --confirm <ADMIN_RECOVERY_CONFIRM_TOKEN> --password '<StrongPassword123!>'
```

Safety controls:
- Requires `ADMIN_RECOVERY_CONFIRM_TOKEN`.
- Use `--if-no-admin` to restrict execution to bootstrap scenarios only.
- Use `--dry-run` before live execution.

## 8) Need data backup before risky change

Create a durable Postgres backup and metadata entry:

```bash
cd /absolute/path/to/repo/backend
npm run backup:postgres -- --actor <operator-id> --reason "pre-deploy snapshot"
```

Notes:
- Dumps are stored under `DATA_BACKUP_DIR` (default `backend/.data/backups`).
- Metadata is recorded in `manifest.json` for admin visibility.
- Ensure `pg_dump` is available on the host.

## 9) Need data restore after bad deploy/content incident

Restore from backup metadata id:

```bash
cd /absolute/path/to/repo/backend
npm run restore:postgres -- --actor <operator-id> --reason "incident rollback" --backup-id <backup_id> --drop-schema
```

Or restore from an explicit file path:

```bash
cd /absolute/path/to/repo/backend
npm run restore:postgres -- --actor <operator-id> --reason "manual restore" --file /absolute/path/to/backup.dump --drop-schema
```

Verification after restore:
- Run API health checks (`/api/livez`, `/api/readyz`).
- Validate critical auth and editorial flows.
- Confirm expected content history and audit records in admin.
