import { apiRequest } from '../api-client';
import type { UsageEvent, UsageEventType, UsageSummary } from '../types';

export interface ListUsageParams {
  page?: number;
  limit?: number;
  entrepreneurId?: string;
  type?: UsageEventType;
  from?: string;
  to?: string;
}

export function listUsageEvents(params: ListUsageParams = {}) {
  return apiRequest<UsageEvent[]>('/usage', { query: params });
}

export function getUsageSummary(days = 30) {
  return apiRequest<UsageSummary>('/usage/summary', { query: { days } });
}

export interface CreateUsageEventInput {
  entrepreneurId: string;
  type: UsageEventType;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}

export function createUsageEvent(input: CreateUsageEventInput) {
  return apiRequest<UsageEvent>('/usage', { method: 'POST', body: input });
}
