import { z } from 'zod';
import { paginationQuery } from '../../utils/validation.js';

export const listSchema = z.object({
  params: z.object({ businessId: z.string().uuid() }),
  query: z.object({ ...paginationQuery }),
});

export const saleIdParam = z.object({
  params: z.object({
    businessId: z.string().uuid('El id de negocio debe ser un UUID válido'),
    saleId: z.string().uuid('El id de venta debe ser un UUID válido'),
  }),
});

export const createSchema = z.object({
  params: z.object({ businessId: z.string().uuid() }),
  body: z.object({
    notes: z.string().max(500).optional(),
    paymentMethod: z.enum(['efectivo', 'yape', 'plin']).optional(),
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.coerce.number().int().min(1),
        }),
      )
      .min(1, 'La venta debe tener al menos un producto'),
  }),
});
