import { z } from 'zod';

export { z };
export * from './auth.js';

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive({ error: 'ID tidak valid' }),
});
