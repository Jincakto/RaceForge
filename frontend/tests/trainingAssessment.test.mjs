import { sourceNames, sourceUrl, flattenModuleImports } from './sourceFiles.mjs';
import { after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Actual production adapters with HTTP mocked; no Vite, backend, SQL or browser required.
const dir = await mkdtemp(path.join(tmpdir(), 'raceforge-assessment-api-'));
for (const file of sourceNames()) {
  if (!file.endsWith('.ts') || file.endsWith('.d.ts')) continue;
  const source = await readFile(sourceUrl(file), 'utf8');
  const code = ts.transpileModule(source.replaceAll('import.meta.env', '({})'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText.replace(/[\s\S]*/, flattenModuleImports);
  await writeFile(path.join(dir, file.replace(/\.ts$/, '.mjs')), code);
}
const a = await import(pathToFileURL(path.join(dir, 'trainingAssessment.mjs')));
const api = await import(pathToFileURL(path.join(dir, 'api.mjs')));
const { makeRemoteActions } = await import(pathToFileURL(path.join(dir, 'remoteActions.mjs')));
const { sessionFromApi } = await import(pathToFileURL(path.join(dir, 'remote.mjs')));
const { sessionStartState } = await import(pathToFileURL(path.join(dir, 'trainingSchedule.mjs')));
const originalFetch = globalThis.fetch, originalWindow = globalThis.window;
globalThis.window = new EventTarget();
after(async () => { globalThis.fetch = originalFetch; globalThis.window = originalWindow; await rm(dir, { recursive: true, force: true }); });
beforeEach(() => api.clearSession());
const ok = data => new Response(JSON.stringify({ success: true, data, message: 'OK' }), { headers: { 'Content-Type': 'application/json' } });
const failed = (status, code, message = 'Backend diagnostic SQL [HTTP detail]') => new Response(JSON.stringify({
  success: false, message, data: { code, errorId: 'internal-error' },
}), { status, headers: { 'Content-Type': 'application/json' } });
const answers = (...concerns) => Object.fromEntries(a.ASSESSMENT_CRITERIA.map(item => [item.code, !concerns.includes(item.code)]));
const input = extra => ({ distance: 1.25, avgSpeed: 18.2, endExerciseHeartRate: 180, recoveryHeartRate2Min: 88,
  recoveryMeasuredAt: '2026-11-10T07:32:00.123', assessment: a.toAssessmentRequest(answers()), ...extra });
function saved(sessionId = 'SES-001', extra = {}) {
  return { sessionId, horseId: 'HOR-001', assessorUserId: 'HTR-001', assessorName: 'Trainer One',
    assessedAt: '2026-11-10T07:35:00', checklistVersion: a.ASSESSMENT_VERSION,
    items: a.ASSESSMENT_CRITERIA.map(item => ({ code: item.code, label: item.label, passed: true, failNote: null })),
    passedCount: 10, failedCount: 0, alertLevel: 'NO_ALERT_DETECTED', triggerCodes: [], failedCriteria: [],
    reviewStatus: 'NOT_REQUIRED', notificationStatus: 'NOT_REQUESTED', linkedMedicalRecordId: null,
    reviewedMedicalRecordId: null, pendingPostTrainingReview: false, ...extra };
}
function actions() {
  const successes = [], errors = []; let reloads = 0;
  const remote = makeRemoteActions({ getState: () => ({ user: { id: 'HTR-001', role: 'head_trainer' }, trainingSessions: [] }),
    reload: async () => { reloads++; }, success: value => successes.push(value), error: value => errors.push(value), navigate: () => {} });
  return { remote, successes, errors, reloads: () => reloads };
}

test('checklist has exactly the ten official codes with English labels', () => {
  assert.deepEqual(a.ASSESSMENT_CRITERIA.map(({ code, label }) => [code, label]), [
    ['TASK_COMPLETION', 'Task Completion'], ['SPEED_CONTROL', 'Speed Control'],
    ['MOVEMENT_STABILITY', 'Movement Stability'], ['BALANCE', 'Balance'],
    ['COMMAND_RESPONSE', 'Command Response'], ['FOCUS', 'Focus'], ['STAMINA', 'Stamina'],
    ['SPEED_TRANSITION', 'Speed Transition'], ['COOPERATION', 'Cooperation'],
    ['PERFORMANCE_CONSISTENCY', 'Performance Consistency'],
  ]);
  assert.equal(a.ASSESSMENT_CRITERIA.length, 10);
  assert.equal(new Set(a.ASSESSMENT_CRITERIA.map(item => item.code)).size, 10);
  assert.ok(a.ASSESSMENT_CRITERIA.some(item => item.code === 'COOPERATION'));
  assert.ok(!a.ASSESSMENT_CRITERIA.some(item => item.code === 'GUM_MOISTURE'));
});
test('unanswered, missing, null, coerced and unknown answers never produce a preview', () => {
  assert.equal(a.assessmentPreview({}), null);
  const missing = answers(); delete missing.TASK_COMPLETION;
  for (const value of [missing, { ...answers(), TASK_COMPLETION: null }, { ...answers(), TASK_COMPLETION: 'true' },
    { ...answers(), TASK_COMPLETION: 1 }, { ...answers(), UNKNOWN: true }]) assert.equal(a.assessmentPreview(value), null);
});
test('base score boundaries use the exact backend demo bands', () => {
  const neutral = ['TASK_COMPLETION', 'FOCUS', 'STAMINA', 'SPEED_TRANSITION', 'COOPERATION', 'BALANCE', 'COMMAND_RESPONSE', 'PERFORMANCE_CONSISTENCY'];
  for (const [passed, concerns, level] of [
    [10, [], 'NO_ALERT_DETECTED'], [7, neutral.slice(0, 3), 'NO_ALERT_DETECTED'],
    [6, neutral.slice(0, 4), 'VET_REVIEW_REQUIRED'], [4, neutral.slice(0, 6), 'VET_REVIEW_REQUIRED'],
    [3, neutral.slice(0, 7), 'URGENT_VET_REVIEW'], [0, a.ASSESSMENT_CRITERIA.map(item => item.code), 'URGENT_VET_REVIEW'],
  ]) {
    const preview = a.assessmentPreview(answers(...concerns));
    assert.equal(preview.passedCount, passed); assert.equal(preview.failedCount, 10 - passed); assert.equal(preview.alertLevel, level);
  }
});
for (const code of ['SPEED_CONTROL', 'MOVEMENT_STABILITY']) test(code + ' concern overrides nine passes to urgent', () => {
  assert.equal(a.assessmentPreview(answers(code)).alertLevel, 'URGENT_VET_REVIEW');
  assert.deepEqual(a.assessmentPreview(answers(code)).triggerCodes, [code]);
});
for (const code of ['BALANCE', 'COMMAND_RESPONSE', 'PERFORMANCE_CONSISTENCY']) test(code + ' concern overrides nine passes to recommended', () => {
  assert.equal(a.assessmentPreview(answers(code)).alertLevel, 'VET_REVIEW_REQUIRED');
});
test('combined urgent and recommended overrides retain urgent priority in template order', () => {
  const preview = a.assessmentPreview(answers('SPEED_CONTROL', 'BALANCE', 'PERFORMANCE_CONSISTENCY'));
  assert.equal(preview.alertLevel, 'URGENT_VET_REVIEW');
  assert.deepEqual(preview.triggerCodes, ['SPEED_CONTROL', 'BALANCE', 'PERFORMANCE_CONSISTENCY']);
});
test('all concerns can be submitted without any per-criterion notes', () => {
  const payload = a.completionPayload(input({ assessment: a.toAssessmentRequest(answers(...a.ASSESSMENT_CRITERIA.map(item => item.code))) }));
  assert.equal(Object.values(payload.assessment.checks).filter(value => value === false).length, 10);
  assert.ok(!('failNotes' in payload.assessment)); assert.ok(!('performanceNotes' in payload));
});
test('one optional overall note is trimmed and limited after trimming', () => {
  const original = input({ performanceNotes: '  Recovered calmly.  ' });
  assert.equal(a.completionPayload(original).performanceNotes, 'Recovered calmly.');
  assert.equal(original.performanceNotes, '  Recovered calmly.  ');
  assert.ok(!('performanceNotes' in a.completionPayload(input({ performanceNotes: ' \n\t ' }))));
  assert.equal(a.completionPayload(input({ performanceNotes: '  ' + 'x'.repeat(1000) + '  ' })).performanceNotes.length, 1000);
  assert.throws(() => a.completionPayload(input({ performanceNotes: 'x'.repeat(1001) })), /1,000/);
});
test('completion uses explicit backend measurement fields without inventing a maximum speed', () => {
  const payload = a.completionPayload(input());
  assert.equal(payload.distance, 1.25); assert.equal(payload.avgSpeed, 18.2);
  assert.equal(payload.endExerciseHeartRate, 180); assert.equal(payload.recoveryHeartRate2Min, 88);
  assert.equal(payload.recoveryMeasuredAt, '2026-11-10T07:32:00.123');
  for (const key of ['time', 'speed', 'heartRate', 'performanceScore', 'maxSpeed']) assert.ok(!(key in payload));
  assert.equal(a.completionPayload(input({ maxSpeed: 20 })).maxSpeed, 20);
});
test('completion never forwards client-owned score, review or recipient fields', () => {
  const malicious = input({ passedCount: 10, reviewStatus: 'RESOLVED', recipientId: 'VET-OTHER',
    assessment: { ...a.toAssessmentRequest(answers('BALANCE')), severity: 'NO_ALERT_DETECTED', passedCount: 10,
      canStart: true, failNotes: { BALANCE: 'Legacy ignored observation' } } });
  const payload = a.completionPayload(malicious);
  assert.deepEqual(Object.keys(payload.assessment).sort(), ['checklistVersion', 'checks']);
  assert.equal(payload.assessment.checks.BALANCE, false);
  for (const key of ['passedCount', 'reviewStatus', 'recipientId']) assert.ok(!(key in payload));
});
test('invalid measurement values and missing assessment are rejected before HTTP', () => {
  for (const extra of [{ distance: -1 }, { distance: 1.234 }, { distance: Number.NaN }, { avgSpeed: Infinity },
    { endExerciseHeartRate: 180.5 }, { recoveryHeartRate2Min: 0 }, { recoveryMeasuredAt: '' },
    { recoveryMeasuredAt: '2026-11-10T07:32:00Z' }, { assessment: undefined }, { maxSpeed: 10 }]) {
    assert.throws(() => a.completionPayload(input(extra)));
  }
});
test('labels never echo unknown server enums or inherited object property names', () => {
  assert.equal(a.assessmentLabel('NO_ALERT_DETECTED'), 'Normal');
  assert.equal(a.reviewStatusLabel('PENDING'), 'Awaiting vet review');
  assert.equal(a.notificationStatusLabel('WAITING_FOR_VET_ASSIGNMENT'), 'Waiting for vet assignment');
  for (const unknown of ['__proto__', 'constructor', 'UNKNOWN_LEVEL', null]) {
    assert.equal(typeof a.assessmentLabel(unknown), 'string');
    assert.equal(typeof a.reviewStatusLabel(unknown), 'string');
    assert.equal(typeof a.notificationStatusLabel(unknown), 'string');
    assert.ok(!a.assessmentLabel(unknown).includes(String(unknown)));
  }
});
test('friendly errors omit backend enums, SQL, error identifiers and HTTP diagnostics', () => {
  const failure = new api.ApiError('SQL error [HTTP 409; errorId: secret]', 409, { code: 'PENDING_POST_TRAINING_REVIEW' });
  const message = a.assessmentErrorMessage(failure);
  assert.match(message, /vet check is pending/); assert.doesNotMatch(message, /SQL|HTTP|secret|PENDING_POST_TRAINING_REVIEW/);
  assert.equal(a.assessmentErrorMessage(new Error('PRIVATE_STACK_TRACE'), 'Try again.'), 'Try again.');
  assert.match(a.assessmentErrorMessage(new api.ApiError('Denied', 403)), /permission/);
});
test('manual request scope follows the accepted current package assignment and allows expired history', () => {
  const user = { id: 'HTR-NEW', role: 'head_trainer' }, session = { status: 'Completed', horsePackageId: 'HPG-1', trainerId: 'HTR-OLD' };
  const entries = [{ id: 'HPG-1', trainerId: user.id, trainerStatus: 'confirmed', status: 'completed', paymentStatus: 'PAID' }];
  assert.equal(a.canRequestVetCheck(session, entries, user), true);
  assert.equal(a.canRequestVetCheck(session, entries, { ...user, id: 'HTR-OLD' }), false);
  assert.equal(a.canRequestVetCheck(session, [{ ...entries[0], trainerStatus: 'pending' }], user), false);
  assert.equal(a.canRequestVetCheck(session, entries, { ...user, role: 'owner' }), false);
  assert.equal(a.canRequestVetCheck({ ...session, status: 'In Progress' }, entries, user), false);
});
test('template API validates all ten criteria and prefers the returned labels and help text', async () => {
  const template = { version: a.ASSESSMENT_VERSION, criteria: a.ASSESSMENT_CRITERIA.map(item => ({ ...item, helpText: 'Server guidance: ' + item.helpText })),
    labels: Object.fromEntries(Object.entries(a.assessmentLabels).map(([code, details]) => [code, details.label])) };
  globalThis.fetch = async (url, init) => { assert.equal(url, '/api/training-assessments/template'); assert.equal(init.method, 'GET'); return ok(template); };
  assert.deepEqual(await a.fetchAssessmentTemplate(), template);
  globalThis.fetch = async () => ok({ ...template, criteria: template.criteria.slice(0, 9) });
  await assert.rejects(a.fetchAssessmentTemplate(), /template is unavailable/);
});
test('saved assessment GET verifies identity and complete persisted data without recomputing the server level', async () => {
  const persisted = saved('SES-001', { alertLevel: 'VET_REVIEW_REQUIRED', triggerCodes: ['SERVER_REVIEW'] });
  globalThis.fetch = async () => ok(persisted);
  assert.equal((await a.fetchSessionAssessment('SES-001')).alertLevel, 'VET_REVIEW_REQUIRED');
  globalThis.fetch = async () => ok(saved('SES-OTHER'));
  await assert.rejects(a.fetchSessionAssessment('SES-001'), /could not be verified/);
  globalThis.fetch = async () => ok({});
  await assert.rejects(a.fetchSessionAssessment('SES-001'), /could not be verified/);
});
test('session mapping keeps persisted assessment, pending flags, HR and an empty overall note separate from stage notes', () => {
  const assessment = saved();
  const session = sessionFromApi({ sessionId: 'SES-001', status: 'COMPLETED', assessment,
    pendingPostTrainingReview: true, startBlockedCode: 'PENDING_POST_TRAINING_REVIEW',
    evaluation: '', notes: 'Scheduled stage objective', actualDurationSeconds: 0, avgSpeed: 0,
    endExerciseHeartRate: 180, recoveryHeartRate2Min: 88, recoveryMeasuredAt: '2026-11-10T07:32:00' });
  assert.deepEqual(session.assessment, assessment); assert.equal(session.pendingPostTrainingReview, true);
  assert.equal(session.startBlockedCode, 'PENDING_POST_TRAINING_REVIEW');
  assert.equal(session.result.notes, ''); assert.equal(session.result.time, '0'); assert.equal(session.result.speed, '0');
  assert.equal(session.result.performanceScore, 88); assert.equal(session.result.recoveryMeasuredAt, '2026-11-10T07:32:00');
  assert.equal(sessionFromApi({ sessionId: 'OLD', status: 'COMPLETED' }).assessment, undefined);
});
test('Start shows the friendly pending message even when the raw reason contains a technical code', () => {
  const session = { id: 'S', trainerId: 'HTR-001', status: 'Scheduled', canStart: false,
    startBlockedCode: 'PENDING_POST_TRAINING_REVIEW', startBlockedReason: 'PENDING_POST_TRAINING_REVIEW' };
  assert.deepEqual(sessionStartState(session, [], 'HTR-001'), { allowed: false, reason: a.PENDING_REVIEW_MESSAGE });
});
test('complete action sends the new assessment DTO and only reloads after success', async () => {
  const env = actions(); let payload;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/api/training-sessions/SES-001/complete'); assert.equal(init.method, 'PATCH');
    payload = JSON.parse(init.body); return ok({ sessionId: 'SES-001', status: 'COMPLETED' });
  };
  assert.equal(await env.remote.completeSession('SES-001', input({ performanceNotes: '  Calm recovery.  ' })), null);
  assert.equal(payload.performanceNotes, 'Calm recovery.'); assert.equal(payload.assessment.checks.TASK_COMPLETION, true);
  assert.equal(env.reloads(), 1); assert.equal(env.successes.length, 1);
});
for (const code of ['SESSION_ALREADY_COMPLETED', 'ASSESSMENT_ALREADY_EXISTS']) test(code + ' recovers only after checking persisted assessment', async () => {
  const env = actions(), calls = [];
  globalThis.fetch = async (url, init) => { calls.push([url, init.method]); return url.endsWith('/complete') ? failed(409, code) : ok(saved()); };
  assert.equal(await env.remote.completeSession('SES-001', input()), null);
  assert.deepEqual(calls, [['/api/training-sessions/SES-001/complete', 'PATCH'], ['/api/training-sessions/SES-001/assessment', 'GET']]);
  assert.equal(env.reloads(), 1); assert.equal(env.successes.length, 1);
});
test('duplicate completion with unavailable detail never reports success or reloads as saved', async () => {
  const env = actions();
  globalThis.fetch = async url => url.endsWith('/complete') ? failed(409, 'SESSION_ALREADY_COMPLETED') : failed(404, 'RESOURCE_NOT_FOUND');
  const result = await env.remote.completeSession('SES-001', input());
  assert.equal(typeof result, 'string'); assert.equal(env.reloads(), 0); assert.equal(env.successes.length, 0);
});
test('duplicate completion with wrong-session or malformed detail is not treated as a successful save', async () => {
  for (const response of [saved('SES-OTHER'), {}]) {
    const env = actions();
    globalThis.fetch = async url => url.endsWith('/complete') ? failed(409, 'ASSESSMENT_ALREADY_EXISTS') : ok(response);
    assert.match(await env.remote.completeSession('SES-001', input()), /could not be verified/);
    assert.equal(env.reloads(), 0); assert.equal(env.successes.length, 0);
  }
});
test('other completion conflicts do not refetch assessment or expose diagnostics', async () => {
  const env = actions(), calls = [];
  globalThis.fetch = async url => { calls.push(url); return failed(409, 'INVALID_SESSION_STATE'); };
  const result = await env.remote.completeSession('SES-001', input());
  assert.match(result, /not ready to complete/); assert.doesNotMatch(result, /SQL|HTTP|internal-error/);
  assert.equal(calls.length, 1); assert.equal(env.reloads(), 0); assert.equal(env.successes.length, 0);
});
test('missing answers or overlong overall notes never trigger an HTTP write', async () => {
  const env = actions(); let calls = 0; globalThis.fetch = async () => { calls++; return ok({}); };
  const missing = input(); delete missing.assessment.checks.TASK_COMPLETION;
  assert.match(await env.remote.completeSession('SES-001', missing), /all 10/);
  assert.match(await env.remote.completeSession('SES-001', input({ performanceNotes: 'x'.repeat(1001) })), /1,000/);
  assert.equal(calls, 0); assert.equal(env.reloads(), 0);
});
test('simultaneous complete actions use one HTTP write and release their request lock', async () => {
  const env = actions(); let resolve, writes = 0;
  globalThis.fetch = () => { writes++; return new Promise(done => { resolve = done; }); };
  const first = env.remote.completeSession('SES-001', input());
  const second = await env.remote.completeSession('SES-001', input());
  assert.equal(typeof second, 'string'); assert.equal(writes, 1);
  resolve(ok({ sessionId: 'SES-001', status: 'COMPLETED' })); assert.equal(await first, null);
  globalThis.fetch = async () => ok({ sessionId: 'SES-001', status: 'COMPLETED' });
  assert.equal(await env.remote.completeSession('SES-001', input()), null);
});
test('manual vet request sends the trimmed reason without a client-supplied recipient', async () => {
  const env = actions(); let body;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/api/training-sessions/SES-001/vet-notification'); assert.equal(init.method, 'POST');
    body = JSON.parse(init.body); return ok({ sessionId: 'SES-001', requestStatus: 'SENT', startBlocked: false, message: 'Vet notification sent.' });
  };
  const result = await env.remote.requestVetCheck('SES-001', '  Please check recovery.  ');
  assert.equal(result.ok, true); assert.equal(result.data.startBlocked, false);
  assert.deepEqual(body, { reason: 'Please check recovery.' }); assert.equal(env.reloads(), 1);
});
test('waiting vet response stays truthful and does not invent a Normal start hold', async () => {
  const env = actions(); globalThis.fetch = async () => ok({ sessionId: 'SES-001', requestStatus: 'WAITING_FOR_VET_ASSIGNMENT', startBlocked: false, message: 'Waiting for a vet assignment.' });
  const result = await env.remote.requestVetCheck('SES-001', 'Please check.');
  assert.equal(result.ok, true); assert.equal(result.data.requestStatus, 'WAITING_FOR_VET_ASSIGNMENT'); assert.equal(result.data.startBlocked, false);
});
test('manual vet request requires a nonblank reason and enforces its length', async () => {
  const env = actions(); let calls = 0; globalThis.fetch = async () => { calls++; return ok({}); };
  assert.equal((await env.remote.requestVetCheck('SES-001', '   ')).ok, false);
  assert.equal((await env.remote.requestVetCheck('SES-001', 'x'.repeat(1001))).ok, false);
  assert.equal(calls, 0); assert.equal(env.successes.length, 0);
});
test('malformed successful vet responses never trigger reload or a success announcement', async () => {
  for (const value of [{}, { sessionId: 'SES-001', requestStatus: 'SENT', startBlocked: false }, { sessionId: 'OTHER', requestStatus: 'SENT', startBlocked: false },
    { sessionId: 'SES-001', requestStatus: 'UNRECOGNIZED', startBlocked: false }]) {
    const env = actions(); globalThis.fetch = async () => ok(value);
    assert.equal((await env.remote.requestVetCheck('SES-001', 'Please check.')).ok, false);
    assert.equal(env.reloads(), 0); assert.equal(env.successes.length, 0);
  }
});
test('manual request permission errors remain friendly and do not announce success', async () => {
  const env = actions(); globalThis.fetch = async () => failed(403, 'ACCESS_DENIED');
  const result = await env.remote.requestVetCheck('SES-001', 'Please check.');
  assert.equal(result.ok, false); assert.match(result.message, /permission/);
  assert.doesNotMatch(result.message, /SQL|HTTP|ACCESS_DENIED/); assert.equal(env.successes.length, 0);
});
test('post-training examination preserves session context when creating its medical draft', async () => {
  let created; const remote=makeRemoteActions({getState:()=>({user:{id:'VET-001',role:'veterinarian'},users:[]}),reload:async()=>{},success:()=>{},error:()=>{},navigate:()=>{}});
  globalThis.fetch=async(url,options)=>{
    if(url.endsWith('/assessment'))return ok(saved());
    if(url.endsWith('/health-profile'))return ok('HLT-001');
    if(url==='/api/medical/records')created=JSON.parse(options.body);
    return ok({medicalRecordId:'MED-101',profileId:'HLT-001',examinedAt:'2026-11-10T10:01:00',finalConclusion:'FIT',status:url.endsWith('/confirm')?'CONFIRMED':'DRAFT'});
  };
  const record={id:'local',horseId:'HOR-001',date:'10/11/2026',status:'confirmed',decision:'eligible',regions:{},isPostTraining:true};
  assert.equal(await remote.postExam('SES-001',record),null);
  assert.equal(created.postTrainingSessionId,'SES-001');
});

test('notification context is fetched through its recipient-checked endpoint',async()=>{
 const calls=[];globalThis.fetch=async url=>{calls.push(url);return ok(url.endsWith('/target')?{sessionId:'SES-001',horseId:'HOR-001'}:saved());};
 const value=await a.fetchAssessmentNotification('42');assert.equal(value.assessment.sessionId,'SES-001');
 assert.deepEqual(calls,['/api/training-assessments/notifications/42/target','/api/training-sessions/SES-001/assessment']);
});
test('denied notification targets do not fetch a private assessment',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({success:false,message:'Denied'}),{status:403});};
 await assert.rejects(a.fetchAssessmentNotification('42'),e=>e.status===403);assert.equal(calls,1);
});
test('mismatched notification horse is rejected',async()=>{
 globalThis.fetch=async url=>ok(url.endsWith('/target')?{sessionId:'SES-001',horseId:'HOR-OTHER'}:saved());
 await assert.rejects(a.fetchAssessmentNotification('42'),/does not match/);
});
test('post-training medical save rejects a different horse before writing',async()=>{
 const {remote}=actions();const calls=[];globalThis.fetch=async url=>{calls.push(url);return ok(saved());};
 const error=await remote.postExam('SES-001',{horseId:'HOR-OTHER'});assert.match(error,/different horse/);assert.equal(calls.length,1);
});
test('post-training retry reuses an existing linked DRAFT instead of creating a second record',async()=>{
 const calls=[];const remote=makeRemoteActions({getState:()=>({users:[]}),reload:async()=>{},success:()=>{},error:()=>{},navigate:()=>{}});
 globalThis.fetch=async(url,options)=>{calls.push({url,method:options.method,body:options.body&&JSON.parse(options.body)});if(url.endsWith('/assessment'))return ok(saved('SES-001',{linkedMedicalRecordId:'MED-101'}));return ok({medicalRecordId:'MED-101',profileId:'HLT-001',examinedAt:'2026-11-10T10:01:00',finalConclusion:'FIT',status:url.endsWith('/confirm')?'CONFIRMED':'DRAFT'});};
 const record={id:'local',horseId:'HOR-001',date:'10/11/2026',status:'confirmed',decision:'eligible',regions:{},postTrainingSessionId:'SES-001'};
 assert.equal(await remote.postExam('SES-001',record),null);assert.equal(calls.some(x=>x.url==='/api/medical/records'),false);
 const update=calls.find(x=>x.url.endsWith('/MED-101/draft'));assert.equal(update.method,'PUT');assert.equal(update.body.postTrainingSessionId,undefined);
});
test('reviewed assessment cannot be confirmed through a new draft',async()=>{
 const {remote}=actions();globalThis.fetch=async()=>ok(saved('SES-001',{reviewedMedicalRecordId:'MED-100'}));
 assert.match(await remote.postExam('SES-001',{horseId:'HOR-001'}),/already been reviewed/);
});
test('plan progress uses completed sessions of that plan and excludes cancellations',async()=>{
 const {planProgress}=await import(pathToFileURL(path.join(dir,'remote.mjs')));
 const sessions=[{planId:'PLN-1',status:'Completed'},{planId:'PLN-1',status:'Scheduled'},{planId:'PLN-1',status:'Not Performed'},{planId:'PLN-1',status:'Cancelled'},{planId:'PLN-OTHER',status:'Completed'}];
 assert.equal(planProgress('PLN-1',sessions),33);assert.equal(planProgress('PLN-OTHER',sessions),100);assert.equal(planProgress('PLN-EMPTY',sessions),0);
});

