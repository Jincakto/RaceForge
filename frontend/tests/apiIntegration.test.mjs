import { after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Run the actual TS adapters without Vite or a database; HTTP is the test boundary.
const dir = await mkdtemp(path.join(tmpdir(), 'raceforge-api-tests-'));
for (const name of ['sessionPreview', 'packageBuilder', 'packageRoadmap', 'trainingSchedule', 'trainingTimestamp', 'api', 'remote', 'remoteActions', 'permissionApi', 'recommendations', 'proxyOrigin', 'data', 'trainingLogic', 'trainerProfile', 'trainingProtocols']) {
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
test('owner treats a missing health profile as no examination records, while preserving other errors', async () => {
  for (const [status, message, expectedWarnings] of [
    [404, 'Health profile not found', 0],
    [404, 'Horse not found', 1],
    [403, 'Denied', 1],
    [500, 'Health profile not found', 1],
  ]) {
    globalThis.fetch = async url => {
      if (url === '/api/horses') return ok([{horseId:'HOR-002',horseName:'Brown',ownerId:'OWN-001',admissionStatus:'PENDING'}]);
      if (url === '/api/medical/horses/HOR-002/records') return new Response(JSON.stringify({success:false,message}), {status});
      return ok([]);
    };
    const warnings = [];
    const data = await mapping.loadRemote(user('owner'), message => warnings.push(message));
    assert.equal(data.horses.length, 1);
    assert.deepEqual(data.healthRecords, []);
    assert.equal(warnings.length, expectedWarnings, `${status}: ${message}`);
    if (expectedWarnings) assert.match(warnings[0], /Examination records HOR-002/);
  }
});
test('admin login loads administration data without calling business APIs', async () => {
  const urls = [];
  globalThis.fetch = async url => {
    urls.push(url);
    if (url.startsWith('/api/users')) return ok([]);
    if (url.startsWith('/api/admin/permissions/')) return ok([]);
    return denied();
  };
  const warnings = [];
  const data = await mapping.loadRemote(user('admin'), message => warnings.push(message));
  assert.deepEqual(warnings, []);
  assert.ok(urls.some(url => url.startsWith('/api/users')));
  assert.equal(Object.keys(data.serverPermissions).length, 6);
  assert.ok(urls.every(url => url.startsWith('/api/users') || url.startsWith('/api/admin/permissions/')));
});
function actions(snapshot) {
  const events = [];
  return { events, remote: makeRemoteActions({ getState:() => snapshot, reload:async () => { events.push('reload'); }, success:message => events.push(message), error:message => events.push(`error:${message}`), navigate:page => events.push(`page:${page}`) }) };
}

test('package creation sends the DTO and uses the server response', async () => {
  const draft={name:' Normal ',packageType:'RACING',description:'Training',durationDays:90,price:5000000,roadmapTemplate:roadmapFixture()};
  const {remote,events}=actions(state());
  globalThis.fetch=async(url,init)=>{
    assert.equal(url,'/api/training-packages');assert.equal(init.method,'POST');
    assert.deepEqual(JSON.parse(init.body),{packageName:'Normal',packageType:'RACING',description:'Training',durationDays:90,price:5000000,roadmapTemplate:draft.roadmapTemplate});
    return ok({packageId:'PKG-001',packageName:'Normal',packageType:'RACING',durationDays:90,price:5000000,status:'ACTIVE'});
  };
  const result=await remote.savePackage(draft);assert.equal(result.ok,true);assert.equal(result.data.id,'PKG-001');assert.ok(events.includes('reload'));
});

test('unavailable package edit and status operations do not send requests',async()=>{
  const {remote,events}=actions(state());let calls=0;
  globalThis.fetch=async()=>{calls++;return ok({});};
  assert.equal((await remote.savePackage({id:'PKG-001',name:'Normal'})).ok,false);
  assert.equal((await remote.togglePackage('PKG-001',true)).ok,false);
  assert.equal((await remote.togglePackage('PKG-001',false)).ok,false);
  assert.equal(calls,0);assert.ok(events.every(event=>event.startsWith('error:')));
});

test('unavailable package routes report failure without success or reload', async () => {
  const {remote,events} = actions(state());
  globalThis.fetch = async () => denied(404);
  assert.equal((await remote.savePackage({id:'PKG-001',name:'Normal'})).ok, false);
  assert.equal((await remote.togglePackage('PKG-001', false)).ok, false);
  assert.equal(events.length, 2);
  assert.ok(events.every(event => event.startsWith('error:')));
});

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
  await assert.rejects(api.request('/horses'), /invalid API response/);
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
  await assert.rejects(mapping.loadRemote(owner,()=>{}), e => e.status===403 && e.message.includes('role ID 6') && e.message.includes('frontend cannot grant access itself'));
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
  await assert.rejects(remote.createAccount({ role:'owner' }), /Horse owners register themselves/);
  assert.equal(bodies.length,1);
});

