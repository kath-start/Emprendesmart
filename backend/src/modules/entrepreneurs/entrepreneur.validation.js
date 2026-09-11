import { z } from 'zod';
import { paginationQuery } from '../../utils/validation.js';

const STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
const PLANS = ['FREE', 'PRO', 'BUSINESS'];

export const listSchema = z.object({
  query: z.object({
    ...paginationQuery,
    search: z.string().optional(),
    status: z.enum(STATUSES).optional(),
    plan: z.enum(PLANS).optional(),
    country: z.string().optional(),
    registeredFrom: z.coerce.date().optional(),
    registeredTo: z.coerce.date().optional(),
  }),
});

export const createSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(80),
    lastName: z.string().min(1).max(80),
    email: z.string().email(),
    phone: z.string().max(30).optional(),
    country: z.string().max(80).optional(),
    city: z.string().max(80).optional(),
    plan: z.enum(PLANS).optional(),
    status: z.enum(STATUSES).optional(),
  }),
});

export const updateSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z
    .object({
      firstName: z.string().min(1).max(80).optional(),
      lastName: z.string().min(1).max(80).optional(),
      email: z.string().email().optional(),
      phone: z.string().max(30).nullable().optional(),
      country: z.string().max(80).nullable().optional(),
      city: z.string().max(80).nullable().optional(),
      plan: z.enum(PLANS).optional(),
      status: z.enum(STATUSES).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'Debes enviar al menos un campo' }),
});

export const changeStatusSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ status: z.enum(STATUSES) }),
});
