import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';

function compile(name, imports = {}) {
  const source = readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const context = { exports: {}, require: name => imports[name] || {}, Date, Intl, Number, Math };
  vm.runInNewContext(compiled, context);
  return context.exports;
}
const vet = compile('vetForm.tsx');
const logic = compile('trainingLogic.ts', { './today': { TODAY: '20/10/2026' } });
const bridge = compile('backendBridge.ts', { './trainingLogic': logic });
const plain = value => JSON.parse(JSON.stringify(value));

test('adult resting reference intervals match cited Rutgers FS1262', () => {
  assert.equal(vet.THRESHOLD_SOURCE_URL, 'https://njaes.rutgers.edu/fs1262/');
  assert.deepEqual(plain(vet.VITAL_DEFS.map(d => [d.key, d.lo, d.hi])), [['temperature', 37.2, 38.3], ['heartRate', 28, 48], ['respRate', 8, 14]]);
  for (const def of vet.VITAL_DEFS) {
    assert.equal(vet.evalVital(def, String(def.lo)).kind, 'normal');
    assert.equal(vet.evalVital(def, String(def.hi)).kind, 'normal');
    assert.equal(vet.evalVital(def, '').kind, 'empty');
    assert.equal(vet.evalVital(def, '-1').kind, 'invalid');
    assert.equal(vet.evalVital(def, 'NaN').kind, 'invalid');
  }
});
test('abnormal readings are warned about without fabricated severity cutoffs', () => {
  const temp = vet.VITAL_DEFS[0], pulse = vet.VITAL_DEFS[1];
  assert.equal(vet.evalVital(temp, '38,1').kind, 'normal');
  assert.equal(vet.evalVital(temp, '39').kind, 'mild');
  assert.equal(vet.evalVital(pulse, '100').kind, 'mild');
  assert.equal(vet.evalVital(pulse, '36.5').kind, 'invalid');
  assert.equal(vet.evalVital(temp, '500').kind, 'impossible');
});
test('the UI models all six clinical areas required by the backend', () => {
  assert.deepEqual(plain(vet.REGION_DEFS.map(d => d.key).sort()), ['eyes', 'general', 'legs', 'movement', 'nose', 'skin']);
});
test('horse adapter uses server IDs and never invents identity or assignment acceptance', () => {
  const horse = bridge.toHorse({ horseId: 12, ownerId: 5, horseName: 'Horse', headTrainerId: 2, admissionStatus: 'NOT_SUBMITTED', status: 'INACTIVE' });
  assert.equal(horse.id, 'HRS-000012'); assert.equal(horse.clubId, null);
  assert.equal(horse.microchip, undefined); assert.equal(horse.identityVerified, undefined);
  assert.equal(horse.vetId, ''); assert.equal(horse.trainerHistory.length, 1); assert.equal(horse.trainerHistory[0].trainerId, 'USR-000002');
  assert.equal(horse.trainerHistory[0].from, '');
  assert.throws(() => bridge.backendId('u1700000012345-demo'), /Mã dữ liệu/);
});
test('medical history keeps the examining veterinarian and never treats drafts as confirmed eligibility', () => {
  const row = { medicalRecordId: 7, veterinarianId: 3, healthStatus: 'READY', status: 'DRAFT', examinedAt: '2026-10-19T09:00:00', vitalSign: { bodyTemperature: 38, restingHeartRate: 36, restingRespiratoryRate: 12 }, clinicalExams: [] };
  const users = [{ id: 'USR-000003', name: 'Doctor A' }];
  const draft = bridge.toHealth(row, 'HRS-000012', users);
  assert.equal(draft.vet, 'Doctor A'); assert.equal(draft.vetId, 'USR-000003'); assert.equal(draft.date, '19/10/2026'); assert.equal(draft.decision, undefined);
  const confirmed = bridge.toHealth({ ...row, status: 'CONFIRMED', trainingNote: 'ALLOW_TRAINING' }, 'HRS-000012', users);
  assert.equal(confirmed.decision, 'eligible'); assert.equal(confirmed.vitals.heartRate, '36');
});
test('unpaid and failed registrations stay distinct from active/completed packages', () => {
  const row = { horsePackageId: 1, horseId: 12, packageId: 3, packageName: 'Basic', status: 'PENDING', paymentStatus: 'PENDING' };
  const pending = bridge.toEnrollment(row);
  assert.equal(pending.status, 'pending'); assert.equal(logic.isCurrent(pending), false);
  const cancelled = bridge.toEnrollment({ ...row, status: 'CANCELLED', paymentStatus: 'FAILED' });
  assert.equal(cancelled.status, 'cancelled'); assert.equal(cancelled.paidAt, '');
  const active = bridge.toEnrollment({ ...row, status: 'ACTIVE', paymentStatus: 'PAID', startDate: '2026-10-20', endDate: '2026-11-19' });
  assert.equal(logic.isCurrent(active), true); assert.equal(active.expiresAt, '19/11/2026');
});
test('staff roles come from backend and a regular manager is never promoted to admin', () => {
  const user = bridge.toAppUser({ userId: 1, fullName: 'Manager', email: 'm@example.com', role: { roleName: 'CLUB_MANAGER' }, status: 'ACTIVE', emailVerified: true });
  assert.equal(user.role, 'manager'); assert.equal(user.password, '');
});
test('plan creation and generated sessions use real server IDs and preserve activity details', async () => {
  const calls = [];
  const apiBridge = compile('backendBridge.ts', { './trainingLogic': logic, './api': { api: async (path, method, body) => {
    calls.push({ path, method, body });
    if (path.endsWith('/training-plans')) return { planId: 77, planName: body.planName, goal: body.goal };
    return [{ sessionId: 88, horseId: 12, planId: 77, scheduledStart: '2026-10-21T07:00:00', notes: body.activityName, status: 'SCHEDULED' }];
  } } });
  let state = { user: { name: 'Trainer' }, trainingPlans: [] };
  let refreshed = 0;
  const handlers = apiBridge.makeBackendHandlers(() => state, fn => { state = fn(state); }, async () => { refreshed++; });
  const plan = await handlers.createPlan({ horseId: 'HRS-000012', phase: 'Foundation', goals: 'Build endurance', startDate: '20/10/2026', endDate: '20/11/2026', distance: '1200m', workload: 'Low', surface: 'Grass' });
  assert.equal(plan.ok, true); assert.equal(plan.data.id, 'PLN-000077');
  assert.match(calls[0].body.notes, /1200m/);
  const generated = await handlers.generateSessions('HRS-000012', plan.data.id, [{ date: '21/10/2026', time: '07:00', type: 'Walk', distance: '1200m', targetTime: 'Easy', notes: 'Recovery day' }]);
  assert.equal(generated.ok, true); assert.equal(generated.data[0].id, 'SES-000088');
  assert.equal(calls[1].path, '/api/training-sessions/recurring'); assert.equal(calls[1].body.planId, 77); assert.equal(calls[1].body.startDate, '2026-10-21');
  assert.match(calls[1].body.activityName, /Walk.*1200m.*Recovery day/);
  assert.equal(refreshed, 1);
  assert.equal(handlers.assignTrainer().ok, false); assert.equal(handlers.respondAssign().ok, false);
});