test('completion sends actual exercise/recovery fields and does not invent a max speed', async () => {
  const snapshot = state(); const { remote } = actions(snapshot); let payload;
  globalThis.fetch = async (url, init) => { assert.equal(url,'/api/training-sessions/SES-001/complete'); assert.equal(init.method,'PATCH'); payload=JSON.parse(init.body); return ok({}); };
  assert.equal(await remote.completeSession('SES-001',{ time:'1.25',speed:'18.2',heartRate:180,performanceScore:88,notes:'Measured recovery',recoveryMeasuredAt:'2026-10-21T07:32:00.123' }),null);
  assert.equal(payload.distance,1.25); assert.equal(payload.endExerciseHeartRate,180); assert.equal(payload.recoveryHeartRate2Min,88); assert.equal(payload.avgSpeed,18.2);
  assert.match(payload.recoveryMeasuredAt,/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?$/); assert.ok(!('maxSpeed' in payload));
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
  await assert.rejects(api.request('/horses'),/invalid API response/);
  globalThis.fetch=async()=>new Response('<html>Vite</html>',{status:200});
  await assert.rejects(api.request('/notifications'),/invalid API response/);
  globalThis.fetch=async()=>denied();
  await assert.rejects(api.request('/notifications'),e=>e.status===403);
});

test('server failures expose correlation ID and failing operation without request secrets', async () => {
  globalThis.fetch=async()=>new Response(JSON.stringify({success:false,message:'An unexpected server error occurred.',data:{code:'INTERNAL_SERVER_ERROR',errorId:'test-correlation-id'}}),{status:500});
  await assert.rejects(api.request('/horses','POST',{privateValue:'secret'}),e=>e.status===500 && e.message.includes('POST /horses') && e.message.includes('test-correlation-id') && !e.message.includes('secret'));
});

