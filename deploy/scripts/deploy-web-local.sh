#!/usr/bin/env bash
#
# CineDrama Web deploy — LOCAL execution variant (run ON the VPS).
#
# Use this when you are running directly on the server (root or a user who can
# restart the service). It is the non-SSH version of deploy-web.sh:
#
#   /opt/cinedrama/source/web       source checkout (WEB_SRC)  [NOT the live dir]
#   /opt/cinedrama/web-deploy       staging (build here)
#   /opt/cinedrama/web              live (what systemd serves)
#
# Flow:
#   1. rsync source -> staging
#   2. npm ci + build in staging
#   3. promote staging -> live (only after build succeeds)
#   4. restart cinedrama-web
#   5. smoke test (local first, then public URL if you pass SMOKE_PUBLIC=1)
#
# `set -euo pipefail` guarantees the restart can NEVER run after a failed
# install/build/promote — the script aborts at the failure.
#
# SECRET-FREE: no credentials are in this file. NEXT_PUBLIC_* are public
# build-time values only; the runtime env file (/etc/cinedrama/web.env) is
# read by systemd, never by this script.
#
# Env overrides:
#   WEB_SRC                 source checkout (default: repo<root>/web)
#   WEB_DEPLOY_PATH         live path   (default: /opt/cinedrama/web)
#   WEB_DEPLOY_STAGING      staging path(default: ${WEB_DEPLOY_PATH}-deploy)
#   NEXT_PUBLIC_APK_URL      default: https://cinedrama.app/download/cinedrama-latest.apk
#   NEXT_PUBLIC_API_BASE_URL default: https://api.cinedrama.app
#   SMOKE_PUBLIC             set to 1 to also smoke-test https://cinedrama.app
#
# Usage (from the repo root on the VPS, typically as root):
#   sudo bash deploy/scripts/deploy-web-local.sh
#
# Notes:
#   - If running as root, no sudo is used. If not root, the script prepends
#     `sudo` for the restart; make sure that sudoers rule exists or run as root.
#   - WEB_SRC must NOT be the live or staging dir (aborts).
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WEB_SRC="${WEB_SRC:-${REPO_ROOT}/web}"
WEB_DEPLOY_PATH="${WEB_DEPLOY_PATH:-/opt/cinedrama/web}"
WEB_DEPLOY_STAGING="${WEB_DEPLOY_STAGING:-${WEB_DEPLOY_PATH}-deploy}"
NEXT_PUBLIC_APK_URL="${NEXT_PUBLIC_APK_URL:-https://cinedrama.app/download/cinedrama-latest.apk}"
NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-https://api.cinedrama.app}"
SMOKE_PUBLIC="${SMOKE_PUBLIC:-0}"
PORT="${PORT:-3000}"

if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  SUDO="sudo"
fi

# Group-friendly umask: when the deploy user (non-root) creates files they are
# group-writable, so the `cinedrama` service user (in cinedramadeploy) can write
# .next/cache without root re-chown.
umask 0002

echo "=== CineDrama Web deploy (LOCAL/on-server) ==="
echo "  Source:   ${WEB_SRC}"
echo "  Staging:  ${WEB_DEPLOY_STAGING}"
echo "  Live:     ${WEB_DEPLOY_PATH}"
echo "  Sudo:     ${SUDO:-<none, running as root>}"
echo ""

# Guards -------------------------------------------
for d in "${WEB_DEPLOY_PATH}" "${WEB_DEPLOY_STAGING}"; do
  if [ "$(readlink -f "${WEB_SRC}")" = "$(readlink -f "${d}")" ]; then
    echo "ERROR: WEB_SRC must not be the live/staging dir (${d})."
    echo "       Use a separate checkout, e.g. /opt/cinedrama/source."
    exit 1
  fi
done
if [ ! -d "${WEB_SRC}" ]; then
  echo "ERROR: source dir does not exist: ${WEB_SRC}"
  exit 1
fi
if ! command -v rsync >/dev/null 2>&1; then
  echo "ERROR: rsync is required. Install it (sudo apt-get install -y rsync)."
  exit 1
fi

# --- 1. Sync source -> staging ---
echo "[1/5] Syncing ${WEB_SRC} -> staging..."
mkdir -p "${WEB_DEPLOY_STAGING}"
rm -rf "${WEB_DEPLOY_STAGING}/node_modules" "${WEB_DEPLOY_STAGING}/.next"
rsync -a --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude '.env*' \
  "${WEB_SRC}/" "${WEB_DEPLOY_STAGING}/"

# --- 2. Install + build in staging ---
echo "[2/5] npm ci + build in staging..."
(
  cd "${WEB_DEPLOY_STAGING}"
  npm ci
  NEXT_PUBLIC_APK_URL="${NEXT_PUBLIC_APK_URL}" \
  NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL}" \
  npm run build
)

# --- 3. Promote staging -> live (only after build ok) ---
echo "[3/5] Promoting staging -> live ${WEB_DEPLOY_PATH}..."
rsync -a --delete --exclude '.env*' "${WEB_DEPLOY_STAGING}/" "${WEB_DEPLOY_PATH}/"

# Fix ownership/perms after promotion so the `cinedrama` service user can write
# .next/cache. When run as root we chown; either way we set group-write so the
# cinedramadeploy group (which cinedrama belongs to) can write new cache files.
if [ "$(id -u)" -eq 0 ]; then
  chown -R "cinedrama:cinedramadeploy" "${WEB_DEPLOY_PATH}" "${WEB_DEPLOY_STAGING}"
fi
chmod -R "g+rwX" "${WEB_DEPLOY_PATH}" "${WEB_DEPLOY_STAGING}"

# --- 4. Restart service ---
echo "[4/5] Restarting cinedrama-web..."
# Clear a previous "start request repeated too quickly" state if it exists;
# a build is fine but the unit had failed-start throttling.
${SUDO} systemctl reset-failed cinedrama-web || true
${SUDO} systemctl restart cinedrama-web
${SUDO} systemctl is-active cinedrama-web

# --- 5. Smoke test ---
echo "[5/5] Smoke test (local)..."
bash "${SCRIPT_DIR}/smoke-test-web.sh" "http://127.0.0.1:${PORT}"

if [ "${SMOKE_PUBLIC}" = "1" ]; then
  echo ""
  echo "Smoke test (public)..."
  bash "${SCRIPT_DIR}/smoke-test-web.sh" "https://cinedrama.app"
fi

echo ""
echo "=== Local deploy complete ==="
echo "Local:  http://127.0.0.1:${PORT}"
echo "Public: https://cinedrama.app"
