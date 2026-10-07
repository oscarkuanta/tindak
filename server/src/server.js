import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { sessionStore } from './config/session.js';
import { startJobs } from './jobs/index.js';
import { attachSocketServer } from './modules/realtime/socket.js';

const app = createApp();

const jobs = env.JOBS_ENABLED ? startJobs() : null;

const server = app.listen(env.PORT, () => {
  logger.info(`Server T!indak berjalan di http://localhost:${env.PORT}`);
});
const io = attachSocketServer(server);

async function shutdown(signal) {
  logger.info(`${signal} diterima, menutup server`);
  io.close(async () => {
    jobs?.stop();
    sessionStore.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
