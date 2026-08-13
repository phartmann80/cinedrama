#!/usr/bin/env bash
#
# CineDrama API smoke test
#
# Verifies:
#   1. Health endpoint returns 200
#   2. Protected route returns 401 without a token
#   3. CORS headers present for https://cinedrama.app origin
#
# Usage:
#   bash deploy/scripts/smoke-test.sh [BASE_URL]
#
# Default base URL: http://localhost:5000
# For production testing: bash deploy/scripts/smoke-test.sh https://api.cinedrama.app
#
set -euo pipefail

BASE_URL="${1:-http://localhost:5000}"
ORIGIN="https://cinedrama.app"
PASS=0
FAIL=0

check() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if echo "$actual" | grep -qi "$expected"; then
    echo "  PASS: $label"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $label"
    echo "    expected: $expected"
    echo "    got:      $actual"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== CineDrama API Smoke Test ==="
echo "Target: $BASE_URL"
echo "Origin: $ORIGIN"
echo ""

# --- 1. Health endpoint returns 200 ---
echo "[1/3] Health endpoint"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/healthz")
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | tail -n 1)
check "GET /api/healthz returns HTTP 200" "200" "$HEALTH_STATUS"
check "Health body contains status:ok" "ok" "$HEALTH_BODY"
echo ""

# --- 2. Protected route returns 401 without token ---
echo "[2/3] Protected route (no auth)"
UNAUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/user/me")
check "GET /api/v1/user/me returns HTTP 401 without token" "401" "$UNAUTH_STATUS"
echo ""

# --- 3. CORS headers present for cinedrama.app origin ---
echo "[3/3] CORS headers"
CORS_RESPONSE=$(curl -s -D - -o /dev/null \
  -H "Origin: $ORIGIN" \
  "$BASE_URL/api/healthz")
check "Access-Control-Allow-Origin header present" "access-control-allow-origin" "$CORS_RESPONSE"
check "CORS allows cinedrama.app origin" "$ORIGIN" "$CORS_RESPONSE"
echo ""

# --- Summary ---
echo "=== Results ==="
echo "  Passed: $PASS"
echo "  Failed: $FAIL"
if [ "$FAIL" -gt 0 ]; then
  echo "SMOKE TEST FAILED"
  exit 1
fi
echo "SMOKE TEST PASSED"
exit 0
