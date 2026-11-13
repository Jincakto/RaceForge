import { request, idPath, allPages } from '../../../shared/api/api';
import type { ApiRecord } from '../../../shared/api/apiTypes';

export const listAccounts = () =>
  allPages<ApiRecord>('/users');

export const getCurrentAccount = () =>
  request<ApiRecord>('/users/me');

export const updateCurrentAccount = (body: { fullName: string; phone: string; avatarUrl: string | null }) =>
  request<ApiRecord>('/users/me', 'PUT', body);

export const createStaffAccount = (body: { fullName: string; email: string; phone: string; roleId: number }) =>
  request<ApiRecord>('/admin/users', 'POST', body);

export const updateAccountStatus = (id: string, body: { status: string }) =>
  request<ApiRecord>(`/users/${idPath(id)}/status`, 'PATCH', body);

export const resendStaffInvitation = (id: string) =>
  request<ApiRecord>(`/admin/users/${idPath(id)}/invitation`, 'POST');

export const listRolePermissions = (role: string) =>
  request<string[]>(`/admin/permissions/${role}`);

export const listPermissionHistory = (role: string) =>
  request<ApiRecord[]>(`/admin/permissions/${role}/audit-log`);
