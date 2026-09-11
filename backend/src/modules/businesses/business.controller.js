import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, getPagination } from '../../utils/http.js';
import * as service from './business.service.js';

const q = (req) => req.validatedQuery ?? req.query;

export const list = asyncHandler(async (req, res) => {
  const pagination = getPagination(q(req));
  const { items, meta } = await service.list(q(req), pagination);
  return ok(res, items, meta);
});

export const getOne = asyncHandler(async (req, res) => {
  const business = await service.getById(req.params.id);
  return ok(res, business);
});

export const create = asyncHandler(async (req, res) => {
  const business = await service.create(req.body);
  return created(res, business);
});

export const update = asyncHandler(async (req, res) => {
  const business = await service.update(req.params.id, req.body);
  return ok(res, business);
});

export const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  return ok(res, { message: 'Negocio eliminado' });
});

export const listMetrics = asyncHandler(async (req, res) => {
  const metrics = await service.listMetrics(req.params.id, q(req));
  return ok(res, metrics);
});

export const upsertMetric = asyncHandler(async (req, res) => {
  const metric = await service.upsertMetric(req.params.id, req.body);
  return created(res, metric);
});
