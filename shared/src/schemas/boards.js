import { z } from 'zod';
import {
  BOARD_DEFAULT_CATEGORIES,
  BOARD_SEARCH_MAX_PAGE_SIZE,
  BOARD_SEARCH_PAGE_SIZE,
  BOARD_TYPES,
  BOARD_VERIFICATIONS,
} from '../constants/boards.js';
import { CITY_NAMES } from '../constants/cities.js';

const boardNameSchema = z
  .string({ error: 'Nama Board wajib diisi' })
  .trim()
  .min(3, 'Nama Board minimal 3 karakter')
  .max(80, 'Nama Board maksimal 80 karakter');

const boardCitySchema = z
  .string({ error: 'Kota wajib dipilih' })
  .trim()
  .min(1, 'Kota wajib dipilih');

const boardTypeSchema = z.enum(BOARD_TYPES, { error: 'Jenis Board wajib dipilih' });

const managerTitleSchema = z
  .string()
  .trim()
  .max(80, 'Jabatan pengelola maksimal 80 karakter')
  .optional();

const boardDescriptionSchema = z
  .string({ error: 'Deskripsi dan cakupan wajib diisi' })
  .trim()
  .min(20, 'Deskripsi minimal 20 karakter')
  .max(1000, 'Deskripsi maksimal 1000 karakter');

const extraCategoriesSchema = z
  .array(
    z
      .string()
      .trim()
      .min(2, 'Nama kategori minimal 2 karakter')
      .max(40, 'Nama kategori maksimal 40 karakter'),
  )
  .max(10, 'Maksimal 10 kategori tambahan')
  .default([]);

const dangerousTargetHoursValueSchema = z.coerce
  .number({ error: 'Target waktu wajib berupa angka' })
  .int('Target waktu harus berupa bilangan bulat')
  .min(1, 'Target minimal 1 jam')
  .max(720, 'Target maksimal 720 jam');

const dangerousTargetHoursSchema = dangerousTargetHoursValueSchema.default(48);

export const boardIdentitySchema = z.object({
  name: boardNameSchema,
  city: boardCitySchema,
  type: boardTypeSchema,
});

export const boardAboutSchema = z.object({
  managerTitle: managerTitleSchema,
  description: boardDescriptionSchema,
});

export const boardSettingsSchema = z.object({
  extraCategories: extraCategoriesSchema,
  dangerousTargetHours: dangerousTargetHoursSchema,
});

export const createBoardSchema = boardIdentitySchema
  .extend(boardAboutSchema.shape)
  .extend(boardSettingsSchema.shape)
  .superRefine((value, context) => {
    const names = [...BOARD_DEFAULT_CATEGORIES[value.type], ...value.extraCategories].map((name) =>
      name.toLocaleLowerCase('id-ID'),
    );
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);

    if (duplicates.length > 0) {
      context.addIssue({
        code: 'custom',
        path: ['extraCategories'],
        message: 'Kategori tambahan tidak boleh sama dengan kategori lain',
      });
    }
  });

export const updateBoardSchema = z
  .object({
    name: boardNameSchema.optional(),
    managerTitle: managerTitleSchema,
    description: boardDescriptionSchema.optional(),
    dangerousTargetHours: dangerousTargetHoursValueSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Pilih setidaknya satu informasi untuk diubah',
  });

export const boardCategorySchema = z.object({
  name: z
    .string({ error: 'Nama kategori wajib diisi' })
    .trim()
    .min(2, 'Nama kategori minimal 2 karakter')
    .max(40, 'Nama kategori maksimal 40 karakter'),
});

const CITY_NAME_SET = new Set(CITY_NAMES);

const officialCitySchema = boardCitySchema.refine((value) => CITY_NAME_SET.has(value), {
  message: 'Kota tidak dikenal, pilih dari daftar kota',
});

const categoryNameSchema = boardCategorySchema.shape.name;

