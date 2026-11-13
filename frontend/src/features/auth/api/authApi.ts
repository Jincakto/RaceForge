import { request, setAccessToken, refreshSession, clearSession } from '../../../shared/api/api';
import type { ApiRecord } from '../../../shared/api/apiTypes';

export const submitNewPassword = (invitation: boolean, body: { token: string; newPassword: string }) =>
  request<ApiRecord>(invitation ? '/auth/staff/set-password' : '/auth/reset-password', 'POST', body);

export const sendPasswordReset = (body: { email: string }) =>
  request<ApiRecord>('/auth/forgot-password', 'POST', body);

export const auth = {
  async login(email: string, password: string) { const data = await request<{ accessToken: string; user: ApiRecord }>('/auth/login', 'POST', { email, password }); setAccessToken(data.accessToken); return data.user; },
  async restore() { return (await refreshSession()).user; },
  async logout() { try { await request('/auth/logout', 'POST', {}); } finally { clearSession(); } },
  register: (body: { fullName: string; email: string; password: string; phone?: string }) => request('/auth/register', 'POST', body),
  verify: (email: string, otp: string) => request('/auth/verify-email', 'POST', { email, otp }),
  resend: (email: string) => request('/auth/resend-otp', 'POST', { email }),
};