test('a confirmed fit exam cannot bypass inactive horse status', () => {
  const h=horse(); const rec={id:'MED-001',horseId:h.id,date:'21/10/2026',createdAt:1,status:'confirmed',decision:'eligible',trainingEligibility:'eligible'};
  assert.match(purchaseBlockReason({...h,trainingStatus:'Inactive'},[],[rec]),/not active/);
  assert.equal(purchaseBlockReason({...h,trainingStatus:'Active'},[],[rec]),null);
  assert.match(purchaseBlockReason({...h,trainingStatus:'Active',lock:{reason:'medical'}},[],[rec]),/locked/);
  assert.match(purchaseBlockReason({...h,trainingStatus:'Active'},[],[{...rec,status:'draft'}]),/draft/);
  assert.match(purchaseBlockReason({...h,trainingStatus:'Active',approvalStatus:'pending'},[],[rec]),/approved/);
});
test('manager activates an approved horse using the existing API and reloads', async () => {
  const snapshot={...state(),user:user('manager')}; const {remote,events}=actions(snapshot); let calls=0;
  globalThis.fetch=async(url,init)=>{calls++; assert.equal(url,'/api/horses/HOR-007/activate'); assert.equal(init.method,'PATCH'); return ok({});};
  await remote.activateHorse('HOR-007');
  assert.equal(calls,1); assert.equal(events[0],'reload');
  snapshot.user=user('owner');
  await assert.rejects(remote.activateHorse('HOR-007'),/club manager/i); assert.equal(calls,1);
  snapshot.user=user('manager'); snapshot.horses[0].approvalStatus='pending';
  await assert.rejects(remote.activateHorse('HOR-007'),/admission must be approved/); assert.equal(calls,1);
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
  snapshot.user=user('admin'); target.status='invited'; await assert.rejects(remote.createTrainerProfile(target.id),/activate/); assert.equal(calls,1);
});
test('trainer assignment uses profile ID, not account ID', async () => {
  const target={...user('head_trainer'),trainerProfileId:'HTR-099'};
  const snapshot={...state(),user:user('manager'),users:[target],enrollments:[{id:'HPG-001',horseId:'HOR-007',apiStatus:'ACTIVE',paymentStatus:'PAID'}]}; const {remote}=actions(snapshot);
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
  await assert.rejects(loadOwnTrainerProfile('HTR-099','other-user'),/does not belong/);
  const count=calls.length;
  await assert.rejects(saveOwnTrainerProfile(profile,'other-user','bio','cert'),/your own/);
  await assert.rejects(saveOwnTrainerProfile(profile,'HTR-001','x'.repeat(1001),''),/1000/);
  await assert.rejects(loadOwnTrainerProfile('','HTR-001'),/profile ID/);
  assert.equal(calls.length,count);
});
test('trainer profile reports missing records and server errors without pretending to save', async () => {
  globalThis.fetch=async()=>denied(404);
  await assert.rejects(loadOwnTrainerProfile('missing','HTR-001'),e=>e.status===404);
  globalThis.fetch=async()=>denied();
  await assert.rejects(saveOwnTrainerProfile({trainer_id:'HTR-099',user_id:'HTR-001'},'HTR-001','bio','cert'),e=>e.status===403);
});

const protocolDraft=()=>({name:'Vet authored protocol',packageType:'BASIC',minWeight:400,maxWeight:500,rationale:'Test rationale',stages:[{startDay:1,endDay:7,activityName:'Vet authored activity',intensity:'LOW',daysOfWeek:['MONDAY'],sessionTime:'08:00',sessionEndTime:'08:30'}]});
test('protocol APIs preserve vet-authored content and use draft/approval/retire endpoints', async()=>{
  const calls=[];globalThis.fetch=async(url,init)=>{calls.push({url,init});return ok({});};
  const draft=protocolDraft();await protocols.createProtocol(draft);await protocols.changeProtocolStatus('PRO-001','approve');await protocols.changeProtocolStatus('PRO-001','retire');
  assert.deepEqual(JSON.parse(calls[0].init.body),draft);
  assert.deepEqual(calls.map(c=>c.url),['/api/training-protocols','/api/training-protocols/PRO-001/approve','/api/training-protocols/PRO-001/retire']);
});
test('invalid protocol weight and stages are blocked before HTTP', async()=>{
  let calls=0;globalThis.fetch=async()=>{calls++;return ok({});};
  for(const change of [{minWeight:0},{maxWeight:400},{rationale:''},{stages:[]},{stages:[{...protocolDraft().stages[0],sessionEndTime:'07:00'}]},{stages:[...protocolDraft().stages,...protocolDraft().stages]}]) {
    assert.throws(()=>protocols.createProtocol({...protocolDraft(),...change}));
  }assert.equal(calls,0);
});
test('published protocol weight intervals are half-open and package-specific',()=>{
  const active={protocol_id:'PRO-1',package_type:'BASIC',min_weight:400,max_weight:500,status:'APPROVED'};
  assert.equal(protocols.protocolOverlap({...active,protocol_id:'PRO-2',min_weight:450,max_weight:550},[active]),true);
  assert.equal(protocols.protocolOverlap({...active,protocol_id:'PRO-2',min_weight:500,max_weight:550},[active]),false);
  assert.equal(protocols.protocolOverlap({...active,protocol_id:'PRO-2',package_type:'RECOVERY'},[active]),false);
});


