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
