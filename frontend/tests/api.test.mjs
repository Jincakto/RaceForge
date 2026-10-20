import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, test } from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/api.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const client = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const originalFetch = globalThis.fetch;
const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const wrapped = data => response({ success: true, data });
afterEach(() => { globalThis.fetch = originalFetch; client.clearSession(); delete globalThis.window; });

test('uses credentials and Bearer auth, unwraps envelopes and keeps raw notifications', async () => {
  client.acceptSession({ accessToken: 'access', user: {} });
  globalThis.fetch = async (path, options) => {
    assert.equal(options.credentials, 'include'); assert.equal(options.headers.Authorization, 'Bearer access');
    return path === '/api/notifications' ? response([{ notificationId: 1 }]) : wrapped({ horseId: 7 });
  };
  assert.deepEqual(await client.api('/api/horses/7'), { horseId: 7 });
  assert.deepEqual(await client.api('/api/notifications'), [{ notificationId: 1 }]);
});
test('serializes mutation bodies and supports empty 204 examination responses', async () => {
  globalThis.fetch = async (path, options) => {
    if (path.endsWith('previous-examination')) return new Response(null, { status: 204 });
    assert.equal(options.method, 'POST'); assert.equal(options.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(options.body), { successful: false }); return wrapped(null);
  };
  assert.equal(await client.api('/api/horse-packages/1/simulate-payment', 'POST', { successful: false }), null);
  assert.equal(await client.api('/api/medical/horses/1/previous-examination'), null);
});
test('deduplicates simultaneous refresh and retries with the new access token', async () => {
  client.acceptSession({ accessToken: 'old', user: {} });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let refreshes = 0; let retried = 0;
  globalThis.fetch = async (path, options) => {
    if (path === '/api/auth/refresh') { refreshes++; await gate; return wrapped({ accessToken: 'new', user: {} }); }
    if (options.headers.Authorization === 'Bearer old') return response({ message: 'Expired' }, 401);
    assert.equal(options.headers.Authorization, 'Bearer new'); retried++; return wrapped(path);
  };
  const pending = Promise.all([client.api('/api/horses'), client.api('/api/trainers')]);
  await new Promise(resolve => setImmediate(resolve)); release();
  assert.deepEqual(await pending, ['/api/horses', '/api/trainers']); assert.equal(refreshes, 1); assert.equal(retried, 2);
});
test('a refresh response arriving after logout cannot restore the session', async () => {
  let release;
  globalThis.fetch = () => new Promise(resolve => { release = () => resolve(wrapped({ accessToken: 'stale', user: {} })); });
  const pending = client.restoreSession(); client.clearSession(); release();
  await assert.rejects(pending, /Session ended/);
  globalThis.fetch = async (_path, options) => { assert.equal(options.headers.Authorization, undefined); return wrapped([]); };
  await client.api('/api/horses');
});
test('shows backend validation details and never retries a forbidden mutation', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return response({ success: false, message: 'Validation failed', data: { validationErrors: { horseName: 'Required' } } }, 403); };
  await assert.rejects(client.api('/api/horses', 'POST', {}), error => error.status === 403 && /horseName.*Required/.test(error.message));
  assert.equal(calls, 1);
});
test('expired refresh emits one sign-in event and clears credentials', async () => {
  globalThis.window = new EventTarget(); let expired = 0;
  window.addEventListener('raceforge:session-expired', () => expired++);
  globalThis.fetch = async () => response({ message: 'Expired' }, 401);
  await assert.rejects(client.api('/api/horses'), error => error.status === 401); assert.equal(expired, 1);
});
test('an incorrect current password does not refresh or retry the password mutation', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return response({ success: false, message: 'Current password is invalid', data: { code: 'INVALID_CURRENT_PASSWORD' } }, 401); };
  await assert.rejects(client.api('/api/users/me/password', 'PUT', { currentPassword: 'wrong', newPassword: 'Password123!' }), /Current password is invalid/);
  assert.equal(calls, 1);
});
test('login errors, non-JSON responses and network errors are actionable', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return response({ message: 'Wrong password' }, 401); };
  await assert.rejects(client.login('owner@example.com', 'bad'), /Wrong password/); assert.equal(calls, 1);
  globalThis.fetch = async () => new Response('<html>Vite</html>');
  await assert.rejects(client.api('/api/health'), /invalid response/);
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(client.api('/api/health'), /Cannot connect/);
});
test('query parameters encode search and permission codes without dropping zero', () => {
  assert.equal(client.query({ search: 'Ngựa & A', page: 0, status: '', roleId: null }), '?search=Ng%E1%BB%B1a+%26+A&page=0');
});