test('unpaid and paused packages cannot create trainer assignments', async () => {
  const target={...user('head_trainer'),trainerProfileId:'HTR-099'};
  const enrollment={id:'HPG-001',horseId:'HOR-007',apiStatus:'ACTIVE',paymentStatus:'PENDING'};
  const snapshot={...state(),user:user('manager'),users:[target],enrollments:[enrollment]};
  const {remote}=actions(snapshot); let calls=0;
  globalThis.fetch=async()=>{calls++; return ok({});};
  assert.equal((await remote.assignTrainer(enrollment.id,target.id)).ok,false);
  enrollment.paymentStatus='PAID'; enrollment.apiStatus='PAUSED';
  assert.equal((await remote.assignTrainer(enrollment.id,target.id)).ok,false);
  assert.equal(calls,0);
});

test('trainer responds only through the package assignment endpoint', async () => {
  const enrollment={id:'HPG-001',assignmentId:'ASN-003'};
  const {remote}=actions({...state(),user:user('head_trainer'),enrollments:[enrollment]});
  globalThis.fetch=async(url,init)=>{assert.equal(url,'/api/trainer-assignments/ASN-003/respond');assert.deepEqual(JSON.parse(init.body),{accepted:true,reason:''});return ok({});};
  assert.equal((await remote.respondAssign(enrollment.id,true)).ok,true);
});

test('legacy horse-only assignments cannot be accepted as package work', async () => {
  const {remote}=actions({...state(),user:user('head_trainer'),enrollments:[{id:'direct:ASN-003',directAssignmentId:'ASN-003'}]});
  let calls=0;globalThis.fetch=async()=>{calls++;return ok({});};
  assert.equal((await remote.respondAssign('direct:ASN-003',true)).ok,false);
  assert.equal(calls,0);
});


function scheduleFixture(key) {
  const trainer=user('head_trainer');
  const enrollment={id:key,horseId:'HOR-007',trainerId:trainer.id,trainerStatus:'confirmed',status:'active',assignmentId:'ASN-003',startedAt:'21/10/2026',expiresAt:'19/11/2026'};
  const draft={horseId:'HOR-007',phase:'Foundation',goals:'Review',startDate:enrollment.startedAt,endDate:enrollment.expiresAt,weekdays:[2,4],time:'09:15'};
  const suggestion={recommendationId:'REC-001',stages:[
    {startDay:1,endDay:15,activityName:'Foundation',intensity:'LOW',daysOfWeek:['MONDAY'],sessionTime:'07:00:00',sessionEndTime:'07:30:00'},
    {startDay:16,endDay:30,activityName:'Review',intensity:'LOW',daysOfWeek:['FRIDAY'],sessionTime:'08:00:00',sessionEndTime:'08:45:00'}]};
  return {enrollment,draft,suggestion,remote:actions({...state(),user:trainer,enrollments:[enrollment]}).remote};
}

test('trainer-selected days and start time are sent with each stage duration preserved', async()=>{
  const {remote,draft,suggestion}=scheduleFixture('HPG-editable-schedule');let posted;
  globalThis.fetch=async(url,init)=>{
    if(url.endsWith('/training-recommendations')) return ok(suggestion);
    assert.equal(url,'/api/horses/HOR-007/training-plans');posted=JSON.parse(init.body);return ok({planId:'PLN-001',planName:'Foundation',status:'ACTIVE'});
  };
  assert.equal((await remote.createPlan(draft)).ok,true);
  assert.deepEqual(posted.stages.map(s=>s.daysOfWeek),[['TUESDAY','THURSDAY'],['TUESDAY','THURSDAY']]);
  assert.deepEqual(posted.stages.map(s=>[s.sessionTime,s.sessionEndTime]),[['09:15:00','09:45:00'],['09:15:00','10:00:00']]);
  assert.equal(suggestion.stages[0].sessionTime,'07:00:00');
  assert.equal(posted.recommendationConfirmed,true);
});

test('invalid weekdays, invalid times, overnight stages and changed package dates block plan writes', async()=>{
  const cases=[{weekdays:[]},{weekdays:[0,1,2,3,4,5,6]},{weekdays:[1,1]},{weekdays:[7]},{time:'25:00'},{time:'09:99'},{time:'23:30'},{startDate:'22/10/2026'}];
  for(const [i,changes] of cases.entries()){
    const {remote,draft,suggestion}=scheduleFixture('HPG-invalid-schedule-'+i);let writes=0;
    globalThis.fetch=async(url)=>{if(url.endsWith('/training-recommendations'))return ok(suggestion);writes++;return ok({});};
    assert.equal((await remote.createPlan({...draft,...changes})).ok,false,JSON.stringify(changes));assert.equal(writes,0);
  }
});

