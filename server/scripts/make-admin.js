import { prisma } from '../src/lib/prisma.js';
import { promoteToAdmin } from '../src/modules/auth/auth.service.js';

const email = process.argv[2];

if (!email) {
  process.stderr.write('Cara pakai: npm run make-admin -- email@contoh.com\n');
  process.exit(1);
}

try {
  const user = await promoteToAdmin(email);
  process.stdout.write(`Berhasil: ${user.email} sekarang ADMIN\n`);
} catch (error) {
  process.stderr.write(`Gagal: ${error.message}\n`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
