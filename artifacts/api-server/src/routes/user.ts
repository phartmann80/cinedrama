import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { db } from '@workspace/db';
import {
  usersTable,
  episodesTable,
  unlocksTable,
  likesTable,
  coinTransactionsTable,
} from '@workspace/db';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, signJwt, AuthRequest } from '../lib/auth.js';
import { signMediaUrl } from '../lib/signedUrl.js';

export const userRouter = Router();

const SALT_ROUNDS = 10;

// ─── Schemas ──────────────────────────────────────────────────────────────────

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

// ─── Custom error for flow control inside transactions ────────────────────────

class InsufficientFundsError extends Error {
  constructor() { super('insufficient_funds'); }
}

// ─── POST /api/v1/user/register ───────────────────────────────────────────────

userRouter.post('/register', async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
    return;
  }

  const { email, password } = parsed.data;

  try {
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
        .returning({ id: usersTable.id, email: usersTable.email, coinBalance: usersTable.coinBalance });
    } catch (insertErr: any) {
      // PostgreSQL unique_violation (race: two concurrent registrations, same email)
      if (insertErr?.code === '23505') {
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

// ─── POST /api/v1/user/login ──────────────────────────────────────────────────

userRouter.post('/login', async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

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

// ─── GET /api/v1/user/me ──────────────────────────────────────────────────────

userRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;

  try {
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
      db
        .select({ episodeId: unlocksTable.episodeId })
        .from(unlocksTable)
        .where(eq(unlocksTable.userId, userId)),
      db
        .select({ episodeId: likesTable.episodeId })
        .from(likesTable)
        .where(eq(likesTable.userId, userId)),
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

// ─── POST /api/v1/user/unlock ─────────────────────────────────────────────────
/**
 * Unlocks an episode for the authenticated user.
 *
 * method 'coins': single database transaction that:
 *   1. Tries to INSERT the unlock row (ON CONFLICT DO NOTHING).
 *      → 0 rows: episode already unlocked — returns idempotent success with no charge.
 *      → 1 row:  proceeds to coin deduction.
 *   2. Conditionally decrements coin_balance WHERE coin_balance >= coinCost.
 *      → 0 rows: insufficient funds — throws InsufficientFundsError, rolling back
 *                the unlock insert from step 1. No coins charged, no unlock created.
 *      → 1 row:  coins deducted successfully.
 *   3. Inserts the coin ledger entry.
 *
 *   Concurrent duplicate unlock requests: the second concurrent request hits the
 *   unique constraint on (userId, episodeId) in step 1 and is treated as
 *   already-unlocked — no double charge, no 500.
 *
 * method 'ad': called by the mobile client after EARNED_REWARD fires.
 *   Credits COIN_REWARD_FROM_AD coins to the user then unlocks the episode for
 *   free. AdMob SSV (GET /admob-ssv) provides secondary server-to-server
 *   verification for auditing; this endpoint handles the immediate unlock.
 */

const COIN_REWARD_FROM_AD = 10;

userRouter.post('/unlock', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;

  const parsed = UnlockSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
    return;
  }

  const { episodeId, method } = parsed.data;

  try {
    // Fetch episode (outside transaction — read-only, no contention)
    const [episode] = await db
      .select()
      .from(episodesTable)
      .where(eq(episodesTable.id, episodeId))
      .limit(1);

    if (!episode) {
      res.status(404).json({ error: 'Episode not found' });
      return;
    }

    if (!episode.isLocked) {
      // Episode is free — return a gateway URL, no charge needed.
      res.json({ success: true, videoUrl: signMediaUrl(episodeId), message: 'Episode is free.' });
      return;
    }

    // ── Ad reward path ──────────────────────────────────────────────────────
    if (method === 'ad') {
      type AdTxResult =
        | { kind: 'unlocked'; newBalance: number }
        | { kind: 'already_unlocked'; currentBalance: number };

      const result: AdTxResult = await db.transaction(async (tx) => {
        // Step 1: atomically claim the unlock slot.
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

        // Step 2: credit the ad reward coins.
        const [updated] = await tx
          .update(usersTable)
          .set({ coinBalance: sql`${usersTable.coinBalance} + ${COIN_REWARD_FROM_AD}` })
          .where(eq(usersTable.id, userId))
          .returning({ newBalance: usersTable.coinBalance });

        // Step 3: record the coin ledger entry.
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

    // ── Coins path ──────────────────────────────────────────────────────────
    type CoinsTxResult =
      | { kind: 'unlocked'; newBalance: number }
      | { kind: 'already_unlocked' };

    const result: CoinsTxResult = await db.transaction(async (tx) => {
      // Step 1: atomically claim the unlock slot.
      // If the row already exists (concurrent or prior request), DO NOTHING returns 0 rows.
      const inserted = await tx
        .insert(unlocksTable)
        .values({ userId, episodeId })
        .onConflictDoNothing()
        .returning({ id: unlocksTable.id });

      if (inserted.length === 0) {
        return { kind: 'already_unlocked' };
      }

      // Step 2: deduct coins only if balance is sufficient — prevents overdraft.
      // If another concurrent request already drained the balance this will return 0 rows,
      // triggering InsufficientFundsError which rolls back the unlock insert above.
      const deducted = await tx
        .update(usersTable)
        .set({ coinBalance: sql`${usersTable.coinBalance} - ${episode.coinCost}` })
        .where(
          and(
            eq(usersTable.id, userId),
            sql`${usersTable.coinBalance} >= ${episode.coinCost}`
          )
        )
        .returning({ newBalance: usersTable.coinBalance });

      if (deducted.length === 0) {
        // Roll back the unlock insert by throwing — Drizzle aborts the transaction.
        throw new InsufficientFundsError();
      }

      // Step 3: record the coin ledger entry.
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

    // kind === 'unlocked'
    req.log.info({ userId, episodeId, method }, 'Episode unlocked via coins');
    res.json({
      success: true,
      newCoinBalance: result.newBalance,
      videoUrl: signMediaUrl(episodeId),
      message: 'Episode unlocked successfully.',
    });
  } catch (err) {
    if (err instanceof InsufficientFundsError) {
      // Thrown from inside the transaction — already handled above via TxResult,
      // but guard here in case the transaction wrapper re-throws.
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

// ─── GET /api/v1/user/admob-ssv ───────────────────────────────────────────────
/**
 * AdMob Server-Side Verification (SSV) callback.
 *
 * Google's AdMob servers call this endpoint after the user completes a rewarded
 * ad. The request is signed with an ECDSA key; we verify the signature using
 * Google's published verifier keys before accepting the callback.
 *
 * Query parameters (sent by Google):
 *   ad_network, ad_unit, reward_amount, reward_item, timestamp,
 *   transaction_id, user_id, key_id, signature
 *
 * The user_id is set via serverSideVerificationOptions.userId in the mobile
 * client (the authenticated user's UUID). transaction_id deduplicates retries.
 *
 * This endpoint is called by Google — it is NOT authenticated via Bearer JWT.
 * Security comes entirely from ECDSA signature verification.
 */

const ADMOB_VERIFIER_KEYS_URL =
  'https://gstatic.com/admob/reward/verifier-keys.json';

/** Simple in-process cache for Google's public keys (keyed by key_id). */
const verifierKeyCache = new Map<string, string>();
let verifierKeysCachedAt = 0;
const VERIFIER_KEYS_TTL_MS = 60 * 60 * 1000; // 1 hour

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
  // Google sends all parameters as query strings. Extract them.
  const {
    key_id,
    signature,
    user_id,
    transaction_id,
    reward_amount,
    reward_item,
  } = req.query as Record<string, string>;

  if (!key_id || !signature || !user_id || !transaction_id) {
    res.status(400).send('Missing required SSV parameters');
    return;
  }

  // ── Verify ECDSA signature ─────────────────────────────────────────────────
  // The signed content is the full raw query string without the trailing
  // &signature=… parameter. Google always appends the signature last.
  const rawQuery = req.url.split('?')[1] ?? '';
  const signatureParam = `&signature=${encodeURIComponent(signature)}`;
  const signedContent = rawQuery.endsWith(signatureParam)
    ? rawQuery.slice(0, -signatureParam.length)
    : rawQuery.replace(/&?signature=[^&]*$/, '');

  const publicKeyPem = await fetchAdMobPublicKey(key_id);
  if (!publicKeyPem) {
    req.log.warn({ key_id }, 'AdMob SSV: unknown key_id or key fetch failed');
    // Return 200 to prevent Google from retrying indefinitely when keys are
    // temporarily unavailable; log the anomaly for manual review.
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

  // ── Signature valid — log the reward for auditing ─────────────────────────
  // The actual coin credit and unlock happen via POST /unlock (method:'ad')
  // called from the mobile client on EARNED_REWARD. SSV provides a secondary
  // audit trail that is independent of the client.
  req.log.info(
    { user_id, transaction_id, reward_amount, reward_item },
    'AdMob SSV verified',
  );

  // Google expects a 200 OK to confirm receipt.
  res.status(200).send('OK');
});

// ─── POST /api/v1/user/like ───────────────────────────────────────────────────

userRouter.post('/like', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;

  const parsed = z.object({ episodeId: z.string().uuid() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
    return;
  }

  const { episodeId } = parsed.data;

  try {
    await db
      .insert(likesTable)
      .values({ userId, episodeId })
      .onConflictDoNothing();

    req.log.info({ userId, episodeId }, 'Episode liked');
    res.json({ success: true });
  } catch (err) {
    req.log.error(err, 'Like failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});
