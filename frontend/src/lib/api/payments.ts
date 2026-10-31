import { apiRequest } from '../api-client';
import type { PaymentSettings, PlanPayment, PlanPaymentStatus, YapeNotification } from '../types';

export function getPaymentSettings() {
  return apiRequest<PaymentSettings>('/payments/settings');
}

export function updatePaymentSettings(input: { yapeHolderName?: string | null; yapePhone?: string | null }) {
  return apiRequest<PaymentSettings>('/payments/settings', { method: 'PATCH', body: input });
}

export function uploadYapeQr(file: File) {
  return apiRequest<PaymentSettings>('/payments/settings/qr', { method: 'POST', file });
}

export function regenerateDeviceKey() {
  return apiRequest<PaymentSettings>('/payments/settings/device-key', { method: 'POST' });
}

export interface ListPlanPaymentsParams {
  page?: number;
  limit?: number;
  status?: PlanPaymentStatus;
}

export function listPlanPayments(params: ListPlanPaymentsParams = {}) {
  return apiRequest<PlanPayment[]>('/payments', { query: params });
}

export interface ListYapeNotificationsParams {
  page?: number;
  limit?: number;
  matched?: 'true' | 'false';
}

export function listYapeNotifications(params: ListYapeNotificationsParams = {}) {
  return apiRequest<YapeNotification[]>('/payments/notifications', { query: params });
}

export function confirmPlanPayment(id: string, notificationId?: string) {
  return apiRequest<PlanPayment>(`/payments/${id}/confirm`, { method: 'POST', body: { notificationId } });
}

export function rejectPlanPayment(id: string, reason?: string) {
  return apiRequest<PlanPayment>(`/payments/${id}/reject`, { method: 'POST', body: { reason } });
}
