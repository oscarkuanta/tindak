import { z } from 'zod';

export const notificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  unread: z
    .preprocess(
      (value) => (value === '' ? undefined : value),
      z.enum(['true', 'false']).default('false'),
    )
    .transform((value) => value === 'true'),
});
