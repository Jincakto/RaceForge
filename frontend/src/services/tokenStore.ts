// Access token stays in memory; refresh token belongs to the HttpOnly cookie.
let accessToken: string | null = null;
let expiresAt = 0;
export const tokenStore = {
  set(token: string, expiresInSeconds: number) { accessToken = token; expiresAt = Date.now() + expiresInSeconds * 1000; },
  get() { if (Date.now() >= expiresAt) { accessToken = null; } return accessToken; },
  clear() { accessToken = null; expiresAt = 0; },
};
