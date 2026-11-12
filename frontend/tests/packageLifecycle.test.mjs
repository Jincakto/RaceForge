import { sourceNames, sourceUrl, flattenModuleImports } from './sourceFiles.mjs';
import { test, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
const dir=await mkdtemp(path.join(tmpdir(),'raceforge-package-lifecycle-'));
for(const name of sourceNames()){
 if(!name.endsWith('.ts') || name.endsWith('.d.ts'))continue;
 const code=ts.transpileModule((await readFile(sourceUrl(name),'utf8')).replaceAll('import.meta.env','({})'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace(/[\s\S]*/,flattenModuleImports);
 await writeFile(path.join(dir,name.replace(/\.ts$/,'.mjs')),code);
}
const p=await import(pathToFileURL(path.join(dir,'packageLifecycle.mjs')));
const {makeRemoteActions}=await import(pathToFileURL(path.join(dir,'remoteActions.mjs')));
const api=await import(pathToFileURL(path.join(dir,'api.mjs')));
const {sessionFromApi}=await import(pathToFileURL(path.join(dir,'remote.mjs')));
const originalFetch=globalThis.fetch;let seq=0;
after(async()=>{globalThis.fetch=originalFetch;await rm(dir,{recursive:true,force:true});});beforeEach(()=>api.clearSession());
const trainer={id:'TRAINER',role:'head_trainer',status:'active'};
const owner={id:'OWNER',role:'owner',status:'active'};
const entry=(extra={})=>({id:'HPG-'+(++seq),horseId:'HOR-1',packageId:'PKG-1',packageName:'Foundation',apiStatus:'ACTIVE',status:'active',paymentStatus:'PAID',trainerId:trainer.id,trainerStatus:'confirmed',startedAt:'01/01/2000',expiresAt:'31/12/2099',...extra});
const session=(e,extra={})=>({id:'SES',horseId:e.horseId,horsePackageId:e.id,status:'Completed',...extra});
const sources=e=>['Training schedule '+e.horseId,'Assigned packages '+e.id];
const ok=data=>new Response(JSON.stringify({success:true,data}),{headers:{'Content-Type':'application/json'}});
const wire=(e,status,deleted=0)=>({registration:{horsePackageId:e.id,horseId:e.horseId,packageId:e.packageId,status,paymentStatus:'PAID'},deletedSessionCount:deleted,certificate:status==='COMPLETED'?{certificateNumber:'CERT-1',issueDate:'2026-11-12'}:null});
function env(e,user=trainer,override={}){
 const state={user,horses:[{id:e.horseId,ownerId:owner.id}],packages:[],enrollments:[e],trainingSessions:[session(e)],trainingLoadedSources:sources(e)};
 const events=[];const remote=makeRemoteActions({getState:()=>state,reload:async()=>{events.push('reload');},applyPackageLifecycle:r=>events.push(r),success:m=>events.push(m),error:()=>{},navigate:()=>{},...override});
 return {remote,state,events};
}
test('completion needs the current trainer, paid active term, successfully loaded context and complete session list',()=>{
 const e=entry(),rows=[session(e)],check=(patch={},u=trainer,r=rows,loaded=sources(e),issues=[])=>p.completionBlockReason({...e,...patch},u,r,loaded,issues,new Date('2026-11-12T12:00:00Z'));
 assert.equal(check(),null);
 for(const patch of [{trainerId:'OTHER'},{trainerStatus:'pending'},{apiStatus:'PAUSED'},{paymentStatus:'PENDING'},{expiresAt:'01/01/2001'},{startedAt:'01/01/2099'}])assert.ok(check(patch));
 assert.ok(check({},owner));assert.ok(check({},trainer,[]));assert.ok(check({},trainer,rows,[]));assert.ok(check({},trainer,rows,sources(e),[{key:'Training schedule '+e.horseId,status:500,stale:true}]));
 for(const status of ['Scheduled','In Progress'])assert.ok(check({},trainer,[session(e,{status,actualStart:'2026-11-12T09:00',actualEnd:'2026-11-12T09:30'})]));
 assert.equal(check({},trainer,[session(e,{status:'Not Performed'}),session(e,{status:'Cancelled'})]),null);
 assert.ok(check({},trainer,[session(e,{status:'Cancelled'})]));
});
test('owner cancellation is limited to owned active/paused paid registrations and notices unfinished stopped exercise',()=>{
 const e=entry();assert.equal(p.canCancelRegistration(e,owner,owner.id),true);assert.equal(p.canCancelRegistration({...e,apiStatus:'PAUSED'},owner,owner.id),true);
 for(const status of ['PENDING','COMPLETED','CANCELLED','EXPIRED','FAILED'])assert.equal(p.canCancelRegistration({...e,apiStatus:status},owner,owner.id),false);
 assert.equal(p.canCancelRegistration(e,owner,'OTHER'),false);assert.equal(p.canCancelRegistration(e,trainer,owner.id),false);
 assert.equal(p.canCancelRegistration({...e,paymentStatus:'PENDING'},owner,owner.id),false);
 assert.equal(p.unfinishedPackageSession(e,[session(e,{status:'In Progress',actualStart:'2026-11-12T09:00',actualEnd:'2026-11-12T09:30'})]),true);
});
test('terminal labels distinguish cancelled, completed, expired and failed without changing persisted status',()=>{
 for(const [status,label] of Object.entries({CANCELLED:'Cancelled',COMPLETED:'Completed',EXPIRED:'Expired',FAILED:'Failed'}))assert.equal(p.registrationStatus(entry({apiStatus:status,status:'completed'})),label);
});
test('complete sends a bodyless PATCH, maps certificate, reloads, and never repeats a confirmed mutation',async()=>{
 const e=entry(),{remote,events}=env(e);let calls=0;
 globalThis.fetch=async(url,init)=>{calls++;assert.equal(url,'/api/horse-packages/'+e.id+'/complete');assert.equal(init.method,'PATCH');assert.equal(init.body,undefined);return ok(wire(e,'COMPLETED'));};
 const r=await remote.completePackage(e.id);assert.equal(r.ok,true);assert.equal(r.data.registration.apiStatus,'COMPLETED');assert.equal(r.data.certificate.certificateNumber,'CERT-1');assert.ok(events.includes('reload'));
 assert.equal((await remote.completePackage(e.id)).ok,true);assert.equal(calls,1);
});
test('cancel sends a bodyless PATCH and preserves the backend deleted count',async()=>{
 const e=entry(),{remote}=env(e,owner);globalThis.fetch=async(url,init)=>{assert.equal(url,'/api/horse-packages/'+e.id+'/cancel');assert.equal(init.method,'PATCH');assert.equal(init.body,undefined);return ok(wire(e,'CANCELLED',3));};
 const r=await remote.cancelRegistration(e.id);assert.equal(r.ok,true);assert.equal(r.data.deletedSessionCount,3);assert.equal(r.data.registration.apiStatus,'CANCELLED');
});
test('a rejected action retains the backend reason and does not claim success',async()=>{
 const e=entry(),{remote}=env(e);globalThis.fetch=async()=>new Response(JSON.stringify({success:false,message:'Every session must be finished',data:{code:'PACKAGE_SESSIONS_NOT_FINISHED'}}),{status:409});
 const r=await remote.completePackage(e.id);assert.equal(r.ok,false);assert.match(r.message,/Every session/);
});
test('success followed by refresh failure remains success and cannot send the mutation again',async()=>{
 const e=entry(),{remote}=env(e,trainer,{reload:async()=>{throw new Error('Offline');}});let calls=0;globalThis.fetch=async()=>{calls++;return ok(wire(e,'COMPLETED'));};
 const r=await remote.completePackage(e.id);assert.equal(r.ok,true);assert.match(r.data.refreshWarning,/succeeded/);await remote.completePackage(e.id);assert.equal(calls,1);
});
test('concurrent clicks send only one mutation',async()=>{
 const e=entry(),{remote}=env(e);let release,calls=0;const gate=new Promise(resolve=>release=resolve);
 globalThis.fetch=async()=>{calls++;await gate;return ok(wire(e,'COMPLETED'));};
 const first=remote.completePackage(e.id);const second=await remote.completePackage(e.id);assert.equal(second.ok,false);release();assert.equal((await first).ok,true);assert.equal(calls,1);
});
test('a lost owner response is reconciled via GET and never invents a deleted count',async()=>{
 const e=entry(),{remote}=env(e,owner);let patches=0;
 globalThis.fetch=async(_url,init)=>{if(init.method==='PATCH'){patches++;throw new TypeError('Connection lost');}return ok(wire(e,'CANCELLED',4));};
 const r=await remote.cancelRegistration(e.id);assert.equal(r.ok,true);assert.equal(r.data.reconciled,true);assert.equal(r.data.deletedSessionCount,undefined);assert.equal(patches,1);
});
test('unconfirmed trainer completion only checks status on retry and never blindly repeats PATCH',async()=>{
 const e=entry(),{remote}=env(e);let patches=0;
 globalThis.fetch=async(_url,init)=>{if(init.method==='PATCH')patches++;throw new TypeError('Offline');};
 const r=await remote.completePackage(e.id);assert.equal(r.ok,false);assert.equal(r.uncertain,true);await remote.completePackage(e.id);assert.equal(patches,1);
});
test('forbidden roles or unfinished owner exercise are blocked before mutation',async()=>{
 const e=entry(),a=env(e,owner);a.state.trainingSessions=[session(e,{status:'In Progress',actualStart:'2026-11-12T09:00'})];let calls=0;globalThis.fetch=async()=>{calls++;return ok({});};
 assert.equal((await a.remote.cancelRegistration(e.id)).ok,false);assert.equal((await a.remote.completePackage(e.id)).ok,false);assert.equal(calls,0);
});
test('session adapter preserves actualStart so stopped unfinished work cannot bypass the cancel warning',()=>{
 const row=sessionFromApi({sessionId:'SES',horsePackageId:'HPG',horseId:'HOR',status:'SCHEDULED',actualStart:'2026-11-12T09:00',actualEnd:'2026-11-12T09:30'});
 assert.equal(row.status,'In Progress');assert.equal(row.actualStart,'2026-11-12T09:00');assert.ok(row.actualEnd);
});