import { request, json } from './api.ts';
import { tokenStore } from './tokenStore.ts';
import { numericId, type AuthDto, type UserDto } from '../types/api.ts';
import type { AppUser, Role } from '../data.ts';
const roles: Record<string, Role> = { CLUB_MANAGER: 'manager', HORSE_OWNER: 'owner', VETERINARIAN: 'veterinarian', HEAD_TRAINER: 'head_trainer', GROOM: 'groom' };
export function toAppUser(user: UserDto): AppUser {
  numericId(user.userId);
  return { id: user.userId, name: user.fullName, email: user.email, password: '', phone: user.phone, avatar: user.fullName.slice(0, 2).toUpperCase(), role: roles[user.role?.roleName || ''] || null, clubId: null, status: user.status === 'ACTIVE' ? 'active' : 'pending', verified: user.emailVerified };
}
async function authenticate(path: string, body?: unknown) {
  const result = await request<AuthDto>(path, json('POST', body));
  if (result.tokenType.toLowerCase() !== 'bearer') throw new Error('BE chưa trả Bearer token.');
  if (!result.accessToken || !Number.isFinite(result.expiresInSeconds) || result.expiresInSeconds <= 0) throw new Error('JWT response không hợp lệ.');
  const user=toAppUser(result.user);
  tokenStore.set(result.accessToken, result.expiresInSeconds);
  return user;
}
export const authService = {
  login: (email: string, password: string) => authenticate('/api/auth/login', { email, password }),
  refresh: () => authenticate('/api/auth/refresh'),
  register: (body: { fullName: string; email: string; password: string; phone: string; requestedRoleId: number | null }) => request<unknown>('/api/auth/register', json('POST', body)),
  verify: (email: string, otp: string) => request<unknown>('/api/auth/verify-email', json('POST', { email, otp })),
  resend: (email: string) => request<unknown>('/api/auth/resend-otp', json('POST', { email })),
  async logout() { try { await request<unknown>('/api/auth/logout', json('POST')); } finally { tokenStore.clear(); } },
};
