import { z } from 'zod';
import {
  REPORT_REJECTION_REASONS,
  REPORT_HANDLING_STATUSES,
} from '../constants/report-handling.js';

const optionalGuestCredentials = {
  trackingCode: z.string().trim().length(8, { error: 'Kode Lacak harus 8 karakter' }).optional(),
  secret: z.string().min(1, { error: 'Tautan lacak tidak valid' }).optional(),
};

export const reportQueueFiltersSchema = z.object({
  status: z.enum(Object.values(REPORT_HANDLING_STATUSES)).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'DANGEROUS']).optional(),
  assigneeId: z.coerce.number().int().positive().optional(),
  overdue: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});

export const processReportSchema = z.object({
  assigneeId: z.coerce.number().int().positive().nullable().optional(),
});

export const requestReportInfoSchema = z.object({
  question: z.string().trim().min(1, { error: 'Pertanyaan wajib diisi' }).max(1000),
});

export const answerReportInfoSchema = z.object({
  answer: z.string().trim().min(1, { error: 'Jawaban wajib diisi' }).max(2000),
  ...optionalGuestCredentials,
});

export const rejectReportSchema = z
  .object({
    reason: z.enum(Object.values(REPORT_REJECTION_REASONS)),
    note: z.string().trim().max(2000).optional().default(''),
  })
  .superRefine((value, context) => {
    if (value.reason === REPORT_REJECTION_REASONS.OTHER && !value.note) {
      context.addIssue({
        code: 'custom',
        path: ['note'],
        message: 'Catatan wajib diisi untuk alasan Lainnya',
      });
    }
  });

export const duplicateReportSchema = z.object({
  parentId: z.coerce.number().int().positive({ error: 'Pilih laporan induk' }),
});

export const resolveReportSchema = z.object({
  note: z.string().trim().min(1, { error: 'Catatan wajib diisi' }).max(2000),
});

export const confirmReportSchema = z
  .object({
    result: z.enum(['resolved', 'not_resolved']),
    note: z.string().trim().max(2000).optional().default(''),
    ...optionalGuestCredentials,
  })
  .superRefine((value, context) => {
    if (value.result === 'not_resolved' && !value.note) {
      context.addIssue({
        code: 'custom',
        path: ['note'],
        message: 'Jelaskan bagian yang belum beres',
      });
    }
    if (Boolean(value.trackingCode) !== Boolean(value.secret)) {
      context.addIssue({
        code: 'custom',
        path: ['secret'],
        message: 'Kode Lacak dan tautan rahasia harus dikirim bersama',
      });
    }
  });
