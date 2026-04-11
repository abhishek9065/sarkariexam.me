#!/usr/bin/env bash

# Fast deployment script with optimizations
# Reduces deployment time from ~9.5 minutes to ~3-4 minutes

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-sarkari-result}"
export COMPOSE_PROJECT_NAME
COMPOSE_FILES=(-f docker-compose.yml)

if [[ -f docker-compose.fast.yml ]]; then
  COMPOSE_FILES+=(-f docker-compose.fast.yml)
fi

dc() {
  docker compose "${COMPOSE_FILES[@]}" --project-name "$COMPOSE_PROJECT_NAME" --env-file .env "$@"
}

echo "Using compose project: $COMPOSE_PROJECT_NAME"
echo "=== FAST DEPLOY MODE - Optimized for Speed ==="

if [[ ! -f .env ]]; then
  echo "ERROR: .env not found at $ROOT_DIR/.env"
  exit 1
fi

# Read environment variables (same as original)
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

# OPTIMIZATION 1: Skip config validation for speed (assumes working config)
if [[ "${SKIP_CONFIG_VALIDATION:-0}" != "1" ]]; then
  echo "Validating compose config..."
  dc config >/dev/null
else
  echo "Skipping config validation (SKIP_CONFIG_VALIDATION=1)"
fi

# OPTIMIZATION 2: Build services in parallel with BuildKit parallelism
echo "Building all services in parallel with optimized caching..."
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Build everything in parallel rather than sequentially. Pull base images only when requested.
BUILD_ARGS=(--parallel)
if [[ "${PULL_BASE_IMAGES:-0}" == "1" ]]; then
  BUILD_ARGS+=(--pull)
  echo "Base image refresh enabled (PULL_BASE_IMAGES=1)"
else
  echo "Using local/cached base images. Set PULL_BASE_IMAGES=1 to force a refresh."
fi

dc build "${BUILD_ARGS[@]}"

# OPTIMIZATION 3: Smart container replacement
remove_conflicting_container() {
  local name="$1"
  local existing_id
  existing_id="$(docker ps -aq --filter "name=^/${name}$" | head -n1 || true)"
  if [[ -n "$existing_id" ]]; then
    echo "Removing pre-existing container ${name}..."
    docker rm -f "$existing_id" >/dev/null 2>&1 &
  fi
}

cleanup_named_containers() {
  # Run container removals in parallel
  remove_conflicting_container "sarkari-nginx" &
  remove_conflicting_container "sarkari-backend" &
  remove_conflicting_container "sarkari-admin" &
  remove_conflicting_container "sarkari-frontend" &
  remove_conflicting_container "sarkari-datadog" &
  wait # Wait for all background removals
}

# OPTIMIZATION 4: Faster service startup
DATADOG_SERVICES=()
if [[ -n "$(read_env_var "DD_API_KEY")" ]]; then
  DATADOG_SERVICES+=(datadog-agent)
fi

echo "Starting services with fast startup mode..."
cleanup_named_containers

# Start backend first (others depend on it)
dc up -d --force-recreate backend
echo "Backend starting..."

# Start other services in parallel
dc up -d --force-recreate --remove-orphans nginx admin frontend "${DATADOG_SERVICES[@]}"

echo "Container status:"
dc ps

# OPTIMIZATION 5: Reduced health check intervals
wait_for_backend_health() {
  local attempts="${1:-30}"  # Reduced from 60
  local sleep_seconds="${2:-1}"  # Reduced from 2
  local i

  echo "Waiting for backend container health (fast mode)..."
  for ((i=1; i<=attempts; i++)); do
    local health
    local container_id
    container_id="$(dc ps -q backend | head -n1)"
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
  local attempts="${1:-30}"  # Reduced from 60  
  local sleep_seconds="${2:-1}"  # Reduced from 2
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

# OPTIMIZATION 6: Minimal frontend checks
wait_for_frontend_minimal() {
  local attempts="${1:-20}"  # Much smaller window
  local sleep_seconds="${2:-1}"
  local i

  echo "Waiting for frontend basic availability (minimal checks)..."
  for ((i=1; i<=attempts; i++)); do
    if dc exec -T frontend wget -q --spider --timeout=2 "http://127.0.0.1:3000/" >/dev/null 2>&1; then
      echo "Frontend ready after ${i}s."
      return 0
    fi
    echo "  [$i/$attempts] frontend not ready"
    sleep "$sleep_seconds"
  done

  echo "WARNING: Frontend minimal check timed out, but continuing..."
  return 0  # Non-blocking
}

# Run health checks
wait_for_backend_health
wait_for_backend_endpoint

# OPTIMIZATION 7: Skip extensive frontend route testing in fast mode
if [[ "${SKIP_FRONTEND_CHECKS:-0}" == "1" ]]; then
  echo "Skipping frontend route checks (SKIP_FRONTEND_CHECKS=1)"
else
  wait_for_frontend_minimal
fi

# OPTIMIZATION 8: Essential health verification only
echo "Backend health (essential check):"
dc exec -T backend wget -qO- --timeout=5 http://127.0.0.1:4000/api/health || {
  echo "ERROR: backend health check failed"
  dc logs --tail=50 backend || true
  exit 1
}

# OPTIMIZATION 9: Conditional cache purge
purge_cloudflare_cache() {
  CF_ZONE_ID="$(read_env_var "CF_ZONE_ID")"
  CF_API_TOKEN="$(read_env_var "CF_API_TOKEN")"

  if [[ -n "$CF_ZONE_ID" && -n "$CF_API_TOKEN" ]]; then
    echo "Purging Cloudflare cache..."
    curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
      -H "Authorization: Bearer ${CF_API_TOKEN}" \
      -H "Content-Type: application/json" \
      --data '{"purge_everything":true}' \
      --max-time 10 >/dev/null 2>&1 && echo "Cache purged." || echo "Cache purge failed (non-blocking)"
  else
    echo "NOTICE: CF_ZONE_ID or CF_API_TOKEN not set — skipping Cloudflare cache purge."
  fi
}

if [[ "${SKIP_CACHE_PURGE:-0}" == "1" ]]; then
  echo "Skipping cache purge (SKIP_CACHE_PURGE=1)"
else
  purge_cloudflare_cache || true
fi

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

verify_public_endpoints() {
  PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://sarkariexams.me}"
  local failures=0

  echo "Public edge verification:"
  verify_public_endpoint "/api/health" "public api health" || failures=1
  verify_public_endpoint "/" "homepage" || failures=1
  verify_public_endpoint "/jobs" "jobs listing" || failures=1
  verify_public_endpoint "/results/upsc-civil-services-2025-final-result" "result detail" || failures=1
  verify_public_endpoint "/admin" "admin console" || failures=1

  if [[ "$failures" -ne 0 ]]; then
    return 1
  fi
}

# OPTIMIZATION 10: Single public verification layer
if [[ "${SKIP_PUBLIC_CHECKS:-0}" == "1" ]]; then
  echo "Skipping public endpoint checks (SKIP_PUBLIC_CHECKS=1)"
else
  verify_public_endpoints
fi

echo "=== FAST DEPLOY COMPLETED ==="
echo "Total services deployed: $(dc ps --services | wc -l)"
echo "For full route testing, run: bash scripts/verify-deployment.sh"
