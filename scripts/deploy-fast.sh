#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./deploy-common.sh
source "${SCRIPT_DIR}/deploy-common.sh"

cd "$ROOT_DIR"

echo "Using compose project: $COMPOSE_PROJECT_NAME"
echo "=== FAST DEPLOY MODE - Rebuild On Droplet ==="

require_env_file
validate_production_env
warn_if_missing_production_runtime_vars
resolve_datadog_services

echo "Building services from the checked-out repository on the droplet."

if [[ "${SKIP_CONFIG_VALIDATION:-0}" != "1" ]]; then
  echo "Validating production compose config..."
  dc config >/dev/null
else
  echo "Skipping config validation (SKIP_CONFIG_VALIDATION=1)"
fi

echo "Building backend image..."
dc build --pull backend

echo "Starting services with fast startup mode..."
cleanup_named_containers

dc up -d --force-recreate backend
echo "Backend starting..."

echo "Building frontend, admin, and nginx images..."
dc build --pull frontend admin nginx
dc up -d --force-recreate --remove-orphans nginx admin frontend "${DATADOG_SERVICES[@]}"

echo "Container status:"
dc ps

wait_for_backend_health() {
  local attempts="${1:-30}"
  local sleep_seconds="${2:-1}"
  local i

  echo "Waiting for backend container health (fast mode)..."
  for ((i=1; i<=attempts; i++)); do
    local health
    local container_id
    container_id="$(service_container_id backend)"
    health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)"

    if [[ "$health" == "healthy" ]]; then
      echo "Backend container healthy after ${i}s."
      return 0
    fi

    if [[ "$health" == "unhealthy" || "$health" == "exited" ]]; then
      echo "Backend container status is '$health'."
      dc logs --tail=50 backend || true
      return 1
    fi

    echo "  [$i/$attempts] backend status: ${health:-unknown}"
    sleep "$sleep_seconds"
  done

  echo "Timed out waiting for backend health."
  dc logs --tail=50 backend || true
  return 1
}

wait_for_backend_endpoint() {
  local attempts="${1:-30}"
  local sleep_seconds="${2:-1}"
  local i

  echo "Waiting for backend /api/health endpoint (fast mode)..."
  for ((i=1; i<=attempts; i++)); do
    if dc exec -T backend wget -qO- --timeout=2 http://127.0.0.1:4000/api/health >/dev/null 2>&1; then
      echo "Backend endpoint ready after ${i}s."
      return 0
    fi
    echo "  [$i/$attempts] backend endpoint not ready"
    sleep "$sleep_seconds"
  done

  echo "Timed out waiting for backend endpoint."
  dc logs --tail=50 backend || true
  return 1
}

wait_for_frontend_minimal() {
  local attempts="${1:-20}"
  local sleep_seconds="${2:-1}"
  local i

  echo "Waiting for core public pages (minimal checks)..."
  for ((i=1; i<=attempts; i++)); do
    if dc exec -T frontend wget -q --spider --timeout=2 "http://127.0.0.1:3000/" >/dev/null 2>&1 &&
      dc exec -T frontend wget -q --spider --timeout=2 "http://127.0.0.1:3000/jobs" >/dev/null 2>&1 &&
      dc exec -T frontend wget -q --spider --timeout=2 "http://127.0.0.1:3000/results/upsc-civil-services-2025-final-result" >/dev/null 2>&1 &&
      dc exec -T admin wget -q --spider --timeout=2 "http://127.0.0.1:3001/admin" >/dev/null 2>&1; then
      echo "Core public pages ready after ${i}s."
      return 0
    fi
    echo "  [$i/$attempts] public pages not ready"
    sleep "$sleep_seconds"
  done

  echo "WARNING: Core public page check timed out, but continuing..."
  return 0
}

wait_for_backend_health
wait_for_backend_endpoint

if [[ "${SKIP_FRONTEND_CHECKS:-0}" == "1" ]]; then
  echo "Skipping core public page check (SKIP_FRONTEND_CHECKS=1)"
