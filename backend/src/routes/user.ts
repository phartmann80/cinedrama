import { Router, Request, Response } from 'express';
import { z } from 'zod';

export const userRouter = Router();

// ─── Schemas (Zod v3) ─────────────────────────────────────────────────────────

const UnlockSchema = z.object({
  episodeId: z.string().min(1, 'episodeId required'),
  method: z.enum(['coins', 'ad']),
});

const LikeSchema = z.object({
  episodeId: z.string().min(1, 'episodeId required'),
});

// ─── Auth helper ──────────────────────────────────────────────────────────────
// TODO: Replace with real JWT verification using jsonwebtoken or Firebase Admin SDK.
// Decode Bearer token → verify signature with JWT_SECRET → return user from DB.

function getAuthUser(req: Request) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  // MOCK — return a fake user for development
  return { id: 'user-mock-001', coinBalance: 50 };
}

// ─── GET /api/v1/user/me ──────────────────────────────────────────────────────

userRouter.get('/me', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }
  // TODO: fetch full profile + unlockedEpisodeIds + likedEpisodeIds from DB
  res.json({ id: user.id, coinBalance: user.coinBalance, unlockedEpisodeIds: [], likedEpisodeIds: [] });
});

// ─── POST /api/v1/user/unlock ─────────────────────────────────────────────────
/**
 * Unlock an episode via two methods:
 *
 *  method = 'coins' → deduct coinCost from user.coinBalance (DB transaction)
 *  method = 'ad'    → verify AdMob SSV token, credit COINS_PER_AD, then unlock
 *
 * Returns a signed streaming URL on success.
 *
 * TODO (DB task):
 *  - Fetch episode.coinCost from DB
 *  - Atomically deduct coins + insert into unlocks table
 *  - Return Cloudflare R2 presigned URL (TTL ~1h) instead of mock URL
 *
 * TODO (AdMob task):
 *  - Verify SSV signature: https://developers.google.com/admob/android/ssv
 *  - Only credit coins after server-side verification passes
 */

const MOCK_COIN_COST = 5;
const COINS_PER_AD = 10;

userRouter.post('/unlock', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const parsed = UnlockSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { episodeId, method } = parsed.data;
  const mockVideoUrl = `https://cdn.cinedrama.app/videos/${episodeId}.m3u8`; // TODO: presign

  if (method === 'coins') {
    if (user.coinBalance < MOCK_COIN_COST) {
      res.status(402).json({
        success: false,
        message: `Need ${MOCK_COIN_COST} coins, have ${user.coinBalance}.`,
      });
      return;
    }
    res.json({
      success: true,
      newCoinBalance: user.coinBalance - MOCK_COIN_COST,
      videoUrl: mockVideoUrl,
      message: 'Episode unlocked.',
    });
    return;
  }

  if (method === 'ad') {
    // TODO: verify req.body.adRewardToken via AdMob SSV before crediting
    res.json({
      success: true,
      newCoinBalance: user.coinBalance + COINS_PER_AD - MOCK_COIN_COST,
      videoUrl: mockVideoUrl,
      message: `Earned ${COINS_PER_AD} coins, episode unlocked.`,
    });
    return;
  }

  res.status(400).json({ error: 'Unknown unlock method' });
});

// ─── POST /api/v1/user/like ───────────────────────────────────────────────────

userRouter.post('/like', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const parsed = LikeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors });
    return;
  }

  // TODO: upsert into likes table
  res.json({ success: true });
});
