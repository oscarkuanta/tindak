import { z } from 'zod';
import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
} from '../constants/auth.js';

const byteLength = (value) => new TextEncoder().encode(value).length;

export const emailSchema = z
  .string({ error: 'Email wajib diisi' })
  .trim()
  .toLowerCase()
  .min(1, 'Email wajib diisi')
  .max(EMAIL_MAX_LENGTH, `Email maksimal ${EMAIL_MAX_LENGTH} karakter`)
  .pipe(z.email({ error: 'Format email tidak valid' }));

export const passwordSchema = z
  .string({ error: 'Password wajib diisi' })
  .min(PASSWORD_MIN_LENGTH, `Password minimal ${PASSWORD_MIN_LENGTH} karakter`)
  .refine((value) => byteLength(value) <= PASSWORD_MAX_BYTES, 'Password terlalu panjang')
  .refine((value) => /\p{L}/u.test(value), 'Password harus mengandung minimal 1 huruf')
  .refine((value) => /\p{N}/u.test(value), 'Password harus mengandung minimal 1 angka');

export const nameSchema = z
  .string({ error: 'Nama wajib diisi' })
  .trim()
  .min(NAME_MIN_LENGTH, `Nama minimal ${NAME_MIN_LENGTH} karakter`)
  .max(NAME_MAX_LENGTH, `Nama maksimal ${NAME_MAX_LENGTH} karakter`);

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: 'Password wajib diisi' })
    .min(1, 'Password wajib diisi')
    .refine((value) => byteLength(value) <= PASSWORD_MAX_BYTES, 'Password terlalu panjang'),
});
