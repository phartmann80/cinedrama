# CineDrama API (`/backend`)

Standalone Express 5 + PostgreSQL (Drizzle) service. Deploy this directory to the Linux VPS. It has **no workspace, Replit, or pnpm catalog dependencies** — `npm install && npm run dev` works anywhere Node 20+ is installed.

## Quick start

```bash
cd backend
cp .env.example .env          # set DATABASE_URL and JWT_SECRET
npm install
npm run db:push               # create tables
npm run db:seed               # four sample series
npm run dev                   # http://localhost:5000
```

Health check: `GET http://localhost:5000/api/healthz` → `{"status":"ok"}`

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | TypeScript watch server (`tsx`) |
| `npm run build` / `npm start` | Compile to `dist/` and run production |
| `npm test` | Vitest (media-gateway HMAC tests, no DB required) |
| `npm run db:push` | Apply Drizzle schema to PostgreSQL |
| `npm run db:seed` | Idempotent seed of four dramas + episodes |

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/healthz` | None | Health check |
| `GET` | `/api/v1/dramas` | None | List active series (pagination, genre, search) |
| `GET` | `/api/v1/dramas/:id` | None | Single drama |
| `GET` | `/api/v1/dramas/:id/episodes` | Optional JWT | Episode list (locked URLs hidden) |
| `GET` | `/api/v1/dramas/:id/episodes/:n` | Optional JWT | Single episode |
| `GET` | `/api/v1/media/play` | HMAC token | Proxy video from private CDN |
| `POST` | `/api/v1/user/register` | None | Register + JWT |
| `POST` | `/api/v1/user/login` | None | Login + JWT |
| `GET` | `/api/v1/user/me` | JWT | Profile, coins, unlocks, likes |
| `POST` | `/api/v1/user/unlock` | JWT | Unlock via coins or ad reward |
| `GET` | `/api/v1/user/admob-ssv` | AdMob ECDSA | Server-side ad verification |
| `POST` | `/api/v1/user/like` | JWT | Like an episode |

## Env vars (names only)

`PORT`, `NODE_ENV`, `LOG_LEVEL`, `DATABASE_URL`, `JWT_SECRET` (or fallback `SESSION_SECRET`), `CORS_ORIGINS`, optional `R2_*`.
