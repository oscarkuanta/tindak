import pino from 'pino';
import { env, isTest } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL ?? (isTest ? 'silent' : 'info'),
  redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
});
