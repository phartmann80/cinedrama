import { Router, Request, Response } from 'express';
import { z } from 'zod';

export const userRouter = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────────

const UnlockSchema = z.object({
  episodeId: z.string().min(1),
  method: z.enum(['coins', 'ad']),
});

// ─── Auth middleware placeholder ──────────────────────────────────────────────
// TODO: Replace with real JWT verification
// import { verifyJWT } from '../lib/auth';
// userRouter.use(verifyJWT);

function getAuthUser(req: Request): { id: string; coinBalance: number } | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  // TODO: decode JWT and return user from DB
  // For now return a mock user
  return { id: 'user-mock-001', coinBalance: 50 };
}

// ─── POST /api/v1/user/unlock ─────────────────────────────────────────────────
/**
 * Body: { episodeId: string, method: 'coins' | 'ad' }
 *
 * - method 'ad':   Server verifies the rewarded ad token from AdMob,
 *                  credits coins, then unlocks episode. In MVP, client sends
 *                  the AdMob reward verification token.
 * - method 'coins': Deducts episode.coinCost from user.coinBalance and
 *                   unlocks the episode.
 *
 * Returns the signed streaming URL on success.
 */
userRouter.post('/unlock', async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parsed = UnlockSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
    return;
  }

  const { episodeId, method } = parsed.data;

  // TODO: fetch episode from DB
  // const episode = await db.select().from(episodesTable).where(eq(episodesTable.id, episodeId)).limit(1);
  const MOCK_COIN_COST = 5;
  const MOCK_VIDEO_URL = `https://cdn.cinedrama.app/videos/${episodeId}.m3u8`;
  // TODO: sign URL with Cloudflare R2 presigned URL or AWS S3 presign

  if (method === 'coins') {
    if (user.coinBalance < MOCK_COIN_COST) {
      res.status(402).json({
        success: false,
        message: `Insufficient coins. Need ${MOCK_COIN_COST}, have ${user.coinBalance}.`,
      });
      return;
    }

    // TODO: DB transaction — deduct coins + insert unlock record
    // await db.transaction(async (tx) => {
    //   await tx.update(usersTable).set({ coinBalance: user.coinBalance - episode.coinCost }).where(eq(usersTable.id, user.id));
    //   await tx.insert(unlocksTable).values({ userId: user.id, episodeId });
    // });

    req.log.info({ userId: user.id, episodeId, method }, 'Episode unlocked via coins');

    res.json({
      success: true,
      newCoinBalance: user.coinBalance - MOCK_COIN_COST,
      videoUrl: MOCK_VIDEO_URL,
      message: 'Episode unlocked successfully.',
    });
    return;
  }

  if (method === 'ad') {
    // TODO: Verify AdMob server-side verification (SSV) callback token
    // AdMob sends a GET callback to your server; verify signature before crediting.
    // See: https://developers.google.com/admob/android/ssv

    const COINS_PER_AD = 10;

    // TODO: insert coins credit + unlock record atomically
    req.log.info({ userId: user.id, episodeId, method }, 'Episode unlocked via rewarded ad');

    res.json({
      success: true,
      newCoinBalance: user.coinBalance + COINS_PER_AD - MOCK_COIN_COST,
      videoUrl: MOCK_VIDEO_URL,
      message: `You earned ${COINS_PER_AD} coins and unlocked this episode.`,
    });
    return;
  }

  res.status(400).json({ error: 'Unknown unlock method' });
});

// ─── GET /api/v1/user/me ──────────────────────────────────────────────────────

userRouter.get('/me', async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  // TODO: fetch full profile from DB
  res.json({
    id: user.id,
    coinBalance: user.coinBalance,
    unlockedEpisodeIds: [],
    likedEpisodeIds: [],
  });
});

// ─── POST /api/v1/user/like ───────────────────────────────────────────────────

userRouter.post('/like', async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { episodeId } = z.object({ episodeId: z.string().min(1) }).parse(req.body);

  // TODO: upsert into likes table
  req.log.info({ userId: user.id, episodeId }, 'Episode liked');

  res.json({ success: true });
});
