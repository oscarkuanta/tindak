import { z } from 'zod';
import {
  REPORT_DESCRIPTION_MAX,
  REPORT_DESCRIPTION_MIN,
  REPORT_LIST_MAX_PAGE_SIZE,
  REPORT_LIST_PAGE_SIZE,
  REPORT_LOCATION_MAX,
  REPORT_SEVERITIES,
  REPORT_SORTS,
  REPORT_STATUSES,
  REPORT_TITLE_MAX,
  REACTION_TYPES,
  HOME_FEED_TABS,
  TRACKING_CODE_ALPHABET,
  TRACKING_CODE_LENGTH,
} from '../constants/reports.js';

export const createReportSchema = z.object({
  title: z
    .string({ error: 'Judul laporan wajib diisi' })
    .trim()
    .min(1, 'Judul laporan wajib diisi')
    .max(REPORT_TITLE_MAX, `Judul maksimal ${REPORT_TITLE_MAX} karakter`),
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
    .min(REPORT_DESCRIPTION_MIN, `Deskripsi minimal ${REPORT_DESCRIPTION_MIN} karakter`),
  isAnonymous: z.boolean().default(false),
  turnstileToken: z.string().trim().min(1, 'Selesaikan verifikasi terlebih dahulu'),
});

const formBoolean = z.preprocess(
  (value) => {
    if (value === 'true' || value === '1' || value === 'on') return true;
    if (value === 'false' || value === '0' || value === '' || value === undefined) return false;
    return value;
  },
  z.boolean({ error: 'Nilai anonim tidak valid' }),
);

export const createReportRequestSchema = z.strictObject({
  title: createReportSchema.shape.title,
  categoryId: createReportSchema.shape.categoryId,
  severity: createReportSchema.shape.severity,
  locationDetail: createReportSchema.shape.locationDetail.max(
    REPORT_LOCATION_MAX,
    `Detail lokasi maksimal ${REPORT_LOCATION_MAX} karakter`,
  ),
  description: createReportSchema.shape.description.max(
    REPORT_DESCRIPTION_MAX,
    `Deskripsi maksimal ${REPORT_DESCRIPTION_MAX} karakter`,
  ),
  isAnonymous: formBoolean,
  turnstileToken: createReportSchema.shape.turnstileToken,
});

const emptyToUndefined = (schema) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema);

const reportPageSchema = {
  page: z.coerce.number().int().min(1, 'Halaman minimal 1').default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1, 'Jumlah per halaman minimal 1')
    .max(REPORT_LIST_MAX_PAGE_SIZE, `Jumlah per halaman maksimal ${REPORT_LIST_MAX_PAGE_SIZE}`)
    .default(REPORT_LIST_PAGE_SIZE),
};

export const boardReportsQuerySchema = z.object({
  sort: emptyToUndefined(z.enum(REPORT_SORTS, { error: 'Urutan tidak dikenal' }).default('new')),
  status: emptyToUndefined(z.enum(REPORT_STATUSES, { error: 'Status tidak dikenal' }).optional()),
  categoryId: emptyToUndefined(z.coerce.number().int().positive().optional()),
  severity: emptyToUndefined(
    z.enum(REPORT_SEVERITIES, { error: 'Tingkat bahaya tidak dikenal' }).optional(),
  ),
  q: emptyToUndefined(
    z.string().trim().min(2, 'Kata kunci minimal 2 karakter').max(100).optional(),
  ),
  ...reportPageSchema,
});

export const myReportsQuerySchema = z.object(reportPageSchema);

export const reportIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ error: 'ID laporan tidak valid' }),
});

export const trackReportParamSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .transform((value) => value.replace(/^TND-/, '').replace(/[\s-]/g, ''))
    .pipe(
      z
        .string()
        .length(TRACKING_CODE_LENGTH, 'Kode Lacak tidak valid')
        .refine(
          (value) => [...value].every((char) => TRACKING_CODE_ALPHABET.includes(char)),
          'Kode Lacak tidak valid',
        ),
    ),
});

export const trackReportQuerySchema = z.object({
  secret: z.string().trim().min(1, 'Tautan rahasia wajib disertakan').max(200),
});

export const reactionRequestSchema = z.strictObject({
  type: z.enum(REACTION_TYPES, { error: 'Pilih reaksi yang valid' }),
});

export const homeFeedQuerySchema = z.object({
  tab: emptyToUndefined(z.enum(HOME_FEED_TABS, { error: 'Tab tidak dikenal' }).default('hot')),
  ...reportPageSchema,
});
