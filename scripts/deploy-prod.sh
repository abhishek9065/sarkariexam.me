#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./deploy-common.sh
source "${SCRIPT_DIR}/deploy-common.sh"

cd "$ROOT_DIR"

echo "Using compose project: $COMPOSE_PROJECT_NAME"
echo "=== FULL DEPLOY MODE - Rebuild On Droplet + Full Verification ==="

require_env_file
validate_production_env
warn_if_missing_production_runtime_vars
resolve_datadog_services

echo "Building services from the checked-out repository on the droplet."

echo "Validating production compose config..."
dc config >/dev/null

echo "Building application images..."
dc build --pull nginx backend admin frontend

echo "Starting services..."
cleanup_named_containers
dc up -d --force-recreate --remove-orphans nginx backend admin frontend "${DATADOG_SERVICES[@]}"

echo "Container status:"
dc ps

wait_for_backend_health() {
  local attempts="${1:-60}"
  local sleep_seconds="${2:-2}"
  local i

  echo "Waiting for backend container health..."
  for ((i=1; i<=attempts; i++)); do
    local health
    local container_id
    container_id="$(service_container_id backend)"
    health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)"

    if [[ "$health" == "healthy" ]]; then
      echo "Backend container reports healthy."
      return 0
    fi

    if [[ "$health" == "unhealthy" || "$health" == "exited" ]]; then
      echo "Backend container status is '$health'."
      dc logs --tail=120 backend || true
      return 1
    fi

    echo "  [$i/$attempts] backend status: ${health:-unknown} ..."
    sleep "$sleep_seconds"
  done

  echo "Timed out waiting for backend container health."
  dc logs --tail=120 backend || true
  return 1
}

wait_for_backend_endpoint() {
  local attempts="${1:-60}"
  local sleep_seconds="${2:-2}"
  local i

  echo "Waiting for backend /api/health endpoint..."
  for ((i=1; i<=attempts; i++)); do
    if dc exec -T backend wget -qO- http://127.0.0.1:4000/api/health >/dev/null 2>&1; then
      echo "Backend health endpoint is reachable."
      return 0
    fi
    echo "  [$i/$attempts] backend endpoint not ready ..."
    sleep "$sleep_seconds"
  done

  echo "Timed out waiting for backend /api/health endpoint."
  dc logs --tail=120 backend || true
  return 1
}

check_frontend_route_ready() {
  local path="$1"
  local label="$2"

  if ! dc exec -T frontend wget -q --spider "http://127.0.0.1:3000${path}" >/dev/null 2>&1; then
    echo "ERROR: ${label} did not return HTTP success for ${path}"
    return 1
  fi

  return 0
}

wait_for_frontend_shell() {
  local attempts="${1:-60}"
  local sleep_seconds="${2:-2}"
  local i

  echo "Waiting for core page shell verification..."
  for ((i=1; i<=attempts; i++)); do
    local ok=1

    check_frontend_route_ready "/" "homepage" || ok=0
    check_frontend_route_ready "/jobs" "jobs listing" || ok=0
    check_frontend_route_ready "/results/upsc-civil-services-2025-final-result" "result detail" || ok=0
    if ! dc exec -T admin wget -q --spider "http://127.0.0.1:3001/admin" >/dev/null 2>&1; then
      echo "ERROR: admin console did not return HTTP success for /admin"
      ok=0
    fi

    if [[ "$ok" -eq 1 ]]; then
      echo "Homepage, key public pages, and admin console are rendering correctly."
      return 0
    fi

    echo "  [$i/$attempts] core pages not ready ..."
    sleep "$sleep_seconds"
  done

  echo "Timed out waiting for core pages."
  for route in "/" "/jobs" "/results/upsc-civil-services-2025-final-result"; do
    echo "--- ${route} ---"
    dc exec -T frontend wget -qO- "http://127.0.0.1:3000${route}" | head -c 1200 || true
    echo
  done
  return 1
}

wait_for_backend_health
wait_for_backend_endpoint

echo "Backend health (container internal):"
dc exec -T backend wget -qO- http://127.0.0.1:4000/api/health || {
  echo
  echo "ERROR: backend health endpoint failed after readiness checks."
  dc logs --tail=120 backend || true
  exit 1
}

wait_for_frontend_shell
echo

PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://sarkariexams.me}"

purge_cloudflare_cache() {
  local cf_zone_id cf_api_token cf_resp

  cf_zone_id="$(read_env_var "CF_ZONE_ID")"
  cf_api_token="$(read_env_var "CF_API_TOKEN")"

  if [[ -n "$cf_zone_id" && -n "$cf_api_token" ]]; then
    echo "Purging Cloudflare edge cache..."
    cf_resp="$(curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/${cf_zone_id}/purge_cache" \
      -H "Authorization: Bearer ${cf_api_token}" \
      -H "Content-Type: application/json" \
      --data '{"purge_everything":true}')"

    if echo "$cf_resp" | grep -q '"success":true'; then
      echo "Cloudflare cache purged successfully."
      return 0
    fi

    echo "WARNING: Cloudflare cache purge may have failed:"
    echo "$cf_resp"
    return 1
  fi

  echo "NOTICE: CF_ZONE_ID or CF_API_TOKEN not set — skipping Cloudflare cache purge."
  echo "  Set them in .env to auto-purge CDN cache on deploy."
  return 0
}

