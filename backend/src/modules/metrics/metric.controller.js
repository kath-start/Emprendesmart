import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import * as service from './metric.service.js';

const months = (req) => (req.validatedQuery ?? req.query)?.months ?? 12;

export const overview = asyncHandler(async (req, res) => {
  return ok(res, await service.overview());
});

export const growth = asyncHandler(async (req, res) => {
  return ok(res, await service.entrepreneursGrowth(months(req)));
});

export const usage = asyncHandler(async (req, res) => {
  return ok(res, await service.usageTrend(months(req)));
});

export const byCategory = asyncHandler(async (req, res) => {
  return ok(res, await service.businessesByCategory());
});

export const finance = asyncHandler(async (req, res) => {
  return ok(res, await service.financeTrend(months(req)));
});

export const signals = asyncHandler(async (req, res) => {
  return ok(res, await service.systemSignals());
});

export const topActive = asyncHandler(async (req, res) => {
  return ok(res, await service.topActiveEntrepreneurs());
});
