import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env, isProduction } from './config/env.js';
import { logger } from './lib/logger.js';
import { getSessionMiddleware } from './config/session.js';
import { configurePassport } from './config/passport.js';
import { createApiRouter } from './routes.js';
import { createRateLimiter } from './middlewares/rateLimit.js';
import { attachUser } from './middlewares/auth.js';
import { createVerifyOrigin } from './middlewares/verifyOrigin.js';
import { UPLOAD_ROUTE, uploadDir } from './lib/storage.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { contentSecurityPolicy, serveClient } from './lib/clientApp.js';

export function createApp({ clientDir = isProduction ? undefined : null } = {}) {
  const app = express();
  const passport = configurePassport();

  if (isProduction) app.set('trust proxy', 1);

  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy }));
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
  app.use(createVerifyOrigin(env.CLIENT_URL));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use(getSessionMiddleware());
  app.use(passport.initialize());
  app.use(attachUser);

  app.use(
    UPLOAD_ROUTE,
    express.static(uploadDir, { immutable: true, maxAge: '30d', fallthrough: false, index: false }),
  );

  app.use('/api', createRateLimiter({ windowMs: 60_000, limit: 300 }), createApiRouter());

  if (clientDir !== null) serveClient(app, clientDir);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
