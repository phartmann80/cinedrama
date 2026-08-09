import { Router, Request, Response } from 'express';

export const dramasRouter = Router();

// ─── Mock data (replace with PostgreSQL queries via Drizzle ORM) ──────────────

const MOCK_DRAMAS = [
  {
    id: 'drama-001',
    title: "Billionaire's Revenge",
    genre: 'Drama · Thriller',
    description:
      'When a self-made billionaire discovers his fiancée married his rival, he orchestrates a meticulous corporate takedown that tears both families apart.',
    thumbnailUrl: 'https://cdn.cinedrama.app/thumbs/billionaires-revenge.jpg',
    totalEpisodes: 24,
    freeEpisodes: 2,
    tags: ['drama', 'thriller', 'romance', 'revenge'],
    isNew: false,
    isTrending: true,
  },
  {
    id: 'drama-002',
    title: 'Neon Exodus',
    genre: 'Sci-Fi · Action',
    description:
      'In 2089, a rogue AI detective hunts synthetic humans disguised as citizens — until she discovers she might be one of them.',
    thumbnailUrl: 'https://cdn.cinedrama.app/thumbs/neon-exodus.jpg',
    totalEpisodes: 18,
    freeEpisodes: 2,
    tags: ['sci-fi', 'action', 'ai', 'thriller'],
    isNew: true,
    isTrending: false,
  },
  {
    id: 'drama-003',
    title: 'Whisper of the Tide',
    genre: 'Romance · Suspense',
    description:
      'A marine biologist and a mysterious salvage diver uncover a decades-old maritime conspiracy — and an undeniable connection.',
    thumbnailUrl: 'https://cdn.cinedrama.app/thumbs/whisper-of-the-tide.jpg',
    totalEpisodes: 30,
    freeEpisodes: 2,
    tags: ['romance', 'suspense', 'mystery'],
    isNew: false,
    isTrending: true,
  },
  {
    id: 'drama-004',
    title: 'Crown of Lies',
    genre: 'Political · Drama',
    description:
      'The heir to a political dynasty must choose between her family\'s legacy and the journalist who threatens to expose everything.',
    thumbnailUrl: 'https://cdn.cinedrama.app/thumbs/crown-of-lies.jpg',
    totalEpisodes: 20,
    freeEpisodes: 2,
    tags: ['political', 'drama', 'romance'],
    isNew: true,
    isTrending: true,
  },
];

// ─── GET /api/v1/dramas ───────────────────────────────────────────────────────

dramasRouter.get('/', async (req: Request, res: Response) => {
  // TODO: Replace with Drizzle ORM query:
  // const dramas = await db.select().from(dramasTable).where(eq(dramasTable.isActive, true));

  const genre = req.query.genre as string | undefined;
  const search = req.query.search as string | undefined;
  const page = parseInt((req.query.page as string) ?? '1', 10);
  const limit = Math.min(parseInt((req.query.limit as string) ?? '20', 10), 50);
  const offset = (page - 1) * limit;

  let filtered = MOCK_DRAMAS;

  if (genre) {
    filtered = filtered.filter((d) =>
      d.genre.toLowerCase().includes(genre.toLowerCase())
    );
  }

  if (search) {
    filtered = filtered.filter(
      (d) =>
        d.title.toLowerCase().includes(search.toLowerCase()) ||
        d.description.toLowerCase().includes(search.toLowerCase())
    );
  }

  const paginated = filtered.slice(offset, offset + limit);

  res.json({
    data: paginated,
    meta: {
      total: filtered.length,
      page,
      limit,
      hasMore: offset + limit < filtered.length,
    },
  });
});

// ─── GET /api/v1/dramas/:id ───────────────────────────────────────────────────

dramasRouter.get('/:id', async (req: Request, res: Response) => {
  const drama = MOCK_DRAMAS.find((d) => d.id === req.params.id);
  if (!drama) {
    res.status(404).json({ error: 'Drama not found' });
    return;
  }
  res.json(drama);
});
