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
require_var "ADMIN_SETUP_KEY"
require_var "TOTP_ENCRYPTION_KEY"

ADMIN_EMAIL_ALLOWLIST_VALUE="$(read_env_var "ADMIN_EMAIL_ALLOWLIST")"
ADMIN_DOMAIN_ALLOWLIST_VALUE="$(read_env_var "ADMIN_DOMAIN_ALLOWLIST")"
if [[ -z "$ADMIN_EMAIL_ALLOWLIST_VALUE" && -z "$ADMIN_DOMAIN_ALLOWLIST_VALUE" ]]; then
  MISSING_KEYS+=("ADMIN_EMAIL_ALLOWLIST|ADMIN_DOMAIN_ALLOWLIST")
fi

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
docker compose --env-file .env up -d --build nginx backend frontend admin-frontend

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

echo "Public route checks:"
check_public_route "/admin" "admin vNext default" "admin-vnext"
check_public_route "/admin-vnext" "admin vNext alias" "admin-vnext-alias"
check_public_route "/admin-legacy" "legacy rollback" "admin-legacy"

# ── Cloudflare Cache Purge ──────────────────────────────────
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
  else
    echo "WARNING: Cloudflare cache purge may have failed:"
    echo "$cf_resp"
  fi
else
  echo "NOTICE: CF_ZONE_ID or CF_API_TOKEN not set — skipping Cloudflare cache purge."
  echo "  Set them in .env to auto-purge CDN cache on deploy."
fi

echo "Deploy completed successfully."
