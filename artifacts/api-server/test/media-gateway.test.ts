/**
 * Media gateway integration tests.
 *
 * Verifies that:
 *  - Unauthenticated / tampered tokens → 403 (never streams content)
 *  - Expired tokens → 403
 *  - Missing params → 403
 *  - No raw CDN URL in any 403 response (content stays server-side)
 *  - Valid token → gateway contacts upstream (502/504 expected in test
 *    environment where cdn.cinedrama.app is a placeholder, NOT 302)
 *
 * Run with:  pnpm --filter @workspace/api-server run test
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import crypto from 'crypto';
import app from '../src/app';

const SECRET = process.env.SESSION_SECRET ?? 'test-secret-for-ci';

/** Build a gateway URL with the given params (mirrors signMediaUrl logic). */
function makeToken(episodeId: string, expiresOffsetSec: number): {
  episodeId: string; expires: number; sig: string
} {
  const expires = Math.floor(Date.now() / 1000) + expiresOffsetSec;
  const payload = `${episodeId}|${expires}`;
  const sig = crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('base64url');
  return { episodeId, expires, sig };
}

const api = supertest(app);
const FAKE_EPISODE_ID = '00000000-0000-0000-0000-000000000001';

describe('Media gateway — authorization enforcement', () => {
  it('returns 403 when all token params are missing', async () => {
    const res = await api.get('/api/v1/media/play');
    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
    // Must not redirect to origin
    expect(res.headers['location']).toBeUndefined();
  });

  it('returns 403 when sig is missing', async () => {
    const res = await api.get(
      `/api/v1/media/play?episodeId=${FAKE_EPISODE_ID}&expires=9999999999`
    );
    expect(res.status).toBe(403);
    expect(res.headers['location']).toBeUndefined();
  });

  it('returns 403 for a tampered / invalid sig', async () => {
    const res = await api.get(
      `/api/v1/media/play?episodeId=${FAKE_EPISODE_ID}&expires=9999999999&sig=badsignature`
    );
    expect(res.status).toBe(403);
    expect(res.headers['location']).toBeUndefined();
  });

  it('returns 403 for an expired valid-sig token', async () => {
    const { episodeId, expires, sig } = makeToken(FAKE_EPISODE_ID, -10); // already expired
    const res = await api.get(
      `/api/v1/media/play?episodeId=${episodeId}&expires=${expires}&sig=${sig}`
    );
    expect(res.status).toBe(403);
    expect(res.headers['location']).toBeUndefined();
  });

  it('returns 403 when sig is valid but episodeId is swapped (HMAC covers the ID)', async () => {
    // Token was issued for FAKE_EPISODE_ID; client swaps in a different ID.
    const { expires, sig } = makeToken(FAKE_EPISODE_ID, 3600);
    const differentId = '00000000-0000-0000-0000-000000000002';
    const res = await api.get(
      `/api/v1/media/play?episodeId=${differentId}&expires=${expires}&sig=${sig}`
    );
    expect(res.status).toBe(403);
    expect(res.headers['location']).toBeUndefined();
  });

  it('does NOT issue a 302 redirect for any response (proxy, not redirect)', async () => {
    // Test both invalid and valid-ish tokens — neither should produce a redirect.
    const bad = await api.get('/api/v1/media/play?episodeId=x&expires=y&sig=z');
    expect([301, 302, 303, 307, 308]).not.toContain(bad.status);

    const { episodeId, expires, sig } = makeToken(FAKE_EPISODE_ID, 3600);
    const valid = await api
      .get(`/api/v1/media/play?episodeId=${episodeId}&expires=${expires}&sig=${sig}`)
      .redirects(0); // do not follow redirects
    // Should be 404 (episode not in test DB) or 502 (CDN unreachable) — NOT a redirect
    expect([301, 302, 303, 307, 308]).not.toContain(valid.status);
  });

  it('never exposes a raw CDN URL in error responses', async () => {
    const res = await api.get(
      `/api/v1/media/play?episodeId=${FAKE_EPISODE_ID}&expires=9999999999&sig=bad`
    );
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/cdn\./);
    expect(body).not.toMatch(/\.m3u8/);
    expect(res.headers['location']).toBeUndefined();
  });
});
