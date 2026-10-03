import { prisma } from '../src/lib/prisma.js';
import { logger } from '../src/lib/logger.js';

async function main() {
  logger.info('Seed selesai, belum ada data untuk diisi');
}

try {
  await main();
} catch (error) {
  logger.error({ err: error }, 'Seed gagal');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
