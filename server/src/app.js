import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env, isProduction } from './config/env.js';
import { logger } from './lib/logger.js';
import { apiRouter } from './routes.js';
import { apiLimiter } from './middlewares/rateLimit.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';

export function createApp() {
  const app = express();

  if (isProduction) app.set('trust proxy', 1);

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(
    pinoHttp({
      logger,
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use('/api', apiLimiter, apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
