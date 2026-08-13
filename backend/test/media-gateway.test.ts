/**
 * Media gateway integration tests.
 *
 * Run with: npm test
 */

import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import crypto from 'node:crypto';
import app from '../src/app.js';

const SECRET = process.env.JWT_SECRET ?? process.env.SESSION_SECRET ?? 'test-secret-for-ci';

function makeToken(episodeId: string, expiresOffsetSec: number): {
  episodeId: string;
  expires: number;
  sig: string;
} {
  const expires = Math.floor(Date.now() / 1000) + expiresOffsetSec;
  const payload = `${episodeId}|${expires}`;
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return { episodeId, expires, sig };
}

const api = supertest(app);
const FAKE_EPISODE_ID = '00000000-0000-0000-0000-000000000001';

describe('Media gateway — authorization enforcement', () => {
  it('returns 403 when all token params are missing', async () => {
    const res = await api.get('/api/v1/media/play');
    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
    expect(res.headers['location']).toBeUndefined();
  });

  it('returns 403 when sig is missing', async () => {
    const res = await api.get(`/api/v1/media/play?episodeId=${FAKE_EPISODE_ID}&expires=9999999999`);
    expect(res.status).toBe(403);
    expect(res.headers['location']).toBeUndefined();
  });

  it('returns 403 for a tampered / invalid sig', async () => {
    const res = await api.get(
      `/api/v1/media/play?episodeId=${FAKE_EPISODE_ID}&expires=9999999999&sig=badsignature`,
    );
    expect(res.status).toBe(403);
    expect(res.headers['location']).toBeUndefined();
  });

  it('returns 403 for an expired valid-sig token', async () => {
    const { episodeId, expires, sig } = makeToken(FAKE_EPISODE_ID, -10);
    const res = await api.get(`/api/v1/media/play?episodeId=${episodeId}&expires=${expires}&sig=${sig}`);
    expect(res.status).toBe(403);
    expect(res.headers['location']).toBeUndefined();
  });

  it('returns 403 when sig is valid but episodeId is swapped (HMAC covers the ID)', async () => {
    const { expires, sig } = makeToken(FAKE_EPISODE_ID, 3600);
    const differentId = '00000000-0000-0000-0000-000000000002';
    const res = await api.get(
      `/api/v1/media/play?episodeId=${differentId}&expires=${expires}&sig=${sig}`,
    );
    expect(res.status).toBe(403);
    expect(res.headers['location']).toBeUndefined();
  });

  it('does NOT issue a 302 redirect for any response (proxy, not redirect)', async () => {
    const bad = await api.get('/api/v1/media/play?episodeId=x&expires=y&sig=z');
    expect([301, 302, 303, 307, 308]).not.toContain(bad.status);

    const { episodeId, expires, sig } = makeToken(FAKE_EPISODE_ID, 3600);
    const valid = await api
      .get(`/api/v1/media/play?episodeId=${episodeId}&expires=${expires}&sig=${sig}`)
      .redirects(0);
    expect([301, 302, 303, 307, 308]).not.toContain(valid.status);
  });

  it('never exposes a raw CDN URL in error responses', async () => {
    const res = await api.get(
      `/api/v1/media/play?episodeId=${FAKE_EPISODE_ID}&expires=9999999999&sig=bad`,
    );
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/cdn\./);
    expect(body).not.toMatch(/\.m3u8/);
    expect(res.headers['location']).toBeUndefined();
  });

  it('GET /api/healthz returns ok', async () => {
    const res = await api.get('/api/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
