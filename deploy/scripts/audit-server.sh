#!/usr/bin/env bash
#
# CineDrama server sanitized audit — run as root ON the VPS.
#
# PURPOSE
#   Produce a sanitized health/readiness report for the CineDrama VPS WITHOUT
#   exposing secrets, environment file contents, API tokens, or SSH keys.
#
# AUDIENCE
#   Paul / an authorized operator runs this locally on the VPS and pastes the
#   output back. It is intentionally safe to share: it never reads
#   /etc/cinedrama/*.env, never prints environment variables, and never reads
#   private keys or key contents.
#
# USAGE
#   sudo bash deploy/scripts/audit-server.sh
#   # To also refresh apt package indexes (root can run it):
#   sudo bash deploy/scripts/audit-server.sh --with-apt-update
#
# WHAT IT REPORTS (sanitized)
#   - OS / kernel / architecture / uptime
#   - CPU + memory + disk summary
#   - Node.js + npm versions
#   - Nginx version + config syntax (only pass/fail)
#   - cinedrama-api / cinedrama-web active state (no env/log content)
#   - Loopback service ports (names only, not secrets)
#   - systemd service file presence
#   - firewall status (ufw inactive/active, basic rule counts)
#
# WHAT IT NEVER REPORTS
#   - /etc/cinedrama/*.env contents or any environment variable values
#   - SSH private keys / authorized key contents / key material
#   - API/data payloads, tokens, passwords, or logs with sensitive values
#
set -euo pipefail

WITH_APT_UPDATE=0
for arg in "$@"; do
  case "${arg}" in
    --with-apt-update) WITH_APT_UPDATE=1 ;;
    *) echo "Unknown option: ${arg}" >&2; echo "Usage: sudo bash $0 [--with-apt-update]" >&2; exit 2 ;;
  esac
done

echo "==============================================================="
echo " CineDrama server sanitized audit"
echo " Generated: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "==============================================================="

echo ""
echo "[1] Operating system"
if [ -r /etc/os-release ]; then
  . /etc/os-release
  echo "  PRETTY_NAME: ${PRETTY_NAME:-unknown}"
  echo "  VERSION_ID:  ${VERSION_ID:-unknown}"
else
  echo "  PRETTY_NAME: <unavailable>"
fi
echo "  Kernel:        $(uname -srm 2>/dev/null || echo unknown)"
echo "  Hostname:      $(hostname -f 2>/dev/null || hostname 2>/dev/null || echo unknown)"
echo "  Uptime:        $(uptime -p 2>/dev/null || echo unknown)"

echo ""
echo "[2] Resources"
echo "  CPU: $(grep -m1 'model name' /proc/cpuinfo 2>/dev/null | sed 's/^[^:]*: //' || echo unknown) x$(nproc 2>/dev/null || echo '?')"
echo "  Memory: $(free -h 2>/dev/null | awk '/Mem:/{print $2" total, "$3" used, "$4" available"} || echo unknown)"
echo "  Disk: $(df -h / 2>/dev/null | tail -1 | awk '{print "root "$2" total, "$3" used, "$4" avail ("$5"%)"} || echo unknown)"

echo ""
echo "[3] Node.js runtime"
echo "  Node: $(node -v 2>/dev/null || echo '<not installed>')"
echo "  npm:  $(npm -v 2>/dev/null || echo '<not installed>')"

echo ""
echo "[4] Nginx"
if command -v nginx >/dev/null 2>&1; then
  echo "  Version: $(nginx -v 2>&1 | sed 's/nginx version: //' || echo unknown)"
  if nginx -t >/dev/null 2>&1; then
    echo "  Config syntax: PASS"
  else
    echo "  Config syntax: FAIL"
  fi
else
  echo "  nginx: <not installed>"
fi

echo ""
echo "[5] CineDrama systemd services"
for svc in cinedrama-api cinedrama-web; do
  if systemctl list-unit-files "${svc}.service" >/dev/null 2>&1; then
    state="$(systemctl show "${svc}" -p ActiveState --value 2>/dev/null || echo unknown)"
    substate="$(systemctl show "${svc}" -p SubState --value 2>/dev/null || echo unknown)"
    unitfile="$(systemctl show "${svc}" -p UnitFileState --value 2>/dev/null || echo unknown)"
    echo "  ${svc}: ActiveState=${state} SubState=${substate} UnitFile=${unitfile}"
  else
    echo "  ${svc}: <unit not present>"
  fi
done

echo ""
echo "[6] Listening loopback service ports (names only)"
if command -v ss >/dev/null 2>&1; then
  ss -tlnp 2>/dev/null | awk 'NR>1 && ($4 ~ /127.0.0.1|\[::1\]/) {print "  " $4 "  " $6}' | sed 's/ \+/ /g; s/^ *//' | sort -u || true
else
  echo "  ss: <not available>"
fi

echo ""
echo "[7] Systemd unit file presence"
for f in /etc/systemd/system/cinedrama-api.service /etc/systemd/system/cinedrama-web.service; do
  if [ -f "${f}" ]; then
    echo "  present: ${f}"
  else
    echo "  missing: ${f}"
  fi
done

echo ""
echo "[8] Firewall status (summary only)"
if command -v ufw >/dev/null 2>&1; then
  echo "  ufw: $(ufw status 2>/dev/null | head -1 || echo '<unavailable>')"
else
  echo "  ufw: <not installed>"
fi
echo "  iptables rules: $(iptables -S 2>/dev/null | wc -l || echo '?')"
echo "  fail2ban: $(command -v fail2ban-client >/dev/null 2>&1 && echo 'installed' || echo 'not installed')"

if [ "${WITH_APT_UPDATE}" -eq 1 ]; then
  echo ""
  echo "[9] apt-get update"
  apt-get update 2>&1 | tail -5 || echo "  apt-get update failed (see above)"
fi

echo ""
echo "==============================================================="
echo " END OF SANITIZED AUDIT"
echo " (No secrets, env values, or key material were collected.)"
echo "==============================================================="
