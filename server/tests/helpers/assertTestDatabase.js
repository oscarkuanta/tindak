export function assertTestDatabase(databaseUrl) {
  const name = databaseUrl ? new URL(databaseUrl).pathname.replace(/^\//, '') : '';
  if (!name.includes('test')) {
    throw new Error(
      `Tes dibatalkan: DATABASE_URL harus mengarah ke database tes (nama mengandung "test"), sekarang "${name || 'kosong'}". Periksa file .env.test.`,
    );
  }
}
