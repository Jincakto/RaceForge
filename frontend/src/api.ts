export interface User {
  userId: number; fullName: string; email: string; phone: string | null;
  status: string; emailVerified: boolean; avatarUrl: string | null;
  role: { roleId: number; roleName: string };
}
export interface AuthSession { accessToken: string; user: User; }
export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) { super(message); this.status = status; this.code = code; }
}
let token: string | null = null;
let generation = 0;
let refreshing: Promise<AuthSession> | null = null;
const baseUrl = (import.meta.env?.VITE_API_BASE_URL || '').replace(/\/$/, '');
export function clearSession() { generation++; token = null; refreshing = null; }
export function acceptSession(session: AuthSession) { token = session.accessToken; }

async function send<T>(path: string, method: string, body?: unknown, accessToken = token): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method, credentials: 'include',
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch { throw new ApiError('Cannot connect to the backend. Check that the server is running and the API URL is correct.', 0); }
  if (response.status === 204) return null as T;
  const raw = await response.text();
  let value;
  try { value = raw ? JSON.parse(raw) : null; }
  catch { throw new ApiError('The server returned an invalid response. Check the API URL.', response.status); }
  if (!response.ok || value?.success === false) {
    const details = value?.data?.validationErrors || value?.data?.fieldErrors || value?.data?.details;
    throw new ApiError([value?.message || value?.detail || `Request failed (${response.status})`, details && Object.keys(details).length ? JSON.stringify(details) : ''].filter(Boolean).join(' — '), response.status, value?.data?.code);
  }
  return value && typeof value === 'object' && 'success' in value ? value.data : value;
}
export function restoreSession(): Promise<AuthSession> {
  if (!refreshing) {
    const current = generation;
    const pending = send<AuthSession>('/api/auth/refresh', 'POST', undefined, null).then(session => {
      if (current !== generation) throw new ApiError('Session ended. Please sign in again.', 401);
      acceptSession(session); return session;
    }).finally(() => { if (refreshing === pending) refreshing = null; });
    refreshing = pending;
  }
  return refreshing;
}
export async function api<T = unknown>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const started = generation;
  const usedToken = token;
  try { return await send<T>(path, method, body); }
  catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || (error.code && error.code !== 'AUTHENTICATION_REQUIRED') || path.startsWith('/api/auth/') || started !== generation) throw error;
    try {
      if (!token || token === usedToken) await restoreSession();
    } catch (refreshError) {
      if (started === generation && refreshError instanceof ApiError && refreshError.status === 401) {
        clearSession();
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('raceforge:session-expired'));
      }
      throw refreshError;
    }
    return send<T>(path, method, body);
  }
}
export async function login(email: string, password: string) {
  const session = await api<AuthSession>('/api/auth/login', 'POST', { email, password });
  acceptSession(session); return session.user;
}
export async function logout() {
  try { await api('/api/auth/logout', 'POST'); } finally { clearSession(); }
}
export function query(values: Record<string, unknown>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== '' && value != null) params.set(key, String(value)); });
  return params.size ? `?${params}` : '';
}
