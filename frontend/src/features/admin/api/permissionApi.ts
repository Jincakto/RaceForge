import { request } from '../../../shared/api/api';
import type { Role } from '../../../shared/data/data';
export const permissionForPage = (role: Role, page: string): string | undefined => {
  const entry = PAGE_PERMISSIONS[page];
  return entry?.[role];
};

/** A grant never grants an unrelated backend role or access to another user's horse. */
export const PAGE_PERMISSIONS: Record<string, Partial<Record<Role, string>>> = {
  'horse-list': { manager: 'VIEW_CLUB_HORSES', head_trainer: 'VIEW_CLUB_HORSES', veterinarian: 'VIEW_CLUB_HORSES' },
  'my-horses': { owner: 'VIEW_MY_HORSES' },
  'horse-create': { owner: 'REGISTER_HORSE' },
  'center-requests': { manager: 'MANAGE_HORSE_INTAKE' },
  'health-records': { manager: 'VIEW_MEDICAL_RECORDS', veterinarian: 'VIEW_MEDICAL_RECORDS', owner: 'VIEW_MEDICAL_RECORDS' },
  'vet-health-form': { veterinarian: 'WRITE_MEDICAL_RECORD' },
  'vet-assign': { manager: 'MANAGE_VET_ASSIGNMENTS', veterinarian: 'ACCESS_VET_ASSIGNMENTS' },
  'post-exam': { veterinarian: 'WRITE_MEDICAL_RECORD' },
  'training-register': { owner: 'REGISTER_TRAINING_PACKAGE' },
  'package-catalog': { manager: 'MANAGE_PACKAGE_CATALOG' },
  'trainer-assign': { manager: 'ASSIGN_TRAINER' },
  'training-hub': { head_trainer: 'MANAGE_TRAINING' },
  'training-read-access': { manager: 'VIEW_TRAINING', head_trainer: 'VIEW_TRAINING', owner: 'VIEW_TRAINING' },
  'performance': { owner: 'VIEW_PERFORMANCE' },
  'care-hub': { groom: 'CARE_TASKS' },
  'inventory': { groom: 'VIEW_INVENTORY' },
  'inventory-log': { groom: 'VIEW_INVENTORY' },
  'staff': { manager: 'VIEW_STAFF' },
  'reports': { manager: 'VIEW_REPORTS' },
  'accounts': { admin: 'MANAGE_ACCOUNTS' },
  'permissions': { admin: 'MANAGE_PERMISSION' },
};

/** Backend-enforced grants also block the corresponding API operation when revoked. */
export const API_ENFORCED_CODES = new Set([
  'VIEW_CLUB_HORSES', 'VIEW_MY_HORSES', 'REGISTER_HORSE', 'MANAGE_HORSE_INTAKE',
  'VIEW_MEDICAL_RECORDS', 'WRITE_MEDICAL_RECORD', 'ACCESS_VET_ASSIGNMENTS',
  'MANAGE_VET_ASSIGNMENTS', 'REGISTER_TRAINING_PACKAGE', 'MANAGE_PACKAGE_CATALOG',
  'ASSIGN_TRAINER', 'MANAGE_TRAINING', 'VIEW_TRAINING', 'VIEW_REPORTS',
]);

export const EDITABLE_ROLE_PERMISSIONS: Partial<Record<Role, readonly string[]>> = {
  manager: ['VIEW_CLUB_HORSES', 'MANAGE_HORSE_INTAKE', 'VIEW_MEDICAL_RECORDS',
    'MANAGE_VET_ASSIGNMENTS', 'MANAGE_PACKAGE_CATALOG', 'ASSIGN_TRAINER',
    'VIEW_TRAINING', 'VIEW_STAFF', 'VIEW_REPORTS'],
  head_trainer: ['VIEW_CLUB_HORSES', 'MANAGE_TRAINING', 'VIEW_TRAINING'],
  veterinarian: ['VIEW_CLUB_HORSES', 'VIEW_MEDICAL_RECORDS', 'WRITE_MEDICAL_RECORD',
    'ACCESS_VET_ASSIGNMENTS'],
  groom: ['CARE_TASKS', 'VIEW_INVENTORY'],
  owner: ['VIEW_MY_HORSES', 'REGISTER_HORSE', 'VIEW_MEDICAL_RECORDS',
    'REGISTER_TRAINING_PACKAGE', 'VIEW_TRAINING', 'VIEW_PERFORMANCE'],
};

export function isEditableRolePermission(role: Role, code: string): boolean {
  return EDITABLE_ROLE_PERMISSIONS[role]?.includes(code) === true;
}

export async function getMyPermissions(): Promise<string[]> {
  return request<string[]>('/permissions/me');
}

export async function changePermission(roleName: string, permissionCode: string, enabled: boolean, reason: string) {
  const payload = { roleName, permissionCode, reason: reason.trim() };
  return enabled
    ? request('/admin/permissions/grant', 'POST', payload)
    : request('/admin/permissions/revoke', 'DELETE', payload);
}
