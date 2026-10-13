import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

test('frontend transport matches backend main without admission extensions', async t => {
  const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), define: { 'import.meta.env.VITE_API_BASE_URL': '""' }, server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
  const previous = globalThis.fetch, calls = [];
  t.after(async () => { globalThis.fetch = previous; await server.close(); });
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return Response.json({ success: true, data: [] }); };
  const { sessionService } = await server.ssrLoadModule('/src/services/sessionService.ts');
  const { plansService } = await server.ssrLoadModule('/src/services/planService.ts');
  const { trainingService } = await server.ssrLoadModule('/src/services/trainingService.ts');
  const { raceService } = await server.ssrLoadModule('/src/services/raceService.ts');
  const { authService } = await server.ssrLoadModule('/src/services/authService.ts');
  const last = () => calls.at(-1);
  await plansService.createPlan(14, { planName: 'Speed' });
  assert.equal(last().url, '/api/horses/14/training-plans');
  assert.equal(last().options.method, 'POST');
  await sessionService.byHorse(14); assert.equal(last().url, '/api/training-sessions/horse/14');
  await sessionService.schedule({ planId: 7, horseId: 14, scheduledTime: '2026-10-15T07:00' });
  assert.equal(last().url, '/api/training-sessions'); assert.equal(last().options.method, 'POST');
  await sessionService.recurring({ planId: 7, activityName: 'Run', startDate: '2026-10-15' });
  assert.equal(last().url, '/api/training-sessions/recurring');
  await sessionService.startSession(9); assert.equal(last().url, '/api/training-sessions/9/start'); assert.equal(last().options.method, 'PATCH');
  const result = { heartRate: 70, avgSpeed: 20, maxSpeed: 25, performanceNotes: 'Good' };
  await sessionService.completeSession(9, result); assert.equal(last().options.method, 'PATCH'); assert.deepEqual(JSON.parse(last().options.body), result);
  await sessionService.attendance(9, { status: 'MISSED', absenceReason: 'BAD_WEATHER' });
  assert.equal(last().url, '/api/training-sessions/9/attendance'); assert.equal(last().options.method, 'PUT');
  await trainingService.getPackages(true); assert.equal(last().url, '/api/training-packages/all');
  await trainingService.togglePackageStatus(2, 'INACTIVE'); assert.deepEqual(JSON.parse(last().options.body), { status: 'INACTIVE' });
  await raceService.byHorse(14); assert.equal(last().url, '/api/horses/14/race-history');
  await raceService.create(14, { raceName: 'Cup' }); assert.equal(last().options.method, 'POST');
  await raceService.update(3, { raceName: 'Cup' }); assert.equal(last().url, '/api/horses/race-history/3'); assert.equal(last().options.method, 'PUT');
  await raceService.remove(3); assert.equal(last().options.method, 'DELETE');
  const registration = { fullName: 'Owner', email: 'owner@example.com', password: 'Password123', phone: '', requestedRoleId: 5 };
  await authService.register(registration); assert.equal(last().url, '/api/auth/register'); assert.deepEqual(JSON.parse(last().options.body), registration);
  await authService.verify(registration.email, '123456'); assert.equal(last().url, '/api/auth/verify-email');
  await authService.resend(registration.email); assert.equal(last().url, '/api/auth/resend-otp');
  for (const name of ['LiveContent.jsx', 'LiveHorses.jsx', 'LiveHorseDetail.jsx']) {
    const source = readFileSync(new URL('../src/pages/live/' + name, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /horseService\.(submit|review|assign|profile)|<LiveTrainers|admissionStatus|label: "Duyệt ngựa"/);
  }
  const workspace = readFileSync(new URL('../src/pages/training/WorkflowWorkspace.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(workspace, /horseService\.profile|horse\.admissionStatus/);
});
