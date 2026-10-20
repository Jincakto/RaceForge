import { ApiError, auth, request } from './api';

export interface PasswordSetupLink { token: string; invitation: boolean; }

export function passwordSetupLink(search: string): PasswordSetupLink | null {
  const params = new URLSearchParams(search);
  // An empty token is still a password-link visit, never a normal login attempt.
  return params.has('token') ? { token: params.get('token') || '', invitation: params.get('invitation') === 'true' } : null;
}

export async function restoreSessionForLocation(readSearch: () => string, onRestore: (user: any) => void): Promise<void> {
  if (passwordSetupLink(readSearch())) return;
  const user = await auth.restore();
  // Do not let a late refresh redirect over a password link opened in the meantime.
  if (!passwordSetupLink(readSearch())) onRestore(user);
}

export function createPasswordSetupSubmitter(link: PasswordSetupLink) {
  let pending: Promise<unknown> | undefined;
  return (newPassword: string): Promise<unknown> => {
    if (pending) return pending;
    if (!link.token.trim()) return Promise.reject(new Error('Liên kết thiếu mã xác thực. Vui lòng mở lại liên kết trong email.'));
    if (!newPassword.trim() || newPassword.length < 8 || newPassword.length > 100) return Promise.reject(new Error('Mật khẩu phải có từ 8 đến 100 ký tự.'));
    pending = request(link.invitation ? '/auth/staff/set-password' : '/auth/reset-password', 'POST', { token: link.token, newPassword })
      .finally(() => { pending = undefined; });
    return pending;
  };
}

export function passwordSetupError(error: unknown, invitation: boolean): string {
  const code = error instanceof ApiError ? (error.details as { code?: string } | undefined)?.code : undefined;
  if (code === 'INVALID_INVITATION' || code === 'INVALID_RESET_TOKEN') {
    return invitation
      ? 'Liên kết đặt mật khẩu không hợp lệ, đã hết hạn hoặc đã được dùng. Vui lòng nhờ admin gửi lại lời mời và mở email mới nhất.'
      : 'Liên kết đặt lại mật khẩu không hợp lệ, đã hết hạn hoặc đã được dùng. Vui lòng yêu cầu liên kết mới.';
  }
  return error instanceof Error ? error.message : 'Không thể đặt mật khẩu. Vui lòng thử lại.';
}

export async function requestPasswordReset(email: string): Promise<unknown> {
  const normalized = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('Vui lòng nhập email hợp lệ.');
  return request('/auth/forgot-password', 'POST', { email: normalized });
}
