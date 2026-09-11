import { apiRequest } from '../api-client';
import type { Recommendation, RecommendationPriority, RecommendationSource, RecommendationStatus } from '../types';

export interface ListRecommendationsParams {
  page?: number;
  limit?: number;
  businessId?: string;
  status?: RecommendationStatus;
  priority?: RecommendationPriority;
  source?: RecommendationSource;
  search?: string;
}

export function listRecommendations(params: ListRecommendationsParams = {}) {
  return apiRequest<Recommendation[]>('/recommendations', { query: params });
}

export function getRecommendation(id: string) {
  return apiRequest<Recommendation>(`/recommendations/${id}`);
}

export interface CreateRecommendationInput {
  businessId: string;
  title: string;
  description: string;
  category: string;
  priority?: RecommendationPriority;
  source?: RecommendationSource;
}

export function createRecommendation(input: CreateRecommendationInput) {
  return apiRequest<Recommendation>('/recommendations', { method: 'POST', body: input });
}

export function updateRecommendationStatus(id: string, status: RecommendationStatus) {
  return apiRequest<Recommendation>(`/recommendations/${id}/status`, { method: 'PATCH', body: { status } });
}

export function deleteRecommendation(id: string) {
  return apiRequest<null>(`/recommendations/${id}`, { method: 'DELETE' });
}
