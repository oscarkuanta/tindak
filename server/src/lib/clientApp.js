import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

export const defaultClientDir = fileURLToPath(new URL('../../../client/dist', import.meta.url));

const SERVER_PATHS = /^\/(api|uploads|socket\.io)(\/|$)/;

export const contentSecurityPolicy = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", 'https://challenges.cloudflare.com'],
    frameSrc: ['https://challenges.cloudflare.com'],
    imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
    connectSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
  },
};

export function hasClientBuild(dir = defaultClientDir) {
  return existsSync(path.join(dir, 'index.html'));
}

export function serveClient(app, dir = defaultClientDir) {
  if (!hasClientBuild(dir)) return false;
  const indexFile = path.join(dir, 'index.html');
  app.use(express.static(dir, { index: false, maxAge: '1h' }));
  app.get(/.*/, (req, res, next) => {
    if (SERVER_PATHS.test(req.path)) return next();
    res.sendFile(indexFile);
  });
  return true;
}
