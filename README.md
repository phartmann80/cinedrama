# CineDrama

> **Cinematic short-form drama streaming built for mobile.**  
> Swipe up. Watch. Get obsessed. One episode at a time.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/phartmann80/cinedrama&project-name=cinedrama&root-directory=web)

**Requires Node.js 20+.** Each app (`web`, `mobile`, `backend`) is independent — `npm install` inside that directory.

---

## Repository Structure

```
cinedrama/
├── web/          Next.js 14 landing page → Vercel (cinedrama.app)
├── mobile/       React Native (Expo 51) Android app → APK + Play
└── backend/      Express 5 + PostgreSQL API → Linux VPS
```

The production API lives in `/backend`. It is a standalone Node project (`npm install && npm run dev`). It does not depend on Replit, pnpm workspaces, or anything under `artifacts/`.

---

## 🌐 Web Landing Page (`/web`)

**Stack:** Next.js 14 (App Router) · Tailwind CSS · TypeScript  
**Deploy target:** Vercel → `cinedrama.app` (set **Root Directory** to `web`)

### Features
- Hero section with trailer slot and "Download Android APK" CTA
- Series showcase grid with genre tags, episode counts, poster cards
- Feature highlights, how-it-works timeline, download/install instructions
- `/privacy` and `/terms` (both reference `support@cinedrama.app`)
- `robots.txt` and `sitemap.xml`

### Local dev
```bash
cd web
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

See `web/DEPLOYMENT.md` for Vercel + DNS steps.

---

## 📱 Mobile App (`/mobile`)

**Stack:** React Native (Expo SDK 51 · RN 0.74.3) · TypeScript · expo-av  
**Target:** Android APK (direct download) + Google Play

| Component | File | Purpose |
|-----------|------|---------|
| Vertical feed | `src/screens/FeedScreen.tsx` | `FlatList` with `pagingEnabled` |
| Episode player | `src/components/VideoCard.tsx` | Auto-play, pause-on-tap, double-tap like |
| Paywall | `src/screens/PaywallScreen.tsx` | AdMob rewarded ads + coins + RevenueCat |
| Auth | `src/contexts/AuthContext.tsx` | JWT register/login, coin balance, unlocks |
| API client | `src/api/client.ts` | Typed fetch wrapper |

### Local dev
```bash
cd mobile
npm install
cp .env.example .env
npx expo start --android
```

### Build a standalone APK (not Expo Go)
```bash
npm install -g eas-cli
eas login
eas build --platform android --profile apk
```

`eas.json` → `apk` profile uses `android.buildType: "apk"` and `:app:assembleRelease`.

---

## ⚙️ Backend API (`/backend`)

**Stack:** Node.js 20 · Express 5 · TypeScript · PostgreSQL (Drizzle ORM) · Zod  
**Deploy target:** Custom Linux VPS

See `backend/README.md` for the full endpoint list, seed script, and env vars.

```bash
cd backend
cp .env.example .env    # set DATABASE_URL and JWT_SECRET
npm install
npm run db:push
npm run db:seed
npm run dev             # http://localhost:5000
```

Health: `GET http://localhost:5000/api/healthz`

---

## 🤖 AI Content Pipeline (not in-repo)

Script (Claude / GPT-4o) → Video (Luma / Runway) → Voice (ElevenLabs) → Lip sync (Sync Labs) → Upscale (Topaz). Output is ingested into object storage and catalogued via the API.

---

## 📋 Progress Tracker

### Task Group 1 — Landing Page
- [x] Repository structure (`/web`, `/mobile`, `/backend`)
- [x] Hero, series showcase, features, how-it-works, download CTA
- [x] Privacy Policy (`/privacy`) and Terms (`/terms`)
- [x] `robots.txt`, `sitemap.xml`, `web/DEPLOYMENT.md`
- [ ] Real trailer video (`web/public/videos/trailer-reel.mp4`)
- [ ] Brand assets (favicon, og-image, hero poster)
- [ ] Set `NEXT_PUBLIC_APK_URL` in Vercel
- [ ] Vercel **Root Directory** = `web` + `cinedrama.app` DNS

### Task Group 2 — Mobile App
- [x] Expo project, vertical feed, VideoCard, paywall UI, home + profile
- [x] JWT auth context (register / login / session restore)
- [x] AdMob rewarded-ad SDK wiring (test IDs in `__DEV__`)
- [x] RevenueCat purchase flow (needs dashboard offerings)
- [ ] Real EAS project ID, app icons/splash images
- [ ] Production AdMob / RevenueCat keys
- [ ] Build & sign APK via EAS

### Task Group 3 — Backend
- [x] Standalone Express in `/backend` (`npm install && npm run dev`)
- [x] Zod validation on POST routes
- [x] PostgreSQL schema (dramas, episodes, users, unlocks, likes, coin_transactions)
- [x] JWT auth (`register` / `login` / `requireAuth`)
- [x] HMAC media gateway (proxy, not redirect)
- [x] Transactional coin unlock + AdMob SSV callback
- [ ] Live PostgreSQL + Cloudflare R2/S3 origin
- [ ] VPS deploy + Nginx reverse proxy

---

## Contact

**Support:** support@cinedrama.app  
**Website:** https://cinedrama.app  
**GitHub:** https://github.com/phartmann80/cinedrama
