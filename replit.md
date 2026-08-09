# CineDrama

Cinematic short-form drama streaming platform built for mobile. Users watch episodic 1–3 minute stories in a vertical swipe feed (TikTok/Reels style) with a coin+ad monetization paywall.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **API:** Express 5 — routes at `artifacts/api-server/src/routes/`
- **DB:** PostgreSQL + Drizzle ORM (`lib/db/`)
- **Validation:** Zod v4, drizzle-zod
- **Web:** Next.js 14 (App Router) + Tailwind CSS — `web/`
- **Mobile:** React Native (Expo 51) — `mobile/`
- **Build:** esbuild (CJS bundle for API)

## Where things live

- `web/` — Next.js landing page (Vercel → cinedrama.app)
  - `web/app/page.tsx` — main landing page (assembles all sections)
  - `web/app/components/Hero.tsx` — hero + APK download CTA
  - `web/app/components/SeriesShowcase.tsx` — drama cards grid
  - `web/app/privacy/page.tsx` — Privacy Policy (required for Play Store)
  - `web/app/terms/page.tsx` — Terms of Service
- `mobile/` — React Native (Expo) Android app
  - `mobile/src/screens/FeedScreen.tsx` — vertical swipe feed (FlatList + pagingEnabled)
  - `mobile/src/components/VideoCard.tsx` — full-screen episode player with double-tap like
  - `mobile/src/screens/PaywallScreen.tsx` — ad-watch / coin-spend / subscribe unlock gate
  - `mobile/src/api/client.ts` — typed fetch wrapper for backend
  - `mobile/src/types/index.ts` — shared TypeScript types
- `artifacts/api-server/src/routes/dramas.ts` — GET /api/v1/dramas, GET /api/v1/dramas/:id
- `artifacts/api-server/src/routes/episodes.ts` — GET /api/v1/dramas/:id/episodes
- `artifacts/api-server/src/routes/user.ts` — POST /api/v1/user/unlock, GET /api/v1/user/me

## Architecture decisions

- Episodes 1–2 are always free; episodes 3+ are locked behind paywall (coins or rewarded ad)
- AdMob server-side verification (SSV) is the canonical way to verify ad completions server-side — do not trust client-only signals
- All video URLs are presigned (Cloudflare R2 or AWS S3) — never expose raw bucket URLs
- `expo-av` is used in the MVP; swap for `react-native-video` if HLS adaptive bitrate is needed in production
- The web landing page APK URL is controlled via `NEXT_PUBLIC_APK_URL` env var — update whenever a new build is released

## Product

- Vertical feed of 1–3 minute episodic drama videos
- Genres: Billionaire Drama, Sci-Fi Thriller, Romantic Suspense, Political Drama
- Monetization: rewarded ads (AdMob) earn coins; coins unlock episodes; optional unlimited subscription via RevenueCat
- Multi-store distribution: direct APK → cinedrama.app/download/, Google Play, Amazon Appstore, Samsung Galaxy Store

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always set `NEXT_PUBLIC_APK_URL` in Vercel env vars before deploying — the download button falls back to `/download/cinedrama-latest.apk` if missing
- EAS build profile `apk` uses `assembleRelease` (not `bundleRelease`) so it produces a direct `.apk` installable without Play Store
- AdMob rewarded ad SSV requires a publicly accessible HTTPS endpoint — test with ngrok locally
- Drizzle `push` is dev-only; use `drizzle-kit migrate` for production

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Blueprint: `attached_assets/Pasted-Project-Blueprint-Developer-Brief-CineDramaProject-Name_1786311372941.txt`
