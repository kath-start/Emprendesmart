import { apiRequest } from '../api-client';
import type {
  CategoryCount,
  FinancePoint,
  GrowthPoint,
  MetricsOverview,
  SystemSignals,
  TopActiveEntrepreneur,
  UsageTrend,
} from '../types';

export function getOverview() {
  return apiRequest<MetricsOverview>('/metrics/overview');
}

export function getGrowth(months = 12) {
  return apiRequest<GrowthPoint[]>('/metrics/growth', { query: { months } });
}

export function getUsageTrend(months = 12) {
  return apiRequest<UsageTrend>('/metrics/usage', { query: { months } });
}

export function getBusinessesByCategory() {
  return apiRequest<CategoryCount[]>('/metrics/businesses-by-category');
}

export function getFinanceTrend(months = 12) {
  return apiRequest<FinancePoint[]>('/metrics/finance', { query: { months } });
}

export function getSignals() {
  return apiRequest<SystemSignals>('/metrics/signals');
}

export function getTopActiveEntrepreneurs() {
  return apiRequest<TopActiveEntrepreneur[]>('/metrics/top-active-entrepreneurs');
}
