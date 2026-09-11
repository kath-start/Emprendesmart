import { apiRequest } from '../api-client';
import type { Admin, AdminRole, AdminStatus } from '../types';

export interface ListAdminsParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: AdminRole;
  status?: AdminStatus;
}

export function listAdmins(params: ListAdminsParams = {}) {
  return apiRequest<Admin[]>('/admins', { query: params });
}

export function getAdmin(id: string) {
  return apiRequest<Admin>(`/admins/${id}`);
}

export interface CreateAdminInput {
  name: string;
  email: string;
  password: string;
  role?: AdminRole;
}

export function createAdmin(input: CreateAdminInput) {
  return apiRequest<Admin>('/admins', { method: 'POST', body: input });
}

export interface UpdateAdminInput {
  name?: string;
  role?: AdminRole;
  status?: AdminStatus;
  password?: string;
}

export function updateAdmin(id: string, input: UpdateAdminInput) {
  return apiRequest<Admin>(`/admins/${id}`, { method: 'PATCH', body: input });
}

export function deleteAdmin(id: string) {
  return apiRequest<null>(`/admins/${id}`, { method: 'DELETE' });
}
