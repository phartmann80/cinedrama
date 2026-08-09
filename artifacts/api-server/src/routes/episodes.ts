import { Router, Request, Response } from 'express';

export const episodesRouter = Router({ mergeParams: true });

// ─── Mock episode generator (replace with DB queries) ─────────────────────────

function generateEpisodes(dramaId: string, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const ep = i + 1;
    const isLocked = ep > 2; // first 2 free
    return {
      id: `${dramaId}-ep-${ep.toString().padStart(3, '0')}`,
      dramaId,
      episodeNumber: ep,
      title: getEpisodeTitle(ep),
      durationSeconds: Math.floor(Math.random() * 60) + 90, // 90–150s
      // In production: signed Cloudflare R2 URL or HLS .m3u8
      videoUrl: isLocked
        ? null
        : `https://cdn.cinedrama.app/videos/${dramaId}/ep${ep}.m3u8`,
      thumbnailUrl: `https://cdn.cinedrama.app/thumbs/${dramaId}/ep${ep}.jpg`,
      isLocked,
      coinCost: isLocked ? 5 : 0,
    };
  });
}

const EPISODE_TITLE_TEMPLATES = [
  'The Beginning',
  'Shadows Fall',
  'No Way Back',
  'The Truth Revealed',
  'Burning Bridges',
  'Into the Storm',
  'The Last Chance',
  'Betrayal',
  'Reckoning',
  'A New Dawn',
  'The Price of Power',
  'Unmasked',
  'Crossroads',
  'The Final Gambit',
  'Aftermath',
];

function getEpisodeTitle(ep: number): string {
  return EPISODE_TITLE_TEMPLATES[(ep - 1) % EPISODE_TITLE_TEMPLATES.length];
}

const DRAMA_EPISODE_COUNTS: Record<string, number> = {
  'drama-001': 24,
  'drama-002': 18,
  'drama-003': 30,
  'drama-004': 20,
};

// ─── GET /api/v1/dramas/:id/episodes ─────────────────────────────────────────

episodesRouter.get('/', async (req: Request, res: Response) => {
  const { id: dramaId } = req.params;
  const count = DRAMA_EPISODE_COUNTS[dramaId];

  if (!count) {
    res.status(404).json({ error: 'Drama not found' });
    return;
  }

  // TODO: DB query:
  // const episodes = await db
  //   .select()
  //   .from(episodesTable)
  //   .where(eq(episodesTable.dramaId, dramaId))
  //   .orderBy(asc(episodesTable.episodeNumber));

  const episodes = generateEpisodes(dramaId, count);
  res.json(episodes);
});

// ─── GET /api/v1/dramas/:id/episodes/:epNum ───────────────────────────────────

episodesRouter.get('/:epNum', async (req: Request, res: Response) => {
  const { id: dramaId, epNum } = req.params;
  const count = DRAMA_EPISODE_COUNTS[dramaId];

  if (!count) {
    res.status(404).json({ error: 'Drama not found' });
    return;
  }

  const epNumber = parseInt(epNum, 10);
  if (isNaN(epNumber) || epNumber < 1 || epNumber > count) {
    res.status(404).json({ error: 'Episode not found' });
    return;
  }

  const [episode] = generateEpisodes(dramaId, epNumber).slice(-1);
  res.json(episode);
});
