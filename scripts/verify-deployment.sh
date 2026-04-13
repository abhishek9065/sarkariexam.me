#!/usr/bin/env bash

set -euo pipefail

PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://sarkariexams.me}"

echo "=== Deployment Verification ==="
echo "Testing: $PUBLIC_BASE_URL"

check_public_route() {
  local path="$1"
  local label="$2"
  local url="${PUBLIC_BASE_URL}${path}"
  local status

  status="$(curl -sS -L -o /dev/null -w "%{http_code}" --max-time 15 "$url" || true)"
  if [[ ! "$status" =~ ^2 ]]; then
    echo "FAIL: ${label} (${url}) returned ${status:-timeout}"
    return 1
  fi

  echo "PASS: ${label} (${url}) returned ${status}"
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

check_public_route "/" "Homepage"
check_public_route_html "/" "Homepage"
check_public_route_assets "/" "Homepage"
check_public_route "/jobs" "Jobs listing"
check_public_route_html "/jobs" "Jobs listing"
check_public_route_assets "/jobs" "Jobs listing"
check_public_route "/results/upsc-civil-services-2025-final-result" "Result detail"
check_public_route_html "/results/upsc-civil-services-2025-final-result" "Result detail"
check_public_route_assets "/results/upsc-civil-services-2025-final-result" "Result detail"
check_public_route "/admin" "Admin console"

check_performance

echo "=== Deployment Verification Complete ==="
