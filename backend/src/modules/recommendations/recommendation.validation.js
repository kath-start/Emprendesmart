import { z } from 'zod';
import { paginationQuery } from '../../utils/validation.js';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];
const STATUSES = ['PENDING', 'SENT', 'ACCEPTED', 'DISMISSED'];
const SOURCES = ['SYSTEM', 'AI', 'ADMIN'];

export const listSchema = z.object({
  query: z.object({
    ...paginationQuery,
    businessId: z.string().uuid().optional(),
    status: z.enum(STATUSES).optional(),
    priority: z.enum(PRIORITIES).optional(),
    source: z.enum(SOURCES).optional(),
    search: z.string().optional(),
  }),
});

export const createSchema = z.object({
  body: z.object({
    businessId: z.string().uuid(),
    title: z.string().min(3).max(160),
    description: z.string().min(3).max(4000),
    category: z.string().min(1).max(80),
    priority: z.enum(PRIORITIES).optional(),
    source: z.enum(SOURCES).optional(),
  }),
});

export const updateStatusSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: z.enum(STATUSES),
  }),
});
