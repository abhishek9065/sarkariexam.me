# Fast Deploy

Production deploys now use a pull-only release flow:
- GitHub Actions build and publish Docker images to DigitalOcean Container Registry
- the droplet `git pull`s the repo for scripts and compose changes
- the deploy scripts run `docker compose pull` and `docker compose up --no-build`

That removes the slowest part of the old flow: rebuilding Next.js and backend images on a `1 vCPU / 1 GB` droplet.

GitHub Actions is the only supported production release entrypoint.

## Default Release

```bash
git push origin main
```

The server-side scripts in `scripts/` are still required because the GitHub deploy workflow invokes `scripts/deploy-live.sh` on the droplet over SSH.

## Modes

Fast mode is the default:
- pulls the target image tag from DigitalOcean Container Registry
- restarts Docker services with `--no-build`
- runs compact backend checks plus representative public route checks
- optionally purges Cloudflare cache

Fast public verification includes:
- `/api/health`
- `/api/health/deep`
- `/`
- `/jobs`
- `/results/upsc-civil-services-2025-final-result`
- `/admin`
- optional authenticated `/api/revalidate` smoke check when `FRONTEND_REVALIDATE_TOKEN` is configured

Full mode uses the same pull-only image path, then runs deeper verification for the homepage, representative public pages, and the admin console.
Use the `Deploy to Production` GitHub Actions manual dispatch if you need to choose `fast` or `full`.

## Image Tags

The default image tag is the checked-out `main` commit SHA on the server. If that exact tag is unavailable, deploy scripts fall back to the stable `main` tag.

If you need to override the tag, use the `image_tag` input on the `Deploy to Production` GitHub Actions workflow dispatch.

## Required Configuration

GitHub Actions secrets:
- `DOCR_REGISTRY_NAME`
- `DOCR_TOKEN`
- `DO_HOST`
- `DO_USER`
- `DO_SSH_KEY`
- optional `DO_PORT`

Server root `.env`:
- `DOCR_REGISTRY_NAME`
- `DOCR_ACCESS_TOKEN`
- optional `DOCR_USERNAME`
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

The server root `.env` is the production source of truth for deploy scripts and `docker-compose.production.yml`.
Do not treat `backend/.env` or `frontend/.env.local` as production Docker config.

## Files

- `docker-compose.production.yml`: pull-only production runtime definition
- `scripts/deploy-common.sh`: shared production deploy helpers
- `scripts/deploy-fast.sh`: fast production deploy
- `scripts/deploy-prod.sh`: full production deploy
- `scripts/deploy-live.sh`: server-side entrypoint used by GitHub Actions deploy over SSH
- `docker-compose.fast.yml`: local build override, not used by production deploys

## Troubleshooting

If a deploy fails:
1. Re-run in full mode.
2. Check the server deploy log at `/tmp/sarkari-result-deploy.log`.
3. Check container logs with `docker compose -f docker-compose.production.yml logs`.
4. Verify the required registry secrets and server `.env` values exist.
