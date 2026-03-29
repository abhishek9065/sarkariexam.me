#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-sarkari-result}"
export COMPOSE_PROJECT_NAME

dc() {
  docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file .env "$@"
}

echo "Using compose project: $COMPOSE_PROJECT_NAME"

if [[ ! -f .env ]]; then
  echo "ERROR: .env not found at $ROOT_DIR/.env"
  exit 1
fi

# Read key from current environment first, then from .env file.
# This avoids `source .env` parsing issues with special characters in secrets.
read_env_var() {
  local key="$1"
  local from_env="${!key:-}"
  if [[ -n "$from_env" ]]; then
    printf '%s' "$from_env"
    return 0
  fi

  local line
  line="$(grep -E "^[[:space:]]*${key}[[:space:]]*=" .env | tail -n 1 || true)"
  if [[ -z "$line" ]]; then
    return 0
  fi

  local value="${line#*=}"
  value="${value%$'\r'}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"

  # Strip matching surrounding quotes only.
  if [[ "$value" == \"*\" && "$value" == *\" ]]; then
    value="${value:1:${#value}-2}"
  elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
    value="${value:1:${#value}-2}"
  fi

  printf '%s' "$value"
}

require_var() {
  local key="$1"
  local value
  value="$(read_env_var "$key")"
  if [[ -z "$value" ]]; then
    MISSING_KEYS+=("$key")
  fi
}

MISSING_KEYS=()
require_var "COSMOS_CONNECTION_STRING"
require_var "JWT_SECRET"

if [[ "${#MISSING_KEYS[@]}" -gt 0 ]]; then
  echo "ERROR: missing required production env var(s) in .env:"
  for key in "${MISSING_KEYS[@]}"; do
    echo "  - $key"
  done
  echo
  echo "Set them in $ROOT_DIR/.env and rerun deploy."
  exit 1
fi

echo "Validating compose config..."
dc config >/dev/null

echo "Building backend, admin, and nginx..."
dc build backend admin nginx

FRONTEND_BUILD_ARGS=()
if [[ "${FRONTEND_NO_CACHE:-0}" == "1" ]]; then
  echo "Rebuilding frontend without cache because FRONTEND_NO_CACHE=1..."
  FRONTEND_BUILD_ARGS+=(--no-cache)
else
  echo "Building frontend with Docker layer cache..."
fi
dc build "${FRONTEND_BUILD_ARGS[@]}" frontend

remove_conflicting_container() {
  local name="$1"
  local existing_id
  existing_id="$(docker ps -aq --filter "name=^/${name}$" | head -n1 || true)"
  if [[ -n "$existing_id" ]]; then
    echo "Removing pre-existing container ${name} (${existing_id}) to avoid name conflicts..."
    docker rm -f "$existing_id" >/dev/null
  fi
}

cleanup_named_containers() {
  remove_conflicting_container "sarkari-nginx"
  remove_conflicting_container "sarkari-backend"
  remove_conflicting_container "sarkari-admin"
  remove_conflicting_container "sarkari-frontend"
  remove_conflicting_container "sarkari-datadog"
}

DATADOG_SERVICES=()
if [[ -n "$(read_env_var "DD_API_KEY")" ]]; then
  DATADOG_SERVICES+=(datadog-agent)
else
  echo "NOTICE: DD_API_KEY not set — skipping Datadog agent startup."
fi

echo "Starting services..."
cleanup_named_containers
dc up -d --force-recreate --remove-orphans nginx backend admin frontend "${DATADOG_SERVICES[@]}"

echo "Container status:"
dc ps

service_container_id() {
  local service="$1"
  dc ps -q "$service" | head -n1
}

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

wait_for_backend_health
wait_for_backend_endpoint

check_frontend_route_ready() {
  local path="$1"
  local label="$2"
  local html

  html="$(dc exec -T frontend wget -qO- "http://127.0.0.1:3000${path}" || true)"
  if [[ -z "$html" ]]; then
    echo "ERROR: ${label} returned no HTML for ${path}"
    return 1
  fi

  if ! printf '%s' "$html" | grep -q '<html'; then
    echo "ERROR: ${label} did not render a valid HTML document for ${path}"
    return 1
  fi

  if ! printf '%s' "$html" | grep -q '/_next/static/'; then
    echo "ERROR: ${label} did not include Next assets for ${path}"
    return 1
  fi

  return 0
}

wait_for_frontend_shell() {
  local attempts="${1:-60}"
  local sleep_seconds="${2:-2}"
  local i

  echo "Waiting for frontend route shell verification..."
  for ((i=1; i<=attempts; i++)); do
    local ok=1

    check_frontend_route_ready "/" "homepage" || ok=0
    check_frontend_route_ready "/jobs" "jobs listing" || ok=0
    check_frontend_route_ready "/results/upsc-civil-services-2025-final-result" "result detail" || ok=0

    if [[ "$ok" -eq 1 ]]; then
      echo "Frontend public routes are rendering correctly."
      return 0
    fi

    echo "  [$i/$attempts] frontend shell not ready ..."
    sleep "$sleep_seconds"
  done

  echo "Timed out waiting for frontend public routes."
  for route in "/" "/jobs" "/results/upsc-civil-services-2025-final-result"; do
    echo "--- ${route} ---"
    dc exec -T frontend wget -qO- "http://127.0.0.1:3000${route}" | head -c 1200 || true
    echo
  done
  return 1
}

echo "Backend health (container internal):"
dc exec -T backend wget -qO- http://127.0.0.1:4000/api/health || {
  echo
  echo "ERROR: backend health endpoint failed after readiness checks."
  dc logs --tail=120 backend || true
  exit 1
}

wait_for_frontend_shell
echo

echo "Backend health (public edge):"
PUBLIC_HEALTH_URL="${PUBLIC_HEALTH_URL:-https://sarkariexams.me/api/health}"
curl -fsS "$PUBLIC_HEALTH_URL" >/dev/null && echo "ok ($PUBLIC_HEALTH_URL)"

PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://sarkariexams.me}"

purge_cloudflare_cache() {
  CF_ZONE_ID="$(read_env_var "CF_ZONE_ID")"
  CF_API_TOKEN="$(read_env_var "CF_API_TOKEN")"

  if [[ -n "$CF_ZONE_ID" && -n "$CF_API_TOKEN" ]]; then
    echo "Purging Cloudflare edge cache..."
    cf_resp="$(curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
      -H "Authorization: Bearer ${CF_API_TOKEN}" \
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

  status="$(curl -k -sS -L -o /dev/null -w "%{http_code}" "$url" || true)"
  if [[ ! "$status" =~ ^2 ]]; then
    echo "ERROR: ${label} route check failed for ${url} (status=${status:-none})"
    return 1
  fi

  if [[ -n "$expected_app_header" ]]; then
    headers="$(curl -k -sS -I -L "$url" || true)"
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

check_public_route_assets() {
  local path="$1"
  local label="$2"
  local url="${PUBLIC_BASE_URL}${path}"
  local html
  local asset_status
  local asset_count=0

  html="$(curl -k -sS -L "$url" || true)"
  if [[ -z "$html" ]]; then
    echo "ERROR: ${label} did not return HTML for asset validation (${url})"
    return 1
  fi

  while IFS= read -r asset; do
    [[ -z "$asset" ]] && continue
    asset_count=$((asset_count + 1))
    asset_status="$(curl -k -sS -o /dev/null -w "%{http_code}" "${PUBLIC_BASE_URL}${asset}" || true)"
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
  status="$(curl -k -sS -L -o /dev/null -w "%{http_code}" "$url" || true)"
  if [[ ! "$status" =~ ^2 ]]; then
    echo "ERROR: ${label} route check failed for ${url} (status=${status:-none})"
    return 1
  fi

  html="$(curl -k -sS -L "$url" || true)"
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
check_public_route "/jobs" "public jobs listing"
check_public_route_assets "/jobs" "public jobs listing"
check_public_route_marker "/jobs/1" "public job detail" 'SSC CGL 2026 - Combined Graduate Level Exam'
check_public_route_marker "/results/upsc-civil-services-2025-final-result" "public result detail" 'UPSC Civil Services 2025 - Final Result'
check_public_route_marker "/detail/upsc-civil-services-2025-final-result" "public detail alias" 'UPSC Civil Services 2025 - Final Result'
check_public_route_marker "/admit-cards/upsc" "public admit card detail" 'UPSC IAS IFS 2025 Admit Card'
check_public_route_marker "/states/uttar-pradesh" "public state jobs page" 'State Jobs'
check_public_route_marker "/search?q=ssc" "public search page" 'Search Results'
check_public_route_marker "/jobs?department=Railway" "public jobs filter" 'Railway RRB Group D - Level 1 Posts'
check_public_route_marker "/important" "public important links page" 'Important Links'
check_public_route_marker "/app" "public app page" 'App Download'

echo "Deploy completed successfully."
