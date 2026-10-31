import express, { Router } from 'express';

import { authenticate, authorize } from '../../middlewares/auth.js';
import { authenticateDevice } from '../../middlewares/deviceAuth.js';
import { authenticateEntrepreneur } from '../../middlewares/entrepreneurAuth.js';
import { validate } from '../../middlewares/validate.js';
import * as controller from './payment.controller.js';
import {
  settingsSchema,
  uploadQrSchema,
  listPaymentsSchema,
  listNotificationsSchema,
  confirmSchema,
  rejectSchema,
  notificationSchema,
  createPlanPaymentSchema,
} from './payment.validation.js';

/** /api/v1/payments: panel de administración y celular que lee las notificaciones de Yape. */
export const paymentRoutes = Router();

// El celular no tiene sesión de administrador: usa el código de dispositivo.
paymentRoutes.get('/device/ping', authenticateDevice, controller.devicePing);
paymentRoutes.post('/device/notifications', authenticateDevice, validate(notificationSchema), controller.receiveNotification);

paymentRoutes.use(authenticate);

const writers = authorize('SUPER_ADMIN', 'ADMIN');

paymentRoutes.get('/settings', controller.getSettings);
paymentRoutes.patch('/settings', writers, validate(settingsSchema), controller.updateSettings);
// El cuerpo es la imagen del QR (image/jpeg|png|webp), no JSON.
paymentRoutes.post(
  '/settings/qr',
  writers,
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '5mb' }),
  validate(uploadQrSchema),
  controller.uploadQr,
);
paymentRoutes.post('/settings/device-key', writers, controller.regenerateDeviceKey);

paymentRoutes.get('/', validate(listPaymentsSchema), controller.listPayments);
paymentRoutes.get('/notifications', validate(listNotificationsSchema), controller.listNotifications);
paymentRoutes.post('/:id/confirm', writers, validate(confirmSchema), controller.confirm);
paymentRoutes.post('/:id/reject', writers, validate(rejectSchema), controller.reject);

/** /api/v1/app/payments: el emprendedor ve el QR y avisa que pagó. */
export const appPaymentRoutes = Router();

appPaymentRoutes.use(authenticateEntrepreneur);

appPaymentRoutes.get('/settings', controller.getPublicSettings);
appPaymentRoutes.get('/', controller.listMyPayments);
appPaymentRoutes.post('/', validate(createPlanPaymentSchema), controller.createPlanPayment);
