import app from './app.js';
import { logger } from './lib/logger.js';

const port = Number(process.env.PORT ?? 5000);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
}

// Production DB guard: fail fast if DATABASE_URL is missing in production
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  logger.error('FATAL: DATABASE_URL is required in production. Set DATABASE_URL environment variable.');
  process.exit(1);
}

// Production CORS guard: fail fast if CORS_ORIGINS is missing in production
if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGINS) {
  logger.error('FATAL: CORS_ORIGINS is required in production. Set CORS_ORIGINS environment variable.');
  process.exit(1);
}

app.listen(port, () => {
  logger.info({ port }, 'CineDrama API server listening');
});
