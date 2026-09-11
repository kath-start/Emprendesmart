import { Router } from 'express';

import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { idParam } from '../../utils/validation.js';
import * as controller from './alert.controller.js';
import { listSchema, createSchema, updateStatusSchema } from './alert.validation.js';

export const alertRoutes = Router();

alertRoutes.use(authenticate);

const writers = authorize('SUPER_ADMIN', 'ADMIN');

alertRoutes.get('/', validate(listSchema), controller.list);
alertRoutes.get('/:id', validate(idParam), controller.getOne);
alertRoutes.post('/', writers, validate(createSchema), controller.create);
alertRoutes.patch('/:id/status', writers, validate(updateStatusSchema), controller.updateStatus);
alertRoutes.delete('/:id', authorize('SUPER_ADMIN'), validate(idParam), controller.remove);
