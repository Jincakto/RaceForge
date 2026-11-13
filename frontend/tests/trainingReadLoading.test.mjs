import { sourceUrl, flattenModuleImports } from './sourceFiles.mjs';
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
const dir=await mkdtemp(path.join(tmpdir(),'training-read-'));
for(const name of ["adminApi", "authApi", "horsesApi", "medicalApi", "notificationsApi", "packagesApi", "trainersApi", "trainingApi", "packageLifecycle", 'trainingAssessment', 'remote','api','trainingSchedule','trainingTimestamp','data','trainingLogic']){
 const source=await readFile(sourceUrl(name+'.ts'),'utf8');
 const output=ts.transpileModule(source.replace('import.meta.env','({})'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace(/[\s\S]*/, flattenModuleImports);
 await writeFile(path.join(dir,name+'.mjs'),output);
}
const {RemoteSourceStore,currentTrainerAssignment,uniqueSessions,loadRemote}=await import(pathToFileURL(path.join(dir,'remote.mjs')));
const {ApiError}=await import(pathToFileURL(path.join(dir,'api.mjs')));
after(()=>rm(dir,{recursive:true,force:true}));
test('technical failure retains only the affected source and retry only calls that source',async()=>{
 const store=new RemoteSourceStore();let version=store.begin('A');
 for(let n=0;n<10;n++)assert.deepEqual(await store.read(version,'horse'+n,async()=>[n],[]),[n]);
 version=store.begin('A');
 assert.deepEqual(await store.read(version,'horse3',async()=>{throw new ApiError('offline',500);},[]),[3]);
 assert.equal(store.issues()[0].stale,true);
 let calls=0;
 version=store.begin('A');
 assert.deepEqual(await store.read(version,'horse2',async()=>{calls++;return [];},[],'horse3'),[2]);
 assert.deepEqual(await store.read(version,'horse3',async()=>{calls++;return [33];},[],'horse3'),[33]);
 assert.equal(calls,1);assert.equal(store.issues().length,0);
});
test('first failed load is marked unavailable rather than successful empty data',async()=>{
 const store=new RemoteSourceStore(),v=store.begin('A');
 assert.deepEqual(await store.read(v,'history',async()=>{throw new ApiError('offline',500);},[]),[]);
 assert.equal(store.issues()[0].stale,false);
});
test('late response cannot restore data following a newer 403',async()=>{
 const store=new RemoteSourceStore();let v=store.begin('A');
 await store.read(v,'horse',async()=>['private'],[]);
 let resolve;v=store.begin('A');const old=store.read(v,'horse',()=>new Promise(r=>{resolve=r;}),[]);
 const rejected=assert.rejects(old,/Superseded/);
 const current=store.begin('A');
 assert.deepEqual(await store.read(current,'horse',async()=>{throw new ApiError('revoked',403);},[]),[]);
 resolve(['old private']);await rejected;
 assert.deepEqual(await store.read(current,'horse',async()=>['unused'],[],'other'),[]);
 assert.equal(store.issues()[0].status,403);
});
test('account switch and logout invalidate caches and pending responses',async()=>{
 const store=new RemoteSourceStore();let v=store.begin('A');
 await store.read(v,'history',async()=>['A'],[]);
 let resolve;const old=store.read(v,'horse',()=>new Promise(r=>{resolve=r;}),[]);
 const rejected=assert.rejects(old,/Superseded/);
 v=store.begin('B');
 assert.deepEqual(await store.read(v,'history',async()=>['unused'],[],'other'),[]);
 resolve(['A']);await rejected;
 store.clear();assert.deepEqual(store.issues(),[]);
});
test('switching horse/request generation does not overwrite newer data',async()=>{
 const store=new RemoteSourceStore();let resolve;
 const first=store.read(store.begin('A'),'HOR-402',()=>new Promise(r=>{resolve=r;}),[]);
 const rejected=assert.rejects(first,/Superseded/);
 const v=store.begin('A');assert.deepEqual(await store.read(v,'HOR-404',async()=>['404'],[]),['404']);
 resolve(['402']);await rejected;
 assert.deepEqual(await store.read(v,'HOR-404',async()=>[],[],'other'),['404']);
});
test('assignment must be accepted and unended; session identities are deduplicated',()=>{
 assert.equal(currentTrainerAssignment({status:'ACCEPTED',ended_at:'2026-11-05'}),false);
 assert.equal(currentTrainerAssignment({status:'ASSIGNED',ended_at:null}),false);
 assert.equal(currentTrainerAssignment({status:'ACCEPTED',ended_at:null}),true);
 assert.deepEqual(uniqueSessions([{id:'S'},{id:'S'},{id:'T'}]).map(x=>x.id),['S','T']);
 assert.equal(uniqueSessions([{id:'S',type:'Saved stage'},{id:'S',type:'Legacy row'}])[0].type,'Saved stage');
});
test('loadRemote keeps a completed registration/history with missing roadmap and isolates schedule failures',async()=>{
 const original=globalThis.fetch;
 const calls=[];
 const user={id:'A',role:'head_trainer',status:'active',verified:true,clubId:'api-center'};
 globalThis.fetch=async(url)=>{
  const p=String(url).replace(/^\/api/,'');calls.push(p);
  let data=[];
  if(p==='/trainer-assignments/me')data=[
   {horse_id:'HOR-1',horse_package_id:'HPG-1',status:'ACCEPTED',ended_at:null,assignee_id:'A',id:'ASN'},
   {horse_id:'HOR-2',horse_package_id:'HPG-2',status:'ACCEPTED',ended_at:null,assignee_id:'A',id:'ASN2'}];
  if(p==='/horse-packages/HPG-1/training-context')data={horseId:'HOR-1',horseName:'History horse',packageId:'PKG',packageName:'Basic',packageStatus:'COMPLETED',paymentStatus:'PAID',roadmapConfigured:false,roadmapConfigurationReason:'ROADMAP_MISSING'};
  if(p==='/horse-packages/HPG-2/training-context')data={horseId:'HOR-2',horseName:'Other horse',packageId:'PKG',packageName:'Basic',packageStatus:'ACTIVE',paymentStatus:'PAID',roadmapConfigured:true};
  if(p==='/trainer-profiles/me')data={trainer_id:'T'};
  if(p==='/trainer-profiles/T/sessions')data=[{session_id:'DONE',horse_id:'HOR-1',plan_id:'PLAN',horse_package_id:'HPG-1',recorded_by:'A',status:'COMPLETED',scheduled_start:'2026-11-01T09:00:00'}];
  if(p==='/training-sessions/horse/HOR-1')return {ok:false,status:500,text:async()=>JSON.stringify({success:false,message:'Schedule unavailable'})};
  if(p==='/training-sessions/horse/HOR-2')data=[{sessionId:'FUTURE',horseId:'HOR-2',status:'SCHEDULED',scheduledStart:'2026-12-01T09:00:00'}];
  return {ok:true,status:200,text:async()=>JSON.stringify({success:true,data})};
 };
 try{
  const data=await loadRemote(user,()=>{});
  assert.equal(data.enrollments.find(e=>e.id==='HPG-1').status,'completed');
  assert.equal(data.enrollments.find(e=>e.id==='HPG-1').roadmapConfigured,false);
  assert.deepEqual(data.trainingSessions.map(s=>s.id).sort(),['DONE','FUTURE']);
  assert.equal(data.trainingLoadIssues.length,1);
  assert.equal(data.trainingLoadIssues[0].key,'Training schedule HOR-1');
 } finally{globalThis.fetch=original;}
});