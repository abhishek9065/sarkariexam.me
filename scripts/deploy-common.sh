#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-sarkari-result}"
export COMPOSE_PROJECT_NAME

PRODUCTION_COMPOSE_FILES=(-f "$ROOT_DIR/docker-compose.yml")
CURRENT_STAGE="${CURRENT_STAGE:-bootstrap}"
LAST_ACTIONABLE_DIAGNOSIS="${LAST_ACTIONABLE_DIAGNOSIS:-Inspect the deploy log and the relevant Docker Compose service logs.}"
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-}"

dc() {
  docker compose "${PRODUCTION_COMPOSE_FILES[@]}" --project-name "$COMPOSE_PROJECT_NAME" --env-file "$ROOT_DIR/.env" "$@"
}

set_stage() {
  CURRENT_STAGE="$1"
  echo ">>> stage=${CURRENT_STAGE}"
}

record_diagnosis() {
  LAST_ACTIONABLE_DIAGNOSIS="$1"
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

warn() {
  echo "WARNING: $*" >&2
}

require_env_file() {
  [[ -f "$ROOT_DIR/.env" ]] || die ".env not found at $ROOT_DIR/.env"
}

read_env_var() {
  local key="$1"
  local from_env="${!key:-}"
  if [[ -n "$from_env" ]]; then
    printf '%s' "$from_env"
    return 0
  fi

  [[ -f "$ROOT_DIR/.env" ]] || return 0

  local line
  line="$(grep -E "^[[:space:]]*${key}[[:space:]]*=" "$ROOT_DIR/.env" | tail -n 1 || true)"
  [[ -n "$line" ]] || return 0

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

validate_production_env() {
  local missing=()
  local jwt_secret postgres_prisma_url database_url cosmos_connection_string mongodb_uri
  local frontend_revalidate_url frontend_revalidate_token

  jwt_secret="$(read_env_var "JWT_SECRET")"
  postgres_prisma_url="$(read_env_var "POSTGRES_PRISMA_URL")"
  database_url="$(read_env_var "DATABASE_URL")"
  cosmos_connection_string="$(read_env_var "COSMOS_CONNECTION_STRING")"
  mongodb_uri="$(read_env_var "MONGODB_URI")"

  [[ -n "$jwt_secret" ]] || missing+=("JWT_SECRET")
  [[ -n "$postgres_prisma_url" || -n "$database_url" ]] || missing+=("POSTGRES_PRISMA_URL or DATABASE_URL")
  [[ -n "$cosmos_connection_string" || -n "$mongodb_uri" ]] || missing+=("COSMOS_CONNECTION_STRING or MONGODB_URI")

  if [[ "${#missing[@]}" -gt 0 ]]; then
    echo "ERROR: missing required production env var(s) in $ROOT_DIR/.env:"
    printf '  - %s\n' "${missing[@]}"
    echo "Set the missing values in the server root .env and rerun deploy."
    exit 1
  fi

  frontend_revalidate_url="$(read_env_var "FRONTEND_REVALIDATE_URL")"
  frontend_revalidate_token="$(read_env_var "FRONTEND_REVALIDATE_TOKEN")"
  if [[ -n "$frontend_revalidate_url" && -z "$frontend_revalidate_token" ]]; then
    die "FRONTEND_REVALIDATE_URL is set but FRONTEND_REVALIDATE_TOKEN is missing."
  fi
  if [[ -z "$frontend_revalidate_url" && -n "$frontend_revalidate_token" ]]; then
    warn "FRONTEND_REVALIDATE_TOKEN is set but FRONTEND_REVALIDATE_URL is missing. Publish-triggered revalidation will stay disabled."
  fi

  PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-$(read_env_var "FRONTEND_URL")}"
  if [[ -z "$PUBLIC_BASE_URL" ]]; then
    PUBLIC_BASE_URL="https://sarkariexams.me"
  fi
  export PUBLIC_BASE_URL
}

warn_if_missing_production_runtime_vars() {
  local recommended_keys=(
    "COSMOS_DATABASE_NAME"
    "FRONTEND_URL"
    "CORS_ORIGINS"
    "FRONTEND_REVALIDATE_URL"
    "FRONTEND_REVALIDATE_TOKEN"
    "METRICS_TOKEN"
    "SENDGRID_API_KEY"
    "SENTRY_DSN"
  )
  local missing=()
  local key

  for key in "${recommended_keys[@]}"; do
    if [[ -z "$(read_env_var "$key")" ]]; then
      missing+=("$key")
    fi
  done

  if [[ "${#missing[@]}" -gt 0 ]]; then
    echo "NOTICE: recommended production env var(s) missing from $ROOT_DIR/.env:"
    printf '  - %s\n' "${missing[@]}"
  fi
}

resolve_datadog_services() {
  DATADOG_SERVICES=()
  if [[ -n "$(read_env_var "DD_API_KEY")" ]]; then
    DATADOG_SERVICES+=(datadog-agent)
  else
    warn "DD_API_KEY not set; Datadog agent will not be started."
  fi
}

service_container_id() {
  local service="$1"
  dc ps -q "$service" | head -n 1
}

tail_service_logs() {
  local service="$1"
  local lines="${2:-80}"
  echo "--- ${service} logs (tail ${lines}) ---"
  dc logs --tail "$lines" "$service" || true
}

tail_core_service_logs() {
  local lines="${1:-80}"
  local service
  for service in backend frontend admin nginx; do
    tail_service_logs "$service" "$lines"
  done
}

handle_deploy_error() {
  local exit_code="${1:-1}"
  local line_number="${2:-unknown}"
  echo
  echo "ERROR: deployment stage '${CURRENT_STAGE}' failed at line ${line_number}."
  echo "Actionable diagnosis: ${LAST_ACTIONABLE_DIAGNOSIS}"
  echo "Repo path: ${DEPLOY_REPO_DIR:-$ROOT_DIR}"
  echo "Target SHA: ${DEPLOY_TARGET_SHA:-unknown}"
  echo "Previous SHA: ${DEPLOY_PREVIOUS_SHA:-unknown}"
  if command -v docker >/dev/null 2>&1; then
    tail_core_service_logs 80
  fi
  exit "$exit_code"
}

install_failure_trap() {
  trap 'handle_deploy_error $? $LINENO' ERR
}

wait_for_service_health() {
  local service="$1"
  local attempts="${2:-60}"
  local sleep_seconds="${3:-2}"
  local i container_id health

  for ((i=1; i<=attempts; i++)); do
    container_id="$(service_container_id "$service")"
    if [[ -z "$container_id" ]]; then
      record_diagnosis "Service '${service}' was not created by Docker Compose. Inspect docker compose output and service definitions."
      echo "  [$i/$attempts] ${service} container not yet created"
      sleep "$sleep_seconds"
      continue
    fi

    health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)"
    if [[ "$health" == "healthy" || "$health" == "running" ]]; then
      echo "${service} health is ${health} after ${i} attempt(s)."
      return 0
    fi
    if [[ "$health" == "unhealthy" || "$health" == "exited" ]]; then
      record_diagnosis "Service '${service}' became ${health}. Inspect its container logs and environment wiring."
      tail_service_logs "$service" 120
      return 1
    fi

    echo "  [$i/$attempts] ${service} health=${health:-unknown}"
    sleep "$sleep_seconds"
  done

  record_diagnosis "Timed out waiting for service '${service}' to report healthy."
  tail_service_logs "$service" 120
  return 1
}

