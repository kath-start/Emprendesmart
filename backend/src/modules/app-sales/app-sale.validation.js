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
    // Hora real de una venta hecha sin internet en la app y subida después (máx. 7 días atrás).
    soldAt: z.coerce
      .date()
      .refine((d) => d.getTime() <= Date.now() + 5 * 60 * 1000, 'La fecha de venta no puede ser futura')
      .refine((d) => d.getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000, 'La venta es de hace más de 7 días')
      .optional(),
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
