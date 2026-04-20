# Phase 4 Reliability Hardening

This document tracks practical hardening steps implemented in-repo for deployment safety, operational clarity, production readiness, and rollback friendliness.

## 1. Reliability/Ops Improvements Made

- Added explicit API liveness and readiness endpoints:
  - `GET /api/livez`
  - `GET /api/readyz`
- Reduced readiness fragility under load:
  - Added in-memory PostgreSQL readiness cache (`READINESS_CACHE_TTL_MS`, default `3000` ms).
  - Added PostgreSQL health-check timeout (`POSTGRES_HEALTH_TIMEOUT_MS`, default `1500` ms).
  - API request guard now uses cached readiness instead of probing PostgreSQL on every request.
- Strengthened deploy env validation:
  - Deploy now rejects placeholder critical values (`JWT_SECRET`, `POSTGRES_PRISMA_URL`/`DATABASE_URL`, `FRONTEND_REVALIDATE_TOKEN`).
  - Deploy now rejects loopback `FRONTEND_URL` in production deploy flow.
- Increased deploy rollback clarity:
  - Successful deploy writes `.deploy-state/last-release.env` with `DEPLOYED_SHA`, `PREVIOUS_SHA`, timestamp, mode, and repo path.
  - Added `scripts/rollback-last.sh` for safer rollback execution with dry-run default.
- Tightened SSH deploy guardrails:
  - `DO_REPO_DIR` is required; repository auto-discovery is disabled.
  - `DO_HOST_FINGERPRINT` is required and must match scanned host key fingerprints.
  - Added preflight-only mode support in `scripts/deploy-via-ssh.sh` (`DEPLOY_PREFLIGHT_ONLY=1`).
- Added manual staging/production preflight workflow:
  - `.github/workflows/deploy-preflight.yml` (`workflow_dispatch`, environment-scoped, no restart).
- Hardened runtime container defaults in `docker-compose.yml`:
  - Added `init: true` for app/proxy services.
  - Added `security_opt: no-new-privileges:true` for app/proxy services.
  - Added bounded JSON log rotation (`max-size`, `max-file`) for core services.
  - Backend healthcheck now targets `/api/readyz`.
- Expanded operational verification:
  - Deploy scripts now check `/api/livez` and `/api/readyz` in addition to existing checks.
  - `scripts/verify-deployment.sh` now checks liveness/readiness and validates `/metrics` when `METRICS_TOKEN` is configured.
- Added CI-level shell safety checks:
  - Bash syntax validation for critical deploy/ops scripts.
  - `shellcheck` with `--severity=error` for deploy-critical shell scripts.
- Added deploy docs consistency gate in CI:
  - If deploy controls change, at least one operational deploy doc must be updated.
- Added compact incident FAQ:
  - `docs/deploy-incident-faq.md` for first-response operator guidance.

## 2. Remaining Scale Limitations

- Single production droplet remains a single compute failure domain.
- Build-and-restart-on-host deploy model still couples release speed to host build time.
- No in-repo blue/green or canary traffic splitting.
- No queue-backed distributed worker separation for heavier automation workloads yet.
- Database and infra failover/SLA posture still depends on provider-level setup and external ops controls.

## 3. What Should Be Done Outside The Repo

- Provision and maintain separate `staging` and `production` GitHub environments with strict approvals and environment-scoped `DO_*` secrets/vars.
- Enforce branch protection + required status checks policy for mainline deployability.
- Set up infrastructure-level backups and tested restore runbooks (database PITR, droplet snapshots, DNS rollback).
- Configure external observability stack dashboards/alerts (error rates, latency, restart loops, readiness failures, queue lag).
- Add uptime checks and synthetic probes from external locations for `/api/livez`, `/api/readyz`, and key user paths.

## 4. Recommended Final Cleanup Pass

- Evaluate expanding shell linting from deploy-critical scripts to all shell scripts after one clean CI cycle.
- Revisit compose hardening after one stabilization cycle to evaluate safe adoption of stricter runtime constraints (e.g., selective read-only root FS where feasible).
