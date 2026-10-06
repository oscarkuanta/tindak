import { z } from 'zod';

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);

const emailListSchema = z
  .string()
  .optional()
  .transform((value) =>
    (value ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );

const booleanFlag = z
  .enum(['true', 'false', '1', '0', ''])
  .optional()
  .transform((value) => value === 'true' || value === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z
    .string()
    .trim()
    .regex(/^mysql:\/\//, 'harus diawali mysql://'),
  SESSION_SECRET: z.string().min(32, 'minimal 32 karakter'),
  CLIENT_URL: z.url().default('http://localhost:5173'),
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  GOOGLE_CALLBACK_URL: z
    .url()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  ADMIN_EMAILS: emailListSchema,
  BOARD_ADMIN_EMAILS: emailListSchema,
  TURNSTILE_SECRET_KEY: optionalString,
  NSFW_ENABLED: booleanFlag,
  UPLOAD_DIR: optionalString,
  IP_HASH_SECRET: z.string().min(16, 'minimal 16 karakter'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
});

const GOOGLE_CREDENTIAL_KEYS = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];

export const TURNSTILE_TEST_SECRETS = Object.freeze({
  PASS: '1x0000000000000000000000000000000AA',
  FAIL: '2x0000000000000000000000000000000AA',
});

const envSchemaWithRules = envSchema.superRefine((value, ctx) => {
  if (value.NODE_ENV === 'production') {
    const secret = value.TURNSTILE_SECRET_KEY;
    if (!secret || Object.values(TURNSTILE_TEST_SECRETS).includes(secret)) {
      ctx.addIssue({
        code: 'custom',
        path: ['TURNSTILE_SECRET_KEY'],
        message: 'wajib diisi dengan secret key asli di production',
      });
    }
  }
  const filled = GOOGLE_CREDENTIAL_KEYS.filter((key) => value[key]);
  if (filled.length === 1) {
    for (const key of GOOGLE_CREDENTIAL_KEYS.filter((item) => !value[item])) {
      ctx.addIssue({
        code: 'custom',
        path: [key],
        message: 'wajib diisi jika login Google dipakai (isi keduanya atau kosongkan keduanya)',
      });
    }
  }
});

export function parseEnv(source) {
  const result = envSchemaWithRules.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map(
      (issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`,
    );
    throw new Error(
      `Konfigurasi environment tidak valid. Periksa file .env (lihat .env.example):\n${lines.join('\n')}`,
    );
  }
  const data = result.data;
  return Object.freeze({
    ...data,
    GOOGLE_CALLBACK_URL:
      data.GOOGLE_CALLBACK_URL ?? new URL('/api/auth/google/callback', data.CLIENT_URL).toString(),
    GOOGLE_ENABLED: GOOGLE_CREDENTIAL_KEYS.every((key) => data[key]),
    TURNSTILE_SECRET_KEY: data.TURNSTILE_SECRET_KEY ?? TURNSTILE_TEST_SECRETS.PASS,
  });
}

export const env = parseEnv(process.env);

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
