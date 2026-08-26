#!/usr/bin/env bash
#
# CineDrama Web deploy (rsync + remote build + restart)
#
# Builds happen on the VPS (matches the host platform and avoids shipping
# platform-specific .next artifacts). No credentials are committed — pass them
# via environment variables or CI secrets.
#
# Required env:
#   WEB_DEPLOY_HOST    target VPS host/IP
#   WEB_DEPLOY_USER    SSH user (default: cinedrama)
# Optional env:
#   WEB_DEPLOY_PORT    SSH port (default: 22)
#   WEB_DEPLOY_PATH    app path on VPS (default: /opt/cinedrama/web)
#   NEXT_PUBLIC_APK_URL      (default: from web/.env.example)
#   NEXT_PUBLIC_API_BASE_URL (default: from web/.env.example)
#
# Usage:
#   WEB_DEPLOY_HOST=1.2.3.4 WEB_DEPLOY_USER=deploy bash deploy/scripts/deploy-web.sh
#
set -euo pipefail

: "${WEB_DEPLOY_HOST:?WEB_DEPLOY_HOST is required}"
WEB_DEPLOY_USER="${WEB_DEPLOY_USER:-cinedrama}"
WEB_DEPLOY_PORT="${WEB_DEPLOY_PORT:-22}"
WEB_DEPLOY_PATH="${WEB_DEPLOY_PATH:-/opt/cinedrama/web}"
NEXT_PUBLIC_APK_URL="${NEXT_PUBLIC_APK_URL:-https://cinedrama.app/download/cinedrama-latest.apk}"
NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-https://api.cinedrama.app}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WEB_DIR="${REPO_ROOT}/web"
SSH_OPTS=(-p "${WEB_DEPLOY_PORT}")
RSH="ssh -p ${WEB_DEPLOY_PORT}"

echo "=== CineDrama Web deploy ==="
echo "  Host:       ${WEB_DEPLOY_HOST}:${WEB_DEPLOY_PORT}"
echo "  User:       ${WEB_DEPLOY_USER}"
echo "  Path:       ${WEB_DEPLOY_PATH}"
echo "  Source:     ${WEB_DIR}"
echo ""

# --- 1. Rsync source (exclude build artifacts + secrets) ---
echo "[1/4] Syncing web source to ${WEB_DEPLOY_HOST}..."
rsync -az --delete \
  -e "${RSH}" \
  --exclude node_modules \
  --exclude .next \
  --exclude '.env*' \
  "${WEB_DIR}/" "${WEB_DEPLOY_USER}@${WEB_DEPLOY_HOST}:${WEB_DEPLOY_PATH}/"

# --- 2. Remote install + build ---
echo "[2/4] Running npm ci + build on the VPS..."
ssh "${SSH_OPTS[@]}" "${WEB_DEPLOY_USER}@${WEB_DEPLOY_HOST}" \
  "cd '${WEB_DEPLOY_PATH}' && \
   npm ci && \
   NEXT_PUBLIC_APK_URL='${NEXT_PUBLIC_APK_URL}' \
   NEXT_PUBLIC_API_BASE_URL='${NEXT_PUBLIC_API_BASE_URL}' \
   npm run build"

# --- 3. Restart service ---
echo "[3/4] Restarting cinedrama-web..."
ssh "${SSH_OPTS[@]}" "${WEB_DEPLOY_USER}@${WEB_DEPLOY_HOST}" \
  "sudo systemctl restart cinedrama-web && sudo systemctl --no-pager status cinedrama-web --lines=0 || true"

# --- 4. Smoke test over the public URL ---
echo "[4/4] Smoke test..."
PUBLIC_URL="https://cinedrama.app"
# If testing before DNS/certs, override: SMOKE_URL=http://127.0.0.1:3000
SMOKE_URL="${SMOKE_URL:-${PUBLIC_URL}}"
bash "${SCRIPT_DIR}/smoke-test-web.sh" "${SMOKE_URL}"

echo ""
echo "=== Deploy complete ==="
echo "URL: ${PUBLIC_URL}"
