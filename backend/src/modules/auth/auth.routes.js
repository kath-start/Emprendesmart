import { Router } from 'express';

import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import * as controller from './auth.controller.js';
import { loginSchema, refreshSchema, changePasswordSchema } from './auth.validation.js';

export const authRoutes = Router();

authRoutes.post('/login', validate(loginSchema), controller.login);
authRoutes.post('/refresh', validate(refreshSchema), controller.refresh);
authRoutes.post('/logout', authenticate, controller.logout);
authRoutes.get('/me', authenticate, controller.me);
authRoutes.post('/change-password', authenticate, validate(changePasswordSchema), controller.changePassword);