function rejectDuplicateCategories(value, context) {
  const names = [...BOARD_DEFAULT_CATEGORIES[value.type], ...value.extraCategories].map((name) =>
    name.toLocaleLowerCase('id-ID'),
  );
  if (names.some((name, index) => names.indexOf(name) !== index)) {
    context.addIssue({
      code: 'custom',
      path: ['extraCategories'],
      message: 'Kategori tambahan tidak boleh sama dengan kategori lain',
    });
  }
}

export const createBoardRequestSchema = z
  .strictObject({
    name: boardNameSchema,
    city: officialCitySchema,
    type: boardTypeSchema,
    managerTitle: managerTitleSchema,
    description: boardDescriptionSchema,
    extraCategories: extraCategoriesSchema,
    dangerousTargetHours: dangerousTargetHoursSchema,
  })
  .superRefine(rejectDuplicateCategories);

export const updateBoardRequestSchema = z
  .strictObject({
    name: boardNameSchema.optional(),
    managerTitle: z
      .string()
      .trim()
      .max(80, 'Jabatan pengelola maksimal 80 karakter')
      .nullable()
      .optional()
      .transform((value) => (value === '' ? null : value)),
    description: boardDescriptionSchema.optional(),
    dangerousTargetHours: dangerousTargetHoursValueSchema.optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: 'Pilih setidaknya satu informasi untuk diubah',
  });

const pageSchema = z.coerce.number().int().min(1, 'Halaman minimal 1').default(1);

const optionalText = (schema) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    schema,
  );

export const boardSearchQuerySchema = z.object({
  q: optionalText(
    z
      .string()
      .trim()
      .min(2, 'Kata kunci minimal 2 karakter')
      .max(80, 'Kata kunci maksimal 80 karakter')
      .optional(),
  ),
  city: optionalText(officialCitySchema.optional()),
  type: optionalText(boardTypeSchema.optional()),
  verification: optionalText(
    z.enum(BOARD_VERIFICATIONS, { error: 'Status verifikasi tidak dikenal' }).optional(),
  ),
  page: pageSchema,
  pageSize: z.coerce
    .number()
    .int()
    .min(1, 'Jumlah per halaman minimal 1')
    .max(BOARD_SEARCH_MAX_PAGE_SIZE, `Jumlah per halaman maksimal ${BOARD_SEARCH_MAX_PAGE_SIZE}`)
    .default(BOARD_SEARCH_PAGE_SIZE),
});

export const similarBoardQuerySchema = z.object({
  name: boardNameSchema,
  city: officialCitySchema,
});

export const citySearchQuerySchema = z.object({
  q: optionalText(z.string().trim().max(80, 'Kata kunci maksimal 80 karakter').optional()),
});

export const boardSlugParamSchema = z.object({
  slug: z.string().trim().min(1).max(120),
});

export const boardCategoryParamSchema = boardSlugParamSchema.extend({
  id: z.coerce.number().int().positive({ error: 'ID kategori tidak valid' }),
});

export const createCategoryRequestSchema = z.strictObject({ name: categoryNameSchema });

export const updateCategoryRequestSchema = z
  .strictObject({
    name: categoryNameSchema.optional(),
    sortOrder: z.coerce
      .number({ error: 'Urutan wajib berupa angka' })
      .int('Urutan harus bilangan bulat')
      .min(0, 'Urutan minimal 0')
      .optional(),
  })
  .refine((value) => value.name !== undefined || value.sortOrder !== undefined, {
    message: 'Kirim nama atau urutan kategori',
  });

export const reorderCategoriesRequestSchema = z.strictObject({
  categoryIds: z
    .array(z.coerce.number().int().positive({ error: 'ID kategori tidak valid' }), {
      error: 'Daftar kategori wajib diisi',
    })
    .min(1, 'Daftar kategori tidak boleh kosong')
    .refine((ids) => new Set(ids).size === ids.length, 'ID kategori tidak boleh duplikat'),
});
