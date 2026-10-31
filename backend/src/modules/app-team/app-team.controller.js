import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/http.js';
import * as service from './app-team.service.js';

export const list = asyncHandler(async (req, res) => {
  return ok(res, await service.list(req.params.businessId, req.entrepreneur.id));
});

export const add = asyncHandler(async (req, res) => {
  return created(res, await service.add(req.params.businessId, req.entrepreneur.id, req.body));
});

export const updateRole = asyncHandler(async (req, res) => {
  return ok(res, await service.updateRole(req.params.businessId, req.entrepreneur.id, req.params.memberId, req.body));
});

export const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.businessId, req.entrepreneur.id, req.params.memberId);
  return ok(res, { message: 'Persona quitada del equipo' });
});
