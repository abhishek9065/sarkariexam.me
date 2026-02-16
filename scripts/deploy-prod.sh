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

echo "Backend health (container internal):"
docker compose exec -T backend wget -qO- http://127.0.0.1:4000/api/health
echo

echo "Backend health (public edge):"
curl -fsS https://sarkariexams.me/api/health >/dev/null && echo "ok"

echo "Deploy completed successfully."
