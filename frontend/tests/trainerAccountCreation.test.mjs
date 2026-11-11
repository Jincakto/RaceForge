import { sourceNames, sourceUrl, flattenModuleImports } from './sourceFiles.mjs';
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const dir = await mkdtemp(path.join(tmpdir(), 'trainer-account-test-'));
for (const name of sourceNames()) {
  if (!name.endsWith('.ts') || name.endsWith('.d.ts')) continue;
  const source = await readFile(sourceUrl(name), 'utf8');
  const code = ts.transpileModule(source.replaceAll('import.meta.env', '({})'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText.replace(/[\s\S]*/, flattenModuleImports);
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
  const snapshot = { user: { id: 'ADM-001', role: 'admin', apiRoleId: 7 }, users: [] };
  const actions = makeRemoteActions({
    getState: () => snapshot,
    reload: async () => { reloads++; }, success: message => successes.push(message),
    error: message => errors.push(message), navigate: () => {},
  });
  return { actions, calls, successes, errors, snapshot, reloads: () => reloads };
}
const trainer = email => ({ name: 'Trainer Example', email, phone: '', role: 'head_trainer' });

test('admin creates an invited Trainer account; the trainer completes their own profile after activation', async () => {
  const env = setup(() => response({ userId: 'HTR-123', status: 'INVITED' }));
  await env.actions.createAccount(trainer('success@example.test'));
  assert.deepEqual(env.calls.map(c => c.url), ['/api/admin/users']);
  assert.equal(env.calls[0].body.roleId, 2);
  assert.equal(env.successes.length, 1);
  assert.match(env.successes[0], /invitation/i);
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
test('failed invitation does not pretend success, and retry only creates the invited account', async () => {
  let fail = true;
  const env = setup(() => response(fail ? null : { userId: 'HTR-124', status: 'INVITED' }, fail ? 500 : 200));
  const account = trainer('retry@example.test');
  await assert.rejects(env.actions.createAccount(account));
  assert.equal(env.successes.length, 0); assert.equal(env.reloads(), 0);
  fail = false;
  await env.actions.createAccount(account);
  assert.deepEqual(env.calls.map(c => c.url), ['/api/admin/users', '/api/admin/users']);
  assert.equal(env.successes.length, 1); assert.equal(env.reloads(), 1);
});

test('an email already loaded in account management cannot create another account', async () => {
  const env = setup(() => response({ userId: 'HTR-125' }));
  env.snapshot.users.push({ email: 'EXISTING@example.test' });
  await assert.rejects(env.actions.createAccount(trainer('existing@example.test')), /already belongs/);
  assert.equal(env.calls.length, 0); assert.equal(env.successes.length, 0);
});
