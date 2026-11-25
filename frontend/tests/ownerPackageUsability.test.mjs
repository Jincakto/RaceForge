import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, Error, require: name => dependencies[name] || {} });
  return exports;
}
const payment = load('../src/features/packages/paymentState.ts');
const filtering = load('../src/features/packages/registrationFilters.ts');
function actions(api) {
  const events = { success: [], error: [], info: [], reloads: 0 };
  const { makeRemoteActions } = load('../src/app/remoteActions.ts', {
    '../features/packages/paymentState': payment,
    '../features/packages/api/packagesApi': api,
    './remote': { enrollmentFromApi: value => value },
  });
  const state = { packages: [], horses: [], enrollments: [{ id: 'HPG-1', horseId: 'HOR-1', packageId: 'PKG-1', apiStatus: 'PENDING', paymentStatus: 'PENDING' }] };
  const result = makeRemoteActions({ getState: () => state, reload: async () => { events.reloads++; },
    success: message => events.success.push(message), error: message => events.error.push(message),
    info: message => events.info.push(message), warning: () => {}, navigate: () => {} });
  return { actions: result, events };
}

test('cancelled link is a typed notice, reloads registrations and never shows a success/error toast', async () => {
  const { actions: a, events } = actions({ createPackagePaymentLink: async () => ({ paymentState: 'CANCELLED', checkoutUrl: 'old-link' }) });
  const result = await a.startPayment('HOR-1', 'PKG-1', 'HPG-1');
  assert.equal(result.ok, false); assert.equal(result.code, 'PAYMENT_CANCELLED');
  assert.equal(result.message, payment.CANCELLED_PAYMENT_MESSAGE);
  assert.equal(events.success.length, 0); assert.equal(events.error.length, 0);
  assert.equal(events.info.length, 1); assert.equal(events.reloads, 1);
  assert.equal(payment.terminalPaymentCode(result.code), true);
});
test('polling cancellation produces the same terminal decision and no receipt lookup', async () => {
  const { actions: a, events } = actions({ syncPackagePayment: async () => ({ paymentState: 'CANCELLED' }),
    listHorsePackages: () => { throw Error('Cancelled payment must not produce a receipt'); } });
  const result = await a.syncPayment('HOR-1', 'HPG-1');
  assert.equal(result.code, 'PAYMENT_CANCELLED'); assert.equal(events.success.length, 0);
});
test('pending polling and link creation are silent rather than reporting payment success', async () => {
  const { actions: a, events } = actions({ createPackagePaymentLink: async () => ({ paymentState: 'PENDING', checkoutUrl: 'link', orderCode: 1 }),
    syncPackagePayment: async () => ({ paymentState: 'PENDING' }), listHorsePackages: async () => [{ horsePackageId: 'HPG-1', paymentStatus: 'PENDING' }] });
  assert.equal((await a.startPayment('HOR-1', 'PKG-1', 'HPG-1')).ok, true);
  assert.equal((await a.syncPayment('HOR-1', 'HPG-1')).ok, true);
  assert.equal(events.success.length, 0);
});
test('real transport failure remains an error, not a cancelled notice', async () => {
  const { actions: a, events } = actions({ syncPackagePayment: async () => { throw Error('Network unavailable'); } });
  const result = await a.syncPayment('HOR-1', 'HPG-1');
  assert.equal(result.ok, false); assert.equal(result.code, undefined); assert.equal(events.error.length, 1);
});
test('only server terminal states stop retry; closing a page is not a cancellation', () => {
  assert.equal(payment.paymentNotice({ paymentState: 'PENDING' }), null);
  assert.equal(payment.paymentNotice({ paymentState: 'PAID', applied: true }), null);
  assert.equal(payment.terminalPaymentCode(undefined), false);
  assert.equal(payment.paymentNotice({ paymentState: 'PAID', applied: false }).code, 'PAYMENT_REVIEW_REQUIRED');
});
test('combined filters use actual status instead of the coarse completed group', () => {
  const rows = [
    { id: 'HPG-1', horseId: 'H1', packageName: 'Performance v1', apiStatus: 'COMPLETED', paymentStatus: 'PAID', status: 'completed' },
    { id: 'HPG-2', horseId: 'H1', packageName: 'Performance v2', apiStatus: 'CANCELLED', paymentStatus: 'FAILED', status: 'completed' },
    { id: 'HPG-3', horseId: 'H2', packageName: 'Basic', apiStatus: 'EXPIRED', paymentStatus: 'PENDING', status: 'completed' },
  ];
  const horses = [{ id: 'H1', name: 'Thunder' }, { id: 'H2', name: 'Gold' }];
  const f = { ...filtering.EMPTY_REGISTRATION_FILTERS, horseId: 'H1', status: 'CANCELLED', paymentStatus: 'FAILED', search: ' THUNDER ' };
  assert.deepEqual(Array.from(filtering.filterRegistrations(rows, horses, f), r => r.id), ['HPG-2']);
  assert.equal(filtering.filterRegistrations(rows, horses, { ...f, search: 'missing' }).length, 0);
  assert.equal(filtering.filterRegistrations(rows, horses, filtering.EMPTY_REGISTRATION_FILTERS).length, 3);
  assert.equal(rows.length, 3);
});
