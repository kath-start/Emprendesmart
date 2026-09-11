import { z } from 'zod';

/** Query de paginación reutilizable. */
export const paginationQuery = {
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
};

export const idParam = z.object({
  params: z.object({ id: z.string().uuid('El id debe ser un UUID válido') }),
});

/** Convierte ?sort=campo&order=asc en { campo: 'asc' } validando contra una lista blanca. */
export function buildOrderBy(query, allowed, fallback = { createdAt: 'desc' }) {
  const { sort, order } = query ?? {};
  if (sort && allowed.includes(sort)) {
    return { [sort]: order === 'asc' ? 'asc' : 'desc' };
  }
  return fallback;
}
