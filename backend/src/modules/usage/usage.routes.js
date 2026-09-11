import { Router } from 'express';

import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import * as controller from './usage.controller.js';
import { listSchema, createSchema, summarySchema } from './usage.validation.js';

export const usageRoutes = Router();

usageRoutes.use(authenticate);

usageRoutes.get('/', validate(listSchema), controller.list);
usageRoutes.get('/summary', validate(summarySchema), controller.summary);

// Ingesta de eventos (normalmente la haría la app de emprendedores vía service token).
usageRoutes.post('/', authorize('SUPER_ADMIN', 'ADMIN'), validate(createSchema), controller.create);
