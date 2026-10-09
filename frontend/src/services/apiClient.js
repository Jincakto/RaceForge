// Thin fetch wrapper for the Spring Boot REST API.
// Not used yet: the UI still runs on in-memory seed data (see context/AppContext.jsx).
// Configure the backend URL in .env: VITE_API_URL=http://localhost:8080/api

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';
const TOKEN_KEY = 'raceforce.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request(method, path, body) {
  const token = tokenStore.get();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) tokenStore.clear();
  if (!res.ok) {
    const err = new Error((await res.text()) || res.statusText);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};
