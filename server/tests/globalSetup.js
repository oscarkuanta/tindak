import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { assertTestDatabase } from './helpers/assertTestDatabase.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(dirname, '..');

export default function setup() {
  const env = { ...process.env };
  config({ path: path.resolve(serverDir, '../.env.test'), processEnv: env, quiet: true });
  assertTestDatabase(env.DATABASE_URL);

  execSync('npx prisma migrate deploy', {
    cwd: serverDir,
    env: { ...env, ENV_FILE: '../.env.test' },
    stdio: 'pipe',
  });
}
