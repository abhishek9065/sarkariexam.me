#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

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
docker compose --env-file .env config >/dev/null

echo "Building and starting services..."
docker compose --env-file .env up -d --build --remove-orphans nginx backend frontend

echo "Container status:"
docker compose ps

wait_for_backend_health() {
  local attempts="${1:-60}"
  local sleep_seconds="${2:-2}"
  local i

  echo "Waiting for backend container health..."
  for ((i=1; i<=attempts; i++)); do
    local health
    health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' sarkari-backend 2>/dev/null || true)"

    if [[ "$health" == "healthy" ]]; then
      echo "Backend container reports healthy."
      return 0
    fi

    if [[ "$health" == "unhealthy" || "$health" == "exited" ]]; then
      echo "Backend container status is '$health'."
      docker compose logs --tail=120 backend || true
      return 1
    fi

    echo "  [$i/$attempts] backend status: ${health:-unknown} ..."
    sleep "$sleep_seconds"
  done

  echo "Timed out waiting for backend container health."
  docker compose logs --tail=120 backend || true
  return 1
}

wait_for_backend_endpoint() {
  local attempts="${1:-60}"
  local sleep_seconds="${2:-2}"
  local i

  echo "Waiting for backend /api/health endpoint..."
  for ((i=1; i<=attempts; i++)); do
    if docker compose exec -T backend wget -qO- http://127.0.0.1:4000/api/health >/dev/null 2>&1; then
      echo "Backend health endpoint is reachable."
      return 0
    fi
    echo "  [$i/$attempts] backend endpoint not ready ..."
    sleep "$sleep_seconds"
  done

  echo "Timed out waiting for backend /api/health endpoint."
  docker compose logs --tail=120 backend || true
  return 1
}

wait_for_backend_health
wait_for_backend_endpoint

echo "Backend health (container internal):"
docker compose exec -T backend wget -qO- http://127.0.0.1:4000/api/health || {
  echo
  echo "ERROR: backend health endpoint failed after readiness checks."
  docker compose logs --tail=120 backend || true
  exit 1
}
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

check_public_redirect() {
  local path="$1"
  local label="$2"
  local expected_location="$3"
  local url="${PUBLIC_BASE_URL}${path}"
  local headers
  local status
  local location
  local expected_absolute=""
  local expected_absolute_no_slash=""

  headers="$(curl -k -sS -I "$url" || true)"
  status="$(printf '%s' "$headers" | tr -d '\r' | awk '/^HTTP\// { code=$2 } END { print code }')"
  location="$(printf '%s' "$headers" | tr -d '\r' | grep -i '^Location:' | tail -n1 | awk -F': ' '{print $2}')"

  if [[ "$expected_location" == /* ]]; then
    expected_absolute="${PUBLIC_BASE_URL%/}${expected_location}"
    expected_absolute_no_slash="${expected_absolute%/}"
  fi

  if [[ "$status" != "302" ]]; then
    echo "ERROR: ${label} expected redirect status 302 for ${url}, got '${status:-missing}'"
    return 1
  fi

  if [[ "$location" != "$expected_location" && "$location" != "$expected_absolute" && "$location" != "$expected_absolute_no_slash" ]]; then
    echo "ERROR: ${label} expected Location=${expected_location}, got '${location:-missing}' for ${url}"
    return 1
  fi

  echo "ok (${label} -> ${url}, redirect=${location})"
}

get_public_detail_slug() {
  local type="$1"
  local payload
  local slug
  payload="$(curl -k -fsS "${PUBLIC_BASE_URL}/api/announcements/v3/cards?type=${type}&limit=1" || true)"
  slug="$(printf '%s' "$payload" | grep -o '"slug":"[^"]*"' | head -n1 | sed 's/"slug":"//; s/"$//')"

  if [[ -z "$slug" ]]; then
    echo "ERROR: unable to fetch a public ${type} slug for detail route verification."
    return 1
  fi

  printf '%s' "$slug"
}

check_public_detail_route() {
  local type="$1"
  local marker="$2"
  local slug
  local url
  local html
  local status

  slug="$(get_public_detail_slug "$type")" || return 1
  url="${PUBLIC_BASE_URL}/${type}/${slug}"
  status="$(curl -k -sS -L -o /dev/null -w "%{http_code}" "$url" || true)"
  if [[ ! "$status" =~ ^2 ]]; then
    echo "ERROR: ${type} detail route check failed for ${url} (status=${status:-none})"
    return 1
  fi

  html="$(curl -k -sS -L "$url" || true)"
  if [[ -z "$html" ]]; then
    echo "ERROR: ${type} detail route returned no HTML for ${url}"
    return 1
  fi

  if printf '%s' "$html" | grep -q 'data-testid="home-mvp"'; then
    echo "ERROR: ${type} detail route fell back to homepage for ${url}"
    return 1
  fi

  if printf '%s' "$html" | grep -q 'Application error:'; then
    echo "ERROR: ${type} detail route rendered an application error for ${url}"
    return 1
  fi

  if ! printf '%s' "$html" | grep -q "$marker"; then
    echo "ERROR: ${type} detail route did not render the expected marker (${marker}) for ${url}"
    return 1
  fi

  check_public_route_assets "/${type}/${slug}" "${type} detail page"
  echo "ok (${type} detail route -> ${url}, status=${status})"
}

purge_cloudflare_cache || true

echo "Public route checks:"
check_public_redirect "/admin" "retired legacy route" "/"
check_public_redirect "/admin-vnext" "retired legacy preview route" "/"
check_public_redirect "/admin-legacy" "retired legacy alias route" "/"
check_public_route "/jobs" "public jobs listing"
check_public_route_assets "/jobs" "public jobs listing"
check_public_detail_route "job" 'data-testid="detail-page"'

echo "Deploy completed successfully."
