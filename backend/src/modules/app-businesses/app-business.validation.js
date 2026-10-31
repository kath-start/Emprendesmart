import { z } from 'zod';
import { paginationQuery } from '../../utils/validation.js';

const STAGES = ['IDEA', 'EARLY', 'GROWTH', 'ESTABLISHED'];
const STATUSES = ['ACTIVE', 'INACTIVE', 'CLOSED'];

export const listSchema = z.object({
  query: z.object({ ...paginationQuery }),
});

export const idParam = z.object({
  params: z.object({ businessId: z.string().uuid('El id debe ser un UUID válido') }),
});

export const createSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(140),
    category: z.string().min(1).max(80),
    description: z.string().max(2000).optional(),
    stage: z.enum(STAGES).optional(),
    employeesCount: z.coerce.number().int().min(0).max(100000).optional(),
    foundedAt: z.coerce.date().optional(),
  }),
});

const money = z.coerce.number().min(0).max(100_000_000);
const shortText = z.string().max(500);

/** Plan de lanzamiento de la etapa IDEA; cada sección es opcional porque se llena por pasos. */
const ideaPlanSchema = z.object({
  customer: z.object({ who: shortText.optional(), problem: shortText.optional() }).optional(),
  pricing: z
    .object({ unitCost: money.optional(), marginPercent: z.coerce.number().min(0).max(1000).optional() })
    .optional(),
  investment: z
    .object({
      initial: money.optional(),
      monthlyFixed: money.optional(),
      unitPrice: money.optional(),
      unitCost: money.optional(),
    })
    .optional(),
  channels: z.object({ selected: z.array(z.string().max(40)).max(20).optional(), note: shortText.optional() }).optional(),
});

export const updateSchema = z.object({
  params: z.object({ businessId: z.string().uuid() }),
  body: z
    .object({
      name: z.string().min(1).max(140).optional(),
      category: z.string().min(1).max(80).optional(),
      description: z.string().max(2000).nullable().optional(),
      stage: z.enum(STAGES).optional(),
      status: z.enum(STATUSES).optional(),
      employeesCount: z.coerce.number().int().min(0).max(100000).optional(),
      foundedAt: z.coerce.date().nullable().optional(),
      ideaPlan: ideaPlanSchema.nullable().optional(),
      monthlySalesGoal: money.nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'Debes enviar al menos un campo' }),
});
