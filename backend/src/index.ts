import app from './app.js';
import { logger } from './lib/logger.js';

const port = Number(process.env.PORT ?? 5000);

app.listen(port, () => {
  logger.info({ port }, 'CineDrama API server listening');
});
