import { z } from 'zod';
import { STATS_DEFAULT_RANGE, STATS_EXPORT_FORMATS, STATS_RANGES } from '../constants/stats.js';

const rangeSchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z
    .enum(Object.keys(STATS_RANGES), { error: 'Rentang waktu harus 7d, 30d, atau 90d' })
    .default(STATS_DEFAULT_RANGE),
);

export const boardStatsQuerySchema = z.object({ range: rangeSchema });

export const boardExportQuerySchema = z.object({
  range: rangeSchema,
  format: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.enum(STATS_EXPORT_FORMATS, { error: 'Format ekspor harus csv' }).default('csv'),
  ),
});
