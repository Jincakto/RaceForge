import { request } from './api';
import type { Role } from './data';
export const permissionForPage = (role: Role, page: string): string | undefined => {
  if (page === 'trainer-assign') return 'ASSIGN_TRAINER';
  if (page === 'training-hub') return role === 'head_trainer' ? 'MANAGE_TRAINING' : 'VIEW_TRAINING';
  if (page === 'accounts') return 'MANAGE_ACCOUNTS';
  if (page === 'permissions') return 'MANAGE_PERMISSION';
  return undefined;
};
export async function changePermission(roleName: string, permissionCode: string, enabled: boolean) {
  return enabled ? request('/admin/permissions/grant', 'POST', { roleName, permissionCode })
    : request(`/admin/permissions/revoke?${new URLSearchParams({ roleName, permissionCode })}`, 'DELETE');
}
