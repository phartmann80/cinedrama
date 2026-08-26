#!/usr/bin/env bash
#
# CineDrama Web smoke test
#
# Verifies:
#   1. Homepage returns 200
#   2. /privacy and /terms return 200
#   3. /download/cinedrama-latest.apk is reachable (200 or 404 if not uploaded yet)
#   4. /api/healthz is proxied to the backend (200)
#
# Usage:
#   bash deploy/scripts/smoke-test-web.sh [BASE_URL]
#
# Default: https://cinedrama.app
# For a loopback check after a local build: bash smoke-test.sh http://127.0.0.1:3000
#
set -euo pipefail

BASE_URL="${1:-https://cinedrama.app}"
PASS=0
FAIL=0

check() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" = "$expected" ] || echo "$actual" | grep -qi "$expected"; then
    echo "  PASS: ${label}"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: ${label}"
    echo "    expected: ${expected}"
    echo "    got:      ${actual}"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== CineDrama Web Smoke Test ==="
echo "Target: ${BASE_URL}"
echo ""

echo "[1/5] Homepage"
check "GET / returns HTTP 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/")"

echo "[2/5] Legal pages"
check "GET /privacy returns HTTP 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/privacy")"
check "GET /terms returns HTTP 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/terms")"

echo "[3/5] Preview teaser"
PREVIEW_CODE="$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/download/previews/billionaire-s-revenge.mp4")"
PREVIEW_TYPE="$(curl -s -o /dev/null -w '%{content_type}' "${BASE_URL}/download/previews/billionaire-s-revenge.mp4")"
check "GET /download/previews/billionaire-s-revenge.mp4 returns HTTP 200" "200" "${PREVIEW_CODE}"
check "preview Content-Type is video/mp4" "video/mp4" "${PREVIEW_TYPE}"

echo "[4/5] APK download (upload → 200; not yet → 404 is informational)"
APK_CODE="$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/download/cinedrama-latest.apk")"
check "GET /download/cinedrama-latest.apk is HTTP 200 or 404" "200\|404" "${APK_CODE}"
echo "      (got ${APK_CODE}; 404 means APK not uploaded yet)"

echo "[5/5] API proxy"
check "GET /api/healthz returns HTTP 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/api/healthz")"

echo ""
echo "=== Results ==="
echo "  Passed: ${PASS}"
echo "  Failed: ${FAIL}"
if [ "${FAIL}" -gt 0 ]; then
  echo "SMOKE TEST FAILED"
  exit 1
fi
echo "SMOKE TEST PASSED"
exit 0