test('historical post-session examination without an assessment keeps the legacy unlinked path',async()=>{
 let created;const remote=makeRemoteActions({getState:()=>({users:[]}),reload:async()=>{},success:()=>{},error:()=>{},navigate:()=>{}});
 globalThis.fetch=async(url,options)=>{if(url.endsWith('/assessment'))return new Response(JSON.stringify({success:false,message:'Historical assessment missing'}),{status:404});if(url.endsWith('/health-profile'))return ok('HLT-001');if(url==='/api/medical/records')created=JSON.parse(options.body);return ok({medicalRecordId:'MED-102',profileId:'HLT-001',status:url.endsWith('/confirm')?'CONFIRMED':'DRAFT',finalConclusion:'FIT'});};
 assert.equal(await remote.postExam('OLD-SESSION',{horseId:'HOR-001',date:'10/11/2026',status:'confirmed',decision:'eligible',regions:{},isPostTraining:true}),null);
 assert.equal(created.postTrainingSessionId,undefined);
});
test('explicit post-training context never falls back to an unrelated exam on 404',async()=>{
 const {remote,reloads}=actions();const calls=[];globalThis.fetch=async url=>{calls.push(url);return new Response(JSON.stringify({success:false,message:'Assessment missing'}),{status:404});};
 assert.equal(await remote.postExam('SES-001',{horseId:'HOR-001',postTrainingSessionId:'SES-001'}),'Assessment missing');assert.equal(calls.length,1);assert.equal(reloads(),0);
});
test('cancelled linked draft permits a new linked examination instead of editing cancelled history',async()=>{
 let created;const paths=[];const remote=makeRemoteActions({getState:()=>({users:[]}),reload:async()=>{},success:()=>{},error:()=>{},navigate:()=>{}});
 globalThis.fetch=async(url,options)=>{paths.push(url);if(url.endsWith('/assessment'))return ok(saved('SES-001',{linkedMedicalRecordId:'MED-OLD'}));if(url==='/api/medical/records/MED-OLD')return ok({medicalRecordId:'MED-OLD',status:'CANCELLED'});if(url.endsWith('/health-profile'))return ok('HLT-001');if(url==='/api/medical/records')created=JSON.parse(options.body);return ok({medicalRecordId:'MED-NEW',profileId:'HLT-001',status:url.endsWith('/confirm')?'CONFIRMED':'DRAFT',finalConclusion:'FIT'});};
 assert.equal(await remote.postExam('SES-001',{horseId:'HOR-001',date:'10/11/2026',status:'confirmed',decision:'eligible',regions:{},postTrainingSessionId:'SES-001'}),null);assert.equal(created.postTrainingSessionId,'SES-001');assert.equal(paths.some(p=>p.endsWith('/MED-OLD/draft')),false);
});


