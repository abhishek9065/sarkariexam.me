#!/usr/bin/env bash

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-sarkari-result}"
export COMPOSE_PROJECT_NAME

PRODUCTION_COMPOSE_FILES=(-f docker-compose.production.yml)

dc() {
  docker compose "${PRODUCTION_COMPOSE_FILES[@]}" --project-name "$COMPOSE_PROJECT_NAME" --env-file .env "$@"
}

require_env_file() {
  if [[ ! -f "$ROOT_DIR/.env" ]]; then
    echo "ERROR: .env not found at $ROOT_DIR/.env"
    exit 1
  fi
}

read_env_var() {
  local key="$1"
  local from_env="${!key:-}"
  if [[ -n "$from_env" ]]; then
    printf '%s' "$from_env"
    return 0
  fi

  local line
  line="$(grep -E "^[[:space:]]*${key}[[:space:]]*=" "$ROOT_DIR/.env" | tail -n 1 || true)"
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

validate_production_env() {
  MISSING_KEYS=()
  require_var "COSMOS_CONNECTION_STRING"
  require_var "JWT_SECRET"
  require_var "DOCR_REGISTRY_NAME"
  require_var "DOCR_ACCESS_TOKEN"

  if [[ "${#MISSING_KEYS[@]}" -gt 0 ]]; then
    echo "ERROR: missing required production env var(s) in .env:"
    for key in "${MISSING_KEYS[@]}"; do
      echo "  - $key"
    done
    echo
    echo "Set them in $ROOT_DIR/.env and rerun deploy."
    exit 1
  fi

  local frontend_revalidate_url frontend_revalidate_token
  frontend_revalidate_url="$(read_env_var "FRONTEND_REVALIDATE_URL")"
  frontend_revalidate_token="$(read_env_var "FRONTEND_REVALIDATE_TOKEN")"

  if [[ -n "$frontend_revalidate_url" && -z "$frontend_revalidate_token" ]]; then
    echo "ERROR: FRONTEND_REVALIDATE_URL is set but FRONTEND_REVALIDATE_TOKEN is missing."
    echo "Set FRONTEND_REVALIDATE_TOKEN in $ROOT_DIR/.env or unset FRONTEND_REVALIDATE_URL."
    exit 1
  fi

  if [[ -z "$frontend_revalidate_url" && -n "$frontend_revalidate_token" ]]; then
    echo "NOTICE: FRONTEND_REVALIDATE_TOKEN is set but FRONTEND_REVALIDATE_URL is missing."
    echo "  Content publishes will skip frontend revalidation until FRONTEND_REVALIDATE_URL is configured."
  fi
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
    for key in "${missing[@]}"; do
      echo "  - $key"
    done
  fi
}

configure_production_images() {
  local registry_name registry_token

  registry_name="$(read_env_var "DOCR_REGISTRY_NAME")"
  registry_token="$(read_env_var "DOCR_ACCESS_TOKEN")"

  export DOCR_REGISTRY_NAME="$registry_name"
  export DOCR_ACCESS_TOKEN="$registry_token"
  export IMAGE_REGISTRY="registry.digitalocean.com/${DOCR_REGISTRY_NAME}"
  export IMAGE_TAG="${DEPLOY_IMAGE_TAG:-${IMAGE_TAG:-main}}"
  export IMAGE_FALLBACK_TAG="${DEPLOY_IMAGE_FALLBACK_TAG:-main}"
}

login_container_registry() {
  local registry_username

  registry_username="$(read_env_var "DOCR_USERNAME")"
  if [[ -z "$registry_username" ]]; then
    registry_username="$DOCR_ACCESS_TOKEN"
  fi

  echo "Authenticating Docker with DigitalOcean Container Registry..."
  printf '%s' "$DOCR_ACCESS_TOKEN" | docker login registry.digitalocean.com -u "$registry_username" --password-stdin >/dev/null
}

resolve_datadog_services() {
  DATADOG_SERVICES=()
  if [[ -n "$(read_env_var "DD_API_KEY")" ]]; then
    DATADOG_SERVICES+=(datadog-agent)
  else
    echo "NOTICE: DD_API_KEY not set — skipping Datadog agent startup."
  fi
}

remove_conflicting_container() {
  local name="$1"
  local existing_id
  existing_id="$(docker ps -aq --filter "name=^/${name}$" | head -n1 || true)"
  if [[ -n "$existing_id" ]]; then
    echo "Removing pre-existing container ${name}..."
    docker rm -f "$existing_id" >/dev/null 2>&1 || true
  fi
}

cleanup_named_containers() {
  remove_conflicting_container "sarkari-nginx"
  remove_conflicting_container "sarkari-backend"
  remove_conflicting_container "sarkari-admin"
  remove_conflicting_container "sarkari-frontend"
  remove_conflicting_container "sarkari-datadog"
}

service_container_id() {
  local service="$1"
  dc ps -q "$service" | head -n1
}

pull_production_images() {
  local services=(nginx backend admin frontend)
  local primary_tag="$IMAGE_TAG"

  echo "Pulling production images for tag ${primary_tag}..."
  if dc pull "${services[@]}"; then
    echo "Production images ready for tag ${primary_tag}."
    return 0
  fi

  if [[ -n "$IMAGE_FALLBACK_TAG" && "$IMAGE_FALLBACK_TAG" != "$primary_tag" ]]; then
    export IMAGE_TAG="$IMAGE_FALLBACK_TAG"
    echo "Primary image tag ${primary_tag} unavailable. Falling back to ${IMAGE_TAG}."
    dc pull "${services[@]}"
    echo "Production images ready for fallback tag ${IMAGE_TAG}."
    return 0
  fi

  echo "ERROR: failed to pull production images for tag ${primary_tag}."
  return 1
}
