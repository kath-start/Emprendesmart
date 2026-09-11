import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, getPagination } from '../../utils/http.js';
import * as service from './recommendation.service.js';

const q = (req) => req.validatedQuery ?? req.query;

export const list = asyncHandler(async (req, res) => {
  const pagination = getPagination(q(req));
  const { items, meta } = await service.list(q(req), pagination);
  return ok(res, items, meta);
});

export const getOne = asyncHandler(async (req, res) => {
  return ok(res, await service.getById(req.params.id));
});

export const create = asyncHandler(async (req, res) => {
  return created(res, await service.create(req.body));
});

export const updateStatus = asyncHandler(async (req, res) => {
  return ok(res, await service.updateStatus(req.params.id, req.body.status, req.user.id));
});

export const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  return ok(res, { message: 'Recomendación eliminada' });
});