test('old criterion codes have no aliases in requests, saved items, failed criteria or templates', async () => {
  const oldCodes = ['ALERTNESS', 'COORDINATION', 'BREATHING_EFFORT', 'GAIT', 'LIMB_CONDITION',
    'MUSCLE_COMFORT', 'EXTERNAL_INJURY', 'SWEATING', 'MUCOUS_MEMBRANES', 'NASAL_BLEEDING'];
  for (const [index, oldCode] of oldCodes.entries()) {
    const legacy = answers(); delete legacy[a.ASSESSMENT_CRITERIA[index].code]; legacy[oldCode] = true;
    assert.equal(a.assessmentPreview(legacy), null);
    assert.throws(() => a.toAssessmentRequest(legacy), /all 10/);
    const itemValue = saved(); itemValue.items[index].code = oldCode;
    assert.equal(a.assessmentFromApi(itemValue), undefined);
    assert.equal(a.assessmentFromApi(saved('SES-001', { failedCriteria: [oldCode] })), undefined);
    const oldTemplate = { version: a.ASSESSMENT_VERSION,
      criteria: a.ASSESSMENT_CRITERIA.map((item, i) => ({ ...item, code: i === index ? oldCode : item.code })),
      labels: Object.fromEntries(Object.entries(a.assessmentLabels).map(([code, value]) => [code, value.label])) };
    globalThis.fetch = async () => ok(oldTemplate);
    await assert.rejects(a.fetchAssessmentTemplate(), /template is unavailable/);
  }
});
