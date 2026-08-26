# CineDrama Web — VPS Deployment Plan

> **Status:** Proposed (pre-credential). No secrets are wired here. Review this
> plan, then run the provisioning scripts on the VPS. Paul must supply the SSH
> host/user and (optionally) add the GitHub Actions secrets below when wiring
> CI.
>
> **Vercel:** suspended until the account's billing issue is fixed. All web
> deployments target the same Linux VPS as the backend. Do **not** treat the
> Vercel PR check as meaningful while suspended (it fails at 0s pre-build).

---

## 1. Target architecture

Existing layout on the VPS (from the backend deploy work):

```
/opt/cinedrama/
├── backend/         # already deployed (systemd: cinedrama-api, port 5000)
└── web/             # THIS plan (systemd: cinedrama-web, port 3000)
/etc/cinedrama/
├── backend.env      # already exists (mode 0600)
└── web.env          # created by this plan (mode 0600)
```

Ports are **loopback-only** (`127.0.0.1`) and exposed through Nginx, which owns
TLS:

| Host | Port | Upstream |
|------|------|----------|
| `cinedrama.app` / `www.cinedrama.app` | 443/80 | `127.0.0.1:3000` (Next.js) |
| `api.cinedrama.app` | 443/80 | `127.0.0.1:5000` (Express API) |
| `cinedrama.app/download/*` | 443/80 | static APK dir `/opt/cinedrama/downloads` |

The web landing page is fully static (no runtime API calls). It only needs
`NEXT_PUBLIC_*` baked in at build time. `/api` on the main domain is proxied to
the backend as a convenience; the mobile/API clients keep talking to
`https://api.cinedrama.app`.

## 2. Prerequisites (review only — not committed)

- Ubuntu 22.04/24.04 VPS, Nginx already configured for `api.cinedrama.app`.
- Node.js 20 on the VPS (the web app requires it; matches backend).
- System user `cinedrama` (already created by the backend provisioner).
- DNS: `cinedrama.app` and `www.cinedrama.app` → VPS public IP.
- APK built separately; place at `/opt/cinedrama/downloads/cinedrama-latest.apk`.

## 3. Environment variables

Build-time (Next.js `NEXT_PUBLIC_*` is baked into the client bundle). Put these
in a non-committed build env file or pass them to the build command:

| Variable | Example | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_APK_URL` | `https://cinedrama.app/download/cinedrama-latest.apk` | Android download CTA |
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.cinedrama.app` | API for future/dynamic use |

Runtime (`/etc/cinedrama/web.env`, owned `cinedrama:cinedrama`, mode 0600):

| Variable | Example | Purpose |
|----------|---------|---------|
| `NODE_ENV` | `production` | Next.js prod mode |
| `NEXT_PUBLIC_APK_URL` | `https://cinedrama.app/download/cinedrama-latest.apk` | app reads at build/runtime |
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.cinedrama.app` | app reads at build/runtime |
| `PORT` | `3000` | Next.js listen port |

> Do **not** commit these files. The provisioning script writes
> `/etc/cinedrama/web.env` with mode 0600 on the VPS only.

## 4. Files in this plan

| File | Purpose |
|------|---------|
| `deploy/nginx/cinedrama-web.conf` | Nginx vhost for `cinedrama.app`, `/api` proxy, `/download` static |
| `deploy/scripts/provision-web.sh` | One-time VPS setup: dirs, env file, systemd service, certbot guidance |
| `deploy/scripts/deploy-web.sh` | Repeatable local/CI deploy: rsync source → remote build → restart → smoke test |
| `deploy/scripts/smoke-test-web.sh` | Smoke test: 200 on `/`, `/privacy`, `/terms`, `/download/` (404 expected if no APK yet) |
| `deploy/github-actions/deploy-web.yml.example` | Optional CI workflow (SSH/rsync) — copy into `.github/workflows/` when integrating |
| `deploy/cinedrama-web.service` | systemd unit for Next.js `next start` on `127.0.0.1:3000` |

## 5. One-time VPS setup

```bash
# from the repo root on your machine
rsync -avz deploy/ user@vps:/opt/cinedrama/deploy/

