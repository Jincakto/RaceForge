/** HTTP boundary for the existing Spring API. Access tokens stay in memory. */
export class ApiError extends Error {
  constructor(message: string, public status: number, public details?: unknown) { super(message); }
}
const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
let accessToken = '';
let refreshFlight: Promise<void> | undefined;
export function clearSession() { accessToken = ''; }
export function setAccessToken(token: string) { accessToken = token; }
export async function request<T = any>(path: string, method = 'GET', body?: unknown, retry = true): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method, credentials: 'include',
      headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch { throw new ApiError("Cannot connect to the server. Check the backend and API configuration.", 0); }
  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    try {
      refreshFlight ??= request<any>('/auth/refresh', 'POST', {}, false).then(data => { accessToken = data.accessToken; }).finally(() => { refreshFlight = undefined; });
      await refreshFlight;
    } catch (error) {
      clearSession(); window.dispatchEvent(new Event('raceforge:session-expired')); throw error;
    }
    return request<T>(path, method, body, false);
  }
  if (response.status === 204) return undefined as T;
  const raw = await response.text();
  let payload: any = null;
  try { payload = JSON.parse(raw); } catch { /* CORS errors may be plain text. */ }
  if (!response.ok || payload?.success === false) {
    const detail = payload?.data;
    const candidateFields = detail?.validationErrors || detail?.fieldErrors || detail?.errors;
    const fields = typeof candidateFields === 'string' ? candidateFields.trim()
      : candidateFields && Object.keys(candidateFields).length ? candidateFields : undefined;
    const message = payload?.message || detail?.message || (raw.trim() === 'Invalid CORS request'
      ? "The server rejected the request origin (CORS). Restart the frontend to apply the API proxy settings."
      : `API returned HTTP error ${response.status}`);
    const diagnostic = typeof detail?.errorId === 'string' ? ` [HTTP ${response.status}; ${method} ${path.split('?')[0]}; errorId: ${detail.errorId}]` : '';
    throw new ApiError((fields ? `${message}: ${typeof fields === 'string' ? fields : JSON.stringify(fields)}` : message) + diagnostic, response.status, detail);
  }
  // NotificationController returns DTOs directly rather than ApiResponse.
  const endpoint = path.split('?')[0];
  if (endpoint === '/notifications' && method === 'GET' && Array.isArray(payload)) return payload as T;
  if (/^\/notifications\/[^/]+\/read$/.test(endpoint) && method === 'PATCH'
      && payload && typeof payload.notificationId === 'number' && typeof payload.read === 'boolean') return payload as T;
  if (endpoint === '/notifications/unread-count' && method === 'GET'
      && payload && typeof payload.unreadCount === 'number') return payload as T;
  if (!payload || typeof payload.success !== 'boolean') throw new ApiError("The server returned an invalid API response.", response.status);
  return payload.data as T;
}
export const auth = {
  async login(email: string, password: string) { const data = await request('/auth/login', 'POST', { email, password }); setAccessToken(data.accessToken); return data.user; },
  async restore() { const data = await request('/auth/refresh', 'POST', {}, false); setAccessToken(data.accessToken); return data.user; },
  async logout() { try { await request('/auth/logout', 'POST', {}); } finally { clearSession(); } },
  register: (body: { fullName: string; email: string; password: string; phone?: string }) => request('/auth/register', 'POST', body),
  verify: (email: string, otp: string) => request('/auth/verify-email', 'POST', { email, otp }),
  resend: (email: string) => request('/auth/resend-otp', 'POST', { email }),
};
export const idPath = (id: string) => encodeURIComponent(id);
export function rows<T = any>(data: T[] | { content: T[] }): T[] { return Array.isArray(data) ? data : data?.content || []; }
export async function allPages(path: string) {
  const result: any[] = [];
  for (let page = 0; ; page++) {
    const data = await request(`${path}${path.includes('?') ? '&' : '?'}page=${page}&size=100`);
    result.push(...rows(data));
    if (Array.isArray(data) || page + 1 >= data.totalPages) return result;
  }
}
