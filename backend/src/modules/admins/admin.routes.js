import { Router } from 'express';

import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { idParam } from '../../utils/validation.js';
import * as controller from './admin.controller.js';
import { listAdminsSchema, createAdminSchema, updateAdminSchema } from './admin.validation.js';

export const adminRoutes = Router();

// Toda la gestión de administradores es exclusiva del SUPER_ADMIN.
adminRoutes.use(authenticate, authorize('SUPER_ADMIN'));

adminRoutes.get('/', validate(listAdminsSchema), controller.list);
adminRoutes.post('/', validate(createAdminSchema), controller.create);
adminRoutes.get('/:id', validate(idParam), controller.getOne);
adminRoutes.patch('/:id', validate(updateAdminSchema), controller.update);
adminRoutes.delete('/:id', validate(idParam), controller.remove);
