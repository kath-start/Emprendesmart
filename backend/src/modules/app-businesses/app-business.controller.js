import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, getPagination } from '../../utils/http.js';
import * as service from './app-business.service.js';

const q = (req) => req.validatedQuery ?? req.query;

export const list = asyncHandler(async (req, res) => {
  const pagination = getPagination(q(req));
  const { items, meta } = await service.list(req.entrepreneur.id, pagination);
  return ok(res, items, meta);
});

export const getOne = asyncHandler(async (req, res) => {
  const business = await service.getById(req.params.businessId, req.entrepreneur.id);
  return ok(res, business);
});

export const create = asyncHandler(async (req, res) => {
  const business = await service.create(req.entrepreneur.id, req.body);
  return created(res, business);
});

export const update = asyncHandler(async (req, res) => {
  const business = await service.update(req.params.businessId, req.entrepreneur.id, req.body);
  return ok(res, business);
});

export const uploadLogo = asyncHandler(async (req, res) => {
  const business = await service.uploadLogo(req.params.businessId, req.entrepreneur.id, {
    contentType: req.headers['content-type'],
    data: req.body,
  });
  return ok(res, business);
});

export const removeLogo = asyncHandler(async (req, res) => {
  return ok(res, await service.removeLogo(req.params.businessId, req.entrepreneur.id));
});
