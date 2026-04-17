#!/usr/bin/env bash

set -euo pipefail

PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://sarkariexams.me}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

read_env_var() {
  local key="$1"
  local from_env="${!key:-}"
  if [[ -n "$from_env" ]]; then
    printf '%s' "$from_env"
    return 0
  fi

  if [[ ! -f "$ROOT_DIR/.env" ]]; then
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

echo "=== Deployment Verification ==="
echo "Testing: $PUBLIC_BASE_URL"

check_public_route() {
  local path="$1"
  local label="$2"
  local url="${PUBLIC_BASE_URL}${path}"
  local status

  status="$(curl -sS -L -o /dev/null -w "%{http_code}" --max-time 15 "$url" || true)"
  if [[ ! "$status" =~ ^(2|3) ]]; then
    echo "FAIL: ${label} (${url}) returned ${status:-timeout}"
    return 1
  fi

  echo "PASS: ${label} (${url}) returned ${status}"
}

check_revalidation_smoke() {
  if [[ -z "$(read_env_var "FRONTEND_REVALIDATE_TOKEN")" ]]; then
    echo "SKIP: Revalidation smoke check (FRONTEND_REVALIDATE_TOKEN not configured in root .env or shell)"
    return 0
  fi

  if ! command -v docker >/dev/null 2>&1 || [[ ! -f "$ROOT_DIR/.env" ]]; then
    echo "SKIP: Revalidation smoke check (docker or root .env unavailable on this machine)"
    return 0
  fi

  if ! docker compose -f "$ROOT_DIR/docker-compose.yml" --project-name "${COMPOSE_PROJECT_NAME:-sarkari-result}" --env-file "$ROOT_DIR/.env" exec -T frontend node -e "const token=process.env.REVALIDATE_TOKEN; if (!token) process.exit(2); fetch('http://127.0.0.1:3000/api/revalidate', { method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify({ paths: ['/jobs'], tags: ['content:posts', 'content:listings'] }) }).then(async (res) => { if (!res.ok) { console.error('revalidate-status=' + res.status); console.error(await res.text()); process.exit(1); } }).catch((error) => { console.error(error); process.exit(1); });"; then
    echo "FAIL: Revalidation smoke (internal frontend container route) failed"
    return 1
  fi

  echo "PASS: Revalidation smoke (internal frontend container route) succeeded"
}

check_public_route_html() {
  local path="$1"
  local label="$2"
  local url="${PUBLIC_BASE_URL}${path}"
  local html

  html="$(curl -sS -L --max-time 15 "$url" || true)"
  if [[ -z "$html" ]]; then
    echo "FAIL: ${label} returned no HTML"
    return 1
  fi

  if printf '%s' "$html" | grep -q 'Application error:'; then
    echo "FAIL: ${label} rendered an application error"
    return 1
  fi

  echo "PASS: ${label} returned HTML without application error"
}

check_public_route_assets() {
  local path="$1"
  local label="$2"
  local url="${PUBLIC_BASE_URL}${path}"
  local html
  local asset_count=0
  local asset
  local asset_status

  html="$(curl -sS -L --max-time 15 "$url" || true)"
  if [[ -z "$html" ]]; then
    echo "FAIL: ${label} returned no HTML for asset validation"
    return 1
  fi

  while IFS= read -r asset; do
    [[ -z "$asset" ]] && continue
    asset_count=$((asset_count + 1))
    asset_status="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "${PUBLIC_BASE_URL}${asset}" || true)"
    if [[ ! "$asset_status" =~ ^2 ]]; then
      echo "FAIL: ${label} asset ${asset} returned ${asset_status:-timeout}"
      return 1
    fi
  done < <(printf '%s' "$html" | grep -oE "/_next/static/[^\"'[:space:]]+\.(js|css)" | sort -u | head -20)

  if [[ "$asset_count" -eq 0 ]]; then
    echo "FAIL: ${label} did not include any Next assets"
    return 1
  fi

  echo "PASS: ${label} assets loaded (${asset_count} checked)"
}

check_performance() {
  local start_time end_time load_time

  start_time=$(date +%s%3N)
  curl -sS -o /dev/null --max-time 15 "${PUBLIC_BASE_URL}/" || true
  end_time=$(date +%s%3N)
  load_time=$((end_time - start_time))

  if [[ $load_time -lt 2000 ]]; then
    echo "PASS: homepage loads in ${load_time}ms"
  elif [[ $load_time -lt 5000 ]]; then
    echo "PASS: homepage loads in ${load_time}ms"
  else
    echo "WARN: homepage loads in ${load_time}ms"
  fi
}

check_public_route "/api/health" "Backend health"
check_public_route "/api/health/deep" "Backend deep health"
check_public_route "/" "Homepage"
check_public_route_html "/" "Homepage"
check_public_route_assets "/" "Homepage"
check_public_route "/jobs" "Jobs listing"
check_public_route_html "/jobs" "Jobs listing"
check_public_route_assets "/jobs" "Jobs listing"
check_public_route "/results" "Results listing"
check_public_route_html "/results" "Results listing"
check_public_route_assets "/results" "Results listing"
check_public_route "/admin" "Admin console"
check_revalidation_smoke

check_performance

echo "=== Deployment Verification Complete ==="