wait_for_http_inside() {
  local service="$1"
  local url="$2"
  local label="$3"
  local attempts="${4:-30}"
  local sleep_seconds="${5:-2}"
  local i

  for ((i=1; i<=attempts; i++)); do
    if dc exec -T "$service" wget -qO- --timeout=2 "$url" >/dev/null 2>&1; then
      echo "${label} ready after ${i} attempt(s)."
      return 0
    fi
    echo "  [$i/$attempts] ${label} not ready"
    sleep "$sleep_seconds"
  done

  record_diagnosis "${label} did not become reachable from inside the '${service}' container."
  tail_service_logs "$service" 120
  return 1
}

wait_for_http_spider_inside() {
  local service="$1"
  local url="$2"
  local label="$3"
  local attempts="${4:-30}"
  local sleep_seconds="${5:-2}"
  local i

  for ((i=1; i<=attempts; i++)); do
    if dc exec -T "$service" wget -q --spider --timeout=2 "$url" >/dev/null 2>&1; then
      echo "${label} ready after ${i} attempt(s)."
      return 0
    fi
    echo "  [$i/$attempts] ${label} not ready"
    sleep "$sleep_seconds"
  done

  record_diagnosis "${label} did not become reachable from inside the '${service}' container."
  tail_service_logs "$service" 120
  return 1
}

