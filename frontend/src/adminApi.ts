import { api, query, type User } from './api';
import type { Role } from './data';
import type { AuditEntry } from './admin';

// Contracts inspected on origin/N, d72ef00. Use names, never numeric role guesses.
export const ADMIN_ROLES: Record<Role, string> = {
  admin: 'ADMIN', manager: 'CLUB_MANAGER', head_trainer: 'HEAD_TRAINER',
  veterinarian: 'VETERINARIAN', groom: 'GROOM', owner: 'HORSE_OWNER',
};
export const ADMIN_PERMISSION_CODES = ['MANAGE_PERMISSION', 'MANAGE_ACCOUNTS', 'ASSIGN_TRAINER', 'MANAGE_TRAINING', 'VIEW_TRAINING'];
export async function listAccounts(): Promise<User[]> {
  const users: User[] = [];
  for (let page = 0; ; page++) {
    const data = await api<{ content: User[]; totalPages: number }>(`/api/users?page=${page}&size=100`);
    users.push(...data.content);
    if (page + 1 >= data.totalPages) break;
  }
  return users;
}
export const STAFF_ROLE_IDS: Partial<Record<Role, number>> = { manager: 1, head_trainer: 2, veterinarian: 3, groom: 4 };
export function createStaff(input: { fullName: string; email: string; phone: string; role: Role }) {
  const roleId = STAFF_ROLE_IDS[input.role];
  if (!roleId) throw new Error('Only manager, trainer, veterinarian and groom may be invited.');
  return api<User>('/api/admin/users', 'POST', { fullName: input.fullName.trim(), email: input.email.trim(), phone: input.phone || null, roleId });
}
export const resendStaffInvitation = (id: string | number) => api('/api/admin/users/' + encodeURIComponent(id) + '/invitation', 'POST');
export const activateStaff = (token: string, newPassword: string) => api('/api/auth/staff/set-password', 'POST', { token, newPassword });
export const updateAccountStatus = (id: string | number, status: 'ACTIVE' | 'INACTIVE') => api<User>('/api/users/' + encodeURIComponent(id) + '/status', 'PATCH', { status });
export const listPermissionCatalog = () => Promise.resolve(ADMIN_PERMISSION_CODES.map(permissionName => ({ permissionName, description: '' })));
export async function listRolePermissions(): Promise<Record<string, string[]>> {
  return Object.fromEntries(await Promise.all(Object.values(ADMIN_ROLES).map(async role => [role, await api<string[]>(`/api/admin/permissions/${role}`)])));
}
export const setRolePermission = (roleName: string, permissionCode: string, enabled: boolean) => enabled
  ? api('/api/admin/permissions/grant', 'POST', { roleName, permissionCode })
  : api(`/api/admin/permissions/revoke${query({ roleName, permissionCode })}`, 'DELETE');
export async function listPermissionAudit(): Promise<AuditEntry[]> {
  const rows = await Promise.all(Object.values(ADMIN_ROLES).map(role => api<{ logId: string; action: string; roleName: string; permissionCode: string; performedBy: string; performedAt: string }[]>(`/api/admin/permissions/${role}/audit-log`)));
  return [...new Map(rows.flat().map(row => [String(row.logId), row])).values()]
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt))
    .map(row => ({ id: String(row.logId), time: row.performedAt, actor: row.performedBy, actorRole: '', action: row.action, target: `${row.roleName} · ${row.permissionCode}` }));
}
