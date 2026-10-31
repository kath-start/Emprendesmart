import { z } from 'zod';

const ROLES = ['PARTNER', 'CASHIER'];
const roleSchema = z.enum(ROLES, { errorMap: () => ({ message: 'Elige un rol: socio o cajero' }) });
const businessId = z.string().uuid('El id de negocio debe ser un UUID válido');

export const listSchema = z.object({ params: z.object({ businessId }) });

export const addSchema = z.object({
  params: z.object({ businessId }),
  body: z.object({
    email: z.string().trim().email('Escribe un correo válido'),
    role: roleSchema,
  }),
});

export const updateSchema = z.object({
  params: z.object({ businessId, memberId: z.string().uuid() }),
  body: z.object({ role: roleSchema }),
});

export const memberParam = z.object({
  params: z.object({ businessId, memberId: z.string().uuid() }),
});
