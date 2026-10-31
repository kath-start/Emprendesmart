import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, getPagination } from '../../utils/http.js';
import * as service from './app-product.service.js';

const q = (req) => req.validatedQuery ?? req.query;

export const list = asyncHandler(async (req, res) => {
  const pagination = getPagination(q(req));
  const { items, meta } = await service.list(req.params.businessId, req.entrepreneur.id, q(req), pagination);
  return ok(res, items, meta);
});

export const getOne = asyncHandler(async (req, res) => {
  const product = await service.getById(req.params.businessId, req.entrepreneur.id, req.params.productId);
  return ok(res, product);
});

export const create = asyncHandler(async (req, res) => {
  const product = await service.create(req.params.businessId, req.entrepreneur.id, req.body);
  return created(res, product);
});

export const update = asyncHandler(async (req, res) => {
  const product = await service.update(req.params.businessId, req.entrepreneur.id, req.params.productId, req.body);
  return ok(res, product);
});

export const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.businessId, req.entrepreneur.id, req.params.productId);
  return ok(res, { message: 'Producto eliminado' });
});

export const listMovements = asyncHandler(async (req, res) => {
  const pagination = getPagination(q(req));
  const { items, meta } = await service.listMovements(
    req.params.businessId,
    req.entrepreneur.id,
    req.params.productId,
    pagination,
  );
  return ok(res, items, meta);
});

export const createMovement = asyncHandler(async (req, res) => {
  const movement = await service.createMovement(
    req.params.businessId,
    req.entrepreneur.id,
    req.params.productId,
    req.body,
  );
  return created(res, movement);
});

export const uploadImage = asyncHandler(async (req, res) => {
  const imageUrl = await service.uploadImage(req.params.businessId, req.entrepreneur.id, {
    contentType: req.headers['content-type'],
    data: req.body,
  });
  return created(res, { imageUrl });
});
