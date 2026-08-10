import { Router } from 'express';
import { dramasRouter } from './dramas.js';
import { episodesRouter } from './episodes.js';
import { userRouter } from './user.js';

const router = Router();

// Health check
router.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// CineDrama API v1
router.use('/v1/dramas', dramasRouter);
// episodesRouter uses mergeParams to access :id from dramasRouter
router.use('/v1/dramas/:id/episodes', episodesRouter);
router.use('/v1/user', userRouter);

export default router;
