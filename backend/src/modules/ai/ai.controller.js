import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import * as service from './ai.service.js';

export const analyzeBusiness = asyncHandler(async (req, res) => {
  const result = await service.analyzeBusiness(req.params.id);
  return ok(res, result);
});

export const chat = asyncHandler(async (req, res) => {
  const { message, history } = req.body;
  const result = await service.chat(message, history ?? []);
  return ok(res, result);
});
