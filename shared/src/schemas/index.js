import { z } from 'zod';

export { z };
export * from './auth.js';
export * from './boards.js';
export * from './handlers.js';
export * from './report-handling.js';

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive({ error: 'ID tidak valid' }),
});
