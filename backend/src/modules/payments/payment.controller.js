import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, getPagination } from '../../utils/http.js';
import * as service from './payment.service.js';

const q = (req) => req.validatedQuery ?? req.query;

export const getSettings = asyncHandler(async (req, res) => ok(res, await service.getSettings()));

export const updateSettings = asyncHandler(async (req, res) => ok(res, await service.updateSettings(req.body)));

export const uploadQr = asyncHandler(async (req, res) => {
  const settings = await service.uploadQr({ contentType: req.headers['content-type'], data: req.body });
  return ok(res, settings);
});

export const regenerateDeviceKey = asyncHandler(async (req, res) => ok(res, await service.regenerateDeviceKey()));

export const listPayments = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listPayments(q(req), getPagination(q(req)));
  return ok(res, items, meta);
});

export const listNotifications = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listNotifications(q(req), getPagination(q(req)));
  return ok(res, items, meta);
});

export const confirm = asyncHandler(async (req, res) => {
  return ok(res, await service.confirmManually(req.params.id, req.user.id, req.body));
});

export const reject = asyncHandler(async (req, res) => ok(res, await service.reject(req.params.id, req.body)));

// Celular del negocio
export const devicePing = asyncHandler(async (req, res) => ok(res, { connected: true }));

export const receiveNotification = asyncHandler(async (req, res) => {
  return created(res, await service.receiveNotification(req.body));
});

// App del emprendedor
export const getPublicSettings = asyncHandler(async (req, res) => ok(res, await service.getPublicSettings()));

export const listMyPayments = asyncHandler(async (req, res) => {
  return ok(res, await service.listMyPayments(req.entrepreneur.id));
});

export const createPlanPayment = asyncHandler(async (req, res) => {
  return created(res, await service.createPlanPayment(req.entrepreneur.id, req.body));
});
