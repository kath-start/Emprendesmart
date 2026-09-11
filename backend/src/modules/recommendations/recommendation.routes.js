import { Router } from 'express';

import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { idParam } from '../../utils/validation.js';
import * as controller from './recommendation.controller.js';
import { listSchema, createSchema, updateStatusSchema } from './recommendation.validation.js';

export const recommendationRoutes = Router();

recommendationRoutes.use(authenticate);

const writers = authorize('SUPER_ADMIN', 'ADMIN');

recommendationRoutes.get('/', validate(listSchema), controller.list);
recommendationRoutes.get('/:id', validate(idParam), controller.getOne);
recommendationRoutes.post('/', writers, validate(createSchema), controller.create);
recommendationRoutes.patch('/:id/status', writers, validate(updateStatusSchema), controller.updateStatus);
recommendationRoutes.delete('/:id', authorize('SUPER_ADMIN'), validate(idParam), controller.remove);
