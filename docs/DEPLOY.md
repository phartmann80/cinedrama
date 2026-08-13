# CineDrama Backend Deploy Runbook

This runbook covers the full backend deployment on a Linux VPS (Ubuntu 22.04+).

All scripts and configs are in `/deploy`. Execute in order on the VPS.

---

## Prerequisites

- Ubuntu 22.04+ VPS
- Root or sudo access
- Node.js 20+ installed (`node --version`)
- Domain `api.cinedrama.app` pointed to the VPS IP (A record)
- Ports 80 and 443 open in the firewall

---

## Step 1: Clone and build the backend

```bash
# Clone the repo
sudo mkdir -p /opt/cinedrama
sudo chown $USER:$USER /opt/cinedrama
cd /opt/cinedrama
git clone https://github.com/phartmann80/cinedrama.git .
git checkout main

# Install dependencies and build
cd backend
npm ci
npm run build
```

Verify the build output exists:

```bash
ls -la dist/index.js
```

---

## Step 2: Provision PostgreSQL

Run the provisioning script as root:

```bash
sudo bash deploy/scripts/provision-postgres.sh
```

This script:

- Installs PostgreSQL 16 if not present
- Creates a `cinedrama` database and user
- Generates a strong random password (never committed)
- Restricts PostgreSQL to listen on localhost only
- Generates a JWT secret via `openssl rand -base64 48`
- Writes `/etc/cinedrama/backend.env` (mode 0600, owned by `cinedrama`)

Verify the env file exists with correct permissions:

```bash
ls -la /etc/cinedrama/backend.env
# Should show: -rw------- 1 cinedrama cinedrama
```

---

## Step 3: Push schema and seed the database

```bash
cd /opt/cinedrama/backend

# Load environment
export $(sudo cat /etc/cinedrama/backend.env | xargs)

# Create all tables
npm run db:push

# Seed sample data (4 dramas, 92 episodes)
npm run db:seed
```

Verify the database has data:

```bash
sudo -u postgres psql -d cinedrama -c "SELECT COUNT(*) FROM dramas;"
# Should return 4

sudo -u postgres psql -d cinedrama -c "SELECT COUNT(*) FROM episodes;"
# Should return 92
```

---

## Step 4: Install the systemd service

```bash
# Copy the service unit
sudo cp /opt/cinedrama/deploy/cinedrama-api.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable and start the service
sudo systemctl enable cinedrama-api
sudo systemctl start cinedrama-api
```

Verify the service is running:

```bash
sudo systemctl status cinedrama-api
# Should show "active (running)"

sudo journalctl -u cinedrama-api --no-pager -n 20
# Should show: "CineDrama API server listening" with port 5000
```

---

## Step 5: Install and configure Nginx

```bash
# Install Nginx if not present
sudo apt-get install -y nginx

# Install the site config
sudo cp /opt/cinedrama/deploy/nginx/cinedrama-api.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/cinedrama-api.conf /etc/nginx/sites-enabled/

# Remove the default site if present
sudo rm -f /etc/nginx/sites-enabled/default

# Test the config
sudo nginx -t
# Should show: "test is successful"

# Reload Nginx
sudo systemctl reload nginx
```

---

## Step 6: SSL via Certbot/Let's Encrypt

```bash
# Install certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain and install the certificate
sudo certbot --nginx -d api.cinedrama.app \
  --non-interactive --agree-tos --email support@cinedrama.app \
  --redirect

# Certbot auto-edits the Nginx config to add the SSL lines and
# sets up auto-renewal via systemd timer.
```

Verify HTTPS works:

```bash
curl -I https://api.cinedrama.app/api/healthz
# Should return HTTP 200 with SSL headers
```

---

## Step 7: Run the smoke test

```bash
# Against localhost (no SSL needed)
bash /opt/cinedrama/deploy/scripts/smoke-test.sh http://localhost:5000

# Against production (through Nginx + SSL)
bash /opt/cinedrama/deploy/scripts/smoke-test.sh https://api.cinedrama.app
```

All three checks should pass:

- Health endpoint returns 200
- Protected route returns 401 without a token
- CORS headers present for `https://cinedrama.app`

---

## Step 8: Verify production guards

The backend has two fail-fast guards in `src/index.ts`. Verify they work:

```bash
# Guard 1: Missing DATABASE_URL in production
sudo -u cinedrama NODE_ENV=production node /opt/cinedrama/backend/dist/index.js
# Should exit with: "FATAL: DATABASE_URL is required in production."

# Guard 2: Missing CORS_ORIGINS in production
sudo -u cinedrama NODE_ENV=production DATABASE_URL=postgresql://x node /opt/cinedrama/backend/dist/index.js
# Should exit with: "FATAL: CORS_ORIGINS is required in production."
```

---

## Troubleshooting

### Service won't start

```bash
sudo journalctl -u cinedrama-api --no-pager -n 50
```

Common causes:
- `/etc/cinedrama/backend.env` missing or wrong permissions
- Build output (`dist/`) missing - run `npm run build`
- PostgreSQL not running: `sudo systemctl status postgresql`

### Nginx returns 502

The backend is not listening on port 5000. Check:

```bash
sudo systemctl status cinedrama-api
curl -s http://localhost:5000/api/healthz
```

### Database connection refused

Verify PostgreSQL is listening on localhost:

```bash
sudo ss -tlnp | grep 5432
# Should show 127.0.0.1:5432
```

### Let's Encrypt certificate renewal

Certbot installs a systemd timer for auto-renewal. Verify it:

```bash
sudo systemctl list-timers | grep certbot
sudo certbot renew --dry-run
```

---

## File inventory

```
deploy/
  cinedrama-api.service          systemd unit (non-root, Restart=on-failure)
  nginx/
    cinedrama-api.conf           reverse proxy config (proxy headers, gzip, rate limit)
  scripts/
    provision-postgres.sh        PostgreSQL 16 install + DB/user/password generation
    smoke-test.sh                curl checks: health 200, 401 auth, CORS headers

backend/
  .env.production.example        template (PORT, DATABASE_URL, JWT_SECRET, CORS_ORIGINS)

docs/
  DEPLOY.md                      this runbook
```
