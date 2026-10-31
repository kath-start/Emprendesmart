import { z } from 'zod';

export const chatSchema = z.object({
  params: z.object({ businessId: z.string().uuid('El id debe ser un UUID válido') }),
  body: z.object({
    message: z.string().min(1).max(2000),
    history: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string().min(1).max(4000),
        }),
      )
      .max(20)
      .optional(),
  }),
});
