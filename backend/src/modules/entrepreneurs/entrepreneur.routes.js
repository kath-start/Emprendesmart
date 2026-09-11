import { Router } from 'express';

import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { idParam } from '../../utils/validation.js';
import * as controller from './entrepreneur.controller.js';
import {
  listSchema,
  createSchema,
  updateSchema,
  changeStatusSchema,
} from './entrepreneur.validation.js';

export const entrepreneurRoutes = Router();

entrepreneurRoutes.use(authenticate);

entrepreneurRoutes.get('/', validate(listSchema), controller.list);
entrepreneurRoutes.get('/:id', validate(idParam), controller.getOne);
entrepreneurRoutes.get('/:id/usage', validate(idParam), controller.usage);

// Escritura: SUPER_ADMIN y ADMIN (los ANALYST solo consultan).
entrepreneurRoutes.post('/', authorize('SUPER_ADMIN', 'ADMIN'), validate(createSchema), controller.create);
entrepreneurRoutes.patch('/:id', authorize('SUPER_ADMIN', 'ADMIN'), validate(updateSchema), controller.update);
entrepreneurRoutes.patch(
  '/:id/status',
  authorize('SUPER_ADMIN', 'ADMIN'),
  validate(changeStatusSchema),
  controller.changeStatus,
);
entrepreneurRoutes.delete('/:id', authorize('SUPER_ADMIN'), validate(idParam), controller.remove);
