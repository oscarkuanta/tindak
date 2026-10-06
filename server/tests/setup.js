import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const dirname = path.dirname(fileURLToPath(import.meta.url));

config({ path: path.resolve(dirname, '../../.env.test'), quiet: true });
process.env.NODE_ENV = 'test';
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `tindak-test-uploads-${process.pid}`);
process.env.NSFW_ENABLED = 'false';
delete process.env.TURNSTILE_SECRET_KEY;
process.env.ADMIN_EMAILS = 'admin@tindak.test,dobel@tindak.test';
process.env.BOARD_ADMIN_EMAILS = 'boardadmin@tindak.test,dobel@tindak.test';
delete process.env.GOOGLE_CLIENT_ID;
delete process.env.GOOGLE_CLIENT_SECRET;
delete process.env.GOOGLE_CALLBACK_URL;
