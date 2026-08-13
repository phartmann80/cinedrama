import express, { type Express, type RequestHandler } from 'express';
import cors from 'cors';
import pinoHttpImport from 'pino-http';
import { logger } from './lib/logger.js';
import router from './routes/index.js';

const pinoHttp = pinoHttpImport as unknown as (opts: object) => RequestHandler;

const app: Express = express();

// Hide the Express x-powered-by header
app.disable('x-powered-by');

const allowedOrigins = (process.env.CORS_ORIGINS ?? '*').split(',').map((s) => s.trim());

app.use(
  cors({
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    credentials: true,
  }),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: { id?: unknown; method?: string; url?: string }) {
        return { id: req.id, method: req.method, url: req.url?.split('?')[0] };
      },
      res(res: { statusCode?: number }) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (_req, res) => {
  res.json({ service: 'CineDrama API', status: 'ok' });
});

app.use('/api', router);

export default app;
