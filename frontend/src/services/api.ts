import { tokenStore } from './tokenStore.ts';
import type { ApiResponse } from '../types/api.ts';
export const apiBase = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '') || '').replace(/\/$/, '');
export const liveApi = Boolean(apiBase);
export class ApiError extends Error {
  constructor(public status: number, message: string, public validationErrors?: Record<string, string>) { super(message); }
}
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  const token = tokenStore.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${apiBase}${path}`, { ...options, headers, credentials: 'include' });
  if (response.status === 401) {
    tokenStore.clear();
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('raceforge:unauthorized'));
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null) as (ApiResponse<T> & { validationErrors?: Record<string, string> }) | null;
  if (!response.ok || body?.success === false) throw new ApiError(response.status, body?.message || (response.status === 403 ? 'Bạn không có quyền thực hiện thao tác này.' : `Yêu cầu thất bại (${response.status}).`), body?.validationErrors);
  if (!body || !('data' in body)) throw new ApiError(response.status, 'Response không đúng ApiResponse DTO.');
  return body.data;
}
export const json = (method: string, body?: unknown): RequestInit => ({ method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
