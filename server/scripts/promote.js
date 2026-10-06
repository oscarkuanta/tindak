import { prisma } from '../src/lib/prisma.js';
import { promoteUser } from '../src/modules/auth/auth.service.js';

export async function runPromoteScript(role, scriptName) {
  const email = process.argv[2];

  if (!email) {
    process.stderr.write(`Cara pakai: npm run ${scriptName} -- email@contoh.com
`);
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  try {
    const user = await promoteUser(email, role);
    process.stdout.write(`Berhasil: ${user.email} sekarang ${role}
`);
  } catch (error) {
    process.stderr.write(`Gagal: ${error.message}
`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
