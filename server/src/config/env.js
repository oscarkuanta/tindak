import { z } from 'zod';

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);

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
  ADMIN_EMAILS: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? '')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  TURNSTILE_SECRET_KEY: optionalString,
  IP_HASH_SECRET: z.string().min(16, 'minimal 16 karakter'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
});

export function parseEnv(source) {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map(
      (issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`,
    );
    throw new Error(
      `Konfigurasi environment tidak valid. Periksa file .env (lihat .env.example):\n${lines.join('\n')}`,
    );
  }
  return Object.freeze(result.data);
}

export const env = parseEnv(process.env);

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