else
  wait_for_frontend_minimal
fi

echo "Backend health (essential check):"
dc exec -T backend wget -qO- --timeout=5 http://127.0.0.1:4000/api/health || {
  echo "ERROR: backend health check failed"
  dc logs --tail=50 backend || true
  exit 1
}

purge_cloudflare_cache() {
  local cf_zone_id cf_api_token

  cf_zone_id="$(read_env_var "CF_ZONE_ID")"
  cf_api_token="$(read_env_var "CF_API_TOKEN")"

  if [[ -n "$cf_zone_id" && -n "$cf_api_token" ]]; then
    echo "Purging Cloudflare cache..."
    curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/${cf_zone_id}/purge_cache" \
      -H "Authorization: Bearer ${cf_api_token}" \
      -H "Content-Type: application/json" \
      --data '{"purge_everything":true}' \
      --max-time 10 >/dev/null 2>&1 && echo "Cache purged." || echo "Cache purge failed (non-blocking)"
  else
    echo "NOTICE: CF_ZONE_ID or CF_API_TOKEN not set — skipping Cloudflare cache purge."
  fi
}

verify_public_endpoint() {
  local path="$1"
  local label="$2"
  local url="${PUBLIC_BASE_URL}${path}"
  local status

  status="$(curl -sS -L -o /dev/null -w "%{http_code}" --max-time 10 "$url" || true)"
  if [[ "$status" =~ ^(2|3) ]]; then
    echo "ok (${label} -> ${url}, status=${status})"
    return 0
  fi

  echo "ERROR: ${label} failed for ${url} (status=${status:-none})"
  return 1
}

verify_public_revalidation_smoke() {
  if [[ -z "$(read_env_var "FRONTEND_REVALIDATE_TOKEN")" ]]; then
    echo "NOTICE: FRONTEND_REVALIDATE_TOKEN not set — skipping revalidation smoke check."
    return 0
  fi

  if dc exec -T frontend node -e "const token=process.env.REVALIDATE_TOKEN; if (!token) process.exit(2); fetch('http://127.0.0.1:3000/api/revalidate', { method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify({ paths: ['/jobs'], tags: ['content:posts', 'content:listings'] }) }).then(async (res) => { if (!res.ok) { console.error('revalidate-status=' + res.status); console.error(await res.text()); process.exit(1); } }).catch((error) => { console.error(error); process.exit(1); });"; then
    echo "ok (frontend revalidation smoke -> internal frontend container route)"
    return 0
  fi

  echo "ERROR: frontend revalidation smoke check failed for internal frontend container route"
  return 1
}

verify_public_endpoints() {
  PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://sarkariexams.me}"
  local failures=0

  echo "Public verification:"
  verify_public_endpoint "/api/health" "backend health" || failures=1
  verify_public_endpoint "/api/health/deep" "backend deep health" || failures=1
  verify_public_endpoint "/" "homepage" || failures=1
  verify_public_endpoint "/jobs" "jobs listing" || failures=1
  verify_public_endpoint "/results/upsc-civil-services-2025-final-result" "result detail" || failures=1
  verify_public_endpoint "/admin" "admin console" || failures=1
  verify_public_revalidation_smoke || failures=1

  if [[ "$failures" -ne 0 ]]; then
    return 1
  fi
}

if [[ "${SKIP_CACHE_PURGE:-0}" == "1" ]]; then
  echo "Skipping cache purge (SKIP_CACHE_PURGE=1)"
else
  purge_cloudflare_cache || true
fi

if [[ "${SKIP_PUBLIC_CHECKS:-0}" == "1" ]]; then
  echo "Skipping public route checks (SKIP_PUBLIC_CHECKS=1)"
else
  verify_public_endpoints
fi

echo "=== FAST DEPLOY COMPLETED ==="
echo "Total services deployed: $(dc ps --services | wc -l)"
echo "For deeper public verification, run: bash scripts/verify-deployment.sh"
