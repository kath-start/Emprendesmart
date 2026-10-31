import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, getPagination } from '../../utils/http.js';
import * as service from './app-sale.service.js';

const q = (req) => req.validatedQuery ?? req.query;

export const list = asyncHandler(async (req, res) => {
  const pagination = getPagination(q(req));
  const { items, meta } = await service.list(req.params.businessId, req.entrepreneur.id, pagination);
  return ok(res, items, meta);
});

export const getOne = asyncHandler(async (req, res) => {
  const sale = await service.getById(req.params.businessId, req.entrepreneur.id, req.params.saleId);
  return ok(res, sale);
});

export const create = asyncHandler(async (req, res) => {
  const { sale, alerts } = await service.create(req.params.businessId, req.entrepreneur.id, req.body);
  return created(res, { ...sale, alerts });
});

export const summary = asyncHandler(async (req, res) => {
  return ok(res, await service.summary(req.params.businessId, req.entrepreneur.id));
});

export const insights = asyncHandler(async (req, res) => {
  return ok(res, await service.insights(req.params.businessId, req.entrepreneur.id));
});
