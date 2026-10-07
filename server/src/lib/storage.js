import path from 'node:path';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomToken } from '../utils/crypto.js';
import { env } from '../config/env.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export const UPLOAD_ROUTE = '/api/uploads';
export const uploadDir = path.resolve(env.UPLOAD_DIR ?? path.join(dirname, '../../uploads'));

export async function saveFile(buffer, extension) {
  await mkdir(uploadDir, { recursive: true });
  const key = `${Date.now().toString(36)}-${randomToken(12)}.${extension}`;
  await writeFile(path.join(uploadDir, key), buffer);
  return { key, url: `${UPLOAD_ROUTE}/${key}` };
}

export async function removeFile(key) {
  if (!key || key.includes('/') || key.includes('\\')) return;
  await rm(path.join(uploadDir, key), { force: true });
}