test('stage with an invalid original duration cannot be moved into a valid-looking window',async()=>{
  const {remote,draft,suggestion}=scheduleFixture('HPG-invalid-duration');suggestion.stages[0].sessionEndTime='06:00:00';let writes=0;
  globalThis.fetch=async(url)=>{if(url.endsWith('/training-recommendations'))return ok(suggestion);writes++;return ok({});};
  assert.equal((await remote.createPlan(draft)).ok,false);assert.equal(writes,0);
});


test('completion preserves the recorded recovery timestamp instead of replacing it at save',async()=>{
 const {remote}=actions(state());let captured;
 globalThis.fetch=async(url,init)=>{if(url.endsWith('/complete'))captured=JSON.parse(init.body);return ok({});};
 const result=await remote.completeSession('SES-001',{time:'2.00',speed:'10',heartRate:160,performanceScore:110,notes:'',recoveryMeasuredAt:'2026-10-21T07:32:00'});
 assert.equal(result,null);assert.equal(captured.recoveryMeasuredAt,'2026-10-21T07:32:00');
});


test('recovery timestamp is ISO LocalDateTime with a decimal point, including midnight', async()=>{
 const {trainingTimestamp}=await import(pathToFileURL(path.join(dir,'trainingTimestamp.mjs')).href);
 assert.equal(trainingTimestamp(new Date('2026-10-21T06:46:37.669Z')),'2026-10-21T13:46:37.669');
 assert.equal(trainingTimestamp(new Date('2026-10-21T17:00:00.001Z')),'2026-10-22T00:00:00.001');
 assert.match(trainingTimestamp(),/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/);
});


test('trainer selected intensity reaches all plan stages without a LOW cap',async()=>{
 for(const [workload,intensity] of [['Low','LOW'],['Medium','MODERATE'],['High','HIGH']]){
  const {remote,draft,suggestion}=scheduleFixture('HPG-intensity-'+workload);let posted;
  globalThis.fetch=async(url,init)=>{if(url.endsWith('/training-recommendations'))return ok(suggestion);posted=JSON.parse(init.body);return ok({planId:'PLN-001',planName:'Training',status:'ACTIVE'});};
  assert.equal((await remote.createPlan({...draft,workload})).ok,true);assert.ok(posted.stages.every(s=>s.intensity===intensity));
 }
});

test('invalid intensity does not create a training plan',async()=>{
 const {remote,draft,suggestion}=scheduleFixture('HPG-bad-intensity');let writes=0;
 globalThis.fetch=async(url)=>{if(url.endsWith('/training-recommendations'))return ok(suggestion);writes++;return ok({});};
 assert.equal((await remote.createPlan({...draft,workload:'INVALID'})).ok,false);assert.equal(writes,0);
});

test('veterinarian loads current assignments and medical records without history endpoint', async () => {
  const me = user('veterinarian'); const calls = []; const warnings = [];
  globalThis.fetch = async url => {
    const endpoint = String(url); calls.push(endpoint);
    if (endpoint.endsWith('/horses')) return ok([{horseId:'HOR-007',horseName:'Thunder',admissionStatus:'APPROVED',healthStatus:'READY'}]);
    if (endpoint.endsWith('/medical/assignments/mine')) return ok([{assignmentId:'ASN-007',horseId:'HOR-007',veterinarianId:me.id,veterinarianName:me.name,status:'ACCEPTED',createdAt:'2026-10-26T08:00:00'}]);
    if (endpoint.endsWith('/medical/horses/HOR-007/records')) return ok([{medicalRecordId:'MED-007',veterinarianId:me.id,status:'CONFIRMED',finalConclusion:'FIT',examinedAt:'2026-10-26T09:00:00'}]);
    return ok([]);
  };
  const data = await mapping.loadRemote(me, message => warnings.push(message));
  assert.equal(data.horses[0].vetId,me.id);
  assert.equal(data.horses[0].vetAssign.status,'accepted');
  assert.equal(data.healthRecords[0].horseId,'HOR-007');
  assert.equal(data.vetAssignmentsError,undefined);
  assert.equal(calls.some(url=>url.includes('/mine/history')),false);
  assert.deepEqual(warnings,[]);
});

