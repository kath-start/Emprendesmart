import { z } from 'zod';

export const rangeSchema = z.object({
  query: z.object({
    months: z.coerce.number().int().min(1).max(36).optional(),
  }),
});
