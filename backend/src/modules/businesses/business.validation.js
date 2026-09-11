import { z } from 'zod';
import { paginationQuery } from '../../utils/validation.js';

const STATUSES = ['ACTIVE', 'INACTIVE', 'CLOSED'];
const STAGES = ['IDEA', 'EARLY', 'GROWTH', 'ESTABLISHED'];

export const listSchema = z.object({
  query: z.object({
    ...paginationQuery,
    search: z.string().optional(),
    category: z.string().optional(),
    status: z.enum(STATUSES).optional(),
    stage: z.enum(STAGES).optional(),
    entrepreneurId: z.string().uuid().optional(),
  }),
});

export const createSchema = z.object({
  body: z.object({
    entrepreneurId: z.string().uuid(),
    name: z.string().min(1).max(140),
    category: z.string().min(1).max(80),
    description: z.string().max(2000).optional(),
    stage: z.enum(STAGES).optional(),
    status: z.enum(STATUSES).optional(),
    employeesCount: z.coerce.number().int().min(0).max(100000).optional(),
    foundedAt: z.coerce.date().optional(),
  }),
});

export const updateSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z
    .object({
      name: z.string().min(1).max(140).optional(),
      category: z.string().min(1).max(80).optional(),
      description: z.string().max(2000).nullable().optional(),
      stage: z.enum(STAGES).optional(),
      status: z.enum(STATUSES).optional(),
      employeesCount: z.coerce.number().int().min(0).max(100000).optional(),
      foundedAt: z.coerce.date().nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'Debes enviar al menos un campo' }),
});

export const upsertMetricSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    period: z.coerce.date(),
    revenue: z.coerce.number().min(0).optional(),
    expenses: z.coerce.number().min(0).optional(),
    customersCount: z.coerce.number().int().min(0).optional(),
    salesCount: z.coerce.number().int().min(0).optional(),
  }),
});

export const listMetricsSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  query: z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }),
});