# on the VPS
sudo bash /opt/cinedrama/deploy/scripts/provision-web.sh
sudo cp /opt/cinedrama/deploy/nginx/cinedrama-web.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/cinedrama-web.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d cinedrama.app -d www.cinedrama.app   # follow Phase 1 → 2 in the nginx file
```

`provision-web.sh` creates `/opt/cinedrama/web`, `/etc/cinedrama/web.env`, and
installs the systemd service (`cinedrama-web`). It does **not** deploy code.

## 6. Repeatable deploy (manual or CI)

```
deploy/scripts/deploy-web.sh
```

It builds in a **staging directory** and promotes only after success, so the
live app keeps serving the old tree during install/build:

- Live: `/opt/cinedrama/web`
- Staging: `/opt/cinedrama/web-deploy`

Steps:
1. Reads non-secret config from env (`WEB_DEPLOY_HOST`, `WEB_DEPLOY_USER`,
   `WEB_DEPLOY_PATH`, optional `WEB_DEPLOY_PORT`, `NEXT_PUBLIC_APK_URL`,
   `NEXT_PUBLIC_API_BASE_URL`).
2. rsyncs `web/` into the **staging** dir (excludes `node_modules`, `.next`,
   `.env*`).
3. SSHes: `npm ci` + `npm run build` **in staging** with `NEXT_PUBLIC_*`.
4. Only after a successful build, rsyncs the built staging tree over the live
   dir, then `systemctl restart cinedrama-web`.
5. Runs `smoke-test-web.sh` against the target host.

`set -euo pipefail` means a failed build **aborts before the restart step** —
the old live tree stays intact and serving. A failed promotion also aborts
before restart, so you never restart onto a broken tree.

**Promote runs on the VPS.** The staging → live move is a single `ssh`
command running `rsync -a --delete` locally on the VPS (`rsync` cannot
copy remote→remote in one invocation).

**Ownership / permissions (shared group):**
- `provision-web.sh` creates a system group `cinedramadeploy`.
- Service user `cinedrama` owns the live + staging files; group is
  `cinedramadeploy` with group-write + setgid on the directories.
- The SSH deploy user (`WEB_DEPLOY_USER`, default `deploy`) is added to
  `cinedramadeploy`, so it can write/build/promote in both dirs while
  `cinedrama` only needs read+execute to serve.
- Never use `cinedrama` as the deploy SSH user (it is `nologin`);
  `provision-web.sh` fails fast if you try.

**Sudo:** `deploy-web.sh` runs exactly one privileged command:
`sudo systemctl restart cinedrama-web`. The status check is unprivileged
(`systemctl is-active cinedrama-web`), so no sudo is needed for it.
`provision-web.sh` installs the matching NOPASSWD rule (`/etc/sudoers.d/
cinedrama-web`) scoped to exactly that command for the `WEB_DEPLOY_USER`.

If you prefer building in CI and only shipping `.next` + `package.json`
dependencies, use the optional GitHub Actions template. **Credentials live as
repo/org secrets, never in the repo.**

## 7. GitHub Actions (optional, when ready)

Copy `deploy/github-actions/deploy-web.yml.example` → `.github/workflows/deploy-web.yml`
and add secrets (repo → Settings → Secrets and variables → Actions):

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | SSH host/IP |
| `VPS_USER` | SSH user |
| `VPS_PORT` | SSH port (default 22) |
| `VPS_SSH_KEY` | Private key for deploy (base64 or multi-line) |
| `NEXT_PUBLIC_APK_URL` | APK download URL |
| `NEXT_PUBLIC_API_BASE_URL` | API base URL |

Trigger on `main` when `web/**` changes (recommended):

```yaml
on:
  push:
    branches: [main]
    paths: ['web/**', '.github/workflows/deploy-web.yml']
```

## 8. Rollback

The deploy script does **not** delete `.next` on failure between rsync and
restart. For rollback:

```bash
# Restore the previous release (if you keep release tarballs) or:
cd /opt/cinedrama/web && git checkout <prev-sha> && npm ci && npm run build \
  && systemctl restart cinedrama-web
```

Recommended improvement for later: rsync into a timestamped release directory
and `ln -s` `current`, so rollback is a symlink flip. Keep that out of v1 scope
to stay simple.

## 9. Pre-flight checklist

- [ ] DNS for `cinedrama.app` + `www` → VPS
- [ ] Node 20 on VPS
- [ ] `/etc/cinedrama/web.env` exists with production values, mode 0600
- [ ] `cinedrama-web` enabled
- [ ] `nginx -t` passes after adding `cinedrama-web.conf`
- [ ] Let's Encrypt issued for `cinedrama.app` / `www` (Phase 2)
- [ ] `curl https://cinedrama.app` returns 200
- [ ] `curl https://cinedrama.app/privacy` and `/terms` return 200
- [ ] `curl https://cinedrama.app/download/cinedrama-latest.apk` serves the APK
- [ ] `curl https://cinedrama.app/api/healthz` returns 200
