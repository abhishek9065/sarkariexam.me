#!/usr/bin/env bash

# Comprehensive deployment verification script
# Run this after fast deployment to ensure everything works correctly

set -euo pipefail

PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://sarkariexams.me}"

echo "=== Comprehensive Deployment Verification ==="
echo "Testing: $PUBLIC_BASE_URL"

check_public_route() {
  local path="$1"
  local label="$2"
  local url="${PUBLIC_BASE_URL}${path}"
  local status

  status="$(curl -sS -L -o /dev/null -w "%{http_code}" --max-time 15 "$url" || true)"
  if [[ ! "$status" =~ ^2 ]]; then
    echo "❌ FAIL: ${label} (${url}) - Status: ${status:-timeout}"
    return 1
  fi

  echo "✅ PASS: ${label} (${url})"
}

check_public_route_assets() {
  local path="$1"
  local label="$2"
  local url="${PUBLIC_BASE_URL}${path}"
  local html
  local asset_count=0

  html="$(curl -sS -L --max-time 15 "$url" || true)"
  if [[ -z "$html" ]]; then
    echo "❌ FAIL: ${label} - No HTML returned"
    return 1
  fi

  while IFS= read -r asset; do
    [[ -z "$asset" ]] && continue
    asset_count=$((asset_count + 1))
    local asset_status
    asset_status="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "${PUBLIC_BASE_URL}${asset}" || true)"
    if [[ ! "$asset_status" =~ ^2 ]]; then
      echo "❌ FAIL: ${label} - Missing asset: ${asset} (${asset_status:-timeout})"
      return 1
    fi
  done < <(printf '%s' "$html" | grep -oE "/_next/static/[^\"'[:space:]]+\.(js|css)" | sort -u | head -20)

  echo "✅ PASS: ${label} assets (${asset_count} checked)"
}

check_admin_functionality() {
  echo
  echo "=== Admin Button Functionality Check ==="
  
  local homepage_html
  homepage_html="$(curl -sS -L --max-time 15 "$PUBLIC_BASE_URL" || true)"
  
  if printf '%s' "$homepage_html" | grep -q 'useCurrentUser\|admin'; then
    echo "✅ PASS: Admin authentication code detected in homepage"
  else
    echo "⚠️  WARN: Admin authentication code not detected (may be bundled)"
  fi
  
  # Check if admin console is accessible
  local admin_status
  admin_status="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 15 "${PUBLIC_BASE_URL}/admin" || true)"
  if [[ "$admin_status" =~ ^[23] ]]; then
    echo "✅ PASS: Admin console endpoint accessible (/admin)"
  else
    echo "❌ FAIL: Admin console endpoint not accessible (/admin) - Status: ${admin_status:-timeout}"
  fi
}

echo "Testing critical public routes..."
check_public_route "/" "Homepage"
check_public_route "/jobs" "Jobs listing"
check_public_route "/results" "Results listing" 
check_public_route "/admissions" "Admissions listing"
check_public_route "/admit-cards" "Admit cards listing"
check_public_route "/answer-keys" "Answer keys listing"

echo
echo "Testing dynamic routes..."
check_public_route "/jobs/1" "Job detail"
check_public_route "/results/upsc-civil-services-2025-final-result" "Result detail"
check_public_route "/admit-cards/upsc" "Admit card detail"
check_public_route "/states/uttar-pradesh" "State jobs page"
check_public_route "/search?q=ssc" "Search page"

echo
echo "Testing static assets..."
check_public_route_assets "/" "Homepage"
check_public_route_assets "/jobs" "Jobs listing"
check_public_route_assets "/jobs/1" "Job detail"

echo
echo "Testing API endpoints..."
check_public_route "/api/health" "API health endpoint"

check_admin_functionality

echo
echo "=== Backend Health Check ==="
health_response="$(curl -sS --max-time 10 "${PUBLIC_BASE_URL}/api/health" || echo "failed")"
if echo "$health_response" | grep -q '"status":"ok"'; then
  echo "✅ PASS: Backend health endpoint returns ok"
  if echo "$health_response" | grep -q '"db":{"configured":true,"ok":true}'; then
    echo "✅ PASS: Database connection healthy"
  else
    echo "⚠️  WARN: Database status unclear"
  fi
else
  echo "❌ FAIL: Backend health endpoint failed"
fi

echo
echo "=== Performance Check ==="
start_time=$(date +%s%3N)
curl -sS -o /dev/null --max-time 10 "$PUBLIC_BASE_URL" || true
end_time=$(date +%s%3N)
load_time=$((end_time - start_time))

if [[ $load_time -lt 2000 ]]; then
  echo "✅ PASS: Homepage loads in ${load_time}ms (excellent)"
elif [[ $load_time -lt 5000 ]]; then
  echo "✅ PASS: Homepage loads in ${load_time}ms (good)"
else
  echo "⚠️  WARN: Homepage loads in ${load_time}ms (slow)"
fi

echo
echo "=== SSL/Security Check ==="
ssl_status="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "https://sarkariexams.me" || true)"
if [[ "$ssl_status" =~ ^2 ]]; then
  echo "✅ PASS: HTTPS/SSL working"
else
  echo "❌ FAIL: HTTPS/SSL issue - Status: ${ssl_status:-timeout}"
fi

echo
echo "=== Deployment Verification Complete ==="
echo "For any failures, check container logs with:"
echo "  docker compose logs backend"
echo "  docker compose logs frontend"
echo "  docker compose logs nginx"