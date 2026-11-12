import { sourceNames, sourceUrl, flattenModuleImports } from './sourceFiles.mjs';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(new URL('../package.json', import.meta.url));
const dir = await mkdtemp(path.join(tmpdir(), 'raceforge-roadmap-ui-'));
after(()=>rm(dir,{recursive:true,force:true}));
for(const name of sourceNames()) {
 if(!/\.tsx?$/.test(name))continue;
 const source=await readFile(sourceUrl(name),'utf8');
 const output=ts.transpileModule(source.replace('import.meta.env','({})'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
 .replace(/[\s\S]*/, flattenModuleImports)
 .replace(/(['"])(react(?:\/jsx-runtime)?|react-dom(?:\/client)?|recharts|qrcode\.react)\1/g,(_,q,s)=>q+pathToFileURL(require.resolve(s)).href+q);
 await writeFile(path.join(dir,name.replace(/\.tsx?$/,'.mjs')),output);
}
const {createElement:h}=require('react');const {renderToStaticMarkup:render}=require('react-dom/server');
const {RoadmapTable,StagesEditor,PackageRoadmapPreview}=await import(pathToFileURL(path.join(dir,'roadmapView.mjs')));
const {PackageCatalogPage}=await import(pathToFileURL(path.join(dir,'packages.mjs')));
const {TrainingRegisterPage}=await import(pathToFileURL(path.join(dir,'trainingRegister.mjs')));
const {TrainingHubPage,TrainingSessionStartButton}=await import(pathToFileURL(path.join(dir,'trainingPlans.mjs')));
const stage={startDay:1,endDay:30,title:'Foundation',phaseCode:'FOUNDATION',objective:'Build endurance',activityName:'Easy canter',intensity:'LOW',daysOfWeek:['MONDAY','FRIDAY'],sessionTime:'07:30',sessionEndTime:'08:00'};
const pkg={id:'PKG-001',name:'Foundation package',description:'Build stamina',active:true,price:1000000,durationDays:30};
const horse={id:'HOR-001',clubId:'club',ownerId:'OWN-001',name:'Brown',trainerIds:[]};
const enrollment={id:'HPG-001',horseId:horse.id,packageId:pkg.id,packageName:pkg.name,trainerStatus:'unassigned',status:'active',sessionsTotal:0,sessionsDone:0,startedAt:'01/11/2026',expiresAt:'30/11/2026',amount:1000000};
const state={user:{id:'OWN-001',clubId:'club',role:'owner'},horses:[horse],enrollments:[enrollment],packages:[pkg],healthRecords:[],trainingPlans:[],trainingSessions:[],notifications:[],users:[]};
test('roadmap table renders the configured curriculum and escapes user text',()=>{
 const html=render(h(RoadmapTable,{roadmap:{title:'<script>unsafe</script>',goal:'Build stamina',stages:[stage]}}));
 for(const text of ['Day 1-30','Build endurance','Easy canter','LOW','Mon, Fri','07:30-08:00']) assert.ok(html.includes(text),text);
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>unsafe'));
});
test('stage editor exposes independent activity, intensity, weekday and time fields',()=>{
 const html=render(h(StagesEditor,{stages:[stage,{...stage,startDay:31,endDay:45,intensity:'HIGH',activityName:'Tempo run',sessionTime:'08:30',sessionEndTime:'09:15'}],duration:45,onChange:()=>{}}));
 for(const text of ['Easy canter','Tempo run','08:30','09:15','Phase code','Training days','Remove stage']) assert.ok(html.includes(text),text);
});
test('catalogue and owner registrations expose curriculum previews without fetching on initial render',()=>{
 const fetch=globalThis.fetch;globalThis.fetch=()=>{throw Error('Unexpected eager fetch');};
 try {
  const catalog=render(h(PackageCatalogPage,{packages:[pkg],enrollments:[],onSave:async()=>{},onToggle:async()=>{}}));
  const owner=render(h(TrainingRegisterPage,{state,navigate:()=>{},onStartPayment:async()=>{},onSyncPayment:async()=>{}}));
  assert.ok(catalog.includes('View package roadmap'));assert.ok(owner.includes('View package roadmap'));
  assert.ok(!render(h(PackageRoadmapPreview,{packageId:pkg.id})).includes('Loading package roadmap'));
 } finally {globalThis.fetch=fetch;}
});
test('manager sees available package previews and an honest explanation of detailed-roadmap access',()=>{
 const html=render(h(TrainingHubPage,{state:{...state,user:{id:'CM-001',clubId:'club',role:'manager'}},navigate:()=>{}}));
 assert.ok(html.includes('View package roadmap'));assert.ok(html.includes('viewed by the assigned trainer'));
 assert.ok(!html.includes('No roadmaps yet'));assert.ok(!html.includes('Create your first roadmap'));
});


test('create-package form opens with duration unselected and clear workflow sections',async()=>{
 const {CreatePackageForm}=await import(pathToFileURL(path.join(dir,'packageCreateForm.mjs')));
 const html=render(h(CreatePackageForm,{packages:[pkg],onSave:async()=>{},onClose:()=>{}}));
 for(const text of ['Package information','Choose curriculum','Arrange stages','Preview &amp; save','Select duration'])assert.ok(html.includes(text),text);
 assert.match(html,/<option value="" selected="">Select duration/);
 assert.ok(!html.includes('Phase code'));assert.ok(!html.includes('Session quota'));assert.ok(!html.includes('Disable package'));
});

test('saved plan exposes stage editing only before sessions exist and while unlocked',()=>{
 const trainer={id:'HTR-001',role:'head_trainer',clubId:'club'};const horseForTrainer={...horse,headTrainerId:trainer.id,trainerIds:[trainer.id]};
 const plan={id:'PLN-001',horseId:horse.id,horsePackageId:enrollment.id,phase:'Saved plan',status:'Active',startDate:'01/01/2099',endDate:'31/12/2099',goals:'Practice cues',progress:0};
 const view=(trainingSessions=[],locked=false)=>render(h(TrainingHubPage,{state:{...state,user:trainer,horses:[horseForTrainer],enrollments:[{...enrollment,trainerId:trainer.id,trainerStatus:'confirmed',paymentStatus:'PAID'}],trainingPlans:[{...plan,locked}],trainingSessions},navigate:()=>{}}));
 assert.ok(view().includes('Edit stages'));assert.ok(!view([{id:'SES-001',planId:plan.id,horseId:horse.id,status:'Scheduled',date:'01/01/2099'}]).includes('Edit stages'));assert.ok(!view([],true).includes('Edit stages'));
});

test('Start control renders exactly one button and a nearby backend explanation',()=>{
 const html=render(h(TrainingSessionStartButton,{allowed:false,reason:'Finish SES-001 <first>',busy:false,onStart:()=>{}}));
 assert.equal((html.match(/<button/g)||[]).length,1);assert.ok(html.includes('Start session'));assert.ok(html.includes('disabled'));
 assert.ok(html.includes('Finish SES-001 &lt;first&gt;'));assert.ok(html.includes('role="status"'));
 const enabled=render(h(TrainingSessionStartButton,{allowed:true,reason:'',busy:false,onStart:()=>{}}));
 assert.ok(!enabled.includes('disabled'));
 const busy=render(h(TrainingSessionStartButton,{allowed:true,reason:'',busy:true,onStart:()=>{}}));
 assert.ok(busy.includes('Starting...'));assert.ok(busy.includes('disabled'));
});
test('owner sees cancellation only for their active or paused paid registration and keeps terminal history labels',()=>{
 const user={...state.user,status:'active'},paid={...enrollment,apiStatus:'ACTIVE',paymentStatus:'PAID'};
 const view=(entry,userOverride=user,sessions=[])=>render(h(TrainingRegisterPage,{state:{...state,user:userOverride,enrollments:[entry],trainingSessions:sessions},navigate:()=>{},onStartPayment:async()=>{},onSyncPayment:async()=>{},onCancelRegistration:async()=>({ok:false,message:'Not sent'})}));
 assert.ok(view(paid).includes('Cancel registration'));
 assert.ok(view({...paid,apiStatus:'PAUSED',status:'paused'}).includes('Cancel registration'));
 assert.ok(!view({...paid,apiStatus:'PENDING',paymentStatus:'PENDING'}).includes('Cancel registration'));
 assert.ok(!view(paid,{...user,id:'OTHER'}).includes('Cancel registration'));
 for(const [apiStatus,label] of Object.entries({CANCELLED:'Cancelled',COMPLETED:'Completed',EXPIRED:'Expired',FAILED:'Failed'})){
  const html=view({...paid,apiStatus,status:'completed'});assert.ok(html.includes(label));assert.ok(html.includes(paid.packageName));assert.ok(!html.includes('Cancel registration'));
 }
 const pending=view(paid,user,[{id:'SES',horsePackageId:paid.id,status:'In Progress',actualStart:'2026-11-12T09:00',actualEnd:'2026-11-12T09:30'}]);
 assert.ok(pending.includes('Finish the started session'));assert.match(pending,/<button[^>]*disabled=""[^>]*>Cancel registration/);
});
test('trainer completion is enabled only after successful context and schedule reads with all sessions finished',()=>{
 const user={id:'HTR-001',role:'head_trainer',clubId:'club',status:'active'};
 const assigned={...enrollment,apiStatus:'ACTIVE',paymentStatus:'PAID',trainerId:user.id,trainerStatus:'confirmed',startedAt:'01/01/2000',expiresAt:'31/12/2099'};
 const horseForTrainer={...horse,headTrainerId:user.id,trainerIds:[user.id]};
 const rows=[{id:'SES',horseId:horse.id,horsePackageId:assigned.id,date:'01/01/2099',time:'09:00',status:'Completed'}];
 const view=(extra={})=>render(h(TrainingHubPage,{state:{...state,user,horses:[horseForTrainer],enrollments:[assigned],trainingSessions:rows,trainingLoadedSources:['Training schedule '+horse.id,'Assigned packages '+assigned.id],...extra},navigate:()=>{},onCompletePackage:async()=>({ok:false,message:'Not sent'})}));
 assert.match(view(),/<button(?![^>]*disabled)[^>]*>Complete package/);
 const blocked=view({trainingLoadedSources:[]});assert.ok(blocked.includes('Refresh the package context'));assert.match(blocked,/<button[^>]*disabled=""[^>]*>Complete package/);
 assert.ok(view({trainingSessions:[]}).includes('At least one completed or missed'));
 assert.ok(view({trainingSessions:[{...rows[0],status:'In Progress',actualEnd:'2026-11-12T09:30'}]}).includes('Stopped exercise still needs'));
 assert.ok(!view({enrollments:[{...assigned,trainerId:'OTHER'}]}).includes('Complete package'));
 assert.ok(!view({user:{...user,role:'manager'}}).includes('Complete package'));
});