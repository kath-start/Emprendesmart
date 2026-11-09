import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { validate } from '../../middlewares/validate.js';
import { authenticateEntrepreneur } from '../../middlewares/entrepreneurAuth.js';
import * as controller from './app-auth.controller.js';
import {
  registerSchema,
  loginSchema,
  firebaseLoginSchema,
  refreshSchema,
  changePasswordSchema,
  updateProfileSchema,
  changeEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  directResetPasswordSchema,
  demoPlanSchema,
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

// Inicio con Google/SMS: el token ya viene verificado por Firebase, el límite solo frena abusos.
const firebaseLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos, espera unos minutos e inténtalo de nuevo' },
});

appAuthRoutes.post('/register', validate(registerSchema), controller.register);
appAuthRoutes.post('/login', validate(loginSchema), controller.login);
// Google o teléfono/SMS vía Firebase Auth.
appAuthRoutes.post('/firebase', firebaseLoginLimiter, validate(firebaseLoginSchema), controller.firebaseLogin);
appAuthRoutes.post('/refresh', validate(refreshSchema), controller.refresh);
appAuthRoutes.get('/me', authenticateEntrepreneur, controller.me);
appAuthRoutes.patch('/me', authenticateEntrepreneur, validate(updateProfileSchema), controller.updateProfile);
// Plan: estado y límites, prueba gratis de Pro (una vez, 15 días) y volver a Gratis.
appAuthRoutes.get('/plan', authenticateEntrepreneur, controller.planStatus);
appAuthRoutes.post('/plan/trial', authenticateEntrepreneur, controller.startTrial);
appAuthRoutes.post('/plan/free', authenticateEntrepreneur, controller.chooseFree);
// Modo concurso (DEMO_PLANS): activar cualquier plan sin pagar.
appAuthRoutes.post('/plan/demo', authenticateEntrepreneur, validate(demoPlanSchema), controller.demoPlan);
appAuthRoutes.post('/change-email', authenticateEntrepreneur, validate(changeEmailSchema), controller.changeEmail);
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
