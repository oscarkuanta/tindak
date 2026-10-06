import bcrypt from 'bcryptjs';
import { prisma } from '../../src/lib/prisma.js';
import { assertTestDatabase } from './assertTestDatabase.js';

export async function resetDatabase() {
  assertTestDatabase(process.env.DATABASE_URL);
  await prisma.session.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.ban.deleteMany();
  await prisma.flag.deleteMany();
  await prisma.reportEvent.deleteMany();
  await prisma.reportMedia.deleteMany();
  await prisma.report.deleteMany();
  await prisma.boardFollower.deleteMany();
  await prisma.category.deleteMany();
  await prisma.boardMember.deleteMany();
  await prisma.board.deleteMany();
  await prisma.user.deleteMany();
}

export async function createUser(overrides = {}) {
  const { password = 'rahasia123', ...data } = overrides;
  return prisma.user.create({
    data: {
      name: 'Budi Santoso',
      email: 'budi@example.com',
      passwordHash: password === null ? null : await bcrypt.hash(password, 4),
      ...data,
    },
  });
}
