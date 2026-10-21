import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import ts from 'typescript';

const dir = await mkdtemp(path.join(tmpdir(), 'raceforge-password-setup-'));
const localRequire = createRequire(new URL('../package.json', import.meta.url));
function compile(source) {
  return ts.transpileModule(source.replace('import.meta.env', '({})'), {
    compilerOptions: { module:ts.ModuleKind.ES2022, target:ts.ScriptTarget.ES2022, jsx:ts.JsxEmit.ReactJSX },
  }).outputText.replace(/(['"])(\.\/[^'"]+)\1/g, (_, quote, specifier) => `${quote}${specifier}.mjs${quote}`)
    .replace(/(['"])(react(?:\/jsx-runtime)?)\1/g, (_, quote, specifier) => `${quote}${pathToFileURL(localRequire.resolve(specifier)).href}${quote}`);
}
for (const name of ['api', 'passwordSetup']) {
  await writeFile(path.join(dir, `${name}.mjs`), compile(await readFile(new URL(`../src/${name}.ts`, import.meta.url), 'utf8')));
}
const api = await import(pathToFileURL(path.join(dir, 'api.mjs')).href);
const flow = await import(pathToFileURL(path.join(dir, 'passwordSetup.mjs')).href);
const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
beforeEach(() => { api.clearSession(); globalThis.window = { location:{ search:'' } }; });
after(async () => {
  globalThis.fetch = originalFetch; globalThis.window = originalWindow;
  if (path.dirname(dir) === tmpdir()) await rm(dir, { recursive:true });
});
const ok = data => new Response(JSON.stringify({ success:true, data, message:'OK' }), { status:200 });

// Render the actual existing LoginPage, without loading the rest of App or
// sending requests. This verifies the real password/login presentation.
const appSource=await readFile(new URL('../src/App.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('App.tsx',appSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const login=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='LoginPage');
const demos=ast.statements.find(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>ts.isIdentifier(d.name)&&d.name.text==='DEMO_ACCOUNTS'));
await writeFile(path.join(dir,'LoginPage.mjs'),compile(`
import { useState, useMemo, useRef } from 'react';
import { auth } from './api';
import { passwordSetupLink, createPasswordSetupSubmitter, passwordSetupError, requestPasswordReset } from './passwordSetup';
${demos.getText(ast)}
${login.getText(ast)}
export { LoginPage };
`));
const { LoginPage }=await import(pathToFileURL(path.join(dir,'LoginPage.mjs')).href);
const {createElement}=localRequire('react');
const {renderToStaticMarkup}=localRequire('react-dom/server');

test('recognizes staff invitations, ordinary resets and malformed empty-token links', () => {
  assert.deepEqual(flow.passwordSetupLink('?invitation=true&token=staff%2Btoken'),{ token:'staff+token', invitation:true });
  assert.deepEqual(flow.passwordSetupLink('?token=reset'),{ token:'reset', invitation:false });
  assert.deepEqual(flow.passwordSetupLink('?invitation=true&token='),{ token:'', invitation:true });
  assert.equal(flow.passwordSetupLink(''),null);
});

test('password links skip restoration whether the browser has no session or an admin session', async () => {
  for (const hasAdminSession of [false,true]) {
    let calls=0; let redirects=0;
    globalThis.fetch = async () => { calls++; return hasAdminSession ? ok({ accessToken:'admin',user:{role:{roleName:'ADMIN'}} }) : new Response('{}',{status:401}); };
    await flow.restoreSessionForLocation(()=>'?invitation=true&token=staff',()=>{redirects++;});
    assert.equal(calls,0); assert.equal(redirects,0);
  }
});

test('normal login still restores a session when no password token is present', async () => {
  const account={userId:'ADM-001',role:{roleName:'ADMIN'}}; let restored;
  globalThis.fetch=async url=>{assert.equal(url,'/api/auth/refresh'); return ok({accessToken:'valid',user:account});};
  await flow.restoreSessionForLocation(()=>'',user=>{restored=user;});
  assert.deepEqual(restored,account);
});

test('a late refresh cannot redirect over a password link', async () => {
  let search=''; let release; let redirects=0;
  globalThis.fetch=()=>new Promise(resolve=>{release=resolve;});
  const pending=flow.restoreSessionForLocation(()=>search,()=>{redirects++;});
  search='?invitation=true&token=staff';
  release(ok({accessToken:'admin',user:{userId:'ADM-001'}}));
  await pending;
  assert.equal(redirects,0);
});

test('staff setup sends only token and the exact new password, even with an existing admin token', async () => {
  api.setAccessToken('existing-admin-session');
  const calls=[];
  globalThis.fetch=async(url,init)=>{ calls.push({url,init}); return ok({message:'activated'}); };
  await flow.createPasswordSetupSubmitter({token:'staff-invitation',invitation:true})(' NewPassword123 ');
  assert.equal(calls.length,1); assert.equal(calls[0].url,'/api/auth/staff/set-password');
  assert.equal(calls[0].init.method,'POST');
  assert.deepEqual(JSON.parse(calls[0].init.body),{token:'staff-invitation',newPassword:' NewPassword123 '});
});

test('ordinary password reset uses the separate reset endpoint', async () => {
  globalThis.fetch=async(url,init)=>{assert.equal(url,'/api/auth/reset-password'); assert.deepEqual(JSON.parse(init.body),{token:'reset',newPassword:'Password123'}); return ok({});};
  await flow.createPasswordSetupSubmitter({token:'reset',invitation:false})('Password123');
});

test('short, blank and oversized passwords and empty tokens never reach BE', async () => {
  let calls=0; globalThis.fetch=async()=>{calls++; return ok({});};
  const submit=flow.createPasswordSetupSubmitter({token:'staff',invitation:true});
  for (const password of ['short','        ','x'.repeat(101)]) await assert.rejects(submit(password),/8–100/);
  await assert.rejects(flow.createPasswordSetupSubmitter({token:'',invitation:true})('Password123'),/missing a verification token/);
  assert.equal(calls,0);
});

test('double submission shares a single in-flight request', async () => {
  let release; let calls=0;
  globalThis.fetch=()=>{calls++; return new Promise(resolve=>{release=resolve;});};
  const submit=flow.createPasswordSetupSubmitter({token:'staff',invitation:true});
  const first=submit('Password123'); const second=submit('Password123');
  assert.equal(first,second); assert.equal(calls,1);
  release(ok({})); await Promise.all([first,second]);
});

test('expired or already-used invitation reports how to obtain a new email', async () => {
  for (const message of ['Expired invitation','Already used invitation']) {
    globalThis.fetch=async()=>new Response(JSON.stringify({success:false,message,data:{code:'INVALID_INVITATION'}}),{status:400});
    let issue;
    try { await flow.createPasswordSetupSubmitter({token:'bad',invitation:true})('Password123'); } catch(e) {issue=e;}
    assert.match(flow.passwordSetupError(issue,true),/administrator to resend the invitation/);
  }
});

test('network errors keep a clear error and allow another attempt', async () => {
  let calls=0;
  globalThis.fetch=async()=>{if(++calls===1)throw new Error('offline'); return ok({});};
  const submit=flow.createPasswordSetupSubmitter({token:'staff',invitation:true});
  let issue; try {await submit('Password123');}catch(e){issue=e;}
  assert.match(flow.passwordSetupError(issue,true),/Cannot connect to the server/);
  await submit('Password123'); assert.equal(calls,2);
});

test('the existing login UI presents password setup without accepting an account email',()=>{
  globalThis.window.location.search='?invitation=true&token=staff';
  const html=renderToStaticMarkup(createElement(LoginPage,{navigate:()=>{},users:[],onLogin:()=>{}}));
  assert.match(html,/Activate staff account/); assert.match(html,/>Set password<\/button>/);
  assert.match(html,/<input[^>]*type="email"[^>]*disabled=""/);
  assert.match(html,/autoComplete="new-password"/); assert.doesNotMatch(html,/token=staff/);
});
test('ordinary login retains its normal label and editable email',()=>{
  const html=renderToStaticMarkup(createElement(LoginPage,{navigate:()=>{},users:[],onLogin:()=>{}}));
  assert.match(html,/Sign in →/); assert.match(html,/autoComplete="current-password"/);
  assert.doesNotMatch(html,/<input[^>]*type="email"[^>]*disabled=""/);
});

test('forgot password sends only recipient email, with no role selector', async () => {
  let calls=0;
  globalThis.fetch=async(url,init)=>{calls++; assert.equal(url,'/api/auth/forgot-password'); assert.deepEqual(JSON.parse(init.body),{email:'staff@example.com'}); return ok({});};
  await flow.requestPasswordReset(' staff@example.com ');
  await assert.rejects(flow.requestPasswordReset('bad'),/valid email address/);
  assert.equal(calls,1);
});
test('password-link form requires two new password fields',()=>{
  globalThis.window.location.search='?token=reset';
  const html=renderToStaticMarkup(createElement(LoginPage,{navigate:()=>{},users:[],onLogin:()=>{}}));
  assert.equal((html.match(/autoComplete="new-password"/g)||[]).length,2);
  assert.match(html,/Confirm new password/);
  assert.doesNotMatch(html,/Forgot password\?/);
});
