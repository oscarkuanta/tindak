import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const dirname = path.dirname(fileURLToPath(import.meta.url));

config({ path: path.resolve(dirname, '../../.env.test'), quiet: true });
process.env.NODE_ENV = 'test';
