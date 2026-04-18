#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-}"

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

resolve_public_base_url() {
  if [[ -n "$PUBLIC_BASE_URL" ]]; then
    return 0
  fi

  PUBLIC_BASE_URL="$(read_env_var "FRONTEND_URL")"
  if [[ -z "$PUBLIC_BASE_URL" ]]; then
    PUBLIC_BASE_URL="https://sarkariexams.me"
  fi
}

check_http() {
  local path="$1"
  local label="$2"
  local expected_pattern="${3:-^(2|3)}"
  local url="${PUBLIC_BASE_URL%/}${path}"
  local status

  status="$(curl -sS -L -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 15 "$url" || true)"
  if [[ "$status" =~ $expected_pattern ]]; then
    echo "ok   ${label} (${url}) -> ${status}"
    return 0
  fi

  echo "fail ${label} (${url}) -> ${status:-none}, expected ${expected_pattern}"
  return 1
}

check_assets() {
  local path="$1"
  local label="$2"
  local url="${PUBLIC_BASE_URL%/}${path}"
  local html asset

  html="$(curl -sS -L --max-time 15 "$url" || true)"
  if [[ -z "$html" ]]; then
    echo "fail ${label} asset check -> empty HTML for ${url}"
    return 1
  fi

  while IFS= read -r asset; do
    [[ -n "$asset" ]] || continue
    local code
    code="$(curl -sS -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 "${PUBLIC_BASE_URL%/}${asset}" || true)"
    if [[ ! "$code" =~ ^2 ]]; then
      echo "fail ${label} asset ${asset} -> ${code:-none}"
      return 1
    fi
  done < <(printf '%s' "$html" | grep -oE "/_next/static/[^\"'[:space:]]+\.(js|css)" | sort -u | head -20)

  echo "ok   ${label} assets"
}

check_revalidation_smoke() {
  local token
  token="$(read_env_var "FRONTEND_REVALIDATE_TOKEN")"
  if [[ -z "$token" ]]; then
    echo "skip frontend revalidation smoke (FRONTEND_REVALIDATE_TOKEN not set)"
    return 0
  fi

  if ! command -v docker >/dev/null 2>&1; then
    echo "skip frontend revalidation smoke (docker command unavailable)"
    return 0
  fi

  if ! docker compose -f "$ROOT_DIR/docker-compose.yml" --project-name "${COMPOSE_PROJECT_NAME:-sarkari-result}" --env-file "$ROOT_DIR/.env" exec -T frontend node -e "const token=process.env.REVALIDATE_TOKEN; if (!token) process.exit(2); fetch('http://127.0.0.1:3000/api/revalidate', { method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify({ paths: ['/jobs'], tags: ['content:posts', 'content:listings'] }) }).then(async (res) => { if (!res.ok) { console.error('status=' + res.status); console.error(await res.text()); process.exit(1); } }).catch((error) => { console.error(error); process.exit(1); });"; then
    echo "fail frontend revalidation smoke"
    return 1
  fi

  echo "ok   frontend revalidation smoke"
}

main() {
  resolve_public_base_url
  echo "Verifying deployment at ${PUBLIC_BASE_URL}"

  check_http "/api/health" "backend health" "^200$"
  check_http "/api/health/deep" "backend deep health" "^200$"
  check_http "/" "homepage"
  check_assets "/" "homepage"
  check_http "/jobs" "jobs listing"
  check_assets "/jobs" "jobs listing"
  check_http "/results" "results listing"
  check_assets "/results" "results listing"
  check_http "/admin" "admin console"
  check_revalidation_smoke

  echo "Deployment verification passed."
}

main "$@"
