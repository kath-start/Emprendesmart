import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, getPagination } from '../../utils/http.js';
import * as service from './admin.service.js';

export const list = asyncHandler(async (req, res) => {
  const pagination = getPagination(req.validatedQuery ?? req.query);
  const { items, meta } = await service.listAdmins(req.validatedQuery ?? req.query, pagination);
  return ok(res, items, meta);
});

export const getOne = asyncHandler(async (req, res) => {
  const admin = await service.getAdmin(req.params.id);
  return ok(res, admin);
});

export const create = asyncHandler(async (req, res) => {
  const admin = await service.createAdmin(req.body);
  return created(res, admin);
});

export const update = asyncHandler(async (req, res) => {
  const admin = await service.updateAdmin(req.params.id, req.body, req.user);
  return ok(res, admin);
});

export const remove = asyncHandler(async (req, res) => {
  await service.deleteAdmin(req.params.id, req.user);
  return ok(res, { message: 'Administrador eliminado' });
});
