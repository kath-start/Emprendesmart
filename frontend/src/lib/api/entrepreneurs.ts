import { apiRequest } from '../api-client';
import type { Entrepreneur, EntrepreneurStatus, PlanType, UsageEvent } from '../types';

export interface ListEntrepreneursParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: EntrepreneurStatus;
  plan?: PlanType;
  country?: string;
}

export function listEntrepreneurs(params: ListEntrepreneursParams = {}) {
  return apiRequest<Entrepreneur[]>('/entrepreneurs', { query: params });
}

export function getEntrepreneur(id: string) {
  return apiRequest<Entrepreneur>(`/entrepreneurs/${id}`);
}

export function getEntrepreneurUsage(id: string, params: { page?: number; limit?: number } = {}) {
  return apiRequest<UsageEvent[]>(`/entrepreneurs/${id}/usage`, { query: params });
}

export interface CreateEntrepreneurInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country?: string;
  city?: string;
  plan?: PlanType;
  status?: EntrepreneurStatus;
}

export function createEntrepreneur(input: CreateEntrepreneurInput) {
  return apiRequest<Entrepreneur>('/entrepreneurs', { method: 'POST', body: input });
}

export type UpdateEntrepreneurInput = Partial<CreateEntrepreneurInput>;

export function updateEntrepreneur(id: string, input: UpdateEntrepreneurInput) {
  return apiRequest<Entrepreneur>(`/entrepreneurs/${id}`, { method: 'PATCH', body: input });
}

export function changeEntrepreneurStatus(id: string, status: EntrepreneurStatus) {
  return apiRequest<Entrepreneur>(`/entrepreneurs/${id}/status`, { method: 'PATCH', body: { status } });
}

export function deleteEntrepreneur(id: string) {
  return apiRequest<null>(`/entrepreneurs/${id}`, { method: 'DELETE' });
}
