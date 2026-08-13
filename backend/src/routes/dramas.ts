import { Router, type Request, type Response } from 'express';
import { eq, ilike, or, and } from 'drizzle-orm';
import { getDb, dramasTable } from '../db/index.js';

export const dramasRouter = Router();

// Mock data for development without database
const MOCK_DRAMAS = [
  {
    id: 'drama-001',
    title: "Billionaire's Revenge",
    genre: 'Drama · Thriller',
    description: 'When a self-made billionaire discovers his fiancée married his rival, he orchestrates a meticulous corporate takedown.',
    thumbnailUrl: 'https://cdn.cinedrama.app/thumbs/billionaires-revenge.jpg',
    totalEpisodes: 24,
    freeEpisodes: 2,
    tags: ['drama', 'thriller', 'romance', 'revenge'],
    isNew: false,
    isTrending: true,
    isActive: true,
  },
  {
    id: 'drama-002',
    title: 'Neon Exodus',
    genre: 'Sci-Fi · Action',
    description: 'In 2089, a rogue AI detective hunts synthetic humans disguised as citizens.',
    thumbnailUrl: 'https://cdn.cinedrama.app/thumbs/neon-exodus.jpg',
    totalEpisodes: 18,
    freeEpisodes: 2,
    tags: ['sci-fi', 'action', 'ai', 'thriller'],
    isNew: true,
    isTrending: false,
    isActive: true,
  },
  {
    id: 'drama-003',
    title: 'Whisper of the Tide',
    genre: 'Romance · Suspense',
    description: 'A marine biologist and a mysterious salvage diver uncover a decades-old maritime conspiracy.',
    thumbnailUrl: 'https://cdn.cinedrama.app/thumbs/whisper-of-the-tide.jpg',
    totalEpisodes: 30,
    freeEpisodes: 2,
    tags: ['romance', 'suspense', 'mystery'],
    isNew: false,
    isTrending: true,
    isActive: true,
  },
  {
    id: 'drama-004',
    title: 'Crown of Lies',
    genre: 'Political · Drama',
    description: 'The heir to a political dynasty must choose between her family legacy and the journalist who threatens to expose everything.',
    thumbnailUrl: 'https://cdn.cinedrama.app/thumbs/crown-of-lies.jpg',
    totalEpisodes: 20,
    freeEpisodes: 2,
    tags: ['political', 'drama', 'romance'],
    isNew: true,
    isTrending: true,
    isActive: true,
  },
];

dramasRouter.get('/', async (req: Request, res: Response) => {
  const genre = req.query.genre as string | undefined;
  const search = req.query.search as string | undefined;
  const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10));
  const limit = Math.min(Math.max(1, parseInt((req.query.limit as string) ?? '20', 10)), 50);
  const offset = (page - 1) * limit;

  // Mock mode: return mock data when DATABASE_URL is not set
  if (process.env.USE_MOCK_DB === 'true' || !process.env.DATABASE_URL) {
    let filtered = MOCK_DRAMAS;
    if (genre) {
      filtered = filtered.filter((d) => d.genre.toLowerCase().includes(genre.toLowerCase()));
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((d) => d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q));
    }
    res.json({
      data: filtered.slice(offset, offset + limit),
      meta: { total: filtered.length, page, limit, hasMore: offset + limit < filtered.length },
    });
    return;
  }

  try {
    const db = getDb();
    const conditions = [eq(dramasTable.isActive, true)];

    if (genre) {
      conditions.push(ilike(dramasTable.genre, `%${genre}%`));
    }

    if (search) {
      conditions.push(
        or(ilike(dramasTable.title, `%${search}%`), ilike(dramasTable.description, `%${search}%`))!,
      );
    }

    const where = and(...conditions);

    const [allRows, pageRows] = await Promise.all([
      db.select({ id: dramasTable.id }).from(dramasTable).where(where),
      db.select().from(dramasTable).where(where).offset(offset).limit(limit),
    ]);

    res.json({
      data: pageRows,
      meta: {
        total: allRows.length,
        page,
        limit,
        hasMore: offset + limit < allRows.length,
      },
    });
  } catch (err) {
    req.log.error(err, 'Failed to fetch dramas');
    res.status(500).json({ error: 'Internal server error' });
  }
});

dramasRouter.get('/:id', async (req: Request, res: Response) => {
  // Mock mode: return mock data when DATABASE_URL is not set
  if (process.env.USE_MOCK_DB === 'true' || !process.env.DATABASE_URL) {
    const drama = MOCK_DRAMAS.find((d) => d.id === req.params.id);
    if (!drama) {
      res.status(404).json({ error: 'Drama not found' });
      return;
    }
    res.json(drama);
    return;
  }

  try {
    const db = getDb();
    const [drama] = await db
      .select()
      .from(dramasTable)
      .where(and(eq(dramasTable.id, String(req.params.id)), eq(dramasTable.isActive, true)))
      .limit(1);

    if (!drama) {
      res.status(404).json({ error: 'Drama not found' });
      return;
    }

    res.json(drama);
  } catch (err) {
    req.log.error(err, 'Failed to fetch drama');
    res.status(500).json({ error: 'Internal server error' });
  }
});
