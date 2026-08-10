import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { logger } from './lib/logger.js';
import router from './routes/index.js';

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS ?? '*').split(',').map((s) => s.trim());

app.use(
  cors({
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    credentials: true,
  })
);

// ─── Logging ──────────────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split('?')[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  })
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', router);

export default app;
