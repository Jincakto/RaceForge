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
    if (!link.token.trim()) return Promise.reject(new Error("The link is missing a verification token. Open the link from your email again."));
    if (!newPassword.trim() || newPassword.length < 8 || newPassword.length > 100) return Promise.reject(new Error("Password must contain 8–100 characters."));
    pending = request(link.invitation ? '/auth/staff/set-password' : '/auth/reset-password', 'POST', { token: link.token, newPassword })
      .finally(() => { pending = undefined; });
    return pending;
  };
}

export function passwordSetupError(error: unknown, invitation: boolean): string {
  const code = error instanceof ApiError ? (error.details as { code?: string } | undefined)?.code : undefined;
  if (code === 'INVALID_INVITATION' || code === 'INVALID_RESET_TOKEN') {
    return invitation
      ? "This password setup link is invalid, expired or already used. Ask your administrator to resend the invitation and open the latest email."
      : "This password reset link is invalid, expired or already used. Request a new link.";
  }
  return error instanceof Error ? error.message : "Unable to set password. Please try again.";
}

export async function requestPasswordReset(email: string): Promise<unknown> {
  const normalized = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error("Enter a valid email address.");
  return request('/auth/forgot-password', 'POST', { email: normalized });
}