purge_cloudflare_cache() {
  local cf_zone_id cf_api_token
  cf_zone_id="$(read_env_var "CF_ZONE_ID")"
  cf_api_token="$(read_env_var "CF_API_TOKEN")"

  if [[ -z "$cf_zone_id" || -z "$cf_api_token" ]]; then
    echo "NOTICE: CF_ZONE_ID or CF_API_TOKEN not set; skipping Cloudflare cache purge."
    return 0
  fi

  if curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/${cf_zone_id}/purge_cache" \
    -H "Authorization: Bearer ${cf_api_token}" \
    -H "Content-Type: application/json" \
    --data '{"purge_everything":true}' \
    --max-time 10 >/dev/null; then
    echo "Cloudflare cache purged."
    return 0
  fi

  warn "Cloudflare cache purge failed. Continuing because cache purge is non-blocking."
  return 1
}

verify_public_endpoint() {
  local path="$1"
  local label="$2"
  local expected_pattern="${3:-^(2|3)}"
  local url="${PUBLIC_BASE_URL%/}${path}"
  local status

  status="$(curl -sS -L -o /dev/null -w "%{http_code}" --max-time 15 "$url" || true)"
  if [[ "$status" =~ $expected_pattern ]]; then
    echo "ok (${label} -> ${url}, status=${status})"
    return 0
  fi

  record_diagnosis "Public check '${label}' failed for ${url}. Inspect nginx, backend, frontend, and admin logs plus the public ingress configuration."
  echo "ERROR: ${label} failed for ${url} (status=${status:-none}, expected=${expected_pattern})"
  return 1
}

check_public_route_assets() {
  local path="$1"
  local label="$2"
  local url="${PUBLIC_BASE_URL%/}${path}"
  local html asset_count asset asset_status
  asset_count=0

  html="$(curl -sS -L --max-time 15 "$url" || true)"
  [[ -n "$html" ]] || {
    record_diagnosis "${label} returned no HTML during asset validation."
    echo "ERROR: ${label} returned no HTML for asset validation (${url})"
    return 1
  }

  while IFS= read -r asset; do
    [[ -n "$asset" ]] || continue
    asset_count=$((asset_count + 1))
    asset_status="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "${PUBLIC_BASE_URL%/}${asset}" || true)"
    if [[ ! "$asset_status" =~ ^2 ]]; then
      record_diagnosis "${label} references a missing asset ${asset}."
      echo "ERROR: ${label} asset ${asset} returned ${asset_status:-timeout}"
      return 1
    fi
  done < <(printf '%s' "$html" | grep -oE "/_next/static/[^\"'[:space:]]+\.(js|css)" | sort -u | head -20)

  if [[ "$asset_count" -eq 0 ]]; then
    record_diagnosis "${label} did not expose any Next.js assets for verification."
    echo "ERROR: ${label} did not include any Next assets"
    return 1
  fi

  echo "ok (${label} assets -> ${url}, assets=${asset_count})"
}

verify_public_revalidation_smoke() {
  if [[ -z "$(read_env_var "FRONTEND_REVALIDATE_TOKEN")" ]]; then
    echo "NOTICE: FRONTEND_REVALIDATE_TOKEN not set; skipping revalidation smoke check."
    return 0
  fi

  if dc exec -T frontend node -e "const token=process.env.REVALIDATE_TOKEN; if (!token) process.exit(2); fetch('http://127.0.0.1:3000/api/revalidate', { method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify({ paths: ['/jobs'], tags: ['content:posts', 'content:listings'] }) }).then(async (res) => { if (!res.ok) { console.error('revalidate-status=' + res.status); console.error(await res.text()); process.exit(1); } }).catch((error) => { console.error(error); process.exit(1); });"; then
    echo "ok (frontend revalidation smoke -> internal frontend container route)"
    return 0
  fi

  record_diagnosis "The protected frontend revalidation smoke check failed. Verify FRONTEND_REVALIDATE_TOKEN and frontend runtime wiring."
  echo "ERROR: frontend revalidation smoke check failed for internal frontend container route"
  return 1
}

print_success_summary() {
  local mode="$1"
  local backend_health_result="$2"
  local public_health_result="$3"
  local rollback_sha="${DEPLOY_PREVIOUS_SHA:-unknown}"
  local rollback_repo="${DEPLOY_REPO_DIR:-$ROOT_DIR}"
  local escaped_repo
  printf -v escaped_repo '%q' "$rollback_repo"

  echo "DEPLOY SUMMARY"
  echo "  deployed_sha: ${DEPLOY_TARGET_SHA:-unknown}"
  echo "  previous_sha: ${rollback_sha}"
  echo "  repo_path: ${rollback_repo}"
  echo "  mode: ${mode}"
  echo "  backend_health: ${backend_health_result}"
  echo "  public_health: ${public_health_result}"
  echo "  rollback_hint: cd ${escaped_repo} && DO_REPO_DIR=${escaped_repo} bash scripts/deploy-live.sh --mode ${mode} --sha ${rollback_sha}"
}
