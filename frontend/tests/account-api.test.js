import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
test('Account API transport and session recovery',async t=>{
 const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom'});
 const previousFetch=globalThis.fetch;t.after(async()=>{globalThis.fetch=previousFetch;await server.close();});
 const {request,setSessionRefresh}=await server.ssrLoadModule('/src/services/api.ts');
 const {tokenStore}=await server.ssrLoadModule('/src/services/tokenStore.ts');
 const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
 await t.test('concurrent unauthorized requests share one refresh and replay with new JWT',async()=>{
  tokenStore.set('old',60);let refreshes=0;
  setSessionRefresh(async()=>{refreshes++;await new Promise(r=>setTimeout(r,10));tokenStore.set('new',60);});
  globalThis.fetch=async(_url,init)=>init.headers.get('Authorization')==='Bearer new'?response({success:true,data:{ok:true}}):response({code:'UNAUTHORIZED'},401);
  const results=await Promise.all([request('/api/users/me'),request('/api/users/me')]);
  assert.equal(refreshes,1);assert.deepEqual(results,[{ok:true},{ok:true}]);
 });
 await t.test('invalid current password does not refresh or clear session',async()=>{
  let refreshes=0;setSessionRefresh(async()=>{refreshes++;});tokenStore.set('valid',60);
  globalThis.fetch=async()=>response({code:'INVALID_CURRENT_PASSWORD',message:'Wrong current password'},401);
  await assert.rejects(request('/api/users/me/password'),/Wrong current password/);assert.equal(refreshes,0);assert.equal(tokenStore.get(),'valid');
 });
 await t.test('notification raw response is supported explicitly',async()=>{
  globalThis.fetch=async()=>response([{notificationId:1,read:false}]);
  assert.deepEqual(await request('/api/notifications',{}, {raw:true}),[{notificationId:1,read:false}]);
  await assert.rejects(request('/api/notifications'),/ApiResponse/);
 });
 await t.test('failed refresh stops after one attempt and clears token',async()=>{
  let refreshes=0;setSessionRefresh(async()=>{refreshes++;throw new Error('expired');});tokenStore.set('old',60);
  globalThis.fetch=async()=>response({message:'Unauthorized'},401);
  await assert.rejects(request('/api/users/me'),/Unauthorized/);assert.equal(refreshes,1);assert.equal(tokenStore.get(),null);
 });
 await t.test('forbidden request keeps session and preserves field validation',async()=>{
  tokenStore.set('valid',60);globalThis.fetch=async()=>response({message:'Forbidden',validationErrors:{fullName:'required'}},403);
  await assert.rejects(request('/api/users/me'),e=>e.status===403&&e.validationErrors.fullName==='required');assert.equal(tokenStore.get(),'valid');
 });
});
