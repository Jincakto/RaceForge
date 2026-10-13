import { request, json } from './api.ts';
import { query } from './query.ts';
export const permissionService = {
  list: (role: string) => request<string[]>(`/api/admin/permissions/${encodeURIComponent(role)}`),
  grant: (roleName: string, permissionCode: string) => request('/api/admin/permissions/grant', json('POST', {roleName, permissionCode})),
  revoke: (roleName: string, permissionCode: string) => request(`/api/admin/permissions/revoke?${query({roleName, permissionCode})}`, json('DELETE')),
  audit: (role: string) => request<unknown[]>(`/api/admin/permissions/${encodeURIComponent(role)}/audit-log`),
};
