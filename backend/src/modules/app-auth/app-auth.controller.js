import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/http.js';
import * as authService from './app-auth.service.js';

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  return created(res, result);
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return ok(res, result);
});

export const firebaseLogin = asyncHandler(async (req, res) => {
  const result = await authService.firebaseLogin(req.body);
  return ok(res, result);
});

export const refresh = asyncHandler(async (req, res) => {
  const tokens = await authService.refresh(req.body);
  return ok(res, tokens);
});

export const me = asyncHandler(async (req, res) => {
  const entrepreneur = await authService.getProfile(req.entrepreneur.id);
  return ok(res, entrepreneur);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const entrepreneur = await authService.updateProfile(req.entrepreneur.id, req.body);
  return ok(res, entrepreneur);
});

export const changeEmail = asyncHandler(async (req, res) => {
  const entrepreneur = await authService.changeEmail(req.entrepreneur.id, req.body);
  return ok(res, entrepreneur);
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.entrepreneur.id, req.body);
  return ok(res, { message: 'Contraseña actualizada correctamente' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body);
  // Misma respuesta exista o no la cuenta, para no revelar qué emails están registrados.
  return ok(res, { message: 'Si el email está registrado, te enviamos un código para restablecer tu contraseña' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  return ok(res, { message: 'Contraseña restablecida correctamente' });
});

export const checkResetEmail = asyncHandler(async (req, res) => {
  return ok(res, await authService.checkResetEmail(req.body));
});

export const directResetPassword = asyncHandler(async (req, res) => {
  await authService.directResetPassword(req.body);
  return ok(res, { message: 'Contraseña restablecida correctamente' });
});
