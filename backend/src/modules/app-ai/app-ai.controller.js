import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import * as service from './app-ai.service.js';

export const chat = asyncHandler(async (req, res) => {
  const { message, history } = req.body;
  const result = await service.chat(req.params.businessId, req.entrepreneur.id, message, history ?? []);
  return ok(res, result);
});

export const usage = asyncHandler(async (req, res) => {
  return ok(res, await service.getUsage(req.params.businessId, req.entrepreneur.id));
});
