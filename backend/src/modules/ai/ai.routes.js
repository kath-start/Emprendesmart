import { Router } from 'express';

import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import * as controller from './ai.controller.js';
import { analyzeSchema, chatSchema } from './ai.validation.js';

export const aiRoutes = Router();

aiRoutes.use(authenticate);

// Analizar un negocio con IA genera recomendaciones/alertas: mismo permiso que crearlas a mano.
aiRoutes.post(
  '/businesses/:id/analyze',
  authorize('SUPER_ADMIN', 'ADMIN'),
  validate(analyzeSchema),
  controller.analyzeBusiness,
);

// El asistente conversacional solo consulta datos (nunca escribe), disponible para cualquier rol.
aiRoutes.post('/chat', validate(chatSchema), controller.chat);