test('veterinary assignment denial is preserved separately from an empty assignment list', async () => {
  globalThis.fetch = async url => String(url).endsWith('/medical/assignments/mine') ? denied() : ok([]);
  const warnings=[];
  const data=await mapping.loadRemote(user('veterinarian'),message=>warnings.push(message));
  assert.match(data.vetAssignmentsError,/server denied access/);
  assert.equal(warnings.length,1);
});


test('manager treats only a missing health profile as empty medical history', async () => {
 for (const [status,message,count] of [[404,'Health profile not found',0],[404,'Horse not found',1],[403,'Denied',1],[500,'Health profile not found',1]]) {
  globalThis.fetch=async url=>url==='/api/horses'?ok([{horseId:'HOR-002',horseName:'Brown',admissionStatus:'PENDING'}]):url==='/api/medical/horses/HOR-002/records'?new Response(JSON.stringify({success:false,message}),{status}):ok([]);
  const warnings=[]; const data=await mapping.loadRemote(user('manager'),m=>warnings.push(m));
  assert.equal(data.horses.length,1); assert.deepEqual(data.healthRecords,[]); assert.equal(warnings.length,count);
 }
});

test('admitted club list excludes pending, rejected and other clubs regardless of health', () => {
 const base=horse();
 const horses=[base,{...base,id:'pending',approvalStatus:'pending',healthStatus:'Eligible'},{...base,id:'rejected',approvalStatus:'rejected'},{...base,id:'other',clubId:'other'}];
 assert.deepEqual(mapping.admittedClubHorses(horses,mapping.CENTER).map(h=>h.id),[base.id]);
 assert.equal(horses.length,4);
});

test('latest confirmed follow-up replaces initial conclusion and ignores newer drafts', () => {
 const initial={id:'initial',horseId:'HOR-007',intake:true,status:'confirmed',date:'27/10/2026',createdAt:1,decision:'not-eligible'};
 const followup={...initial,id:'followup',intake:false,createdAt:2,decision:'eligible'};
 const draft={...followup,id:'draft',status:'draft',createdAt:3,decision:'not-eligible'};
 const other={...followup,id:'other',horseId:'HOR-008',createdAt:4};
 assert.equal(mapping.latestConfirmedExam([initial,draft,other,followup],'HOR-007').id,'followup');
 assert.equal(mapping.latestConfirmedExam([initial,draft],'HOR-007').id,'initial');
 assert.equal(mapping.latestConfirmedExam([draft],'HOR-007'),undefined);
});

function roadmapFixture() { return {title:'Racing foundation',goal:'Build stamina safely',stages:[{startDay:1,endDay:30,title:'Foundation',phaseCode:'FOUNDATION',objective:'Build endurance',activityName:'Easy canter',intensity:'LOW',daysOfWeek:['MONDAY','WEDNESDAY','FRIDAY'],sessionTime:'07:30',sessionEndTime:'08:00'}]}; }

test('package roadmap mapping preserves every configured stage field', async()=>{
 const recommendations=await import(pathToFileURL(path.join(dir,'recommendations.mjs')).href);
 const template=roadmapFixture();template.stages.push({...template.stages[0],startDay:31,endDay:45,activityName:'Tempo run',intensity:'HIGH',sessionTime:'08:00',sessionEndTime:'08:45'});
 const mapped=recommendations.recommendationView(template);
 assert.equal(mapped.stages.length,2);assert.equal(mapped.stages[0].activityName,'Easy canter');assert.deepEqual(mapped.stages[0].daysOfWeek,template.stages[0].daysOfWeek);
 assert.equal(mapped.stages[1].intensity,'HIGH');assert.equal(mapped.stages[1].sessionEndTime,'08:45');assert.equal(mapped.stages[0].phaseCode,'FOUNDATION');assert.equal(mapped.rationale[0],template.goal);
});

