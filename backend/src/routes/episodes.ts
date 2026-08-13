import { Router, type Request, type Response } from 'express';
import { eq, and, asc } from 'drizzle-orm';
import { getDb, dramasTable, episodesTable, unlocksTable } from '../db/index.js';
import { optionalAuth, type AuthRequest } from '../lib/auth.js';
import { signMediaUrl } from '../lib/signedUrl.js';

export const episodesRouter = Router({ mergeParams: true });

episodesRouter.get('/', optionalAuth, async (req: Request, res: Response) => {
  const dramaId = String(req.params.id);
  const authReq = req as AuthRequest;

  try {
    const db = getDb();
    const [drama] = await db
      .select({ id: dramasTable.id })
      .from(dramasTable)
      .where(and(eq(dramasTable.id, dramaId), eq(dramasTable.isActive, true)))
      .limit(1);

    if (!drama) {
      res.status(404).json({ error: 'Drama not found' });
      return;
    }

    const episodes = await db
      .select()
      .from(episodesTable)
      .where(eq(episodesTable.dramaId, dramaId))
      .orderBy(asc(episodesTable.episodeNumber));

    if (authReq.user) {
      const unlocks = await db
        .select({ episodeId: unlocksTable.episodeId })
        .from(unlocksTable)
        .where(eq(unlocksTable.userId, authReq.user.id));

      const unlockedSet = new Set(unlocks.map((u) => u.episodeId));

      const enriched = episodes.map((ep) => {
        const stillLocked = ep.isLocked && !unlockedSet.has(ep.id);
        return {
          ...ep,
          isLocked: stillLocked,
          videoUrl: stillLocked ? null : signMediaUrl(ep.id),
        };
      });

      res.json(enriched);
      return;
    }

    const sanitized = episodes.map((ep) => ({
      ...ep,
      videoUrl: ep.isLocked ? null : signMediaUrl(ep.id),
    }));

    res.json(sanitized);
  } catch (err) {
    req.log.error(err, 'Failed to fetch episodes');
    res.status(500).json({ error: 'Internal server error' });
  }
});

episodesRouter.get('/:epNum', optionalAuth, async (req: Request, res: Response) => {
  const dramaId = String(req.params.id);
  const authReq = req as AuthRequest;

  const epNumber = parseInt(String(req.params.epNum), 10);
  if (isNaN(epNumber) || epNumber < 1) {
    res.status(400).json({ error: 'Invalid episode number' });
    return;
  }

  try {
    const db = getDb();
    const [drama] = await db
      .select({ id: dramasTable.id })
      .from(dramasTable)
      .where(and(eq(dramasTable.id, dramaId), eq(dramasTable.isActive, true)))
      .limit(1);

    if (!drama) {
      res.status(404).json({ error: 'Drama not found' });
      return;
    }

    const [episode] = await db
      .select()
      .from(episodesTable)
      .where(and(eq(episodesTable.dramaId, dramaId), eq(episodesTable.episodeNumber, epNumber)))
      .limit(1);

    if (!episode) {
      res.status(404).json({ error: 'Episode not found' });
      return;
    }

    if (episode.isLocked && authReq.user) {
      const [unlock] = await db
        .select({ id: unlocksTable.id })
        .from(unlocksTable)
        .where(and(eq(unlocksTable.userId, authReq.user.id), eq(unlocksTable.episodeId, episode.id)))
        .limit(1);

      if (unlock) {
        res.json({ ...episode, isLocked: false, videoUrl: signMediaUrl(episode.id) });
        return;
      }
    }

    res.json({
      ...episode,
      videoUrl: episode.isLocked ? null : signMediaUrl(episode.id),
    });
  } catch (err) {
    req.log.error(err, 'Failed to fetch episode');
    res.status(500).json({ error: 'Internal server error' });
  }
});
