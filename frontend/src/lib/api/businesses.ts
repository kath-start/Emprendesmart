import { apiRequest } from '../api-client';
import type { Business, BusinessMetric, BusinessStage, BusinessStatus } from '../types';

export interface ListBusinessesParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: BusinessStatus;
  stage?: BusinessStage;
  entrepreneurId?: string;
}

export function listBusinesses(params: ListBusinessesParams = {}) {
  return apiRequest<Business[]>('/businesses', { query: params });
}

export function getBusiness(id: string) {
  return apiRequest<Business>(`/businesses/${id}`);
}

export function listBusinessMetrics(id: string, params: { from?: string; to?: string } = {}) {
  return apiRequest<BusinessMetric[]>(`/businesses/${id}/metrics`, { query: params });
}

export interface CreateBusinessInput {
  entrepreneurId: string;
  name: string;
  category: string;
  description?: string;
  stage?: BusinessStage;
  status?: BusinessStatus;
  employeesCount?: number;
  foundedAt?: string;
}

export function createBusiness(input: CreateBusinessInput) {
  return apiRequest<Business>('/businesses', { method: 'POST', body: input });
}

export type UpdateBusinessInput = Partial<Omit<CreateBusinessInput, 'entrepreneurId'>>;

export function updateBusiness(id: string, input: UpdateBusinessInput) {
  return apiRequest<Business>(`/businesses/${id}`, { method: 'PATCH', body: input });
}

export function deleteBusiness(id: string) {
  return apiRequest<null>(`/businesses/${id}`, { method: 'DELETE' });
}

export interface UpsertMetricInput {
  period: string;
  revenue?: number;
  expenses?: number;
  customersCount?: number;
  salesCount?: number;
}

export function upsertBusinessMetric(id: string, input: UpsertMetricInput) {
  return apiRequest<BusinessMetric>(`/businesses/${id}/metrics`, { method: 'PUT', body: input });
}
