import { z } from 'zod';
import { paginationQuery } from '../../utils/validation.js';

const PAID_PLANS = ['EMPRENDE', 'CRECIMIENTO', 'PRO'];

export const settingsSchema = z.object({
  body: z.object({
    yapeHolderName: z.string().trim().max(120).nullable().optional(),
    yapePhone: z.string().trim().max(20).nullable().optional(),
  }),
});

export const uploadQrSchema = z.object({});

export const listPaymentsSchema = z.object({
  query: z.object({
    ...paginationQuery,
    status: z.enum(['PENDING', 'CONFIRMED', 'REJECTED']).optional(),
  }),
});

export const listNotificationsSchema = z.object({
  query: z.object({
    ...paginationQuery,
    matched: z.enum(['true', 'false']).optional(),
  }),
});

export const confirmSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ notificationId: z.string().uuid().optional() }).default({}),
});

export const rejectSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ reason: z.string().trim().max(300).optional() }).default({}),
});

/** Aviso enviado por el celular del negocio que lee las notificaciones de Yape. */
export const notificationSchema = z.object({
  body: z.object({
    paymentMethod: z.enum(['yape', 'plin']).default('yape'),
    message: z.string().trim().min(1).max(1000),
    notifiedAt: z.coerce.date(),
    amount: z.coerce.number().positive().optional().nullable(),
    senderName: z.string().trim().max(120).optional().nullable(),
    packageName: z.string().trim().max(200).optional().nullable(),
  }),
});

export const createPlanPaymentSchema = z.object({
  body: z.object({
    plan: z.enum(PAID_PLANS, { errorMap: () => ({ message: 'Elige un plan de pago' }) }),
    payerName: z.string().trim().min(2, 'Escribe el nombre que aparece en tu Yape').max(120),
  }),
});
