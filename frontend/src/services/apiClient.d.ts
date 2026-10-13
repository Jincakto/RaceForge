export { tokenStore } from './tokenStore.ts';
export const api: {
  get<T = any>(path: string, options?: { params?: Record<string, string | number | boolean | undefined> }): Promise<T>;
  post<T = any>(path: string, body?: unknown): Promise<T>;
  put<T = any>(path: string, body?: unknown): Promise<T>;
  patch<T = any>(path: string, body?: unknown): Promise<T>;
  delete<T = any>(path: string): Promise<T>;
};