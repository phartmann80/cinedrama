import { Router, Request, Response } from 'express';

// mergeParams gives access to :id from the parent router
export const episodesRouter = Router({ mergeParams: true });

// ─── Mock data generator ──────────────────────────────────────────────────────
// TODO: Replace with db.select().from(episodesTable).where(...) once DB task complete.
// Video URLs should become Cloudflare R2 presigned URLs (TTL ~1h) in production.

const DRAMA_EPISODE_COUNTS: Record<string, number> = {
  'drama-001': 24,
  'drama-002': 18,
  'drama-003': 30,
  'drama-004': 20,
};

const TITLE_POOL = [
  'The Beginning', 'Shadows Fall', 'No Way Back', 'The Truth Revealed',
  'Burning Bridges', 'Into the Storm', 'The Last Chance', 'Betrayal',
  'Reckoning', 'A New Dawn', 'The Price of Power', 'Unmasked',
  'Crossroads', 'The Final Gambit', 'Aftermath',
];

function mockEpisodes(dramaId: string, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const ep = i + 1;
    const isLocked = ep > 2;
    return {
      id: `${dramaId}-ep-${ep.toString().padStart(3, '0')}`,
      dramaId,
      episodeNumber: ep,
      title: TITLE_POOL[(ep - 1) % TITLE_POOL.length],
      durationSeconds: 90 + Math.floor(Math.random() * 60),
      // Locked episodes return null URL — client shows paywall
      videoUrl: isLocked ? null : `https://cdn.cinedrama.app/videos/${dramaId}/ep${ep}.m3u8`,
      thumbnailUrl: `https://cdn.cinedrama.app/thumbs/${dramaId}/ep${ep}.jpg`,
      isLocked,
      coinCost: isLocked ? 5 : 0,
    };
  });
}

// ─── GET /api/v1/dramas/:id/episodes ─────────────────────────────────────────

episodesRouter.get('/', async (req: Request, res: Response) => {
  const { id } = req.params;
  const count = DRAMA_EPISODE_COUNTS[id];
  if (!count) { res.status(404).json({ error: 'Drama not found' }); return; }
  res.json(mockEpisodes(id, count));
});

// ─── GET /api/v1/dramas/:id/episodes/:epNum ───────────────────────────────────

episodesRouter.get('/:epNum', async (req: Request, res: Response) => {
  const { id, epNum } = req.params;
  const count = DRAMA_EPISODE_COUNTS[id];
  if (!count) { res.status(404).json({ error: 'Drama not found' }); return; }
  const n = parseInt(epNum, 10);
  if (isNaN(n) || n < 1 || n > count) { res.status(404).json({ error: 'Episode not found' }); return; }
  const [episode] = mockEpisodes(id, n).slice(-1);
  res.json(episode);
});
