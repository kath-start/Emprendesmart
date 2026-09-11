import { z } from 'zod';
import { paginationQuery } from '../../utils/validation.js';

const SEVERITIES = ['INFO', 'WARNING', 'CRITICAL'];
const STATUSES = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'];

export const listSchema = z.object({
  query: z.object({
    ...paginationQuery,
    businessId: z.string().uuid().optional(),
    status: z.enum(STATUSES).optional(),
    severity: z.enum(SEVERITIES).optional(),
    type: z.string().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }),
});

export const createSchema = z.object({
  body: z.object({
    businessId: z.string().uuid(),
    type: z.string().min(2).max(80),
    severity: z.enum(SEVERITIES).optional(),
    message: z.string().min(3).max(2000),
  }),
});

export const updateStatusSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: z.enum(STATUSES),
    resolutionNote: z.string().max(2000).optional(),
  }),
});
