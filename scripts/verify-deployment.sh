#!/usr/bin/env bash

set -euo pipefail

PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://sarkariexams.me}"
HOMEPAGE_URL="${PUBLIC_BASE_URL}/"

echo "=== Homepage Verification ==="
echo "Testing: $HOMEPAGE_URL"

check_homepage_status() {
  local status

  status="$(curl -sS -L -o /dev/null -w "%{http_code}" --max-time 15 "$HOMEPAGE_URL" || true)"
  if [[ ! "$status" =~ ^2 ]]; then
    echo "FAIL: homepage returned status ${status:-timeout}"
    return 1
  fi

  echo "PASS: homepage returned status ${status}"
}

check_homepage_html() {
  local html

  html="$(curl -sS -L --max-time 15 "$HOMEPAGE_URL" || true)"
  if [[ -z "$html" ]]; then
    echo "FAIL: homepage returned no HTML"
    return 1
  fi

  if printf '%s' "$html" | grep -q 'Application error:'; then
    echo "FAIL: homepage rendered an application error"
    return 1
  fi

  echo "PASS: homepage returned HTML without application error"
}

check_homepage_assets() {
  local html asset_count asset asset_status

  html="$(curl -sS -L --max-time 15 "$HOMEPAGE_URL" || true)"
  if [[ -z "$html" ]]; then
    echo "FAIL: homepage returned no HTML for asset validation"
    return 1
  fi

  asset_count=0
  while IFS= read -r asset; do
    [[ -z "$asset" ]] && continue
    asset_count=$((asset_count + 1))
    asset_status="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "${PUBLIC_BASE_URL}${asset}" || true)"
    if [[ ! "$asset_status" =~ ^2 ]]; then
      echo "FAIL: homepage asset ${asset} returned ${asset_status:-timeout}"
      return 1
    fi
  done < <(printf '%s' "$html" | grep -oE "/_next/static/[^\"'[:space:]]+\.(js|css)" | sort -u | head -20)

  if [[ "$asset_count" -eq 0 ]]; then
    echo "FAIL: homepage did not include any Next assets"
    return 1
  fi

  echo "PASS: homepage assets loaded (${asset_count} checked)"
}

check_homepage_performance() {
  local start_time end_time load_time

  start_time=$(date +%s%3N)
  curl -sS -o /dev/null --max-time 15 "$HOMEPAGE_URL" || true
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

check_https() {
  local status

  status="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "$HOMEPAGE_URL" || true)"
  if [[ ! "$status" =~ ^2 ]]; then
    echo "FAIL: HTTPS homepage returned status ${status:-timeout}"
    return 1
  fi

  echo "PASS: HTTPS homepage is reachable"
}

check_homepage_status
check_homepage_html
check_homepage_assets
check_homepage_performance
check_https

echo "=== Homepage Verification Complete ==="
