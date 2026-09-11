import { z } from 'zod';
import { paginationQuery } from '../../utils/validation.js';

const TYPES = ['LOGIN', 'REPORT_VIEW', 'RECOMMENDATION_VIEW', 'METRIC_UPDATE', 'ALERT_VIEW', 'FEATURE_USE'];

export const listSchema = z.object({
  query: z.object({
    ...paginationQuery,
    entrepreneurId: z.string().uuid().optional(),
    type: z.enum(TYPES).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }),
});

export const createSchema = z.object({
  body: z.object({
    entrepreneurId: z.string().uuid(),
    type: z.enum(TYPES),
    metadata: z.record(z.any()).optional(),
    occurredAt: z.coerce.date().optional(),
  }),
});

export const summarySchema = z.object({
  query: z.object({
    days: z.coerce.number().int().min(1).max(365).optional(),
  }),
});