check_public_route() {
  local path="$1"
  local label="$2"
  local expected_app_header="${3:-}"
  local url="${PUBLIC_BASE_URL}${path}"
  local status headers app_header

  status="$(curl -sS -L -o /dev/null -w "%{http_code}" "$url" || true)"
  if [[ ! "$status" =~ ^2 ]]; then
    echo "ERROR: ${label} route check failed for ${url} (status=${status:-none})"
    return 1
  fi

  if [[ -n "$expected_app_header" ]]; then
    headers="$(curl -sS -I -L "$url" || true)"
    app_header="$(echo "$headers" | tr -d '\r' | grep -i '^X-Sarkari-App:' | tail -n1 | awk -F': ' '{print $2}')"
    if [[ "$app_header" != "$expected_app_header" ]]; then
      echo "ERROR: ${label} expected X-Sarkari-App=${expected_app_header}, got '${app_header:-missing}' for ${url}"
      return 1
    fi
  fi

  if [[ -n "$expected_app_header" ]]; then
    echo "ok (${label} -> ${url}, status=${status}, x-sarkari-app=${expected_app_header})"
  else
    echo "ok (${label} -> ${url}, status=${status})"
  fi
}

check_public_revalidation_smoke() {
  if [[ -z "$(read_env_var "FRONTEND_REVALIDATE_TOKEN")" ]]; then
    echo "NOTICE: FRONTEND_REVALIDATE_TOKEN not set — skipping revalidation smoke check."
    return 0
  fi

  if ! dc exec -T frontend node -e "const token=process.env.REVALIDATE_TOKEN; if (!token) process.exit(2); fetch('http://127.0.0.1:3000/api/revalidate', { method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify({ paths: ['/jobs'], tags: ['content:posts', 'content:listings'] }) }).then(async (res) => { if (!res.ok) { console.error('revalidate-status=' + res.status); console.error(await res.text()); process.exit(1); } }).catch((error) => { console.error(error); process.exit(1); });"; then
    echo "ERROR: frontend revalidation smoke check failed for internal frontend container route"
    return 1
  fi

  echo "ok (frontend revalidation smoke -> internal frontend container route)"
}

check_public_route_assets() {
  local path="$1"
  local label="$2"
  local url="${PUBLIC_BASE_URL}${path}"
  local html
  local asset_status
  local asset_count=0

  html="$(curl -sS -L "$url" || true)"
  if [[ -z "$html" ]]; then
    echo "ERROR: ${label} did not return HTML for asset validation (${url})"
    return 1
  fi

  while IFS= read -r asset; do
    [[ -z "$asset" ]] && continue
    asset_count=$((asset_count + 1))
    asset_status="$(curl -sS -o /dev/null -w "%{http_code}" "${PUBLIC_BASE_URL}${asset}" || true)"
    if [[ ! "$asset_status" =~ ^2 ]]; then
      echo "ERROR: ${label} references missing asset ${asset} (status=${asset_status:-none})"
      return 1
    fi
  done < <(printf '%s' "$html" | grep -oE "/_next/static/[^\"'[:space:]]+\.(js|css)" | sort -u)

  if [[ "$asset_count" -eq 0 ]]; then
    echo "ERROR: ${label} did not include any Next assets for validation (${url})"
    return 1
  fi

  echo "ok (${label} assets -> ${url}, assets=${asset_count})"
}

check_public_route_marker() {
  local path="$1"
  local label="$2"
  local marker="$3"
  local url
  local html
  local status

  url="${PUBLIC_BASE_URL}${path}"
  status="$(curl -sS -L -o /dev/null -w "%{http_code}" "$url" || true)"
  if [[ ! "$status" =~ ^2 ]]; then
    echo "ERROR: ${label} route check failed for ${url} (status=${status:-none})"
    return 1
  fi

  html="$(curl -sS -L "$url" || true)"
  if [[ -z "$html" ]]; then
    echo "ERROR: ${label} route returned no HTML for ${url}"
    return 1
  fi

  if printf '%s' "$html" | grep -q 'Application error:'; then
    echo "ERROR: ${label} route rendered an application error for ${url}"
    return 1
  fi

  if ! printf '%s' "$html" | grep -q "$marker"; then
    echo "ERROR: ${label} route did not render the expected marker (${marker}) for ${url}"
    return 1
  fi

  check_public_route_assets "${path}" "${label}"
  echo "ok (${label} -> ${url}, status=${status})"
}

purge_cloudflare_cache || true

echo "Public route checks:"
check_public_route "/api/health" "backend health"
check_public_route "/api/health/deep" "backend deep health"
check_public_route "/" "homepage"
check_public_route_assets "/" "homepage"
check_public_route "/jobs" "public jobs listing"
check_public_route_assets "/jobs" "public jobs listing"
check_public_route "/results/upsc-civil-services-2025-final-result" "public result detail"
check_public_route_assets "/results/upsc-civil-services-2025-final-result" "public result detail"
check_public_route "/admin" "admin console"
check_public_revalidation_smoke

echo "Deploy completed successfully."
