import { Router, type Request, type Response } from 'express';
import { eq, ilike, or, and } from 'drizzle-orm';
import { getDb, dramasTable } from '../db/index.js';

export const dramasRouter = Router();

dramasRouter.get('/', async (req: Request, res: Response) => {
  const genre = req.query.genre as string | undefined;
  const search = req.query.search as string | undefined;
  const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10));
  const limit = Math.min(Math.max(1, parseInt((req.query.limit as string) ?? '20', 10)), 50);
  const offset = (page - 1) * limit;

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
