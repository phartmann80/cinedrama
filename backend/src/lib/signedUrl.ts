/**
 * Server-enforced media gateway signed URLs.
 *
 * Raw CDN storage paths never leave the server. Clients receive signed gateway
 * URLs of the form:
 *   /api/v1/media/play?episodeId=<uuid>&expires=<unix_ts>&sig=<hmac_base64url>
 *
 * HMAC covers: episodeId + "|" + expires — keyed with JWT_SECRET (or SESSION_SECRET).
 */

import crypto from 'node:crypto';

export const TTL_SECONDS = 3600;

function getSecret(): string {
  const secret = process.env.JWT_SECRET ?? process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET (or SESSION_SECRET) must be set for media URL signing.');
  }
  return secret;
}

function payload(episodeId: string, expires: number): string {
  return `${episodeId}|${expires}`;
}

export function signMediaUrl(episodeId: string | null | undefined): string | null {
  if (!episodeId) return null;
  const expires = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const sig = crypto.createHmac('sha256', getSecret()).update(payload(episodeId, expires)).digest('base64url');
  return `/api/v1/media/play?episodeId=${episodeId}&expires=${expires}&sig=${sig}`;
}

export function verifyMediaToken(episodeId: string, expires: number, sig: string): boolean {
  const now = Math.floor(Date.now() / 1000);
  if (now > expires) return false;
  const expected = crypto
    .createHmac('sha256', getSecret())
    .update(payload(episodeId, expires))
    .digest('base64url');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, 'base64url'), Buffer.from(expected, 'base64url'));
  } catch {
    return false;
  }
}
