import { z } from 'zod';
import { paginationQuery } from '../../utils/validation.js';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];
const STATUSES = ['PENDING', 'SENT', 'ACCEPTED', 'DISMISSED'];

export const listSchema = z.object({
  params: z.object({ businessId: z.string().uuid() }),
  query: z.object({
    ...paginationQuery,
    status: z.enum(STATUSES).optional(),
    priority: z.enum(PRIORITIES).optional(),
  }),
});

export const generateSchema = z.object({
  params: z.object({ businessId: z.string().uuid() }),
});
