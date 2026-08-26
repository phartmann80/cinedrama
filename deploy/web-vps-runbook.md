# CineDrama Web — VPS Execution Runbook (run as root on the server)

> **Model:** *You script it, I run it as root and paste back sanitized output.*
> Everything below is secret-free and reviewable. No credentials, no
> `/etc/cinedrama/*.env` contents, no SSH keys.
>
> **Assumption:** you have the repo checked out on the VPS at
> `/opt/cinedrama/source` (a copy of this repo, NOT the live app dir). If you
> place it elsewhere, substitute that path in the commands below.
> `SERVER_SOURCE=/opt/cinedrama/source`.

---

## 0. Pre-flight: SSH into your own server

You are running this directly on the VPS (no agent SSH needed). Start there:

```bash
ssh deploy@31.70.107.44          # or however you normally log in
sudo -i                          # become root for the provisioning/apt steps
```

---

## 1. Audit (secret-free) — run and paste back

Copy the required script into the source checkout and run it **as root**:

```bash
cd /opt/cinedrama/source
sudo bash deploy/scripts/audit-server.sh --with-apt-update
```

Paste the full output back. It reports OS/kernel/arch/uptime, CPU/mem/disk,
Node/npm versions, Nginx version + config-syntax pass/fail, `cinedrama-api` /
`cinedrama-web` systemd state (if present), loopback service ports, systemd
unit-file presence, firewall summary, and the `apt-get update` tail. It never
reads env files or keys.

> Note: on a **clean** Ubuntu 24.04, Node will still be absent at this point.
> That's expected — the provision script installs it next.

---

## 2. Provision (clean Ubuntu 24.04) — run as root

From the source checkout:

```bash
cd /opt/cinedrama/source
sudo bash deploy/scripts/provision-web.sh
```

This is current for a clean Ubuntu 24.04. It will:
- create the `cinedrama` service user (nologin) and the `cinedrama` app dirs;
- **install Node.js 20** via NodeSource if Node is missing/old (clean box → adds `nodejs`, plus `curl`, `gnupg`, `rsync`);
- create the shared `cinedramadeploy` group;
- create the SSH deploy user `deploy` (home + bash) and add it to the shared group (group-write + setgid on live/staging);
- create `/opt/cinedrama/downloads`;
- write `/etc/cinedrama/web.env` (mode 0600, cinedrama) with **public, non-secret** `NEXT_PUBLIC_*` values + `PORT`;
- install + enable `cinedrama-web.service`;
- install the scoped sudoers rule granting exactly `systemctl restart cinedrama-web`.

Override env before running if needed (all defaults are correct for prod):
```bash
# defaults already correct; only override if you use different values
# sudo NEXT_PUBLIC_APK_URL=... NEXT_PUBLIC_API_BASE_URL=... bash deploy/scripts/provision-web.sh
```

> If you prefer not to auto-create the `deploy` SSH user (you only need local
> deploy), set `WEB_DEPLOY_USER` to a real SSH user that already exists, or set
> it to your root-executed username; the guard still refuses `cinedrama`.

---

## 3. Nginx + Certbot — run as root

Prototype flow: **prepare everything before the DNS flip; only the tiny
certbot+reload runs after it.** This keeps the plain-HTTP window to a few
seconds and never leaves the site down.

### 3a. Phase A — BEFORE DNS flip (prepare, no domain traffic expected)

```bash
# Install nginx + certbot + rsync
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Web challenge/webroot + app/download dirs
sudo mkdir -p /var/www/html /opt/cinedrama/downloads

# Export the NEXT_PUBLIC values used at build (already the script defaults,
# but set explicitly so the shell below is self-contained):
export NEXT_PUBLIC_APK_URL="https://cinedrama.app/download/cinedrama-latest.apk"
export NEXT_PUBLIC_API_BASE_URL="https://api.cinedrama.app"
```

**Stage all config files (NOT yet enabled):**

```bash
# 1) Final web vhost (references cert paths that don't exist yet — keep disabled)
sudo install -m 644 /opt/cinedrama/source/deploy/nginx/cinedrama-web.conf \
  /etc/nginx/sites-available/cinedrama-web.conf

# 2) ACME bootstrap vhost (only HTTP challenge; returns 503 elsewhere)
sudo tee /etc/nginx/sites-available/cinedrama-acme.conf >/dev/null <<'EOF'
server {
    listen 80;
    server_name cinedrama.app www.cinedrama.app;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 503 "CineDrama provisioning in progress"; }
}
EOF
```

Now test the **ACME config** without touching the live sites (it's the only
enabled CineDrama site for now):

```bash
sudo rm -f /etc/nginx/sites-enabled/cinedrama-web.conf
sudo ln -sf /etc/nginx/sites-available/cinedrama-acme.conf /etc/nginx/sites-enabled/cinedrama-acme.conf
sudo nginx -t && sudo systemctl reload nginx
```

> At this point the server serves 503 on cinedrama.app if anyone hits it,
> and is ready to answer ACME the instant DNS points here.

### 3b. Phase B — AT DNS flip (Paul flips `cinedrama.app`/`www` → `31.70.107.44`)

