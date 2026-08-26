#!/usr/bin/env bash
#
# CineDrama Web deploy (staging rsync + remote build + atomic-ish swap)
#
# Builds happen in a STAGING directory so the live app keeps serving from the
# old tree for the whole install/build window:
#
#   /opt/cinedrama/web          live (what systemd serves)
#   /opt/cinedrama/web-deploy   staging (npm ci + build happen here)
#
# Flow:
#   1. rsync source -> staging
#   2. npm ci + build in staging
#   3. rsync the built staging tree -> live (only after the build succeeds)
#   4. restart cinedrama-web
#   5. smoke test
#
# `set -euo pipefail` guarantees the restart step can NEVER run if the build
# fails — the script aborts at the failed command in step 2/3. This is the
# guard against leaving a broken live tree mid-restart.
#
# No credentials are committed — pass them via environment variables or CI
# secrets.
#
# Required env:
#   WEB_DEPLOY_HOST    target VPS host/IP
#   WEB_DEPLOY_USER    SSH user (default: deploy; MUST be a member of the shared
#                      'cinedramadeploy' group with write on the live/staging
#                      dirs and have NOPASSWD sudo for exactly
#                      `systemctl restart cinedrama-web` — see provision-web.sh)
# Optional env:
#   WEB_DEPLOY_PORT    SSH port (default: 22)
#   WEB_DEPLOY_PATH    live app path on VPS (default: /opt/cinedrama/web)
#   WEB_DEPLOY_STAGING staging path (default: ${WEB_DEPLOY_PATH}-deploy)
#   NEXT_PUBLIC_APK_URL      (default: from web/.env.example)
#   NEXT_PUBLIC_API_BASE_URL (default: from web/.env.example)
#
# Usage:
#   WEB_DEPLOY_HOST=1.2.3.4 WEB_DEPLOY_USER=deploy bash deploy/scripts/deploy-web.sh
#
set -euo pipefail

: "${WEB_DEPLOY_HOST:?WEB_DEPLOY_HOST is required}"
WEB_DEPLOY_USER="${WEB_DEPLOY_USER:-deploy}"
WEB_DEPLOY_PORT="${WEB_DEPLOY_PORT:-22}"
WEB_DEPLOY_PATH="${WEB_DEPLOY_PATH:-/opt/cinedrama/web}"
WEB_DEPLOY_STAGING="${WEB_DEPLOY_STAGING:-${WEB_DEPLOY_PATH}-deploy}"
NEXT_PUBLIC_APK_URL="${NEXT_PUBLIC_APK_URL:-https://cinedrama.app/download/cinedrama-latest.apk}"
NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-https://api.cinedrama.app}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WEB_DIR="${REPO_ROOT}/web"
SSH_OPTS=(-p "${WEB_DEPLOY_PORT}")
RSH="ssh -p ${WEB_DEPLOY_PORT}"

echo "=== CineDrama Web deploy (staging build) ==="
echo "  Host:      ${WEB_DEPLOY_HOST}:${WEB_DEPLOY_PORT}"
echo "  User:      ${WEB_DEPLOY_USER}"
echo "  Live:      ${WEB_DEPLOY_PATH}"
echo "  Staging:   ${WEB_DEPLOY_STAGING}"
echo "  Source:    ${WEB_DIR}"
echo ""

cleanup_staging() {
  echo "INFO: leaving staging tree at ${WEB_DEPLOY_STAGING} for inspection (not deleting)."
}
trap cleanup_staging EXIT

# --- 1. Rsync source to STAGING (exclude build artifacts + secrets) ---
echo "[1/5] Syncing source to staging on ${WEB_DEPLOY_HOST}..."
ssh "${SSH_OPTS[@]}" "${WEB_DEPLOY_USER}@${WEB_DEPLOY_HOST}" \
  "mkdir -p '${WEB_DEPLOY_STAGING}' && rm -rf '${WEB_DEPLOY_STAGING}'/.next '${WEB_DEPLOY_STAGING}'/node_modules"
rsync -az --delete \
  -e "${RSH}" \
  --exclude node_modules \
  --exclude .next \
  --exclude '.env*' \
  "${WEB_DIR}/" "${WEB_DEPLOY_USER}@${WEB_DEPLOY_HOST}:${WEB_DEPLOY_STAGING}/"

# --- 2. Install + build in staging ---
echo "[2/5] Running npm ci + build in staging..."
ssh "${SSH_OPTS[@]}" "${WEB_DEPLOY_USER}@${WEB_DEPLOY_HOST}" \
  "cd '${WEB_DEPLOY_STAGING}' && \
   npm ci && \
   NEXT_PUBLIC_APK_URL='${NEXT_PUBLIC_APK_URL}' \
   NEXT_PUBLIC_API_BASE_URL='${NEXT_PUBLIC_API_BASE_URL}' \
   npm run build"

# --- 3. Promote staging -> live (ON THE VPS; only after build succeeded) ---
# rsync cannot copy remote->remote in one command, so the promote runs over
# SSH as a single local rsync on the VPS. Runs only after the build succeeded
# (set -euo pipefail aborts above otherwise), so the live service is never
# touched by a failed build.
echo "[3/5] Promoting staging tree to live ${WEB_DEPLOY_PATH} on the VPS..."
ssh "${SSH_OPTS[@]}" "${WEB_DEPLOY_USER}@${WEB_DEPLOY_HOST}" \
  "rsync -a --delete --exclude '.env*' '${WEB_DEPLOY_STAGING}/' '${WEB_DEPLOY_PATH}/'"

# --- 4. Restart service (aborts above if build failed) ---
echo "[4/5] Restarting cinedrama-web..."
ssh "${SSH_OPTS[@]}" "${WEB_DEPLOY_USER}@${WEB_DEPLOY_HOST}" \
  "sudo systemctl restart cinedrama-web && systemctl is-active cinedrama-web"

# --- 5. Smoke test ---
echo "[5/5] Smoke test..."
PUBLIC_URL="https://cinedrama.app"
# If testing before DNS/certs, override: SMOKE_URL=http://127.0.0.1:3000
SMOKE_URL="${SMOKE_URL:-${PUBLIC_URL}}"
bash "${SCRIPT_DIR}/smoke-test-web.sh" "${SMOKE_URL}"

echo ""
echo "=== Deploy complete ==="
echo "URL: ${PUBLIC_URL}"
