import { apiRequest } from '../api-client';
import type { Admin } from '../types';

export interface LoginResponse {
  admin: Admin;
  accessToken: string;
  refreshToken: string;
}

export function login(email: string, password: string) {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
    skipAuth: true,
  });
}

export function logout() {
  return apiRequest<null>('/auth/logout', { method: 'POST' });
}

export function me() {
  return apiRequest<Admin>('/auth/me');
}

export function changePassword(currentPassword: string, newPassword: string) {
  return apiRequest<null>('/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });
}
