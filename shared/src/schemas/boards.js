import { z } from 'zod';
import { BOARD_DEFAULT_CATEGORIES, BOARD_TYPES } from '../constants/boards.js';

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

const dangerousTargetHoursSchema = z.coerce
  .number({ error: 'Target waktu wajib berupa angka' })
  .int('Target waktu harus berupa bilangan bulat')
  .min(1, 'Target minimal 1 jam')
  .max(720, 'Target maksimal 720 jam')
  .default(48);

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
    dangerousTargetHours: dangerousTargetHoursSchema.optional(),
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
