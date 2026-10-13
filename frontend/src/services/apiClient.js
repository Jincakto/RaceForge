// Compatibility adapter: shares authentication and response handling with api.ts.
import { request, json } from './api.ts';
export { tokenStore } from './tokenStore.ts';
const path = p => p.startsWith('/api/') ? p : '/api' + (p.startsWith('/') ? p : '/' + p);
export const api = {
  get: (p, options = {}) => {
    const params = new URLSearchParams();
    Object.entries(options.params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.set(key, String(value));
    });
    const suffix = params.toString();
    return request(path(p) + (suffix ? (p.includes('?') ? '&' : '?') + suffix : ''));
  },
  post: (p, body) => request(path(p), json('POST', body)),
  put: (p, body) => request(path(p), json('PUT', body)),
  patch: (p, body) => request(path(p), json('PATCH', body)),
  delete: p => request(path(p), json('DELETE')),
};
// Previous implementation retained for reference.
// // Compatibility adapter: both frontends share JWT storage, cookies and 401/403 handling.
// import { request,json } from './api.ts';
// export {tokenStore} from './tokenStore.ts';
// const path=p=>p.startsWith('/api/')?p:'/api'+(p.startsWith('/')?p:'/'+p);
// export const api={get:p=>request(path(p)),post:(p,body)=>request(path(p),json('POST',body)),put:(p,body)=>request(path(p),json('PUT',body)),patch:(p,body)=>request(path(p),json('PATCH',body)),delete:p=>request(path(p),json('DELETE'))};
// 