import session from 'express-session';
import { env, isProduction, isTest } from './env.js';
import { prisma } from '../lib/prisma.js';
import { PrismaSessionStore } from '../lib/PrismaSessionStore.js';

export const SESSION_COOKIE_NAME = 'tindak.sid';
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export const sessionStore = new PrismaSessionStore(prisma, {
  pruneIntervalMs: isTest ? 0 : 15 * 60 * 1000,
});

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction,
  path: '/',
};

let sessionMiddleware;

export function getSessionMiddleware() {
  sessionMiddleware ??= session({
    name: SESSION_COOKIE_NAME,
    secret: env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: false,
    proxy: isProduction,
    cookie: { ...sessionCookieOptions, maxAge: SESSION_MAX_AGE_MS },
  });
  return sessionMiddleware;
}
