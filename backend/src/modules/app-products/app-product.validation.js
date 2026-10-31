import { z } from 'zod';
import { paginationQuery } from '../../utils/validation.js';

const STATUSES = ['ACTIVE', 'INACTIVE'];
const MOVEMENT_TYPES = ['RESTOCK', 'ADJUSTMENT', 'RETURN'];

export const businessIdParam = z.object({
  params: z.object({ businessId: z.string().uuid('El id de negocio debe ser un UUID válido') }),
});

export const productIdParam = z.object({
  params: z.object({
    businessId: z.string().uuid('El id de negocio debe ser un UUID válido'),
    productId: z.string().uuid('El id de producto debe ser un UUID válido'),
  }),
});

export const listSchema = z.object({
  params: z.object({ businessId: z.string().uuid() }),
  query: z.object({
    ...paginationQuery,
    search: z.string().optional(),
    category: z.string().optional(),
    status: z.enum(STATUSES).optional(),
  }),
});

export const createSchema = z.object({
  params: z.object({ businessId: z.string().uuid() }),
  body: z.object({
    name: z.string().min(1).max(140),
    description: z.string().max(2000).optional(),
    category: z.string().max(80).optional(),
    sku: z.string().max(60).optional(),
    imageUrl: z.string().url('URL de imagen inválida').max(1000).optional(),
    unit: z.string().max(30).optional(),
    price: z.coerce.number().min(0),
    cost: z.coerce.number().min(0).optional(),
    stock: z.coerce.number().int().min(0).optional(),
    lowStockThreshold: z.coerce.number().int().min(0).optional(),
  }),
});

export const updateSchema = z.object({
  params: z.object({ businessId: z.string().uuid(), productId: z.string().uuid() }),
  body: z
    .object({
      name: z.string().min(1).max(140).optional(),
      description: z.string().max(2000).nullable().optional(),
      category: z.string().max(80).nullable().optional(),
      sku: z.string().max(60).nullable().optional(),
      imageUrl: z.string().url('URL de imagen inválida').max(1000).nullable().optional(),
      unit: z.string().max(30).nullable().optional(),
      price: z.coerce.number().min(0).optional(),
      cost: z.coerce.number().min(0).nullable().optional(),
      lowStockThreshold: z.coerce.number().int().min(0).optional(),
      status: z.enum(STATUSES).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'Debes enviar al menos un campo' }),
});

export const listMovementsSchema = z.object({
  params: z.object({ businessId: z.string().uuid(), productId: z.string().uuid() }),
  query: z.object({ ...paginationQuery }),
});

export const createMovementSchema = z.object({
  params: z.object({ businessId: z.string().uuid(), productId: z.string().uuid() }),
  body: z.object({
    type: z.enum(MOVEMENT_TYPES),
    quantity: z.coerce.number().int(),
    note: z.string().max(500).optional(),
  }),
});

export const uploadImageSchema = z.object({
  params: z.object({ businessId: z.string().uuid() }),
});
