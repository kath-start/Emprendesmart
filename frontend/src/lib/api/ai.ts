import { apiRequest } from '../api-client';
import type { AiAnalysisResult, ChatMessage, ChatResponse } from '../types';

export function analyzeBusiness(businessId: string) {
  return apiRequest<AiAnalysisResult>(`/ai/businesses/${businessId}/analyze`, { method: 'POST' });
}

export function chat(message: string, history: ChatMessage[]) {
  return apiRequest<ChatResponse>('/ai/chat', { method: 'POST', body: { message, history } });
}
