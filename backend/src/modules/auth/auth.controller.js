import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import * as authService from './auth.service.js';

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return ok(res, result);
});

export const refresh = asyncHandler(async (req, res) => {
  const tokens = await authService.refresh(req.body);
  return ok(res, tokens);
});

export const me = asyncHandler(async (req, res) => {
  const admin = await authService.getProfile(req.user.id);
  return ok(res, admin);
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user.id, req.body);
  return ok(res, { message: 'Contraseña actualizada correctamente' });
});

export const logout = asyncHandler(async (req, res) => {
  // Los tokens son stateless: el cliente debe descartarlos.
  return ok(res, { message: 'Sesión cerrada' });
});
