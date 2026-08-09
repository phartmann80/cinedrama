# CineDrama

> **Cinematic short-form drama streaming built for mobile.**  
> Swipe up. Watch. Get obsessed. One episode at a time.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/phartmann80/cinedrama&project-name=cinedrama&root-directory=web)

---

## Repository Structure

```
cinedrama/
├── web/          Next.js 14 landing page → deployed on Vercel (cinedrama.app)
├── mobile/       React Native (Expo) Android app → direct APK + Google Play
└── artifacts/
    └── api-server/  Express API → deployed on custom Linux VPS
```

---

## 🌐 Web Landing Page (`/web`)

**Stack:** Next.js 14 (App Router) · Tailwind CSS · TypeScript  
**Deploy target:** Vercel → `cinedrama.app`

### Features
- Hero section with background trailer reel & glowing "Download Android APK" button
- Series showcase grid with genre tags, episode counts & poster cards
- Feature highlights, how-it-works timeline, download section with install instructions
- `/privacy` — Privacy Policy page (required for Play Store & payment gateways)
- `/terms` — Terms of Service page

### Local dev
```bash
cd web
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

### Vercel deployment
1. Connect the repo root to Vercel
2. Set **Root Directory** to `web`
3. Add env var `NEXT_PUBLIC_APK_URL` pointing to your hosted APK
4. Point `cinedrama.app` → Vercel DNS (`76.76.21.21` A record or `cname.vercel-dns.com` CNAME)

---

## 📱 Mobile App (`/mobile`)

**Stack:** React Native (Expo 51) · TypeScript · expo-av · expo-linear-gradient  
**Target:** Android APK (direct download) + Google Play submission

### Architecture
| Component | File | Purpose |
|-----------|------|---------|
| Vertical feed | `src/screens/FeedScreen.tsx` | `FlatList` with `pagingEnabled`, full-screen snap |
| Episode player | `src/components/VideoCard.tsx` | Auto-play, pause-on-tap, double-tap like, locked gate |
| Paywall | `src/screens/PaywallScreen.tsx` | Ad-watch unlock (AdMob SSV) + coin spend + subscribe |
| Navigation | `src/navigation/AppNavigator.tsx` | Stack + bottom tabs |
| API client | `src/api/client.ts` | Typed fetch wrapper |

### Monetization
- **Free:** Episodes 1–2 of every series
- **Rewarded Ad:** Watch a short ad → earn coins → episode unlocked
- **Coins:** Spend accumulated coins (5 coins/episode)
- **Subscription:** RevenueCat → Google Play Billing (unlimited access)

### Local dev
```bash
cd mobile
npm install
cp .env.example .env
npx expo start --android
```

### Build APK
```bash
npm install -g eas-cli
eas login
eas build --platform android --profile apk
# Download .apk from Expo dashboard → host on cinedrama.app/download/
```

### Pending SDK wiring
1. **AdMob:** `npm install react-native-google-mobile-ads` → replace stubs in `PaywallScreen.tsx`
2. **RevenueCat:** `npm install react-native-purchases` → wire subscribe flow
3. **Video:** Swap `expo-av` mock for real HLS URLs from your backend CDN

---

## ⚙️ Backend API (`/artifacts/api-server`)

**Stack:** Node.js · Express 5 · TypeScript · PostgreSQL (Drizzle ORM) · Zod validation  
**Deploy target:** Custom Linux VPS (e.g. Hetzner CX21 / DigitalOcean Droplet)

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/dramas` | None | List active series (pagination, genre filter, search) |
| `GET` | `/api/v1/dramas/:id` | None | Single drama metadata |
| `GET` | `/api/v1/dramas/:id/episodes` | None | Episode list (locked URLs hidden) |
| `GET` | `/api/v1/dramas/:id/episodes/:n` | None | Single episode |
| `POST` | `/api/v1/user/unlock` | JWT | Unlock episode via coins or ad reward |
| `GET` | `/api/v1/user/me` | JWT | Authenticated user profile + coin balance |
| `POST` | `/api/v1/user/like` | JWT | Like an episode |
| `GET` | `/api/healthz` | None | Health check |

### Local dev
```bash
cd artifacts/api-server
cp .env.example .env    # set DATABASE_URL
pnpm dev                # http://localhost:5000
```

### Infrastructure
- **Video CDN:** Cloudflare R2 or AWS S3 → serve `.mp4` / `.m3u8` (HLS) with presigned URLs
- **Auth:** JWT via `jsonwebtoken` or Firebase Auth
- **DB schema:** PostgreSQL + Drizzle ORM (see `lib/db/src/schema/`)

---

## 🤖 AI Content Pipeline

| Layer | Tool | Function |
|-------|------|---------|
| Script | Claude 3.5 Sonnet / GPT-4o | Story, scene breakdown, cliffhangers |
| Video | Luma Dream Machine / Runway Gen-3 | Portrait 9:16 text-to-video |
| Voice | ElevenLabs | Multilingual cinematic narration |
| Lip sync | Sync Labs | Speech-to-face sync |
| Upscale | Topaz Video AI | 1080×1920 @ 60fps |

---

## 📋 Progress Tracker

### Task Group 1 — Landing Page
- [x] Repository structure scaffolded
- [x] Hero section with APK download CTA
- [x] Series showcase with poster cards
- [x] Features + How It Works sections
- [x] Privacy Policy page (`/privacy`)
- [x] Terms of Service page (`/terms`)
- [ ] Add real trailer video (`web/public/videos/trailer-reel.mp4`)
- [ ] Set `NEXT_PUBLIC_APK_URL` in Vercel dashboard
- [ ] Connect repo to Vercel + assign `cinedrama.app` domain

### Task Group 2 — Mobile App
- [x] React Native project scaffold
- [x] Vertical video feed (FlatList + pagingEnabled)
- [x] VideoCard with auto-play, pause-on-tap, double-tap like
- [x] Paywall modal (ad + coins + subscribe UI)
- [x] Home screen with genre tabs + series grid
- [x] Profile screen with coin balance
- [ ] Wire Google AdMob rewarded ads
- [ ] Wire RevenueCat subscriptions
- [ ] Replace mock API calls with real backend URLs
- [ ] Build & sign APK via EAS

### Task Group 3 — Backend
- [x] Express route structure (`/dramas`, `/episodes`, `/user/unlock`)
- [x] Zod input validation on all POST routes
- [ ] PostgreSQL schema (users, dramas, episodes, unlocks, coins)
- [ ] JWT authentication middleware
- [ ] Cloudflare R2 presigned URL generation
- [ ] Deploy to VPS + Nginx reverse proxy

---

## Contact

**Support:** support@cinedrama.app  
**Website:** https://cinedrama.app  
**GitHub:** https://github.com/phartmann80/cinedrama
