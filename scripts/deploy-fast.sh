#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./deploy-common.sh
source "${SCRIPT_DIR}/deploy-common.sh"

cd "$ROOT_DIR"
install_failure_trap

BACKEND_HEALTH_RESULT="not-run"
PUBLIC_HEALTH_RESULT="not-run"

echo "Using compose project: $COMPOSE_PROJECT_NAME"
echo "=== FAST DEPLOY MODE - Rebuild On Droplet ==="

set_stage "validate-env"
record_diagnosis "Fix the root .env in the production checkout before retrying deployment."
require_env_file
validate_production_env
warn_if_missing_production_runtime_vars
resolve_datadog_services

set_stage "validate-compose"
record_diagnosis "Docker Compose failed to render with the current root .env. Fix compose syntax or missing variables before retrying."
dc config >/dev/null

set_stage "build-images"
record_diagnosis "Docker image build failed. Inspect build logs for backend/frontend/admin/nginx."
COMPOSE_PARALLEL_LIMIT="${COMPOSE_PARALLEL_LIMIT:-1}" dc build --pull backend frontend admin nginx

set_stage "restart-backend"
record_diagnosis "Backend restart failed. Inspect backend image, migrations, and environment wiring."
dc up -d --force-recreate backend

set_stage "wait-backend"
wait_for_service_health backend 60 2
BACKEND_HEALTH_RESULT="container healthcheck ok"

set_stage "restart-web"
record_diagnosis "Frontend/admin/nginx restart failed. Inspect container logs and reverse proxy wiring."
if [[ ${#DATADOG_SERVICES[@]} -gt 0 ]]; then
  dc up -d --force-recreate --remove-orphans nginx admin frontend "${DATADOG_SERVICES[@]}"
else
  dc up -d --force-recreate --remove-orphans nginx admin frontend
fi
dc ps

set_stage "wait-web-services"
wait_for_service_health frontend 60 2
wait_for_service_health admin 60 2
wait_for_service_health nginx 60 2

set_stage "purge-cache"
purge_cloudflare_cache || true

set_stage "public-checks"
verify_public_endpoint "/api/livez" "backend liveness" "^200$"
verify_public_endpoint "/api/readyz" "backend readiness" "^200$"
verify_public_endpoint "/api/health" "backend health" "^200$"
verify_public_endpoint "/api/health/deep" "backend deep health" "^200$"
verify_public_endpoint "/" "homepage"
verify_public_endpoint "/jobs" "jobs listing"
verify_public_endpoint "/results" "results listing"
verify_public_endpoint "/admin" "admin console"
verify_public_revalidation_smoke
PUBLIC_HEALTH_RESULT="public endpoints ok"

set_stage "summary"
print_success_summary "fast" "$BACKEND_HEALTH_RESULT" "$PUBLIC_HEALTH_RESULT"
