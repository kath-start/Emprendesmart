import { Router } from 'express';

import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { idParam } from '../../utils/validation.js';
import * as controller from './business.controller.js';
import {
  listSchema,
  createSchema,
  updateSchema,
  upsertMetricSchema,
  listMetricsSchema,
} from './business.validation.js';

export const businessRoutes = Router();

businessRoutes.use(authenticate);

businessRoutes.get('/', validate(listSchema), controller.list);
businessRoutes.get('/:id', validate(idParam), controller.getOne);
businessRoutes.get('/:id/metrics', validate(listMetricsSchema), controller.listMetrics);

const writers = authorize('SUPER_ADMIN', 'ADMIN');

businessRoutes.post('/', writers, validate(createSchema), controller.create);
businessRoutes.patch('/:id', writers, validate(updateSchema), controller.update);
businessRoutes.delete('/:id', authorize('SUPER_ADMIN'), validate(idParam), controller.remove);
businessRoutes.put('/:id/metrics', writers, validate(upsertMetricSchema), controller.upsertMetric);
