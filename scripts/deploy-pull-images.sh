#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./deploy-common.sh
source "${SCRIPT_DIR}/deploy-common.sh"

cd "$ROOT_DIR"
install_failure_trap
: "${DEPLOY_IMAGE_TAG:?DEPLOY_IMAGE_TAG is required for image-pull mode}"
export DEPLOY_IMAGE_TAG

set_stage "validate-env"
require_env_file
validate_production_env
warn_if_missing_production_runtime_vars
verify_redis_preflight
resolve_datadog_services

set_stage "validate-compose"
dc config >/dev/null

set_stage "pull-images"
dc pull backend frontend admin nginx

set_stage "preflight-backend-db"
verify_backend_database_network_preflight
verify_backend_database_preflight

set_stage "migrate-backend-db"
run_backend_prisma_migrations

set_stage "restart-backend"
dc up -d --force-recreate backend campaign-worker
wait_for_service_health backend 60 2
wait_for_service_health campaign-worker 60 2

set_stage "restart-web"
if [[ ${#DATADOG_SERVICES[@]} -gt 0 ]]; then
  dc up -d --force-recreate --remove-orphans nginx admin frontend "${DATADOG_SERVICES[@]}"
else
  dc up -d --force-recreate --remove-orphans nginx admin frontend
fi
wait_for_service_health frontend 60 2
wait_for_service_health admin 60 2
wait_for_service_health nginx 60 2

set_stage "public-checks"
verify_public_endpoint "/api/livez" "backend liveness" "^200$"
verify_public_endpoint "/api/readyz" "backend readiness" "^200$"
verify_public_endpoint "/api/health" "backend health" "^200$"
verify_public_endpoint "/" "homepage"
verify_public_endpoint "/jobs" "jobs listing"
verify_public_endpoint "/results" "results listing"
verify_public_endpoint "/admin" "admin console"

print_success_summary "image-pull" "container healthcheck ok" "public endpoints ok"
