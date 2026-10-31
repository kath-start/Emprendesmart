import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, getPagination } from '../../utils/http.js';
import * as service from './app-recommendation.service.js';

const q = (req) => req.validatedQuery ?? req.query;

export const list = asyncHandler(async (req, res) => {
  const pagination = getPagination(q(req));
  const { items, meta } = await service.list(req.params.businessId, req.entrepreneur.id, q(req), pagination);
  return ok(res, items, meta);
});

export const generate = asyncHandler(async (req, res) => {
  const items = await service.generate(req.params.businessId, req.entrepreneur.id);
  return created(res, items);
});
