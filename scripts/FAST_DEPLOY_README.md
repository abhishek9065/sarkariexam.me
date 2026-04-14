# Fast Deploy

Production deploys now use a GitHub Actions driven rebuild flow:
- GitHub Actions runs CI and security checks
- the deploy workflow SSHes into the droplet after those checks pass
- the droplet `git pull`s the repo for scripts and compose changes
- the deploy scripts rebuild Docker services locally on the droplet and restart them

That removes the external registry dependency from the production release path while keeping GitHub Actions as the only supported deploy trigger.

GitHub Actions is the only supported production release entrypoint.

## Default Release

```bash
git push origin main
```

The server-side scripts in `scripts/` are still required because the GitHub deploy workflow invokes `scripts/deploy-live.sh` on the droplet over SSH.

## Modes

Fast mode is the default:
- rebuilds backend first so API readiness is established early
- rebuilds frontend, admin, and nginx from the checked-out repo
- restarts Docker services after the rebuild
- runs compact backend checks plus representative public route checks
- optionally purges Cloudflare cache

Fast public verification includes:
- `/api/health`
- `/api/health/deep`
- `/`
- `/jobs`
- `/results/upsc-civil-services-2025-final-result`
- `/admin`
- optional authenticated internal frontend `/api/revalidate` smoke check when `FRONTEND_REVALIDATE_TOKEN` is configured

Full mode uses the same GitHub-triggered rebuild path, then runs deeper verification for the homepage, representative public pages, the admin console, and internal frontend revalidation.
Use the `Deploy to Production` GitHub Actions manual dispatch if you need to choose `fast` or `full`.

## Required Configuration

GitHub Actions secrets:
- `DO_HOST`
- `DO_USER`
- `DO_SSH_KEY`
- optional `DO_PORT`

Server root `.env`:
- `COSMOS_CONNECTION_STRING`
- `JWT_SECRET`
- recommended `COSMOS_DATABASE_NAME`
- recommended `FRONTEND_URL`
- recommended `CORS_ORIGINS`
- recommended `FRONTEND_REVALIDATE_URL`
- recommended `FRONTEND_REVALIDATE_TOKEN`
- recommended `METRICS_TOKEN`
- optional `CF_ZONE_ID`
- optional `CF_API_TOKEN`
- optional `DD_API_KEY`

The server root `.env` is the production source of truth for deploy scripts and `docker-compose.yml`.
Do not treat `backend/.env` or `frontend/.env.local` as production Docker config.

## Files

- `docker-compose.yml`: production runtime and build definition used by GitHub Actions deploys
- `scripts/deploy-common.sh`: shared production deploy helpers
- `scripts/deploy-fast.sh`: fast production deploy
- `scripts/deploy-prod.sh`: full production deploy
- `scripts/deploy-live.sh`: server-side entrypoint used by GitHub Actions deploy over SSH
- `docker-compose.fast.yml`: local build override, not used by production deploys

## Troubleshooting

If a deploy fails:
1. Re-run in full mode.
2. Check the server deploy log at `/tmp/sarkari-result-deploy.log`.
3. Check container logs with `docker compose -f docker-compose.yml logs`.
4. Verify the required deploy secrets and server `.env` values exist.
