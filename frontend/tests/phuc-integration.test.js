import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {createServer} from 'vite';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
test('Phuc and minh frontend integration',async context=>{
  const server=await createServer({root,server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});context.after(()=>server.close());
  const flow=await server.ssrLoadModule('/src/utils/phucWorkflow.js');
  const {createInitialState}=await server.ssrLoadModule('/src/utils/initialState.js');const {scopeState}=await server.ssrLoadModule('/src/utils/routeScope.js');const {TRAINING_PACKAGES,REHAB_PACKAGES}=await server.ssrLoadModule('/src/data/constants.js');
  const initial=createInitialState();const owner=initial.users.find(u=>u.role==='owner');const vet=initial.users.find(u=>u.role==='veterinarian');const cm=initial.users.find(u=>u.role==='manager');
  const as=(s,u)=>({...s,user:u});const horseId=90000;
  const input={...initial.horses[0],id:horseId,name:'New horse',ownerId:owner.id,clubId:null,achievements:[],raceHistory:[]};
  const clinical={eyes:'normal',nose:'normal',mouth:'normal',movement:'normal',eating:'normal',waste:'normal',skin:'normal',behavior:'normal'};
  const medical={id:90001,horseId,examType:'INITIAL',healthStatus:'READY',clinical,injuryDetails:{},vitals:{temperature:'38',heartRate:'40',respRate:'12'},autoEvaluation:'pass',trainingEligibility:'eligible',systemNote:'System evaluation',trainingNote:'ALLOW_TRAINING',date:'12/10/2026',diagnosis:'Normal',notes:''};
  function registered(){const s=flow.createHorse(as(createInitialState(),owner),input);return flow.approveHorse(as(s,cm),s.horseClubRequests.at(-1).id);}
  function ready(){let s=flow.saveDraft(as(registered(),vet),medical);s=flow.confirmMedical(s,medical.id);return as(s,owner);}
  await context.test('IDs are numeric across both merged seed models, and live state contains no demo data',()=>{
    for(const key of ['users','clubs','horses','healthRecords','trainingPlans','trainingSessions','inventory','enrollments'])for(const row of initial[key])assert.equal(typeof row.id,'number',key);
    const live=createInitialState(true);for(const value of Object.values(live))if(Array.isArray(value))assert.equal(value.length,0);
  });
  await context.test('registration stays pending until CM approval; CM can see pending horses in its own requests',()=>{
    const submitted=flow.createHorse(as(initial,owner),input);assert.equal(submitted.horses.at(-1).lifecycle,'pending');assert.equal(submitted.horses.at(-1).vetClearance,false);
    assert.ok(scopeState(as(submitted,cm)).horses.some(h=>h.id===horseId));assert.throws(()=>flow.submitHorse(submitted,horseId),/chờ duyệt/);
    const approved=flow.approveHorse(as(submitted,cm),submitted.horseClubRequests.at(-1).id);assert.equal(approved.horses.at(-1).lifecycle,'awaiting_vet');assert.equal(approved.horses.at(-1).vetClearance,false);
    assert.throws(()=>flow.approveHorse(as(submitted,{...cm,clubId:999}),submitted.horseClubRequests.at(-1).id),/trung tâm/);assert.throws(()=>flow.approveHorse(submitted,submitted.horseClubRequests.at(-1).id),/Vai trò/);
  });
  await context.test('draft save does not change health; Confirm is required and final records cannot be edited',()=>{
    const approved=as(registered(),vet);const draft=flow.saveDraft(approved,medical);assert.deepEqual(draft.horses,approved.horses);assert.equal(draft.healthRecords.at(-1).status,'DRAFT');assert.throws(()=>flow.registerPackage(as(draft,owner),horseId,TRAINING_PACKAGES[0].id),/Initial Medical/);
    const confirmed=flow.confirmMedical(draft,medical.id);assert.equal(confirmed.horses.at(-1).backendHealthStatus,'READY');assert.equal(confirmed.horses.at(-1).lifecycle,'ready');assert.throws(()=>flow.saveDraft(confirmed,medical),/bản nháp/);
    const incomplete=flow.saveDraft(approved,{...medical,vitals:{}});assert.throws(()=>flow.confirmMedical(incomplete,medical.id),/Hoàn tất/);
  });
  await context.test('owner registers pending package; payment starts sessions only on success',()=>{
    let s=flow.registerPackage(ready(),horseId,TRAINING_PACKAGES[0].id);const pkg=s.enrollments.at(-1);assert.equal(pkg.status,'pending');assert.equal(pkg.paymentStatus,'PENDING');assert.equal(s.horses.at(-1).lifecycle,'ready');assert.equal(s.trainingSessions.filter(t=>t.horseId===horseId).length,0);
    assert.throws(()=>flow.payPackage(as(s,cm),pkg.id,true),/Vai trò/);const paid=flow.payPackage(s,pkg.id,true);assert.equal(paid.enrollments.at(-1).paymentStatus,'PAID');assert.equal(paid.horses.at(-1).lifecycle,'training');assert.equal(paid.trainingSessions.filter(t=>t.horseId===horseId).length,TRAINING_PACKAGES[0].sessions);
    const failed=flow.payPackage(s,pkg.id,false);assert.equal(failed.enrollments.at(-1).status,'cancelled');assert.equal(failed.enrollments.at(-1).paymentStatus,'FAILED');assert.equal(failed.trainingSessions.filter(t=>t.horseId===horseId).length,0);
  });
  await context.test('injury locks; CM pauses normal at Recovery approval; READY and Unlock never auto Resume',()=>{
    let s=flow.registerPackage(ready(),horseId,TRAINING_PACKAGES[0].id);s=flow.payPackage(s,s.enrollments.at(-1).id,true);const originalId=s.enrollments.at(-1).id;
    s=flow.saveDraft(as(s,vet),{...medical,id:90002,examType:'FOLLOW_UP',healthStatus:'INJURED',trainingEligibility:'not-eligible',autoEvaluation:'fail'});s=flow.confirmMedical(s,90002);assert.equal(s.horses.at(-1).trainingLocked,true);assert.equal(s.enrollments.find(e=>e.id===originalId).status,'active');
    s=flow.approveRecovery(as(s,cm),horseId,REHAB_PACKAGES[0].id);const recoveryId=s.enrollments.at(-1).id;assert.equal(s.enrollments.find(e=>e.id===originalId).status,'paused');assert.ok(s.enrollments.find(e=>e.id===originalId).remainingDays>0);assert.equal(s.enrollments.at(-1).paymentStatus,'PENDING');
    s=flow.payPackage(as(s,owner),recoveryId,true);s=flow.saveDraft(as(s,vet),{...medical,id:90003,examType:'FOLLOW_UP'});s=flow.confirmMedical(s,90003);assert.equal(s.horses.at(-1).backendHealthStatus,'READY');assert.equal(s.horses.at(-1).trainingLocked,true);
    assert.throws(()=>flow.resumePackage(as(s,cm),recoveryId,'recovered'),/đủ điều kiện/);s=flow.unlockHorse(s,horseId,'Thú y đánh giá đủ điều kiện');assert.equal(s.horses.at(-1).trainingLocked,false);assert.equal(s.enrollments.find(e=>e.id===originalId).status,'paused');assert.equal(s.enrollments.find(e=>e.id===recoveryId).status,'active');
    s=flow.resumePackage(as(s,cm),recoveryId,'CM Resume');assert.equal(s.enrollments.find(e=>e.id===originalId).status,'active');assert.equal(s.enrollments.find(e=>e.id===recoveryId).status,'completed');assert.equal(s.enrollments.find(e=>e.id===originalId).scheduleConfirmed,false);assert.equal(s.horses.at(-1).rehab,null);
  });
  await context.test('owner views and edits cannot expose or change another owner horse or health',()=>{
    const s=as(initial,owner);s.horses.push({...input,id:90009,ownerId:999});assert.ok(!scopeState(s).horses.some(h=>h.id===90009));assert.throws(()=>flow.updateOwnerHorse(s,{...input,id:90009}),/của mình/);const original=s.horses[0];const changed=flow.updateOwnerHorse(s,{...original,name:'New name',lock:{reason:'forged'},backendHealthStatus:'QUARANTINED',ownerId:999});assert.equal(changed.horses[0].ownerId,original.ownerId);assert.equal(changed.horses[0].backendHealthStatus,original.backendHealthStatus);
  });
  await context.test('primary router and provider expose the new handlers and render login',async()=>{
    const {MemoryRouter}=await import('react-router-dom');const {AppProvider}=await server.ssrLoadModule('/src/context/AppContext.jsx');const {useApp}=await server.ssrLoadModule('/src/hooks/useApp.js');const {default:App}=await server.ssrLoadModule('/src/App.jsx');let captured;
    function Probe(){captured=useApp();return React.createElement(App);}
    const html=renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:['/login']},React.createElement(AppProvider,null,React.createElement(Probe))));assert.ok(html.includes('Đăng nhập nhanh'));for(const action of ['handleSaveDraft','handleConfirmMedical','handlePayPackage','handleResumePackage'])assert.equal(typeof captured[action],'function',action);
  });
  const pages=[['dashboard/ManagerDashboard','manager'],['dashboard/HeadTrainerDashboard','head_trainer'],['dashboard/VetDashboard','veterinarian'],['dashboard/GroomDashboard','groom'],['dashboard/OwnerDashboard','owner'],['horses/MyHorsesPage','owner'],['horses/HorseCreatePage','owner'],['horses/HorseDetailPage','owner'],['horses/CenterRequestsPage','manager'],['horses/HorseListPage','manager'],['health/HealthRecordsPage','veterinarian'],['health/VetHealthFormPage','veterinarian'],['health/PostExamPage','veterinarian'],['training/TrainingRegisterPage','owner'],['training/TrainingHubPage','head_trainer'],['training/RehabCenterPage','manager'],['care/CareHubPage','groom'],['care/InventoryPage','groom'],['care/InventoryLogPage','groom'],['members/StaffPage','manager'],['members/MemberRequestsPage','manager']];
  for(const [file,roleName]of pages)await context.test(file+' renders on merged seed state',async()=>{
    const module=await server.ssrLoadModule('/src/pages/'+file+'.jsx');const name=file.split('/').at(-1);const user=initial.users.find(u=>u.role===roleName);const state=scopeState(as(createInitialState(),user));const noop=()=>null;
    const props={state,user,navigate:noop,role:roleName,clubId:user.clubId,horses:state.horses,onSave:noop,onSaveRecord:noop,onSaveDraft:noop,onConfirmRecord:noop,onPostExam:noop,onUnlock:noop,onManualLock:noop,onEnroll:noop,onPay:noop,onResume:noop,onActivate:noop,onApprove:noop,onReject:noop,onViewTrainer:noop,onUpdatePermissions:noop,onSelectHorse:noop,onUpdateHorse:noop,onShowSuccess:noop,onCreateHorse:noop,onSubmitToCenter:noop,onComplete:noop,onUndo:noop,onReceive:noop,onReport:noop,onAdd:noop,onEdit:noop,onAdjust:noop,onDelete:noop};
    const html=renderToStaticMarkup(React.createElement(module[name],props));assert.ok(html.length>50,file);
  });
});