Run immediately (a few seconds). Email `YOU@example.com` is required by
Certbot; use your real Let's Encrypt contact.

```bash
sudo certbot certonly --webroot -w /var/www/html \
  -d cinedrama.app -d www.cinedrama.app \
  --non-interactive --agree-tos -m YOU@example.com --keep-until-expiring
```

If it succeeds it writes `/etc/letsencrypt/live/cinedrama.app/fullchain.pem`
and `privkey.pem`.

### 3c. Phase C — activate HTTPS (immediately after certbot)

```bash
sudo ln -sf /etc/nginx/sites-available/cinedrama-web.conf /etc/nginx/sites-enabled/cinedrama-web.conf
sudo rm -f /etc/nginx/sites-enabled/cinedrama-acme.conf
sudo nginx -t && sudo systemctl reload nginx
```

The final vhost now redirects HTTP→HTTPS, serves Next.js from
`127.0.0.1:3000`, proxies `/api/` → `127.0.0.1:5000`, and serves `/download/`
from `/opt/cinedrama/downloads/`.

### Optional after the fact
- Set auto-renewal hook so renewals reload nginx:
  ```bash
  sudo systemctl enable --now certbot.timer
  sudo tee /etc/letsencrypt/renewal-hooks/deploy/nginx-reload <<'EOF'
  #!/bin/sh
  systemctl reload nginx
  EOF
  sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/nginx-reload
  ```
- If you also want the API domain later, install `cinedrama-api.conf` the same
  way (it keeps `api.cinedrama.app`).

---

## 4. Deploy (local execution on the VPS) — run as root

There are two variants. **Use the local variant** since you're executing on the
server:

```bash
cd /opt/cinedrama/source
sudo bash deploy/scripts/deploy-web-local.sh
```

What it does (secret-free, reviewed in `deploy/scripts/deploy-web-local.sh`):
- source: `/opt/cinedrama/source/web`  (Web_SRC; must not be the live dir)
- build in `/opt/cinedrama/web-deploy` (staging)
- promote to `/opt/cinedrama/web` (live) **only after a successful build**
- `systemctl restart cinedrama-web` + `systemctl is-active`
- run `deploy/scripts/smoke-test-web.sh http://127.0.0.1:3000`

It uses the prod-correct defaults for `NEXT_PUBLIC_APK_URL` /
`NEXT_PUBLIC_API_BASE_URL`, so no extra env is needed for the first deploy.
To also hit the public URL right away (only meaningful after DNS/certs):
```bash
sudo SMOKE_PUBLIC=1 bash deploy/scripts/deploy-web-local.sh
```

> The SSH variant (`deploy-web.sh`) is already fixed (`WEB_DEPLOY_USER` defaults
> to `deploy`) and remains for pull-based deploys later. It is NOT required here.

---

## 5. Smoke-test checklist — run and paste back

Run these **after** the service is up. Local checks work immediately; public
checks only become meaningful once DNS is flipped to `31.70.107.44`.

```bash
# Local (server-side, after deploy)
bash /opt/cinedrama/source/deploy/scripts/smoke-test-web.sh http://127.0.0.1:3000

# Public (after DNS flip + certbot)
curl -s -o /dev/null -w "GET /              → %{http_code}\n" https://cinedrama.app/
curl -s -o /dev/null -w "GET /privacy       → %{http_code}\n" https://cinedrama.app/privacy
curl -s -o /dev/null -w "GET /terms         → %{http_code}\n" https://cinedrama.app/terms
curl -s -o /dev/null -w "GET /api/healthz   → %{http_code}\n" https://cinedrama.app/api/healthz
curl -s -o /dev/null -w "GET /download/...  → %{http_code}\n" https://cinedrama.app/download/cinedrama-latest.apk
```

**Pass criteria:**
- `/` → 200 and contains `Stories Built for Your Phone`
- `/privacy` → 200
- `/terms` → 200
- `/api/healthz` → 200 (if the API is deployed; otherwise report 502/504 — the
  web service itself is fine if `/`, `/privacy`, `/terms` are 200)
- `/download/cinedrama-latest.apk` → 200 (APK uploaded) **or** 404 (APK not
  uploaded yet — expected; not a deploys failure)

**Also verify the service processes:**
```bash
systemctl is-active cinedrama-web
systemctl is-active cinedrama-api   # if/once deployed
```

---

## 6. What to paste back

Please paste back the sanitized output of, in order:
1. `audit-server.sh --with-apt-update` output
2. `provision-web.sh` output (or the error, if any)
3. `deploy-web-local.sh` output
4. Smoke-test commands output

I'll review for correctness before any further change. If a step fails, paste
the full command + error (still secret-free) and I'll adjust the script.

---

## Security/privacy notes
- No passwords, env-file contents, tokens, or SSH key material are read,
  printed, or required by any script here.
- The public key install (`deploy` SSH user) is **not** needed for the local
  deploy path; it only matters if you later use the SSH deploy variant or agent
  deploys.
- If you run from a fresh checkout, keep `/opt/cinedrama/source` outside the
  live dir; the local deploy script enforces that.
