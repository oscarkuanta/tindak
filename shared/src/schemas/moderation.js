import { z } from 'zod';
import {
  BAN_DURATIONS,
  BAN_TARGET_TYPES,
  BOARD_FLAG_REASONS,
  FLAG_REASON_ORDER,
  FLAG_STATUSES,
  FLAG_TARGET_TYPES,
  IP_BAN_DURATIONS,
  REPORT_FLAG_REASONS,
} from '../constants/moderation.js';
import { BOARD_STATUSES } from '../constants/boards.js';

const USER_FLAG_REASONS = [...new Set([...REPORT_FLAG_REASONS, ...BOARD_FLAG_REASONS])];
const blank = (schema) => z.preprocess((value) => (value === '' ? undefined : value), schema);
const pageFields = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
};

export const createFlagRequestSchema = z
  .strictObject({
    targetType: z.enum(FLAG_TARGET_TYPES, { error: 'Target tidak dikenal' }),
    targetId: z.coerce.number().int().positive({ error: 'Target tidak valid' }),
    reason: z.enum(USER_FLAG_REASONS, { error: 'Pilih alasan pelanggaran' }),
    note: z.string().trim().max(500, 'Catatan maksimal 500 karakter').optional(),
  })
  .superRefine((value, context) => {
    const allowed = value.targetType === 'BOARD' ? BOARD_FLAG_REASONS : REPORT_FLAG_REASONS;
    if (!allowed.includes(value.reason)) {
      context.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'Alasan ini tidak berlaku untuk target tersebut',
      });
    }
  });

const banFields = {
  targetType: z.enum(BAN_TARGET_TYPES, { error: 'Pilih target ban' }),
  duration: z.enum(Object.keys(BAN_DURATIONS), { error: 'Pilih durasi ban' }),
  reason: z.string().trim().min(3, 'Alasan minimal 3 karakter').max(500),
};

function ipDurationRule(value, context, path = []) {
  if (value.targetType === 'IP' && !IP_BAN_DURATIONS.includes(value.duration)) {
    context.addIssue({
      code: 'custom',
      path: [...path, 'duration'],
      message: 'Ban IP hanya boleh 1 hari atau 7 hari',
    });
  }
}

export const createBanRequestSchema = z
  .strictObject({
    ...banFields,
    reportId: z.coerce.number().int().positive().optional(),
    userId: z.coerce.number().int().positive().optional(),
  })
  .superRefine((value, context) => {
    ipDurationRule(value, context);
    const needsReport = value.targetType !== 'USER';
    if (needsReport && !value.reportId) {
      context.addIssue({
        code: 'custom',
        path: ['reportId'],
        message: 'Ban perangkat atau IP dibuat dari laporan',
      });
    }
    if (!needsReport && !value.reportId && !value.userId) {
      context.addIssue({ code: 'custom', path: ['userId'], message: 'Pilih user atau laporan' });
    }
  });

export const removeReportRequestSchema = z
  .strictObject({
    note: z.string().trim().max(500).optional(),
    ban: z.strictObject(banFields).optional(),
  })
  .superRefine((value, context) => {
    if (value.ban) ipDurationRule(value.ban, context, ['ban']);
  });

export const moderationNoteRequestSchema = z.strictObject({
  note: z.string().trim().max(500).optional(),
});

export const freezeBoardRequestSchema = z.strictObject({
  reason: z.string().trim().min(3, 'Alasan minimal 3 karakter').max(500),
});

export const moderationQuerySchema = z.object({
  status: blank(z.enum(FLAG_STATUSES).default('OPEN')),
  reason: blank(z.enum(FLAG_REASON_ORDER).optional()),
  targetType: blank(z.enum(FLAG_TARGET_TYPES).optional()),
  ...pageFields,
});

export const adminListQuerySchema = z.object({
  q: blank(z.string().trim().max(100).optional()),
  ...pageFields,
});

export const adminBoardsQuerySchema = adminListQuerySchema.extend({
  status: blank(z.enum(BOARD_STATUSES).optional()),
});

export const adminBansQuerySchema = z.object({
  active: blank(z.enum(['true', 'false']).default('true')).transform((value) => value === 'true'),
  ...pageFields,
});

export const auditLogQuerySchema = z.object({
  action: blank(z.string().trim().max(60).optional()),
  actorUserId: blank(z.coerce.number().int().positive().optional()),
  targetType: blank(z.string().trim().max(30).optional()),
  ...pageFields,
});
