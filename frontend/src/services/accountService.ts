import { request, json } from './api.ts';
import type { UserDto } from '../types/api.ts';
export const accountService = {
  me: () => request<UserDto>('/api/users/me'),
  update: (body: { fullName: string; phone: string; avatarUrl: string }) => request<UserDto>('/api/users/me', json('PUT', body)),
  changePassword: (currentPassword: string, newPassword: string) => request('/api/users/me/password', json('PUT', { currentPassword, newPassword })),
  registration: () => request('/api/users/me/registration-request'),
};
