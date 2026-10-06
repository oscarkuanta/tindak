import { z } from 'zod';
import { REPORT_SEVERITIES } from '../constants/reports.js';

export const createReportSchema = z.object({
  title: z
    .string({ error: 'Judul laporan wajib diisi' })
    .trim()
    .min(1, 'Judul laporan wajib diisi')
    .max(100, 'Judul maksimal 100 karakter'),
  categoryId: z.coerce.number({ error: 'Kategori wajib dipilih' }).int().positive({
    error: 'Kategori wajib dipilih',
  }),
  severity: z.enum(REPORT_SEVERITIES, { error: 'Tingkat bahaya wajib dipilih' }),
  locationDetail: z
    .string({ error: 'Detail lokasi wajib diisi' })
    .trim()
    .min(1, 'Detail lokasi wajib diisi'),
  description: z
    .string({ error: 'Deskripsi wajib diisi' })
    .trim()
    .min(20, 'Deskripsi minimal 20 karakter'),
  isAnonymous: z.boolean().default(false),
  turnstileToken: z.string().trim().min(1, 'Selesaikan verifikasi terlebih dahulu'),
});
