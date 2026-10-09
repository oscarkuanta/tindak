import { z } from 'zod';
import { FOLLOW_NOTIFY_LEVELS } from '../constants/boards.js';
import { emailSchema } from './auth.js';

export const inviteHandlerSchema = z.object({ email: emailSchema });

export const followNotifyLevelSchema = z.object({
  notifyLevel: z.enum(FOLLOW_NOTIFY_LEVELS, { error: 'Pilih pengaturan notifikasi yang valid' }),
});

export const transferOwnershipSchema = z.object({
  userId: z.coerce.number().int().positive({ error: 'Penindak tujuan tidak valid' }),
});

export const inviteHandlerRequestSchema = z
  .strictObject({
    email: emailSchema.optional(),
    userId: z.coerce.number().int().positive({ error: 'Akun tidak valid' }).optional(),
  })
  .refine((value) => Boolean(value.email) !== Boolean(value.userId), {
    message: 'Pilih akun dari daftar atau isi email',
    path: ['email'],
  });

export const handlerCandidateQuerySchema = z.object({
  q: z.string().trim().min(2, 'Ketik minimal 2 karakter').max(80, 'Maksimal 80 karakter'),
});

export const followNotifyLevelRequestSchema = z.strictObject({
  notifyLevel: followNotifyLevelSchema.shape.notifyLevel,
});

export const transferOwnershipRequestSchema = z.strictObject({
  userId: transferOwnershipSchema.shape.userId,
});

export const boardMemberParamSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  userId: z.coerce.number().int().positive({ error: 'ID pengguna tidak valid' }),
});

export const invitationParamSchema = z.object({
  id: z.coerce.number().int().positive({ error: 'ID undangan tidak valid' }),
});
