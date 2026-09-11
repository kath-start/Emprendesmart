import { z } from 'zod';
import { paginationQuery } from '../../utils/validation.js';

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'ANALYST'];
const STATUSES = ['ACTIVE', 'INACTIVE'];

export const listAdminsSchema = z.object({
  query: z.object({
    ...paginationQuery,
    search: z.string().optional(),
    role: z.enum(ROLES).optional(),
    status: z.enum(STATUSES).optional(),
  }),
});

export const createAdminSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    password: z.string().min(8).max(72),
    role: z.enum(ROLES).optional(),
  }),
});

export const updateAdminSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z
    .object({
      name: z.string().min(2).max(120).optional(),
      role: z.enum(ROLES).optional(),
      status: z.enum(STATUSES).optional(),
      password: z.string().min(8).max(72).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'Debes enviar al menos un campo' }),
});
