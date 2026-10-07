import { z } from 'zod';
import { RATING_QUICK_TAGS } from '../constants/verification.js';

const blank = (schema) => z.preprocess((value) => (value === '' ? undefined : value), schema);
const pageFields = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
};

export const ratingRequestSchema = z.strictObject({
  stars: z.coerce
    .number({ error: 'Pilih jumlah bintang' })
    .int({ error: 'Pilih jumlah bintang' })
    .min(1, 'Pilih 1 sampai 5 bintang')
    .max(5, 'Pilih 1 sampai 5 bintang'),
  quickTag: z.enum(RATING_QUICK_TAGS, { error: 'Pilihan cepat tidak dikenal' }).nullish(),
});

export const verifyBoardRequestSchema = z.strictObject({
  note: z
    .string({ error: 'Catatan wajib diisi' })
    .trim()
    .min(5, 'Catatan minimal 5 karakter')
    .max(500, 'Catatan maksimal 500 karakter'),
});

export const skipBoardRequestSchema = z.strictObject({
  note: z.string().trim().max(500, 'Catatan maksimal 500 karakter').optional(),
});

export const revokeVerificationRequestSchema = z.strictObject({
  reason: z
    .string({ error: 'Alasan wajib diisi' })
    .trim()
    .min(10, 'Alasan minimal 10 karakter')
    .max(500, 'Alasan maksimal 500 karakter'),
});

export const candidatesQuerySchema = z.object(pageFields);

export const officialBoardsQuerySchema = z.object({
  q: blank(z.string().trim().max(100).optional()),
  review: blank(z.enum(['true', 'false']).default('false')).transform((value) => value === 'true'),
  ...pageFields,
});