test('package roadmap validation rejects invalid stage ranges, times and missing curriculum',async()=>{
 const {validateRoadmap}=await import(pathToFileURL(path.join(dir,'packageRoadmap.mjs')).href);
 assert.equal(validateRoadmap(roadmapFixture(),30),'');
 assert.ok(validateRoadmap(undefined,30));
 for(const patch of [{endDay:31},{startDay:0},{title:''},{phaseCode:''},{activityName:''},{daysOfWeek:[]},{daysOfWeek:['MONDAY','MONDAY']},{daysOfWeek:['NODAY']},{sessionEndTime:'07:00'},{intensity:'UNSAFE'}]) {
  const template=roadmapFixture();template.stages[0]={...template.stages[0],...patch};assert.ok(validateRoadmap(template,30),JSON.stringify(patch));
 }
 const overlap=roadmapFixture();overlap.stages.push({...overlap.stages[0],startDay:20});assert.match(validateRoadmap(overlap,30),/overlap/);
});

test('invalid package roadmap is blocked before HTTP',async()=>{
 const {remote}=actions(state());let calls=0;globalThis.fetch=async()=>{calls++;return ok({});};
 assert.equal((await remote.savePackage({name:'Package',packageType:'BASIC',description:'',durationDays:30,price:1000000})).ok,false);assert.equal(calls,0);
});

test('trainer submits stage-specific schedules and intensities without flattening the template',async()=>{
 const fixture=scheduleFixture('HPG-stage-specific');const template=roadmapFixture();template.stages[0].endDay=15;template.stages.push({...template.stages[0],startDay:16,endDay:30,title:'Performance',phaseCode:'PERFORMANCE',intensity:'HIGH',activityName:'Tempo run',daysOfWeek:['TUESDAY'],sessionTime:'08:00',sessionEndTime:'08:45'});
 let payload;globalThis.fetch=async(url,init)=>{payload=JSON.parse(init.body);return ok({planId:'PLN-1',horseId:'HOR-007'});};
 const result=await fixture.remote.createPlan({...fixture.draft,phase:template.title,goals:template.goal,weekdays:undefined,time:undefined,workload:'',suggestion:{stages:template.stages}});
 assert.equal(result.ok,true);assert.deepEqual(payload.stages.map(s=>[s.activityName,s.intensity,s.daysOfWeek,s.sessionTime,s.sessionEndTime]),template.stages.map(s=>[s.activityName,s.intensity,s.daysOfWeek,s.sessionTime+':00',s.sessionEndTime+':00']));
});


test('combined roadmap stages cannot create a seven-day training week',async()=>{
 const {validateRoadmap}=await import(pathToFileURL(path.join(dir,'packageRoadmap.mjs')).href);
 const template=roadmapFixture();template.stages[0]={...template.stages[0],endDay:6,daysOfWeek:['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY']};
 template.stages.push({...template.stages[0],startDay:7,endDay:30,daysOfWeek:['TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY']});
 assert.match(validateRoadmap(template,30),/rest day/);
 assert.match(validateRoadmap(template,30,'2026-11-02'),/rest day/);
});

test('empty roadmap responses report a configuration error rather than inventing stages',async()=>{
 const recommendations=await import(pathToFileURL(path.join(dir,'recommendations.mjs')).href);
 assert.throws(()=>recommendations.recommendationView({title:'Empty',stages:[]}),/No package roadmap stages/);
 assert.throws(()=>recommendations.recommendationView({phases:[{title:'Legacy'}]}),/No package roadmap stages/);
});


test('retrying an unconfigured roadmap reloads the template instead of caching an empty result',async()=>{
 const recommendations=await import(pathToFileURL(path.join(dir,'recommendations.mjs')).href);recommendations.clearRecommendations();let calls=0;
 globalThis.fetch=async url=>{assert.equal(url,'/api/horse-packages/HPG-retry/roadmap-template');calls++;return ok(calls===1?{stages:[]}:roadmapFixture());};
 await assert.rejects(recommendations.packageRoadmapFor('HPG-retry'),/No package roadmap stages/);
 const value=await recommendations.packageRoadmapFor('HPG-retry');assert.equal(value.stages.length,1);assert.equal(calls,2);
 recommendations.clearRecommendations();
});
