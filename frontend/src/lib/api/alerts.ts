import { apiRequest } from '../api-client';
import type { Alert, AlertSeverity, AlertStatus } from '../types';

export interface ListAlertsParams {
  page?: number;
  limit?: number;
  businessId?: string;
  status?: AlertStatus;
  severity?: AlertSeverity;
  type?: string;
  from?: string;
  to?: string;
}

export function listAlerts(params: ListAlertsParams = {}) {
  return apiRequest<Alert[]>('/alerts', { query: params });
}

export function getAlert(id: string) {
  return apiRequest<Alert>(`/alerts/${id}`);
}

export interface CreateAlertInput {
  businessId: string;
  type: string;
  severity?: AlertSeverity;
  message: string;
}

export function createAlert(input: CreateAlertInput) {
  return apiRequest<Alert>('/alerts', { method: 'POST', body: input });
}

export function updateAlertStatus(id: string, status: AlertStatus, resolutionNote?: string) {
  return apiRequest<Alert>(`/alerts/${id}/status`, { method: 'PATCH', body: { status, resolutionNote } });
}

export function deleteAlert(id: string) {
  return apiRequest<null>(`/alerts/${id}`, { method: 'DELETE' });
}
