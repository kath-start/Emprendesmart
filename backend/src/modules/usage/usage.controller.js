import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, getPagination } from '../../utils/http.js';
import * as service from './usage.service.js';

const q = (req) => req.validatedQuery ?? req.query;

export const list = asyncHandler(async (req, res) => {
  const pagination = getPagination(q(req));
  const { items, meta } = await service.list(q(req), pagination);
  return ok(res, items, meta);
});

export const create = asyncHandler(async (req, res) => {
  const event = await service.record(req.body);
  return created(res, event);
});

export const summary = asyncHandler(async (req, res) => {
  const data = await service.summary(q(req)?.days ?? 30);
  return ok(res, data);
});
