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
  assigneeId: z.coerce
    .number({ error: 'Pilih penanggung jawab dulu' })
    .int()
    .positive({ error: 'Pilih penanggung jawab dulu' })
    .optional(),
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

const strictGuestCredentials = {
  trackingCode: z
    .string()
    .trim()
    .toUpperCase()
    .transform((value) => value.replace(/^TND-/, '').replace(/[\s-]/g, ''))
    .pipe(z.string().length(8, { error: 'Kode Lacak harus 8 karakter' }))
    .optional(),
  secret: z.string().trim().min(1, { error: 'Tautan lacak tidak valid' }).max(200).optional(),
};

function requireCredentialPair(value, context) {
  if (Boolean(value.trackingCode) !== Boolean(value.secret)) {
    context.addIssue({
      code: 'custom',
      path: ['secret'],
      message: 'Kode Lacak dan tautan rahasia harus dikirim bersama',
    });
  }
}

export const processReportRequestSchema = z.strictObject({
  assigneeId: processReportSchema.shape.assigneeId,
});

export const requestInfoRequestSchema = z.strictObject({
  question: requestReportInfoSchema.shape.question,
});

export const answerInfoRequestSchema = z
  .strictObject({ answer: answerReportInfoSchema.shape.answer, ...strictGuestCredentials })
  .superRefine(requireCredentialPair);

export const rejectReportRequestSchema = z
  .strictObject({
    reason: z.enum(Object.values(REPORT_REJECTION_REASONS), { error: 'Pilih alasan penolakan' }),
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

export const duplicateReportRequestSchema = z.strictObject({
  parentId: duplicateReportSchema.shape.parentId,
});

export const resolveReportRequestSchema = z.strictObject({
  note: resolveReportSchema.shape.note,
});

export const confirmReportRequestSchema = z
  .strictObject({
    result: z.enum(['resolved', 'not_resolved'], { error: 'Pilih Sudah Beres atau Belum Beres' }),
    note: z.string().trim().max(2000).optional().default(''),
    ...strictGuestCredentials,
  })
  .superRefine((value, context) => {
    if (value.result === 'not_resolved' && !value.note) {
      context.addIssue({
        code: 'custom',
        path: ['note'],
        message: 'Jelaskan bagian yang belum beres',
      });
    }
    requireCredentialPair(value, context);
  });

export const reportQueueQuerySchema = z.object({
  status: z.preprocess(
    (value) => (value === '' ? undefined : value),
    reportQueueFiltersSchema.shape.status,
  ),
  categoryId: z.preprocess(
    (value) => (value === '' ? undefined : value),
    reportQueueFiltersSchema.shape.categoryId,
  ),
  severity: z.preprocess(
    (value) => (value === '' ? undefined : value),
    reportQueueFiltersSchema.shape.severity,
  ),
  assigneeId: z.preprocess(
    (value) => (value === '' ? undefined : value),
    reportQueueFiltersSchema.shape.assigneeId,
  ),
  overdue: z.preprocess(
    (value) => (value === '' ? undefined : value),
    reportQueueFiltersSchema.shape.overdue,
  ),
  sort: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.enum(['priority', 'hot', 'new'], { error: 'Urutan tidak dikenal' }).default('priority'),
  ),
  page: reportQueueFiltersSchema.shape.page,
  pageSize: reportQueueFiltersSchema.shape.pageSize,
});
