/**
 * Media gateway — server-side proxy with HMAC authorization.
 *
 * GET /api/v1/media/play?episodeId=<uuid>&expires=<ts>&sig=<hmac>
 *
 * Validates HMAC + expiry, looks up the raw CDN path, then proxies the
 * response. The raw origin URL is never sent to the client.
 */

import { Router, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { Readable } from 'node:stream';
import { getDb, episodesTable } from '../db/index.js';
import { verifyMediaToken } from '../lib/signedUrl.js';

export const mediaRouter = Router();

mediaRouter.get('/play', async (req: Request, res: Response) => {
  const { episodeId, expires: expiresStr, sig } = req.query as Record<string, string>;

  if (!episodeId || !expiresStr || !sig) {
    res.status(403).json({ error: 'Missing or invalid media token.' });
    return;
  }

  const expires = parseInt(expiresStr, 10);
  if (isNaN(expires)) {
    res.status(403).json({ error: 'Invalid token expiry.' });
    return;
  }

  if (!verifyMediaToken(episodeId, expires, sig)) {
    res.status(403).json({ error: 'Media token is invalid or has expired.' });
    return;
  }

  let rawUrl: string | null = null;
  try {
    const db = getDb();
    const [episode] = await db
      .select({ videoUrl: episodesTable.videoUrl })
      .from(episodesTable)
      .where(eq(episodesTable.id, episodeId))
      .limit(1);

    rawUrl = episode?.videoUrl ?? null;
  } catch (err) {
    req.log.error(err, 'Media gateway: DB lookup failed');
    res.status(500).json({ error: 'Internal server error' });
    return;
  }

  if (!rawUrl) {
    res.status(404).json({ error: 'Episode media not found.' });
    return;
  }

  try {
    const upstreamHeaders: Record<string, string> = {};
    const rangeHeader = req.headers['range'];
    if (rangeHeader) {
      upstreamHeaders['Range'] = rangeHeader;
    }

    const upstream = await fetch(rawUrl, {
      headers: upstreamHeaders,
      signal: AbortSignal.timeout(30_000),
    });

    res.status(upstream.status);

    const forward = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'cache-control',
      'etag',
      'last-modified',
    ];
    for (const h of forward) {
      const val = upstream.headers.get(h);
      if (val) res.setHeader(h, val);
    }

    res.removeHeader('Location');

    if (!upstream.body) {
      res.end();
      return;
    }

    Readable.fromWeb(upstream.body as import('stream/web').ReadableStream<Uint8Array>).pipe(res);
  } catch (err: unknown) {
    const error = err as { name?: string; code?: string; message?: string };
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      req.log.warn({ episodeId }, 'Media gateway: upstream CDN timed out');
      res.status(504).json({ error: 'Media origin timed out.' });
    } else if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
      req.log.warn(
        { episodeId, err: error.message },
        'Media gateway: CDN origin unreachable (placeholder)',
      );
      res.status(502).json({ error: 'Media origin unreachable.' });
    } else {
      req.log.error(err, 'Media gateway: proxy error');
      res.status(502).json({ error: 'Failed to retrieve media.' });
    }
  }
});
