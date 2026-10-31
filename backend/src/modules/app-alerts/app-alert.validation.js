import { z } from 'zod';
import { paginationQuery } from '../../utils/validation.js';

const SEVERITIES = ['INFO', 'WARNING', 'CRITICAL'];
const STATUSES = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'];

export const listSchema = z.object({
  params: z.object({ businessId: z.string().uuid() }),
  query: z.object({
    ...paginationQuery,
    status: z.enum(STATUSES).optional(),
    severity: z.enum(SEVERITIES).optional(),
  }),
});
