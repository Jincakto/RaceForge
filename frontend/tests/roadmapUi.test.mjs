import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(new URL('../package.json', import.meta.url));
const dir = await mkdtemp(path.join(tmpdir(), 'raceforge-roadmap-ui-'));
after(()=>rm(dir,{recursive:true,force:true}));
for(const name of await readdir(new URL('../src/',import.meta.url))) {
 if(!/\.tsx?$/.test(name))continue;
 const source=await readFile(new URL('../src/'+name,import.meta.url),'utf8');
 const output=ts.transpileModule(source.replace('import.meta.env','({})'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
 .replace(/(['"])(\.\/[^'"]+)\1/g,(_,q,s)=>q+s+'.mjs'+q)
 .replace(/(['"])(react(?:\/jsx-runtime)?|react-dom(?:\/client)?|recharts)\1/g,(_,q,s)=>q+pathToFileURL(require.resolve(s)).href+q);
 await writeFile(path.join(dir,name.replace(/\.tsx?$/,'.mjs')),output);
}
const {createElement:h}=require('react');const {renderToStaticMarkup:render}=require('react-dom/server');
const {RoadmapTable,StagesEditor,PackageRoadmapPreview}=await import(pathToFileURL(path.join(dir,'roadmapView.mjs')));
const {PackageCatalogPage}=await import(pathToFileURL(path.join(dir,'packages.mjs')));
const {TrainingRegisterPage}=await import(pathToFileURL(path.join(dir,'trainingRegister.mjs')));
const {TrainingHubPage}=await import(pathToFileURL(path.join(dir,'trainingPlans.mjs')));
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
  const owner=render(h(TrainingRegisterPage,{state,navigate:()=>{},onPurchase:async()=>{}}));
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
