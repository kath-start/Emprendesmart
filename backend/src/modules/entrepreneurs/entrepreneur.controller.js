import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, getPagination } from '../../utils/http.js';
import * as service from './entrepreneur.service.js';

const q = (req) => req.validatedQuery ?? req.query;

export const list = asyncHandler(async (req, res) => {
  const pagination = getPagination(q(req));
  const { items, meta } = await service.list(q(req), pagination);
  return ok(res, items, meta);
});

export const getOne = asyncHandler(async (req, res) => {
  const entrepreneur = await service.getById(req.params.id);
  return ok(res, entrepreneur);
});

export const create = asyncHandler(async (req, res) => {
  const entrepreneur = await service.create(req.body);
  return created(res, entrepreneur);
});

export const update = asyncHandler(async (req, res) => {
  const entrepreneur = await service.update(req.params.id, req.body);
  return ok(res, entrepreneur);
});

export const changeStatus = asyncHandler(async (req, res) => {
  const entrepreneur = await service.changeStatus(req.params.id, req.body.status);
  return ok(res, entrepreneur);
});

export const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  return ok(res, { message: 'Emprendedor eliminado' });
});

export const usage = asyncHandler(async (req, res) => {
  const pagination = getPagination(q(req));
  const { items, meta } = await service.listUsage(req.params.id, pagination);
  return ok(res, items, meta);
});
