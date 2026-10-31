import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, getPagination } from '../../utils/http.js';
import * as service from './app-alert.service.js';

const q = (req) => req.validatedQuery ?? req.query;

export const list = asyncHandler(async (req, res) => {
  const pagination = getPagination(q(req));
  const { items, meta } = await service.list(req.params.businessId, req.entrepreneur.id, q(req), pagination);
  return ok(res, items, meta);
});
