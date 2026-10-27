import {test,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';import ts from 'typescript';
const dir=await mkdtemp(path.join(tmpdir(),'raceforge-package-builder-'));
for(const file of await readdir(new URL('../src/',import.meta.url))) {
 if(!file.endsWith('.ts')||file.endsWith('.d.ts'))continue;
 const source=await readFile(new URL('../src/'+file,import.meta.url),'utf8');
 const output=ts.transpileModule(source.replaceAll('import.meta.env','({})'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText.replace(/(['"])(\.\/[^'"]+)\1/g,(_,q,s)=>q+s+'.mjs'+q);
 await writeFile(path.join(dir,file.replace(/\.ts$/,'.mjs')),output);
}
const b=await import(pathToFileURL(path.join(dir,'packageBuilder.mjs')));
const api=await import(pathToFileURL(path.join(dir,'api.mjs')));
const {readPackageCurriculum}=await import(pathToFileURL(path.join(dir,'packageCurriculum.mjs')));
const {makeRemoteActions}=await import(pathToFileURL(path.join(dir,'remoteActions.mjs')));
const originalFetch=globalThis.fetch;after(async()=>{globalThis.fetch=originalFetch;await rm(dir,{recursive:true,force:true});});beforeEach(()=>api.clearSession());
const stage=(startDay=1,endDay=10,extra={})=>({title:'Foundation',objective:'Build stamina',phaseCode:'FOUNDATION',startDay,endDay,activityName:'Easy canter',daysOfWeek:['MONDAY','WEDNESDAY','FRIDAY'],sessionTime:'07:00:00',sessionEndTime:'07:30:00',intensity:'LOW',...extra});
const roadmap=(stages=[stage()])=>({title:'Package curriculum',goal:'Improve endurance safely',revision:4,stages});
const draft=()=>({name:'New racing package',description:'A separate curriculum',packageType:'RACING',durationDays:90,price:1500000.25,sessions:0,roadmapTemplate:b.copyRoadmap(roadmap())});
const ok=data=>new Response(JSON.stringify({success:true,message:'OK',data}),{status:200});
function actions(){const events=[];const state={packages:[],user:{id:'CM-001',role:'manager'}};return {events,remote:makeRemoteActions({getState:()=>state,reload:async()=>{events.push('reload');},success:()=>events.push('success'),error:()=>events.push('error'),navigate:()=>{}})};}

test('new-package durations are restricted by type without changing legacy sources',()=>{
 assert.deepEqual(b.PACKAGE_DURATIONS,{RACING:[90,180],BASIC:[30,60,90],PERFORMANCE:[30,60,90],RECOVERY:[30,60]});
 for(const type of Object.keys(b.PACKAGE_DURATIONS))for(const days of b.PACKAGE_DURATIONS[type])assert.equal(b.packageInfoErrors({...draft(),packageType:type,durationDays:days}).durationDays,undefined);
 for(const days of [0,NaN,45,120])assert.ok(b.packageInfoErrors({...draft(),durationDays:days}).durationDays);
 const source=roadmap([stage(1,45)]);assert.equal(b.copyRoadmap(source).stages[0].endDay,45);assert.equal(source.stages[0].endDay,45);
 const recovery=roadmap([stage(1,21)]);assert.equal(b.copyRoadmap(recovery).stages[0].endDay,21);
});
test('package metadata follows DTO limits and decimal price rules',()=>{
 assert.deepEqual(b.packageInfoErrors({...draft(),name:'A'.repeat(100),description:'X'.repeat(500),price:0}),{});
 for(const change of [{name:''},{name:'A'.repeat(101)},{description:'X'.repeat(501)},{price:NaN},{price:-1},{price:10000000000},{price:1.001}])assert.ok(Object.keys(b.packageInfoErrors({...draft(),...change})).length);
});
test('copying curriculum and stages produces independent drafts and preserves phase metadata',()=>{
 const source=roadmap();Object.freeze(source.stages[0].daysOfWeek);Object.freeze(source.stages[0]);Object.freeze(source.stages);
 const copy=b.copyRoadmap(source);assert.equal(copy.revision,undefined);copy.stages[0].daysOfWeek.push('TUESDAY');copy.stages[0].activityName='Walk';copy.title='Changed';
 assert.equal(source.title,'Package curriculum');assert.equal(source.stages[0].activityName,'Easy canter');assert.equal(source.stages[0].daysOfWeek.length,3);assert.equal(copy.stages[0].phaseCode,'FOUNDATION');
 const added=b.appendStage([],source.stages[0]);added[0].daysOfWeek.pop();assert.equal(source.stages[0].daysOfWeek.length,3);
});
test('reorder proposal keeps duration and preceding gap with its stage without mutating the draft',()=>{
 const stages=[stage(3,7,{title:'A'}),stage(11,16,{title:'B'}),stage(18,20,{title:'C'})];const before=structuredClone(stages);
 const proposal=b.proposeStageMove(stages,2,0);assert.deepEqual(stages,before);
 assert.deepEqual(proposal.rows.map(r=>[r.title,r.duration,r.gapBefore,r.newStart,r.newEnd]),[['C',3,1,2,4],['A',5,2,7,11],['B',6,3,15,20]]);
 assert.deepEqual(proposal.stages.map(s=>s.title),['C','A','B']);assert.equal(proposal.stages.at(-1).endDay,20);
 assert.throws(()=>b.proposeStageMove([stage(1,8),stage(5,10)],0,1),/Correct/);
});
test('adding stages does not stretch them and gaps include the final package days',()=>{
 assert.deepEqual(b.uncoveredDays([stage(3,7),stage(11,16)],30),[{start:1,end:2},{start:8,end:10},{start:17,end:30}]);
 const old=stage(10,20);const copied=b.appendStage([stage(1,5)],old);assert.equal(copied[1].startDay,6);assert.equal(copied[1].endDay,16);assert.equal(old.startDay,10);
 const fresh=b.appendStage(copied);assert.equal(fresh[2].startDay,17);assert.equal(fresh[2].phaseCode,'CUSTOM');
 assert.deepEqual(b.uncoveredDays([],30),[{start:1,end:30}]);
});
test('inline stage errors identify dates, order, metadata, weekdays and invalid times',()=>{
 for(const [change,field] of [[{endDay:91},'endDay'],[{startDay:0},'startDay'],[{title:''},'title'],[{phaseCode:''},'metadata'],[{daysOfWeek:[]},'daysOfWeek'],[{sessionTime:'25:00'},'sessionTime'],[{sessionEndTime:'06:00'},'sessionEndTime'],[{intensity:'UNKNOWN'},'intensity']]){
  const result=b.stageDraftErrors(roadmap([stage(1,10,change)]),90);assert.ok(result.stages[0][field],field);
 }
 const reversed=b.stageDraftErrors(roadmap([stage(20,25),stage(1,10)]),90);assert.match(reversed.stages[1].startDay,/displayed order/);
});
test('combined schedules are checked for every possible start weekday',()=>{
 const value=roadmap([stage(1,6,{daysOfWeek:['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY']}),stage(7,30,{daysOfWeek:['TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY']})]);
 const result=b.stageDraftErrors(value,30);assert.match(result.fields.calendar,/rest day/);assert.ok(result.stages.every(s=>s.daysOfWeek));
 assert.deepEqual(b.stageDraftErrors(roadmap([stage(1,21)]),30),{fields:{},stages:[{}]});
});
test('same-type source packages load their own curricula by package ID and failed reads can retry',async()=>{
 const calls=[];let failed=true;
 globalThis.fetch=async url=>{calls.push(String(url));if(String(url).includes('PKG-B')&&failed){failed=false;return new Response(JSON.stringify({success:false,message:'Source unavailable'}),{status:500});}return ok(roadmap([stage(1,45,{title:String(url).includes('PKG-A')?'Curriculum A':'Curriculum B'})]));};
 const a=await readPackageCurriculum('PKG-A');await assert.rejects(readPackageCurriculum('PKG-B'),/Source unavailable/);const c=await readPackageCurriculum('PKG-B');
 assert.equal(a.stages[0].title,'Curriculum A');assert.equal(c.stages[0].title,'Curriculum B');assert.ok(calls.every(p=>p.startsWith('/api/training-packages/')&&p.endsWith('/roadmap-template')));
});
test('save sends one POST with full ordered metadata and the independent roadmap',async()=>{
 const {remote,events}=actions();const d=draft();d.roadmapTemplate=b.copyRoadmap(roadmap([stage(1,10),stage(15,30,{phaseCode:'RACE_PREP',intensity:'HIGH'})]));let payload;let posts=0;
 globalThis.fetch=async(url,init)=>{posts++;assert.equal(url,'/api/training-packages');assert.equal(init.method,'POST');payload=JSON.parse(init.body);return ok({packageId:'PKG-NEW',packageName:d.name,durationDays:90,price:d.price,status:'ACTIVE'});};
 const result=await remote.savePackage(d);assert.equal(result.ok,true);assert.equal(result.data.id,'PKG-NEW');assert.equal(posts,1);assert.deepEqual(payload.roadmapTemplate,d.roadmapTemplate);assert.deepEqual(payload.roadmapTemplate.stages.map(s=>s.startDay),[1,15]);assert.equal(payload.roadmapTemplate.stages[1].phaseCode,'RACE_PREP');assert.deepEqual(events,['reload','success']);
});
test('duplicate save is blocked while a POST is in flight',async()=>{
 const {remote,events}=actions();let release;let posts=0;globalThis.fetch=async()=>{posts++;await new Promise(resolve=>{release=resolve;});return ok({packageId:'PKG-NEW'});};
 const first=remote.savePackage(draft());const second=await remote.savePackage(draft());assert.equal(second.ok,false);assert.equal(posts,1);release();assert.equal((await first).ok,true);assert.equal(events.filter(e=>e==='success').length,1);
});
test('failed save keeps the original draft intact, never reports success and allows retry',async()=>{
 const {remote,events}=actions();const d=draft();const original=structuredClone(d);let calls=0;
 globalThis.fetch=async()=>++calls===1?new Response(JSON.stringify({success:false,message:'Save failed'}),{status:500}):ok({packageId:'PKG-NEW'});
 assert.equal((await remote.savePackage(d)).ok,false);assert.deepEqual(d,original);assert.deepEqual(events,['error']);assert.equal((await remote.savePackage(d)).ok,true);assert.equal(calls,2);assert.deepEqual(d,original);
});
test('invalid duration or unconfirmed date order cannot reach the save API',async()=>{
 const {remote}=actions();let calls=0;globalThis.fetch=async()=>{calls++;return ok({});};
 assert.equal((await remote.savePackage({...draft(),durationDays:45})).ok,false);
 assert.equal((await remote.savePackage({...draft(),roadmapTemplate:roadmap([stage(20,25),stage(1,10)])})).ok,false);assert.equal(calls,0);
});


test('incomplete source metadata is reported instead of supplying placeholder curriculum',async()=>{
 globalThis.fetch=async()=>ok({stages:[stage()]});
 await assert.rejects(readPackageCurriculum('PKG-INCOMPLETE'),/missing its title or goal/);
});
