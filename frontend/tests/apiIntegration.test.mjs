import { after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Run the actual TS adapters without Vite or a database; HTTP is the test boundary.
const dir = await mkdtemp(path.join(tmpdir(), 'raceforge-api-tests-'));
for (const name of ['api', 'remote', 'remoteActions', 'permissionApi', 'recommendations', 'proxyOrigin', 'data', 'trainingLogic', 'trainerProfile', 'trainingProtocols']) {
  const source = await readFile(new URL(`../src/${name}.ts`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source.replace('import.meta.env', '({})'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
    .replace(/(['"])(\.\/[^'"]+)\1/g, (_, quote, specifier) => `${quote}${specifier}.mjs${quote}`);
  await writeFile(path.join(dir, `${name}.mjs`), code);
}
const api = await import(pathToFileURL(path.join(dir, 'api.mjs')).href);
const mapping = await import(pathToFileURL(path.join(dir, 'remote.mjs')).href);
const { makeRemoteActions } = await import(pathToFileURL(path.join(dir, 'remoteActions.mjs')).href);
const protocols = await import(pathToFileURL(path.join(dir, 'trainingProtocols.mjs')).href);
const { loadOwnTrainerProfile, saveOwnTrainerProfile } = await import(pathToFileURL(path.join(dir, 'trainerProfile.mjs')).href);
const { purchaseBlockReason } = await import(pathToFileURL(path.join(dir, 'trainingLogic.mjs')).href);
const { apiProxyOrigin } = await import(pathToFileURL(path.join(dir, 'proxyOrigin.mjs')).href);
const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
globalThis.window = new EventTarget();
after(async () => { globalThis.fetch = originalFetch; globalThis.window = originalWindow; if (path.dirname(dir) === tmpdir()) await rm(dir, { recursive: true }); });
beforeEach(() => api.clearSession());
test('proxy normalizes only same-origin requests, including fallback ports and 127.0.0.1', () => {
  assert.equal(apiProxyOrigin('http://127.0.0.1:5174', '127.0.0.1:5174', 'http://localhost:8080'), 'http://localhost:8080');
  assert.equal(apiProxyOrigin('http://localhost:5175', 'localhost:5175', 'http://localhost:8080'), 'http://localhost:8080');
  assert.equal(apiProxyOrigin('https://foreign.example', 'localhost:5175', 'http://localhost:8080'), 'https://foreign.example');
  assert.equal(apiProxyOrigin('null', 'localhost:5175', 'http://localhost:8080'), 'null');
  assert.equal(apiProxyOrigin(undefined, 'localhost:5175', 'http://localhost:8080'), undefined);
});
test('reports a plain-text CORS rejection instead of an unexplained 403', async () => {
  globalThis.fetch = async () => new Response('Invalid CORS request', { status:403 });
  await assert.rejects(api.request('/auth/register', 'POST', {}), e => e.status === 403 && e.message.includes('CORS'));
});
const ok = data => new Response(JSON.stringify({ success: true, data, message: 'OK' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
const denied = (status = 403) => new Response(JSON.stringify({ success: false, message: 'Denied', data: {} }), { status });
const user = role => mapping.userFromApi({ userId: role === 'owner' ? 'OWN-001' : 'HTR-001', fullName: 'Test User', email: 'test@example.invalid', emailVerified: true, status: 'ACTIVE', role: { roleName: mapping.ROLE_NAMES[role], roleId: mapping.ROLE_IDS[role] } });
const horse = () => mapping.horseFromApi({ horseId:'HOR-007', ownerId:'OWN-001', horseName:'Thunder', dateOfBirth:'2020-01-02', gender:'GELDING', admissionStatus:'APPROVED', healthStatus:'READY', trainerIds:['HTR-001','HTR-002'], registrationNumber:'704ABC000000001', imageUrl:'https://example.invalid/horse.jpg', documentUrl:'https://example.invalid/ueln.pdf' }, []);
const state = () => ({ user:user('owner'), users:[], horses:[horse()], packages:[], enrollments:[], trainingPlans:[], trainingSessions:[], notifications:[], healthRecords:[], horseClubRequests:[] });
function actions(snapshot) {
  const events = [];
  return { events, remote: makeRemoteActions({ getState:() => snapshot, reload:async () => { events.push('reload'); }, success:message => events.push(message), error:message => events.push(`error:${message}`), navigate:page => events.push(`page:${page}`) }) };
}

test('attaches bearer auth and cookie credentials, unwraps the BE response', async () => {
  api.setAccessToken('access');
  globalThis.fetch = async (url, init) => { assert.equal(url, '/api/horses'); assert.equal(init.credentials, 'include'); assert.equal(init.headers.Authorization, 'Bearer access'); return ok([{ horseId:'HOR-007' }]); };
  assert.deepEqual(await api.request('/horses'), [{ horseId:'HOR-007' }]);
});

test('refreshes once for simultaneous expired API calls and retries with the new token', async () => {
  let refreshes = 0;
  globalThis.fetch = async (url, init) => {
    if (url.endsWith('/auth/refresh')) { refreshes++; await new Promise(resolve => setTimeout(resolve, 10)); return ok({ accessToken:'new' }); }
    return init.headers.Authorization === 'Bearer new' ? ok('fresh') : denied(401);
  };
  assert.deepEqual(await Promise.all([api.request('/horses'), api.request('/notifications')]), ['fresh','fresh']);
  assert.equal(refreshes, 1);
});

test('does not retry a forbidden action, and rejects non-API HTML', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return denied(); };
  await assert.rejects(api.request('/horses', 'POST', {}), e => e.status === 403);
  assert.equal(calls, 1);
  globalThis.fetch = async () => new Response('<html>Vite</html>');
  await assert.rejects(api.request('/horses'), /định dạng API/);
});

test('public registration payload never contains role or groom selection', async () => {
  globalThis.fetch = async (url, init) => { assert.equal(url, '/api/auth/register'); assert.deepEqual(Object.keys(JSON.parse(init.body)).sort(), ['email','fullName','password','phone']); return ok({ message:'OTP sent' }); };
  await api.auth.register({ fullName:'Owner', email:'test@example.invalid', password:'password123', phone:'' });
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const registration = app.slice(app.indexOf('function RegisterPage'), app.indexOf('// ── Onboarding'));
  assert.match(registration, /auth\.register/);
  assert.doesNotMatch(registration, /role:\s*['"]groom/);
});

test('preserves server IDs, all trainer relationships, UELN and canonical gender', () => {
  const h = horse();
  assert.equal(h.id, 'HOR-007'); assert.deepEqual(h.trainerIds, ['HTR-001','HTR-002']);
  assert.equal(h.trainerHistory.filter(t => t.to === null).length, 2);
  const body = mapping.horsePayload(h);
  assert.equal(body.registrationNumber,'704ABC000000001'); assert.equal(body.gender,'GELDING');
  assert.equal(body.dateOfBirth,'2020-01-02');
  assert.ok(!('stable' in body)); assert.ok(!('weight' in body));
});

test('preserves medical values, veterinarian ID, decisions and all four clinical areas', () => {
  const w = { medicalRecordId:'MED-003', profileId:'HEA-002', veterinarianId:'VET-001', finalConclusion:'FIT_WITH_MONITORING', status:'CONFIRMED', examType:'INITIAL', examinedAt:'2026-10-21T09:00:00', vitalSign:{ bodyTemperature:38.1, restingHeartRate:40, restingRespiratoryRate:15, weight:490 }, clinicalExams:[{ examinationArea:'MOVEMENT_LEGS', conditionStatus:'ABNORMAL', notes:'Observe gait' }] };
  const r = mapping.recordFromApi(w, 'HOR-007', []);
  assert.equal(r.decision,'conditional'); assert.equal(r.vetId,'VET-001'); assert.equal(r.vitals.weight,'490');
  const body = mapping.medicalPayload({ ...r, regions:{ eyes:{ok:true,note:''},nose:{ok:true,note:''},mouth:{ok:true,note:''},movement:{ok:false,note:'Observe gait'} } }, r.profileId);
  assert.equal(body.finalConclusion,'FIT_WITH_MONITORING'); assert.equal(body.examType,'INITIAL');
  assert.deepEqual(body.clinicalExams.map(x => x.examinationArea), ['EYES','NOSE','MOUTH','MOVEMENT_LEGS']);
});

test('saves a BE draft before confirmation and returns the real record ID', async () => {
  const snapshot = state(); const { remote, events } = actions(snapshot); const paths = [];
  globalThis.fetch = async (url, init) => {
    paths.push(url);
    if (url.endsWith('/health-profile')) return ok('HEA-002');
    if (url.endsWith('/medical/records')) { assert.equal(JSON.parse(init.body).finalConclusion,'FIT'); return ok({ medicalRecordId:'MED-099' }); }
    if (url.endsWith('/MED-099/confirm')) return ok({ medicalRecordId:'MED-099', profileId:'HEA-002', status:'CONFIRMED', finalConclusion:'FIT', veterinarianId:'VET-001', examinedAt:'2026-10-21T09:00:00' });
    throw new Error(`Unexpected URL ${url}`);
  };
  const saved = await remote.saveHealth({ id:'local', horseId:'HOR-007', date:'21/10/2026', status:'confirmed', decision:'eligible', vitals:{ heartRate:'40',temperature:'38',respRate:'15',weight:'490' }, regions:{} });
  assert.equal(saved.id,'MED-099'); assert.equal(saved.status,'confirmed'); assert.equal(paths.length,3); assert.deepEqual(events,['reload']);
});

test('records payment failure on BE without claiming a successful payment', async () => {
  const snapshot = state(); const { remote, events } = actions(snapshot); const calls=[];
  globalThis.fetch = async (url, init) => {
    calls.push([url, JSON.parse(init.body)]);
    if (url.endsWith('/register')) return ok({ horsePackageId:'HP-001' });
    return ok({ horsePackageId:'HP-001', horseId:'HOR-007', packageId:'PKG-001', paymentStatus:'FAILED', status:'CANCELLED', totalPrice:100 });
  };
  const r = await remote.purchasePackage('HOR-007','PKG-001',undefined,false);
  assert.equal(r.ok,true); assert.equal(r.data.paymentStatus,'FAILED'); assert.equal(r.data.status,'completed');
  assert.deepEqual(calls[1][1],{ successful:false }); assert.equal(calls[1][0],'/api/horse-packages/HP-001/simulate-payment'); assert.equal(events[0],'reload');
});

test('resumes an unpaid registration rather than registering it again', async () => {
  const snapshot = state(); snapshot.enrollments = [{ id:'HP-001',horseId:'HOR-007',packageId:'PKG-001',paymentStatus:'PENDING' }];
  const { remote } = actions(snapshot); const calls=[];
  globalThis.fetch = async (url) => { calls.push(url); return ok({ horsePackageId:'HP-001', horseId:'HOR-007', packageId:'PKG-001', status:'ACTIVE', paymentStatus:'PAID', startDate:'2026-10-21',endDate:'2026-11-30' }); };
  const r = await remote.purchasePackage('HOR-007','PKG-001');
  assert.equal(r.data.startedAt,'21/10/2026'); assert.deepEqual(calls,['/api/horse-packages/HP-001/simulate-payment']);
});

test('pending trainer requests remain visible without fetching restricted horse/context data', async () => {
  const me = user('head_trainer'); const urls=[];
  globalThis.fetch = async url => {
    urls.push(url);
    if (url.includes('/notifications')) return new Response('[]',{status:200});
    if (url.endsWith('/trainer-assignments/me')) return ok([{ assignment_id:'ASN-001',horse_id:'HOR-007',horse_package_id:'HP-001',horse_name:'Thunder',trainer_name:'Test User',assignee_id:me.id,status:'ASSIGNED' }]);
    return ok([]);
  };
  const warnings=[]; const data=await mapping.loadRemote(me, message=>warnings.push(message));
  assert.equal(data.enrollments[0].trainerStatus,'pending'); assert.equal(data.enrollments[0].assignmentId,'ASN-001');
  assert.equal(data.horses[0].name,'Thunder'); assert.ok(!urls.some(url => url.endsWith('/training-context'))); assert.deepEqual(warnings,[]);
});

test('keeps the DB role ID while mapping an active owner, without changing authority', () => {
  const owner = mapping.userFromApi({ userId:'OWN-000',fullName:'Owner',email:'owner@example.invalid',status:'ACTIVE',emailVerified:true,role:{roleName:'HORSE_OWNER',roleId:6} });
  assert.equal(owner.role,'owner'); assert.equal(owner.apiRoleId,6); assert.equal(owner.status,'active');
  assert.deepEqual(mapping.ROLE_IDS,{ admin:1,manager:2,head_trainer:3,veterinarian:4,groom:5,owner:6 });
});
test('staff creation follows the authenticated admin catalogue before and after SQL migration', () => {
  const before = user('admin');
  const after = { ...before, apiRoleId:7 };
  assert.equal(mapping.staffRoleId('groom',before),5);
  assert.equal(mapping.staffRoleId('groom',after),4);
  assert.equal(mapping.staffRoleId('manager',after),1);
  assert.equal(mapping.staffRoleId('head_trainer',after),2);
  assert.equal(mapping.staffRoleId('veterinarian',after),3);
  assert.throws(()=>mapping.staffRoleId('owner',after));
  assert.throws(()=>mapping.staffRoleId('groom',{...before,apiRoleId:undefined}));
});

test('stops a globally forbidden business load instead of cascading horse/package requests', async () => {
  const owner = { ...user('owner'),apiRoleId:6 }; const urls=[];
  globalThis.fetch=async url => { urls.push(url); return new Response(JSON.stringify({ success:false,message:'Your account does not have the role or active status required for this action.',data:{code:'ACCESS_DENIED',errors:{}} }),{status:403}); };
  await assert.rejects(mapping.loadRemote(owner,()=>{}), e => e.status===403 && e.message.includes('mã role 6') && e.message.includes('FE không thể tự cấp quyền'));
  assert.deepEqual(urls,['/api/notifications']);
});

test('does not append an empty validation object to an access-denied message', async () => {
  globalThis.fetch=async()=>new Response(JSON.stringify({ success:false,message:'Access denied',data:{errors:{}} }),{status:403});
  await assert.rejects(api.request('/horses'), e=>e.message==='Access denied');
});

test('does not request business endpoints for a pending account', async () => {
  globalThis.fetch=async()=>{ throw new Error('Business request must not run'); };
  const messages=[]; const result=await mapping.loadRemote({...user('owner'),status:'pending'},m=>messages.push(m));
  assert.equal(messages.length,1); assert.deepEqual(result.horses,[]);
});

test('a rejected write does not refresh or show success', async () => {
  const { remote, events } = actions(state());
  globalThis.fetch=async()=>denied();
  await assert.rejects(remote.approveHorse('HOR-007'), /Denied/);
  assert.equal(events.filter(e=>e==='reload').length,0);
  assert.ok(events.every(e=>e.startsWith('error:')));
});

test('admin staff creation maps groom to database role 5, and refuses public-owner creation', async () => {
  const snapshot = state(); snapshot.user = user('admin');
  const { remote } = actions(snapshot); const bodies = [];
  globalThis.fetch = async (url, init) => { assert.equal(url,'/api/admin/users'); bodies.push(JSON.parse(init.body)); return ok({}); };
  await remote.createAccount({ name:'Staff',email:'staff@example.invalid',phone:'',role:'groom' });
  assert.equal(bodies[0].roleId,5); assert.ok(!('password' in bodies[0]));
  await assert.rejects(remote.createAccount({ role:'owner' }), /Chủ ngựa tự đăng ký/);
  assert.equal(bodies.length,1);
});

test('completion sends actual exercise/recovery fields and does not invent a max speed', async () => {
  const snapshot = state(); const { remote } = actions(snapshot); let payload;
  globalThis.fetch = async (url, init) => { assert.equal(url,'/api/training-sessions/SES-001/complete'); assert.equal(init.method,'PATCH'); payload=JSON.parse(init.body); return ok({}); };
  assert.equal(await remote.completeSession('SES-001',{ time:'1.25',speed:'18.2',heartRate:180,performanceScore:88,notes:'Measured recovery' }),null);
  assert.equal(payload.distance,1.25); assert.equal(payload.endExerciseHeartRate,180); assert.equal(payload.recoveryHeartRate2Min,88); assert.equal(payload.avgSpeed,18.2);
  assert.match(payload.recoveryMeasuredAt,/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/); assert.ok(!('maxSpeed' in payload));
});

test('medical confirmation failure keeps its draft ID and retries using the draft update API', async () => {
  const { remote } = actions(state()); let failed = false; const paths=[];
  globalThis.fetch = async url => {
    paths.push(url);
    if (url.endsWith('/health-profile')) return ok('HEA-002');
    if (url.endsWith('/confirm') && !failed) { failed=true; return denied(); }
    return ok({ medicalRecordId:'MED-087', profileId:'HEA-002', examinedAt:'2026-10-21T09:00:00', finalConclusion:'FIT',status:url.endsWith('/confirm')?'CONFIRMED':'DRAFT' });
  };
  const record={ id:'local', horseId:'HOR-007',date:'21/10/2026',decision:'eligible',status:'confirmed',regions:{} };
  await assert.rejects(remote.saveHealth(record),/Denied/);
  assert.equal(record.id,'MED-087'); assert.equal(record.profileId,'HEA-002');
  await remote.saveHealth(record);
  assert.equal(paths.filter(url=>url==='/api/medical/records').length,1);
  assert.ok(paths.includes('/api/medical/records/MED-087/draft'));
});

test('accepts the direct notification DTO contract without relaxing other APIs', async () => {
  const notification={notificationId:42,notificationType:'INFO',title:'Assigned',message:'Horse assigned',read:false,createdAt:'2026-10-21T00:00:00Z'};
  globalThis.fetch=async()=>new Response(JSON.stringify([notification]),{status:200});
  assert.deepEqual(await api.request('/notifications'),[notification]);
  globalThis.fetch=async()=>new Response(JSON.stringify({...notification,read:true}),{status:200});
  assert.equal((await api.request('/notifications/42/read','PATCH')).read,true);
  globalThis.fetch=async()=>new Response(JSON.stringify({unreadCount:3}),{status:200});
  assert.deepEqual(await api.request('/notifications/unread-count'),{unreadCount:3});
  await assert.rejects(api.request('/horses'),/định dạng API/);
  globalThis.fetch=async()=>new Response('<html>Vite</html>',{status:200});
  await assert.rejects(api.request('/notifications'),/định dạng API/);
  globalThis.fetch=async()=>denied();
  await assert.rejects(api.request('/notifications'),e=>e.status===403);
});

test('server failures expose correlation ID and failing operation without request secrets', async () => {
  globalThis.fetch=async()=>new Response(JSON.stringify({success:false,message:'An unexpected server error occurred.',data:{code:'INTERNAL_SERVER_ERROR',errorId:'test-correlation-id'}}),{status:500});
  await assert.rejects(api.request('/horses','POST',{privateValue:'secret'}),e=>e.status===500 && e.message.includes('POST /horses') && e.message.includes('test-correlation-id') && !e.message.includes('secret'));
});

test('a confirmed fit exam cannot bypass inactive horse status', () => {
  const h=horse(); const rec={id:'MED-001',horseId:h.id,date:'21/10/2026',createdAt:1,status:'confirmed',decision:'eligible',trainingEligibility:'eligible'};
  assert.match(purchaseBlockReason({...h,trainingStatus:'Inactive'},[],[rec]),/chưa được kích hoạt/);
  assert.equal(purchaseBlockReason({...h,trainingStatus:'Active'},[],[rec]),null);
  assert.match(purchaseBlockReason({...h,trainingStatus:'Active',lock:{reason:'medical'}},[],[rec]),/khóa/);
  assert.match(purchaseBlockReason({...h,trainingStatus:'Active'},[],[{...rec,status:'draft'}]),/nháp/);
  assert.match(purchaseBlockReason({...h,trainingStatus:'Active',approvalStatus:'pending'},[],[rec]),/duyệt/);
});
test('manager activates an approved horse using the existing API and reloads', async () => {
  const snapshot={...state(),user:user('manager')}; const {remote,events}=actions(snapshot); let calls=0;
  globalThis.fetch=async(url,init)=>{calls++; assert.equal(url,'/api/horses/HOR-007/activate'); assert.equal(init.method,'PATCH'); return ok({});};
  await remote.activateHorse('HOR-007');
  assert.equal(calls,1); assert.equal(events[0],'reload');
  snapshot.user=user('owner');
  await assert.rejects(remote.activateHorse('HOR-007'),/Club Manager/); assert.equal(calls,1);
  snapshot.user=user('manager'); snapshot.horses[0].approvalStatus='pending';
  await assert.rejects(remote.activateHorse('HOR-007'),/duyệt tiếp nhận/); assert.equal(calls,1);
});
test('failed activation never reloads or reports success', async () => {
  const snapshot={...state(),user:user('manager')}; const {remote,events}=actions(snapshot);
  globalThis.fetch=async()=>denied();
  await assert.rejects(remote.activateHorse('HOR-007'));
  assert.ok(!events.includes('reload')); assert.ok(events.every(e=>e.startsWith('error:')));
});

test('only admin can create a profile for an activated Trainer', async () => {
  const target=user('head_trainer'); const snapshot={...state(),user:user('admin'),users:[target]}; const {remote,events}=actions(snapshot); let calls=0;
  globalThis.fetch=async(url,init)=>{calls++; assert.equal(url,'/api/trainer-profiles'); assert.deepEqual(JSON.parse(init.body),{userId:target.id,bio:'',qualifications:''}); return ok({trainer_id:'HTR-099'});};
  await remote.createTrainerProfile(target.id); assert.equal(calls,1); assert.ok(events.includes('reload'));
  snapshot.user=user('manager'); await assert.rejects(remote.createTrainerProfile(target.id),/admin/); assert.equal(calls,1);
  snapshot.user=user('admin'); target.status='invited'; await assert.rejects(remote.createTrainerProfile(target.id),/kích hoạt/); assert.equal(calls,1);
});
test('trainer assignment uses profile ID, not account ID', async () => {
  const target={...user('head_trainer'),trainerProfileId:'HTR-099'};
  const snapshot={...state(),user:user('manager'),users:[target],enrollments:[{id:'HPG-001',horseId:'HOR-007'}]}; const {remote}=actions(snapshot);
  globalThis.fetch=async(url,init)=>{assert.equal(url,'/api/trainer-assignments'); assert.deepEqual(JSON.parse(init.body),{trainerId:'HTR-099',horsePackageId:'HPG-001'}); return ok({});};
  assert.equal((await remote.assignTrainer('HPG-001',target.id)).ok,true);
});

test('trainer loads and updates only the profile tied to their own account', async () => {
  const profile={trainer_id:'HTR-099',user_id:'HTR-001',bio:'Old',qualifications:'Certificate'};
  const calls=[];
  globalThis.fetch=async(url,init)=>{calls.push({url,init}); return ok(profile);};
  const loaded=await loadOwnTrainerProfile(' HTR-099 ','HTR-001');
  await saveOwnTrainerProfile(loaded,'HTR-001',' New bio ',' New certificate ');
  assert.equal(calls[0].url,'/api/trainer-profiles/HTR-099');
  assert.equal(calls[1].init.method,'PUT');
  assert.deepEqual(JSON.parse(calls[1].init.body),{bio:'New bio',qualifications:'New certificate'});
  await assert.rejects(loadOwnTrainerProfile('HTR-099','other-user'),/không thuộc/);
  const count=calls.length;
  await assert.rejects(saveOwnTrainerProfile(profile,'other-user','bio','cert'),/của mình/);
  await assert.rejects(saveOwnTrainerProfile(profile,'HTR-001','x'.repeat(1001),''),/1000/);
  await assert.rejects(loadOwnTrainerProfile('','HTR-001'),/mã hồ sơ/);
  assert.equal(calls.length,count);
});
test('trainer profile reports missing records and server errors without pretending to save', async () => {
  globalThis.fetch=async()=>denied(404);
  await assert.rejects(loadOwnTrainerProfile('missing','HTR-001'),e=>e.status===404);
  globalThis.fetch=async()=>denied();
  await assert.rejects(saveOwnTrainerProfile({trainer_id:'HTR-099',user_id:'HTR-001'},'HTR-001','bio','cert'),e=>e.status===403);
});

const protocolDraft=()=>({name:'Vet authored protocol',packageType:'BASIC',minWeight:400,maxWeight:500,rationale:'Test rationale',sources:['https://www.merckvetmanual.com/test'],stages:[{startDay:1,endDay:7,activityName:'Vet authored activity',intensity:'LOW',daysOfWeek:['MONDAY'],sessionTime:'08:00',sessionEndTime:'08:30'}]});
test('protocol APIs preserve vet-authored content and use draft/approval/retire endpoints', async()=>{
  const calls=[];globalThis.fetch=async(url,init)=>{calls.push({url,init});return ok({});};
  const draft=protocolDraft();await protocols.createProtocol(draft);await protocols.changeProtocolStatus('PRO-001','approve');await protocols.changeProtocolStatus('PRO-001','retire');
  assert.deepEqual(JSON.parse(calls[0].init.body),draft);
  assert.deepEqual(calls.map(c=>c.url),['/api/training-protocols','/api/training-protocols/PRO-001/approve','/api/training-protocols/PRO-001/retire']);
});
test('invalid protocol weight, stages and source are blocked before HTTP', async()=>{
  let calls=0;globalThis.fetch=async()=>{calls++;return ok({});};
  for(const change of [{minWeight:0},{maxWeight:400},{sources:['https://example.com']},{sources:[]},{rationale:''},{stages:[]},{stages:[{...protocolDraft().stages[0],sessionEndTime:'07:00'}]},{stages:[...protocolDraft().stages,...protocolDraft().stages]}]) {
    assert.throws(()=>protocols.createProtocol({...protocolDraft(),...change}));
  }assert.equal(calls,0);
});
test('published protocol weight intervals are half-open and package-specific',()=>{
  const active={protocol_id:'PRO-1',package_type:'BASIC',min_weight:400,max_weight:500,status:'APPROVED'};
  assert.equal(protocols.protocolOverlap({...active,protocol_id:'PRO-2',min_weight:450,max_weight:550},[active]),true);
  assert.equal(protocols.protocolOverlap({...active,protocol_id:'PRO-2',min_weight:500,max_weight:550},[active]),false);
  assert.equal(protocols.protocolOverlap({...active,protocol_id:'PRO-2',package_type:'RECOVERY'},[active]),false);
});
