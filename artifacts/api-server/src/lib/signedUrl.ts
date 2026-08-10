/**
 * Server-enforced media gateway signed URLs.
 *
 * Raw CDN storage paths NEVER leave the server. Clients receive signed gateway
 * URLs of the form:
 *   /api/v1/media/play?episodeId=<uuid>&expires=<unix_ts>&sig=<hmac_base64url>
 *
 * The server validates the HMAC and expiry before redirecting to the private
 * CDN path (302). This means:
 *  - A client who strips query params gets 403 (gateway requires a valid sig).
 *  - A captured token is useless after TTL_SECONDS.
 *  - The raw CDN URL is never in any API response; only the server sees it.
 *
 * HMAC covers: episodeId + "|" + expires  — keyed with SESSION_SECRET.
 */

import crypto from 'crypto';

const SECRET = process.env.SESSION_SECRET;

if (!SECRET) {
  throw new Error('SESSION_SECRET must be set for media URL signing.');
}

export const TTL_SECONDS = 3600; // 1 hour

/** Build the HMAC payload deterministically. */
function payload(episodeId: string, expires: number): string {
  return `${episodeId}|${expires}`;
}

/**
 * Generate a signed gateway URL for the given episode.
 * Returns null if episodeId is falsy.
 */
export function signMediaUrl(episodeId: string | null | undefined): string | null {
  if (!episodeId) return null;
  const expires = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const sig = crypto
    .createHmac('sha256', SECRET!)
    .update(payload(episodeId, expires))
    .digest('base64url');
  return `/api/v1/media/play?episodeId=${episodeId}&expires=${expires}&sig=${sig}`;
}

/**
 * Verify a gateway URL token. Returns true only when the HMAC is valid
 * and the token has not expired.
 */
export function verifyMediaToken(
  episodeId: string,
  expires: number,
  sig: string,
): boolean {
  const now = Math.floor(Date.now() / 1000);
  if (now > expires) return false;
  const expected = crypto
    .createHmac('sha256', SECRET!)
    .update(payload(episodeId, expires))
    .digest('base64url');
  // Constant-time compare to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(sig, 'base64url'),
      Buffer.from(expected, 'base64url'),
    );
  } catch {
    return false;
  }
}
