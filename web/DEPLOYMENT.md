# CineDrama Landing Page — Deployment Guide

This document covers every manual step required to get `cinedrama.app` live on Vercel with a working APK download link.

---

## Prerequisites

| Tool | Install |
|------|---------|
| Vercel CLI | `npm i -g vercel` |
| EAS CLI | `npm i -g eas-cli` |
| Expo account | <https://expo.dev/signup> |
| Vercel account | <https://vercel.com/signup> |

---

## Step 1 — Build the Android APK

The app must be built before you have a real APK URL to put in the env var.

```bash
cd mobile
npx eas-cli build --platform android --profile apk
```

- EAS will output a download URL when the build finishes (e.g. `https://expo.dev/artifacts/...`).
- Download the `.apk` file and host it somewhere stable (see Step 2).

### Hosting the APK

**Option A — Cloudflare R2 (recommended, free egress)**

1. Create an R2 bucket in the Cloudflare dashboard (Storage → R2).
2. Upload `cinedrama-latest.apk`.
3. Enable Public Access and note the public URL, e.g.:
   `https://pub-XXXX.r2.dev/cinedrama-latest.apk`

**Option B — Serve from your VPS**

Upload the APK to your backend server:
```bash
scp cinedrama-latest.apk user@your-vps:/var/www/html/download/
```
Public URL: `https://api.cinedrama.app/download/cinedrama-latest.apk`

---

## Step 2 — Connect `web/` to Vercel

### Option A — Vercel Dashboard (recommended)

1. Go to <https://vercel.com/new> and import the GitHub repo `phartmann80/cinedrama`.
2. **IMPORTANT:** Set **Root Directory** to `web`.
3. Framework preset will auto-detect **Next.js** — leave it.
4. Add these environment variables (Settings → Environment Variables):

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_APK_URL` | Your hosted APK URL from Step 1 |
   | `NEXT_PUBLIC_API_BASE_URL` | `https://api.cinedrama.app` |

5. Click **Deploy**.

### Option B — Vercel CLI

```bash
cd web
vercel --cwd . link          # link to existing project, or create new
vercel env add NEXT_PUBLIC_APK_URL   # paste your APK URL when prompted
vercel env add NEXT_PUBLIC_API_BASE_URL
vercel --prod                # deploy to production
```

---

## Step 3 — Configure the Domain

In the Vercel project → **Settings → Domains**, add `cinedrama.app` and `www.cinedrama.app`.

Then update your DNS registrar with **one** of these options:

### Option A — A record (apex domain, most registrars)

| Type | Name | Value |
|------|------|-------|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

### Option B — CNAME (if registrar supports CNAME flattening)

| Type | Name | Value |
|------|------|-------|
| CNAME | `@` | `cname.vercel-dns.com` |
| CNAME | `www` | `cname.vercel-dns.com` |

DNS propagation can take up to 48 hours, but usually resolves in under 15 minutes.

---

## Step 4 — Add the Trailer Video

The Hero component uses `/videos/trailer-reel.mp4` as the background reel. Place your video file here:

```
web/public/videos/trailer-reel.mp4
```

**Size guidance:**
- Keep the file under 10 MB for fast LCP. Compress with:
  ```bash
  ffmpeg -i original.mp4 -vf scale=1280:-1 -b:v 800k -b:a 96k trailer-reel.mp4
  ```
- A static poster image should also be placed at `web/public/images/hero-poster.jpg` (shown before the video loads).

---

## Step 5 — Add Static Assets

These files are referenced in the site but need to be created and placed in `web/public/`:

| File | Used in |
|------|---------|
| `favicon.ico` | Browser tab icon |
| `apple-touch-icon.png` | iOS home screen (180×180 px) |
| `og-image.png` | Open Graph preview (1200×630 px) |
| `images/hero-poster.jpg` | Hero video fallback poster |

Create them from your app icon/brand kit and commit to `web/public/`.

---

## Step 6 — Verify the Live Site

After deployment and DNS propagation:

```bash
# Check the APK URL env var is live
curl -I https://cinedrama.app

# Confirm the APK redirects correctly
curl -L -o /dev/null -w "%{http_code}" $NEXT_PUBLIC_APK_URL
```

The download button on the landing page should trigger a `.apk` download.

---

## Auto-Deploy on Push

Once the GitHub repo is connected to Vercel, every push to `main` automatically re-deploys. No extra setup needed.

---

## Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_APK_URL` | ✅ | Direct link to the hosted APK file |
| `NEXT_PUBLIC_API_BASE_URL` | ✅ | Backend API base URL |
