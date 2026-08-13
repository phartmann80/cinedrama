import { Router } from 'express';
import { dramasRouter } from './dramas.js';
import { episodesRouter } from './episodes.js';
import { userRouter } from './user.js';
import { mediaRouter } from './media.js';

const router = Router();

router.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/v1/dramas', dramasRouter);
router.use('/v1/dramas/:id/episodes', episodesRouter);
router.use('/v1/user', userRouter);
router.use('/v1/media', mediaRouter);

export default router;
