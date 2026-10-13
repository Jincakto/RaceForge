import { tokenStore } from './tokenStore.ts';
import type { AuthDto } from '../types/api.ts';
let refreshing: Promise<AuthDto> | null = null;
let generation = 0;
export function cancelSession() { generation++; tokenStore.clear(); }
export async function refreshSession(base: string): Promise<AuthDto> {
  if (refreshing) return refreshing;
  const current = generation;
  refreshing = (async () => {
    const response = await fetch(base + '/api/auth/refresh', { method: 'POST', credentials: 'include' });
    const body = await response.json();
    if (!response.ok || !body.success || !body.data?.accessToken) throw new Error(body.message || 'Phiên đăng nhập đã hết hạn.');
    const data = body.data as AuthDto;
    if (current !== generation) throw new Error('Phiên đã kết thúc.');
    if (data.tokenType?.toLowerCase() !== 'bearer' || data.expiresInSeconds <= 0) throw new Error('Phiên đăng nhập không hợp lệ.');
    tokenStore.set(data.accessToken, data.expiresInSeconds);
    return data;
  })().finally(() => { refreshing = null; });
  return refreshing;
}
