import { z } from 'zod';

export { z };

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive({ error: 'ID tidak valid' }),
});
