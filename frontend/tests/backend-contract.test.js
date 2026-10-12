import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
const root = fileURLToPath(new URL('../',import.meta.url));
test('backend contract and medical training regressions', async context => {
  const server=await createServer({root,server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
  const previousFetch=globalThis.fetch;
  context.after(()=>{globalThis.fetch=previousFetch;return server.close();});
  const api=await server.ssrLoadModule('/src/services/api.ts');
  const {tokenStore}=await server.ssrLoadModule('/src/services/tokenStore.ts');
  const {healthService}=await server.ssrLoadModule('/src/services/healthService.ts');
  const {horseService}=await server.ssrLoadModule('/src/services/horseService.ts');
  const {trainingService}=await server.ssrLoadModule('/src/services/trainingService.ts');
  const {authService,toAppUser}=await server.ssrLoadModule('/src/services/authService.ts');
  const rules=await server.ssrLoadModule('/src/utils/horseWorkflow.ts');
  const {blankMedical,VetHealthFormPage}=await server.ssrLoadModule('/src/pages/health/VetHealthFormPage.tsx');
  const calls=[];
  let responseData={};let responseStatus=200;
  globalThis.fetch=async(url,options)=>{calls.push({url,options});return new Response(responseStatus===204?null:JSON.stringify(responseStatus>=400?{message:'Denied',validationErrors:{field:'invalid'}}:{success:true,message:'OK',data:responseData}),{status:responseStatus,headers:{'Content-Type':'application/json'}});};
  const last=()=>calls.at(-1);const body=()=>JSON.parse(last().options.body);
  await context.test('JWT is sent with HttpOnly-cookie credentials; 403 keeps login, 401 clears it',async()=>{
    tokenStore.set('access-token',3600);await api.request('/check');
    assert.equal(last().options.headers.get('Authorization'),'Bearer access-token');assert.equal(last().options.credentials,'include');
    responseStatus=403;await assert.rejects(api.request('/check'),e=>e.status===403 && e.validationErrors.field==='invalid');assert.equal(tokenStore.get(),'access-token');
    responseStatus=401;await assert.rejects(api.request('/check'),e=>e.status===401);assert.equal(tokenStore.get(),null);
    responseStatus=200;tokenStore.set('expired',-1);await api.request('/check');assert.equal(last().options.headers.has('Authorization'),false);
  });
  await context.test('medical endpoints preserve numeric IDs, draft payload and bodyless Confirm; previous supports 204',async()=>{
    const draft={...blankMedical(),profileId:99};await healthService.createDraft(draft);assert.equal(last().url,'/api/medical/records');assert.equal(body().profileId,99);assert.ok(!('veterinarianId' in body()));
    await healthService.saveDraft(12,draft);assert.equal(last().url,'/api/medical/records/12/draft');assert.equal(last().options.method,'PUT');
    await healthService.confirm(12);assert.equal(last().url,'/api/medical/records/12/confirm');assert.equal(last().options.body,undefined);assert.equal(last().options.headers.has('Content-Type'),false);
    responseStatus=204;assert.equal(await healthService.previous(14),undefined);responseStatus=200;
    assert.throws(()=>healthService.list('14'),/ID/);assert.throws(()=>healthService.unlock(14,' '),/lý do/);
    await healthService.unlock(14,' Thú y đã đánh giá ');assert.deepEqual(body(),{reason:'Thú y đã đánh giá'});
  });
  await context.test('horse owner ID is a query parameter and no activation substitutes for approval',async()=>{
    const input={horseName:'Arrow',dateOfBirth:'2022-03-15',gender:'STALLION',breed:'Thoroughbred',coatColor:'Bay',weight:500,height:160};
    await horseService.create(7,input);assert.equal(last().url,'/api/horses?ownerId=7');assert.deepEqual(body(),input);assert.equal(horseService.approve,undefined);
  });
  await context.test('package registration payment recovery and resume match separate controllers',async()=>{
    await trainingService.register(14,101);assert.deepEqual(body(),{horseId:14,packageId:101});
    await trainingService.pay(33,false);assert.equal(last().url,'/api/horse-packages/33/simulate-payment');assert.deepEqual(body(),{successful:false});
    await trainingService.pay(34,true,true);assert.equal(last().url,'/api/horse-packages/34/simulate-recovery-payment');
    await trainingService.approveRecovery(14,102,'injury');assert.equal(last().url,'/api/horse-packages/horse/14/approve-recovery');assert.deepEqual(body(),{recoveryPackageId:102,reason:'injury'});
    await trainingService.resume(34,' recovered ');assert.equal(last().url,'/api/horse-packages/34/resume-original');assert.deepEqual(body(),{reason:'recovered'});assert.throws(()=>trainingService.resume(34,''),/lý do/);
  });
  await context.test('auth maps actual User DTO without inventing club membership',async()=>{
    responseData={accessToken:'jwt',tokenType:'Bearer',expiresInSeconds:60,user:{userId:7,fullName:'Owner',email:'a@b.test',phone:'123',status:'ACTIVE',emailVerified:true,avatarUrl:null,role:{roleId:5,roleName:'HORSE_OWNER'}}};
    const user=await authService.login('a@b.test','password');assert.equal(last().url,'/api/auth/login');assert.equal(user.id,7);assert.equal(user.role,'owner');assert.equal(user.clubId,null);assert.equal(tokenStore.get(),'jwt');
    assert.equal(toAppUser({...responseData.user,role:{roleId:88,roleName:'UNKNOWN'}}).role,null);responseData={};
  });
  const horse={horseId:14,ownerId:7,healthStatus:'INJURED',trainingLocked:true};
  const record={...blankMedical(),medicalRecordId:8,profileId:99,veterinarianId:5,correctionOfId:null,status:'CONFIRMED',healthStatus:'READY',systemNote:'BE system note',trainingNote:'FOLLOW_UP_NORMAL_REVIEW_REQUIRED',createdAt:'',updatedAt:'',confirmedAt:''};
  await context.test('READY never unlocks a horse, and saving a draft never mutates health',()=>{
    assert.equal(rules.applyConfirmedMedical(horse,record).trainingLocked,true);assert.equal(rules.applyConfirmedMedical(horse,{...record,status:'DRAFT'}),horse);
    assert.equal(rules.applyConfirmedMedical({...horse,trainingLocked:false},{...record,healthStatus:'QUARANTINED'}).trainingLocked,true);
  });
  await context.test('normal package requires confirmed INITIAL, READY and explicit unlock',()=>{
    const ready={...horse,healthStatus:'READY',trainingLocked:false};assert.equal(rules.canRegisterPackage(ready,[record],[]),true);
    assert.equal(rules.canRegisterPackage({...ready,trainingLocked:true},[record],[]),false);assert.equal(rules.canRegisterPackage(ready,[{...record,status:'DRAFT'}],[]),false);assert.equal(rules.canRegisterPackage(ready,[{...record,examType:'FOLLOW_UP'}],[]),false);assert.equal(rules.canRegisterPackage(ready,[record],[{status:'PAUSED'}]),false);
  });
  await context.test('Resume applies returned ORIGINAL and completes only its linked Recovery',()=>{
    const original={horsePackageId:1,horseId:14,packageType:'NORMAL',status:'PAUSED',paymentStatus:'PAID',remainingDays:12};
    const recovery={horsePackageId:2,horseId:14,packageType:'RECOVERY',status:'ACTIVE',paymentStatus:'PAID',replacedHorsePackageId:1};
    const packages=[original,recovery];assert.equal(rules.canResume({...horse,healthStatus:'READY',trainingLocked:false},recovery,packages),true);assert.equal(rules.canResume({...horse,healthStatus:'READY'},recovery,packages),false);assert.equal(rules.canResume({...horse,healthStatus:'READY',trainingLocked:false},recovery,[{...original,remainingDays:0},recovery]),false);
    const resumed={...original,status:'ACTIVE',startDate:'2026-10-12',endDate:'2026-10-23'};const result=rules.reconcileResume(packages,2,resumed);assert.equal(result.find(p=>p.horsePackageId===2).status,'COMPLETED');assert.deepEqual(result.find(p=>p.horsePackageId===1),resumed);assert.equal(packages[1].status,'ACTIVE');assert.throws(()=>rules.reconcileResume(packages,2,{...resumed,horsePackageId:999}),/khớp/);
  });
  await context.test('Medical renders both actions and incomplete drafts with nullable vital signs',()=>{
    const html=renderToStaticMarkup(React.createElement(VetHealthFormPage,{record:{...record,status:'DRAFT',vitalSign:null,clinicalExams:[]},busy:false,initialAllowed:true,onSave:async()=>{},onConfirm:async()=>{}}));assert.ok(html.includes('Save Draft'));assert.ok(html.includes('Confirm'));assert.ok(html.includes('GENERAL_CONDITION'));assert.ok(html.includes('Chưa đánh giá'));
  });
  await context.test('notes and lock/payment panels render authoritative statuses',async()=>{
    const {MedicalSummary}=await server.ssrLoadModule('/src/components/training/MedicalSummary.tsx');const summary=renderToStaticMarkup(React.createElement(MedicalSummary,{records:[record]}));assert.ok(summary.includes('BE system note'));assert.ok(summary.includes('FOLLOW_UP_NORMAL_REVIEW_REQUIRED'));
    const {TrainingLockPanel}=await server.ssrLoadModule('/src/components/training/TrainingLockPanel.tsx');const lock=renderToStaticMarkup(React.createElement(TrainingLockPanel,{horse,history:[],veterinarian:true,busy:false,onUnlock:async()=>{}}));assert.ok(lock.includes('LOCKED'));assert.ok(lock.includes('Unlock riêng'));
    const {PackagePanel}=await server.ssrLoadModule('/src/components/training/PackagePanel.tsx');const payment=renderToStaticMarkup(React.createElement(PackagePanel,{catalog:[],packages:[{horsePackageId:1,packageName:'Base',packageType:'NORMAL',status:'PAUSED',paymentStatus:'PAID',totalPrice:100,remainingDays:12}],eligible:false,busy:false,owner:true,onRegister:async()=>{},onPay:async()=>{}}));assert.ok(payment.includes('PAUSED'));assert.ok(payment.includes('PAID'));
  });
});
