import {test,after,beforeEach} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,readdir,readFile,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';import ts from 'typescript';
const dir=await mkdtemp(path.join(tmpdir(),'session-preview-'));
for(const file of await readdir(new URL('../src/',import.meta.url))){if(!file.endsWith('.ts')||file.endsWith('.d.ts'))continue;const source=await readFile(new URL('../src/'+file,import.meta.url),'utf8');const code=ts.transpileModule(source.replaceAll('import.meta.env','({})'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText.replace(/(['"])(\.\/[^'"]+)\1/g,(_,q,s)=>q+s+'.mjs'+q);await writeFile(path.join(dir,file.replace(/\.ts$/,'.mjs')),code);}
const p=await import(pathToFileURL(path.join(dir,'sessionPreview.mjs')));const api=await import(pathToFileURL(path.join(dir,'api.mjs')));const {makeRemoteActions}=await import(pathToFileURL(path.join(dir,'remoteActions.mjs')));
const originalFetch=globalThis.fetch;after(async()=>{globalThis.fetch=originalFetch;await rm(dir,{recursive:true,force:true});});beforeEach(()=>api.clearSession());
const stage=(extra={})=>({startDay:1,endDay:30,daysOfWeek:['MONDAY','WEDNESDAY','FRIDAY'],sessionTime:'09:00:00',sessionEndTime:'09:30:00',activityName:'Canter',intensity:'LOW',phaseCode:'FOUNDATION',title:'Foundation',...extra});
const ctx=(extra={})=>({planId:'PLN-1',horseId:'HOR-1',trainerId:'USR-1',startDate:'07/01/2030',endDate:'05/02/2030',stages:[stage()],sessions:[],now:new Date('2030-01-06T00:00:00Z'),...extra});
const row=(extra={})=>({key:'a',stageIndex:0,date:'07/01/2030',time:'09:00',endTime:'09:30',type:'Canter',distance:'',targetTime:'',notes:'',...extra});
const session=(extra={})=>({id:'SES-1',planId:'OTHER',horseId:'HOR-1',trainerId:'USR-1',date:'07/01/2030',time:'09:00',endTime:'10:00',status:'Scheduled',...extra});
test('overlapping horse, trainer and preview rows have individual conflict errors',()=>{
 assert.match(p.rowProblem(row(),[row()],ctx({sessions:[session()]})),/horse/);
 assert.match(p.rowProblem(row(),[row()],ctx({sessions:[session({horseId:'HOR-2'})]})),/trainer/);
 const rows=[row(),row({key:'b',time:'09:15',endTime:'09:45'})];assert.ok(rows.every(r=>p.rowProblem(r,rows,ctx())));
 assert.equal(p.rowProblem(row({time:'10:00',endTime:'10:30'}),[],ctx({sessions:[session()]})),'');
});
test('invalid dates, stage gaps, past starts and inverted times cannot be scheduled',()=>{
 assert.match(p.rowProblem(row({date:'06/02/2030'}),[],ctx()),/stage/);
 assert.match(p.rowProblem(row(),[],ctx({now:new Date('2030-01-08T00:00:00Z')})),/future/);
 assert.match(p.rowProblem(row({endTime:'08:30'}),[],ctx()),/End time/);
 assert.match(p.rowProblem(row({date:'09/01/2030'}),[],ctx({stages:[stage({endDay:2}),stage({startDay:5})]})),/stage/);
});
test('free-slot suggestions preserve duration and avoid both horse and trainer schedules',()=>{
 const c=ctx({sessions:[session({horseId:'HOR-2'}),session({id:'SES-2',time:'08:00',endTime:'09:00'})]});const before=row();const original=structuredClone(before);const result=p.suggestFreeSlot(before,[],c,'07:00','12:00');assert.ok(result);assert.equal(p.rowProblem(result,[result],c),'');assert.deepEqual(before,original);assert.equal((Number(result.endTime.slice(0,2))*60+Number(result.endTime.slice(3)))-(Number(result.time.slice(0,2))*60+Number(result.time.slice(3))),30);
 assert.equal(result.date,'08/01/2030');
});
test('suggestions return no result when the stage has no free slots and never spill into another stage',()=>{
 const c=ctx({stages:[stage({endDay:1}),stage({startDay:2})],sessions:[session({time:'07:00',endTime:'19:00'})]});assert.equal(p.suggestFreeSlot(row(),[],c),null);
 assert.equal(p.suggestFreeSlot(row(),[],ctx(),'19:00','07:00'),null);
});
test('combined preview obeys six distinct days per week, while extra same-day slots are allowed',()=>{
 const rows=Array.from({length:7},(_,i)=>row({key:String(i),date:String(7+i).padStart(2,'0')+'/01/2030'}));assert.ok(rows.every(r=>p.rowProblem(r,rows,ctx()).includes('six')));
 const six=rows.slice(0,6);const extra=row({key:'extra',time:'10:00',endTime:'10:30'});assert.equal(p.rowProblem(extra,[...six,extra],ctx()),'');
});
test('resolving conflicts considers other draft rows and leaves unresolved rows visible',()=>{
 const rows=[row(),row({key:'b'})];const result=p.suggestConflicts(rows,ctx());assert.equal(result.unresolved.length,0);assert.ok(result.changed>0);assert.ok(result.rows.every(r=>!p.rowProblem(r,result.rows,ctx())));assert.deepEqual(rows,[row(),row({key:'b'})]);
 const full=ctx({stages:[stage({endDay:1})],sessions:[session({time:'07:00',endTime:'19:00'})]});assert.deepEqual(p.suggestConflicts([row()],full).unresolved,['a']);
});
test('saved rows are recognized on retry and template preview skips past starts',()=>{
 const c=ctx({sessions:[session({planId:'PLN-1',endTime:'09:30'})]});assert.equal(p.persistedRow(row(),c).id,'SES-1');assert.equal(p.rowProblem(row(),[row()],c),'');assert.equal(p.suggestFreeSlot(row(),[],c)?.date,'08/01/2030');
 assert.ok(p.templatePreview(ctx({now:new Date('2030-01-20T00:00:00Z')})).every(r=>r.date.split('/').reverse().join('-')>='2030-01-20'));
});
const ok=data=>new Response(JSON.stringify({success:true,data,message:'OK'}),{status:200});
function actions(){const events=[];const state={user:{id:'USR-1',role:'head_trainer'},trainingPlans:[{id:'PLN-1',horseId:'HOR-1',startDate:'07/01/2030',endDate:'05/02/2030'}],trainingSessions:[]};return {state,events,remote:makeRemoteActions({getState:()=>state,reload:async()=>events.push('reload'),success:()=>events.push('success'),error:()=>events.push('error'),navigate:()=>{}})};}
const wire=(id,body)=>({sessionId:id,planId:body.planId,horseId:body.horseId,scheduledStart:body.scheduledTime,scheduledEnd:body.scheduledEnd,status:'SCHEDULED',intensity:'LOW'});
test('custom preview saves the edited dates and times through the existing single-session API',async()=>{
 const {remote,events}=actions();const posts=[];globalThis.fetch=async(url,init)=>{if(String(url).endsWith('/stages'))return ok([stage()]);if(!init?.method||init.method==='GET')return ok([]);assert.equal(url,'/api/training-sessions');const body=JSON.parse(init.body);posts.push(body);return ok(wire('SES-'+posts.length,body));};
 const result=await remote.generateSessions('HOR-1','PLN-1',[row({time:'11:00',endTime:'11:30'})],{mode:'preview'});assert.equal(result.ok,true);assert.equal(posts.length,1);assert.equal(posts[0].scheduledTime,'2030-01-07T11:00:00');assert.deepEqual(events,['reload','success']);
});
test('invalid preview rows block all writes',async()=>{
 const {remote}=actions();let writes=0;globalThis.fetch=async(url,init)=>{if(init?.method==='POST'){writes++;return ok({});}return ok(String(url).endsWith('/stages')?[stage()]:[]);};
 assert.equal((await remote.generateSessions('HOR-1','PLN-1',[row(),row({key:'b'})],{mode:'preview'})).ok,false);assert.equal(writes,0);
});
test('partial save reports confirmed rows and retry never recreates them',async()=>{
 const {remote,events}=actions();let calls=0;const saved=[];let fail=true;globalThis.fetch=async(url,init)=>{if(String(url).endsWith('/stages'))return ok([stage()]);if(init?.method!=='POST')return ok(saved);calls++;if(calls===2&&fail){fail=false;return new Response(JSON.stringify({success:false,message:'Conflict changed'}),{status:409});}const value=wire('SES-'+calls,JSON.parse(init.body));saved.push(value);return ok(value);};
 const rows=[row(),row({key:'b',time:'11:00',endTime:'11:30'})];const first=await remote.generateSessions('HOR-1','PLN-1',rows,{mode:'preview'});assert.equal(first.ok,false);assert.match(first.message,/1 of 2/);assert.equal(events.includes('success'),false);assert.equal(saved.length,1);
 const second=await remote.generateSessions('HOR-1','PLN-1',rows,{mode:'preview'});assert.equal(second.ok,true);assert.equal(saved.length,2);assert.equal(calls,3);
});
test('lost response after commit is recovered by reading saved sessions before retry',async()=>{
 const {remote}=actions();const saved=[];let posts=0;globalThis.fetch=async(url,init)=>{if(String(url).endsWith('/stages'))return ok([stage()]);if(init?.method!=='POST')return ok(saved);posts++;saved.push(wire('SES-1',JSON.parse(init.body)));throw Error('Lost response');};
 const result=await remote.generateSessions('HOR-1','PLN-1',[row()],{mode:'preview'});assert.equal(result.ok,true);assert.equal(posts,1);assert.equal(result.data[0].id,'SES-1');
});
test('fresh schedules for the trainers other horses prevent writes into newly occupied slots',async()=>{
 const {state,remote}=actions();state.trainingPlans.push({id:'PLN-2',horseId:'HOR-2'});let writes=0;globalThis.fetch=async(url,init)=>{if(init?.method==='POST'){writes++;return ok({});}if(String(url).endsWith('/stages'))return ok([stage()]);return ok(String(url).endsWith('HOR-2')?[wire('SES-OTHER',{planId:'PLN-2',horseId:'HOR-2',scheduledTime:'2030-01-07T09:00:00',scheduledEnd:'2030-01-07T09:30:00'})]:[]);};
 const result=await remote.generateSessions('HOR-1','PLN-1',[row()],{mode:'preview'});assert.equal(result.ok,false);assert.match(result.message,/trainer/);assert.equal(writes,0);
});


test('package day limit counts saved sessions and drafts without double counting persisted preview rows',()=>{
 const c=ctx({startDate:'07/01/2030',endDate:'09/01/2030',sessions:[session({planId:'PLN-1',endTime:'09:30'})]});
 const rows=[row(),row({key:'b',time:'11:00',endTime:'11:30'}),row({key:'c',time:'12:00',endTime:'12:30'})];
 assert.deepEqual(p.sessionCapacity(rows,c),{limit:3,saved:1,drafts:2,remaining:0,exceeds:false});
 assert.equal(p.sessionCapacity([...rows,row({key:'d',time:'13:00',endTime:'13:30'})],c).exceeds,true);
 assert.equal(p.sessionCapacity(rows.slice(0,2),c).remaining,1);
});
test('package allowance includes sessions from other plans of the same package and excludes cancelled sessions',()=>{
 const c=ctx({horsePackageId:'HPG-1',sessionLimit:2,packagePlanIds:['PLN-1','PLN-OLD'],sessions:[session({id:'old',planId:'PLN-OLD',horsePackageId:'HPG-1'}),session({id:'cancelled',planId:'PLN-1',horsePackageId:'HPG-1',status:'Cancelled'}),session({id:'other-package',planId:'OTHER',horsePackageId:'HPG-2'})]});
 const capacity=p.sessionCapacity([row({time:'11:00',endTime:'11:30'})],c);assert.equal(capacity.limit,2);assert.equal(capacity.saved,1);assert.equal(capacity.remaining,0);assert.equal(capacity.exceeds,false);
});
test('fresh package capacity is checked before any preview session is written',async()=>{
 const {state,remote}=actions();state.trainingPlans[0].endDate='07/01/2030';let posts=0;
 globalThis.fetch=async(url,init)=>{if(init?.method==='POST'){posts++;return ok({});}return ok(String(url).endsWith('/stages')?[stage()]:[wire('SES-EXISTING',{planId:'PLN-1',horseId:'HOR-1',scheduledTime:'2030-01-07T09:00:00',scheduledEnd:'2030-01-07T09:30:00'})]);};
 const result=await remote.generateSessions('HOR-1','PLN-1',[row({time:'11:00',endTime:'11:30'})],{mode:'preview'});assert.equal(result.ok,false);assert.match(result.message,/Package limit reached: 1/);assert.equal(posts,0);
});


test('suggest creates only one session per horse per day while manual entry allows two',()=>{
 const c=ctx({stages:[stage({endDay:3})]});const first=row();const second=row({key:'manual',time:'11:00',endTime:'11:30'});
 assert.equal(p.rowProblem(second,[first,second],c),'');
 const third=row({key:'third',time:'14:00',endTime:'14:30'});assert.match(p.rowProblem(third,[first,second,third],c),/at most two/);
 const suggestion=p.suggestFreeSlot(row({key:'suggested'}),[first],c);assert.ok(suggestion);assert.equal(suggestion.date,'08/01/2030');
});
test('repeated suggestions never stack the same horse on one day and respect other horses times',()=>{
 const c=ctx({stages:[stage({endDay:3})],sessions:[session({horseId:'OTHER'})]});const rows=[];
 for(let i=0;i<3;i++){const r=p.suggestFreeSlot(row({key:'extra-'+i}),rows,c);assert.ok(r);rows.push(r);}
 assert.equal(new Set(rows.map(r=>r.date)).size,3);assert.equal(rows[0].date,'07/01/2030');assert.ok(rows[0].time>='10:00'||rows[0].endTime<='09:00');assert.equal(p.suggestFreeSlot(row({key:'full'}),rows,c),null);
});
test('saved sessions count toward the manual daily maximum across plans',()=>{
 const c=ctx({sessions:[session({id:'one',time:'07:00',endTime:'07:30'}),session({id:'two',time:'08:00',endTime:'08:30',planId:'OLDER'})]});
 assert.match(p.rowProblem(row({time:'12:00',endTime:'12:30'}),[],c),/at most two/);
});
