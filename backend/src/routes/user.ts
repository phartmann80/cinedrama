import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { eq, and, sql } from 'drizzle-orm';
import {
  getDb,
  usersTable,
  episodesTable,
  unlocksTable,
  likesTable,
  coinTransactionsTable,
} from '../db/index.js';
import { requireAuth, signJwt, type AuthRequest } from '../lib/auth.js';
import { signMediaUrl } from '../lib/signedUrl.js';

export const userRouter = Router();

const SALT_ROUNDS = 10;
const COIN_REWARD_FROM_AD = 10;

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const UnlockSchema = z.object({
  episodeId: z.string().uuid(),
  method: z.enum(['coins', 'ad']),
});

class InsufficientFundsError extends Error {
  constructor() {
    super('insufficient_funds');
  }
}

userRouter.post('/register', async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const db = getDb();
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    let user: { id: string; email: string; coinBalance: number };
    try {
      [user] = await db
        .insert(usersTable)
        .values({ email, passwordHash, coinBalance: 10 })
        .returning({
          id: usersTable.id,
          email: usersTable.email,
          coinBalance: usersTable.coinBalance,
        });
    } catch (insertErr: unknown) {
      if ((insertErr as { code?: string })?.code === '23505') {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }
      throw insertErr;
    }

    const token = signJwt({ sub: user.id, email: user.email });

    req.log.info({ userId: user.id }, 'User registered');
    res.status(201).json({ token, user });
  } catch (err) {
    req.log.error(err, 'Registration failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

userRouter.post('/login', async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const db = getDb();
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signJwt({ sub: user.id, email: user.email });

    req.log.info({ userId: user.id }, 'User logged in');
    res.json({
      token,
      user: { id: user.id, email: user.email, coinBalance: user.coinBalance },
    });
  } catch (err) {
    req.log.error(err, 'Login failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

userRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user!.id;

  try {
    const db = getDb();
    const [user] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        coinBalance: usersTable.coinBalance,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const [unlocks, likes] = await Promise.all([
      db.select({ episodeId: unlocksTable.episodeId }).from(unlocksTable).where(eq(unlocksTable.userId, userId)),
      db.select({ episodeId: likesTable.episodeId }).from(likesTable).where(eq(likesTable.userId, userId)),
    ]);

    res.json({
      ...user,
      unlockedEpisodeIds: unlocks.map((u) => u.episodeId),
      likedEpisodeIds: likes.map((l) => l.episodeId),
    });
  } catch (err) {
    req.log.error(err, 'Failed to fetch user profile');
    res.status(500).json({ error: 'Internal server error' });
  }
});

userRouter.post('/unlock', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user!.id;

  const parsed = UnlockSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
    return;
  }

  const { episodeId, method } = parsed.data;

  try {
    const db = getDb();
    const [episode] = await db.select().from(episodesTable).where(eq(episodesTable.id, episodeId)).limit(1);

    if (!episode) {
      res.status(404).json({ error: 'Episode not found' });
      return;
    }

    if (!episode.isLocked) {
      res.json({ success: true, videoUrl: signMediaUrl(episodeId), message: 'Episode is free.' });
      return;
    }

    if (method === 'ad') {
      type AdTxResult =
        | { kind: 'unlocked'; newBalance: number }
        | { kind: 'already_unlocked'; currentBalance: number };

      const result: AdTxResult = await db.transaction(async (tx) => {
        const inserted = await tx
          .insert(unlocksTable)
          .values({ userId, episodeId })
          .onConflictDoNothing()
          .returning({ id: unlocksTable.id });

        if (inserted.length === 0) {
          const [userRow] = await tx
            .select({ coinBalance: usersTable.coinBalance })
            .from(usersTable)
            .where(eq(usersTable.id, userId))
            .limit(1);
          return { kind: 'already_unlocked', currentBalance: userRow?.coinBalance ?? 0 };
        }

        const [updated] = await tx
          .update(usersTable)
          .set({ coinBalance: sql`${usersTable.coinBalance} + ${COIN_REWARD_FROM_AD}` })
          .where(eq(usersTable.id, userId))
          .returning({ newBalance: usersTable.coinBalance });

        await tx.insert(coinTransactionsTable).values({
          userId,
          amount: COIN_REWARD_FROM_AD,
          reason: 'ad_reward',
          episodeId,
        });

        return { kind: 'unlocked', newBalance: updated.newBalance };
      });

      if (result.kind === 'already_unlocked') {
        req.log.info({ userId, episodeId }, 'Episode already unlocked via ad (idempotent)');
        res.json({
          success: true,
          newCoinBalance: result.currentBalance,
          videoUrl: signMediaUrl(episodeId),
          message: 'Already unlocked.',
        });
        return;
      }

      req.log.info({ userId, episodeId }, 'Episode unlocked via ad reward');
      res.json({
        success: true,
        newCoinBalance: result.newBalance,
        videoUrl: signMediaUrl(episodeId),
        message: 'Episode unlocked via ad reward.',
      });
      return;
    }

    type CoinsTxResult = { kind: 'unlocked'; newBalance: number } | { kind: 'already_unlocked' };

    const result: CoinsTxResult = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(unlocksTable)
        .values({ userId, episodeId })
        .onConflictDoNothing()
        .returning({ id: unlocksTable.id });

      if (inserted.length === 0) {
        return { kind: 'already_unlocked' };
      }

      const deducted = await tx
        .update(usersTable)
        .set({ coinBalance: sql`${usersTable.coinBalance} - ${episode.coinCost}` })
        .where(and(eq(usersTable.id, userId), sql`${usersTable.coinBalance} >= ${episode.coinCost}`))
        .returning({ newBalance: usersTable.coinBalance });

      if (deducted.length === 0) {
        throw new InsufficientFundsError();
      }

      await tx.insert(coinTransactionsTable).values({
        userId,
        amount: -episode.coinCost,
        reason: 'episode_unlock',
        episodeId,
      });

      return { kind: 'unlocked', newBalance: deducted[0].newBalance };
    });

    if (result.kind === 'already_unlocked') {
      req.log.info({ userId, episodeId }, 'Episode already unlocked (idempotent)');
      res.json({
        success: true,
        videoUrl: signMediaUrl(episodeId),
        message: 'Already unlocked.',
      });
      return;
    }

    req.log.info({ userId, episodeId, method }, 'Episode unlocked via coins');
    res.json({
      success: true,
      newCoinBalance: result.newBalance,
      videoUrl: signMediaUrl(episodeId),
      message: 'Episode unlocked successfully.',
    });
  } catch (err) {
    if (err instanceof InsufficientFundsError) {
      const db = getDb();
      const [userRow] = await db
        .select({ coinBalance: usersTable.coinBalance })
        .from(usersTable)
        .where(eq(usersTable.id, (req as AuthRequest).user!.id))
        .limit(1);

      res.status(402).json({
        success: false,
        message: `Insufficient coins. Have ${userRow?.coinBalance ?? 0}.`,
      });
      return;
    }
    req.log.error(err, 'Unlock failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

const ADMOB_VERIFIER_KEYS_URL = 'https://gstatic.com/admob/reward/verifier-keys.json';

const verifierKeyCache = new Map<string, string>();
let verifierKeysCachedAt = 0;
const VERIFIER_KEYS_TTL_MS = 60 * 60 * 1000;

async function fetchAdMobPublicKey(keyId: string): Promise<string | null> {
  const now = Date.now();
  if (verifierKeyCache.size === 0 || now - verifierKeysCachedAt > VERIFIER_KEYS_TTL_MS) {
    try {
      const res = await fetch(ADMOB_VERIFIER_KEYS_URL);
      if (!res.ok) return null;
      const data = (await res.json()) as { keys: { keyId: number; pem: string }[] };
      verifierKeyCache.clear();
      for (const k of data.keys) {
        verifierKeyCache.set(String(k.keyId), k.pem);
      }
      verifierKeysCachedAt = now;
    } catch {
      return null;
    }
  }
  return verifierKeyCache.get(keyId) ?? null;
}

userRouter.get('/admob-ssv', async (req: Request, res: Response) => {
  const { key_id, signature, user_id, transaction_id, reward_amount, reward_item } = req.query as Record<
    string,
    string
  >;

  if (!key_id || !signature || !user_id || !transaction_id) {
    res.status(400).send('Missing required SSV parameters');
    return;
  }

  const rawQuery = req.url.split('?')[1] ?? '';
  const signatureParam = `&signature=${encodeURIComponent(signature)}`;
  const signedContent = rawQuery.endsWith(signatureParam)
    ? rawQuery.slice(0, -signatureParam.length)
    : rawQuery.replace(/&?signature=[^&]*$/, '');

  const publicKeyPem = await fetchAdMobPublicKey(key_id);
  if (!publicKeyPem) {
    req.log.warn({ key_id }, 'AdMob SSV: unknown key_id or key fetch failed');
    res.status(200).send('OK');
    return;
  }

  let signatureValid = false;
  try {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(signedContent);
    signatureValid = verifier.verify(
      { key: publicKeyPem, dsaEncoding: 'ieee-p1363' },
      Buffer.from(signature, 'base64url'),
    );
  } catch (err) {
    req.log.error(err, 'AdMob SSV: signature verification threw');
    res.status(400).send('Signature verification error');
    return;
  }

  if (!signatureValid) {
    req.log.warn({ user_id, transaction_id }, 'AdMob SSV: invalid signature');
    res.status(400).send('Invalid signature');
    return;
  }

  req.log.info({ user_id, transaction_id, reward_amount, reward_item }, 'AdMob SSV verified');
  res.status(200).send('OK');
});

userRouter.post('/like', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user!.id;

  const parsed = z.object({ episodeId: z.string().uuid() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
    return;
  }

  const { episodeId } = parsed.data;

  try {
    const db = getDb();
    await db.insert(likesTable).values({ userId, episodeId }).onConflictDoNothing();

    req.log.info({ userId, episodeId }, 'Episode liked');
    res.json({ success: true });
  } catch (err) {
    req.log.error(err, 'Like failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});
