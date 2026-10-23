import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const dir = await mkdtemp(path.join(tmpdir(), 'trainer-account-test-'));
const src = new URL('../src/', import.meta.url);
for (const name of await readdir(src)) {
  if (!name.endsWith('.ts') || name.endsWith('.d.ts')) continue;
  const source = await readFile(new URL(name, src), 'utf8');
  const code = ts.transpileModule(source.replaceAll('import.meta.env', '({})'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText.replace(/(['"])(\.\/[^'"]+)\1/g, (_, quote, specifier) => `${quote}${specifier}.mjs${quote}`);
  await writeFile(path.join(dir, name.replace(/\.ts$/, '.mjs')), code);
}
const { makeRemoteActions } = await import(pathToFileURL(path.join(dir, 'remoteActions.mjs')).href);
const originalFetch = globalThis.fetch;
after(async () => { globalThis.fetch = originalFetch; await rm(dir, { recursive: true, force: true }); });
const response = (data, status = 200) => new Response(JSON.stringify({ success: status < 400, data, message: status < 400 ? 'OK' : 'Denied' }), { status });
function setup(handler) {
  const calls = [], successes = [], errors = [];
  let reloads = 0;
  globalThis.fetch = async (url, options) => {
    const call = { url, method: options.method, body: options.body ? JSON.parse(options.body) : undefined };
    calls.push(call);
    return handler(call);
  };
  const actions = makeRemoteActions({
    getState: () => ({ user: { id: 'ADM-001', role: 'admin', apiRoleId: 7 }, users: [] }),
    reload: async () => { reloads++; }, success: message => successes.push(message),
    error: message => errors.push(message), navigate: () => {},
  });
  return { actions, calls, successes, errors, reloads: () => reloads };
}
const trainer = email => ({ name: 'Trainer Example', email, phone: '', role: 'head_trainer' });

test('creates User before an empty trainer profile using the returned ID', async () => {
  const env = setup(call => response(call.url.endsWith('/admin/users') ? { userId: 'HTR-123' } : { trainer_id: 'HTR-456' }));
  await env.actions.createAccount(trainer('success@example.test'));
  assert.deepEqual(env.calls.map(c => c.url), ['/api/admin/users', '/api/trainer-profiles']);
  assert.equal(env.calls[0].body.roleId, 2);
  assert.deepEqual(env.calls[1], { url: '/api/trainer-profiles', method: 'POST', body: { userId: 'HTR-123', bio: '', qualifications: '' } });
  assert.equal(env.successes.length, 1);
  assert.equal(env.reloads(), 1);
});
test('other staff roles only create User', async () => {
  const env = setup(() => response({ userId: 'VET-123' }));
  await env.actions.createAccount({ ...trainer('vet@example.test'), role: 'veterinarian' });
  assert.deepEqual(env.calls.map(c => c.url), ['/api/admin/users']);
});
test('User failure never calls trainer profile creation', async () => {
  const env = setup(() => response(null, 409));
  await assert.rejects(env.actions.createAccount(trainer('failed@example.test')));
  assert.equal(env.calls.length, 1);
  assert.equal(env.successes.length, 0);
});
test('profile failure reports partial success and retry does not create User again', async () => {
  let failProfile = true;
  const env = setup(call => call.url.endsWith('/admin/users') ? response({ userId: 'HTR-124' }) : response({}, failProfile ? 403 : 200));
  const account = trainer('retry@example.test');
  await assert.rejects(env.actions.createAccount(account), /HTR-124 was created, but its professional profile could not be created/);
  assert.equal(env.successes.length, 0);
  failProfile = false;
  await env.actions.createAccount(account);
  assert.deepEqual(env.calls.map(c => c.url), ['/api/admin/users', '/api/trainer-profiles', '/api/trainer-profiles']);
  assert.equal(env.calls[2].body.userId, 'HTR-124');
  assert.equal(env.successes.length, 1);
});
