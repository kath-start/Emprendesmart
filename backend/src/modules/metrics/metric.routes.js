import { Router } from 'express';

import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import * as controller from './metric.controller.js';
import { rangeSchema } from './metric.validation.js';

export const metricRoutes = Router();

// Métricas: cualquier administrador autenticado (incluye ANALYST).
metricRoutes.use(authenticate);

metricRoutes.get('/overview', controller.overview);
metricRoutes.get('/growth', validate(rangeSchema), controller.growth);
metricRoutes.get('/usage', validate(rangeSchema), controller.usage);
metricRoutes.get('/businesses-by-category', controller.byCategory);
metricRoutes.get('/finance', validate(rangeSchema), controller.finance);
metricRoutes.get('/signals', controller.signals);
metricRoutes.get('/top-active-entrepreneurs', controller.topActive);
