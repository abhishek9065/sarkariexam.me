#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "ERROR: .env not found at $ROOT_DIR/.env"
  exit 1
fi

# Load env vars from .env for validation and compose.
set -a
source .env
set +a

require_var() {
  local key="$1"
  local value="${!key:-}"
  if [[ -z "$value" ]]; then
    echo "ERROR: required env var '$key' is missing or empty in .env"
    exit 1
  fi
}

require_var "COSMOS_CONNECTION_STRING"
require_var "JWT_SECRET"
require_var "ADMIN_SETUP_KEY"
require_var "TOTP_ENCRYPTION_KEY"

if [[ -z "${ADMIN_EMAIL_ALLOWLIST:-}" && -z "${ADMIN_DOMAIN_ALLOWLIST:-}" ]]; then
  echo "ERROR: set at least one of ADMIN_EMAIL_ALLOWLIST or ADMIN_DOMAIN_ALLOWLIST in .env"
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
