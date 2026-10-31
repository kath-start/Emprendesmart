import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { validate } from '../../middlewares/validate.js';
import { authenticateEntrepreneur } from '../../middlewares/entrepreneurAuth.js';
import * as controller from './app-auth.controller.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  directResetPasswordSchema,
} from './app-auth.validation.js';

export const appAuthRoutes = Router();

// Límite estricto para la recuperación de contraseña: evita spam de correos y adivinar códigos.
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos, espera unos minutos e inténtalo de nuevo' },
});

appAuthRoutes.post('/register', validate(registerSchema), controller.register);
appAuthRoutes.post('/login', validate(loginSchema), controller.login);
appAuthRoutes.post('/refresh', validate(refreshSchema), controller.refresh);
appAuthRoutes.get('/me', authenticateEntrepreneur, controller.me);
appAuthRoutes.post(
  '/change-password',
  authenticateEntrepreneur,
  validate(changePasswordSchema),
  controller.changePassword,
);
appAuthRoutes.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), controller.forgotPassword);
appAuthRoutes.post('/reset-password', passwordResetLimiter, validate(resetPasswordSchema), controller.resetPassword);
appAuthRoutes.post(
  '/forgot-password/check-email',
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  controller.checkResetEmail,
);
appAuthRoutes.post(
  '/forgot-password/reset',
  passwordResetLimiter,
  validate(directResetPasswordSchema),
  controller.directResetPassword,
);
