// Optional browser integration check. Install Playwright or expose it via NODE_PATH.
// All /api calls are intercepted; no real account or database is modified.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
const { chromium } = createRequire(import.meta.url)('playwright');
const server = await createServer({ server: { host: '127.0.0.1', port: 5183, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'chrome' } : {}) });
const failures = [];
const horse = { horseId: 7, ownerId: 5, horseName: 'Live horse', breed: 'Thoroughbred', coatColor: 'Bay', weight: 480, height: 160, status: 'ACTIVE', healthStatus: 'READY', admissionStatus: 'APPROVED', headTrainerId: 2, trainingLocked: false };
const pkg = { packageId: 8, packageName: 'Live package', packageType: 'BASIC', durationDays: 30, price: 1000000, status: 'ACTIVE' };
const enrollment = { horsePackageId: 9, horseId: 7, packageId: 8, packageName: 'Live package', packageType: 'BASIC', status: 'PENDING', paymentStatus: 'UNPAID' };
const session = { sessionId: 12, horseId: 7, planId: 11, scheduledStart: '2026-10-21T07:00:00', status: 'SCHEDULED' };
async function scenario(role, run, authenticated = true) {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const requests = [];
  // Fulfill app assets through the Node server connection so the browser itself
  // does not require loopback access in restricted desktop environments.
  await page.route('http://127.0.0.1:5183/**', async route => {
    const response = await fetch(route.request().url());
    await route.fulfill({ status: response.status, contentType: response.headers.get('content-type') || 'text/plain', body: Buffer.from(await response.arrayBuffer()) });
  });
  let record = null;
  let membershipRequest = null;
  const user = { userId: role === 'HORSE_OWNER' ? 5 : role === 'VETERINARIAN' ? 3 : 2, fullName: 'Test user', email: 'test@example.com', status: 'ACTIVE', emailVerified: true, role: { roleId: 5, roleName: role } };
  page.on('pageerror', error => failures.push(error.message));
  await page.route('**/api/**', async route => {
    const req = route.request(); const url = new URL(req.url()); const p = url.pathname;
    const method = req.method(); const body = req.postDataJSON();
    requests.push({ p, method, body, query: url.searchParams });
    let data;
    if (p === '/api/auth/refresh' && !authenticated) return route.fulfill({ status: 401, json: { message: 'Sign in required' } });
    if (p === '/api/auth/refresh' || p === '/api/auth/login') data = { accessToken: 'test-token', user };
    else if (['/api/auth/register', '/api/auth/verify-email', '/api/auth/resend-otp'].includes(p)) data = { message: 'Success' };
    else if (p === '/api/health') data = { status: 'UP' };
    else if (p === '/api/users/me') data = user;
    else if (p === '/api/users/me/registration-request') {
      if (method === 'POST') membershipRequest = { requestId: 3, status: 'PENDING', requestedRole: { roleName: 'GROOM' } };
      if (!membershipRequest) return route.fulfill({ status: 404, json: { success: false, message: 'Registration request not found' } });
      data = membershipRequest;
    }
    else if (p === '/api/notifications/unread-count') return route.fulfill({ json: { unreadCount: 1 } });
    else if (p === '/api/notifications') return route.fulfill({ json: [{ notificationId: 1, title: 'Message', message: 'Server notice', read: false }] });
    else if (p === '/api/notifications/1/read') return route.fulfill({ json: { notificationId: 1, read: true } });
    else if (p === '/api/horses') data = method === 'GET' ? [horse] : { ...horse, ...body };
    else if (p === '/api/horses/7') data = horse;
    else if (p === '/api/trainers') data = { content: [{ userId: 2, fullName: 'Live trainer' }], totalPages: 1 };
    else if (p === '/api/trainers/2') data = { userId: 2, fullName: 'Live trainer' };
    else if (p === '/api/horses/7/trainer') data = horse;
    else if (p === '/api/training-packages' || p === '/api/training-packages/all') data = [pkg];
    else if (p === '/api/training-packages/8') data = pkg;
    else if (p === '/api/horse-packages/horse/7') data = [enrollment];
    else if (p === '/api/horse-packages/register' || p === '/api/horse-packages/9/simulate-payment') data = enrollment;
    else if (p === '/api/training-sessions/horse/7') data = [];
    else if (p === '/api/horses/7/race-history') data = [];
    else if (p === '/api/horses/7/training-plans') data = { planId: 11, horseId: 7, ...body };
    else if (p === '/api/training-sessions' || p === '/api/training-sessions/12/start' || p === '/api/training-sessions/12/complete') data = session;
    else if (p === '/api/training-sessions/recurring') data = [session];
    else if (p === '/api/training-sessions/12/attendance') data = { session, warningTriggered: true, warningMessage: 'Attendance warning' };
    else if (p === '/api/horses/7/health-profile') data = 42;
    else if (p === '/api/medical/horses/7/records') data = record ? [record] : [{ medicalRecordId: 13, veterinarianId: 3, examType: 'INITIAL', examinedAt: '2026-10-19T07:00:00', createdAt: '2026-10-19T07:00:00', healthStatus: 'READY', status: 'CONFIRMED', vitalSign: { bodyTemperature: 38, restingHeartRate: 36, restingRespiratoryRate: 12 }, clinicalExams: [], trainingNote: 'ALLOW_TRAINING' }];
    else if (p === '/api/medical/horses/7/previous-examination') return route.fulfill({ status: 204 });
    else if (p === '/api/medical/horses/7/training-lock/history') data = [];
    else if (p === '/api/medical/records') { record = { ...body, medicalRecordId: 13, status: 'DRAFT' }; data = record; }
    else if (p === '/api/medical/records/13') data = record;
    else if (p === '/api/medical/records/13/draft') { record = { ...record, ...body }; data = record; }
    else if (p === '/api/medical/records/13/confirm') { record = { ...record, status: 'CONFIRMED' }; data = record; }
    else if (p === '/api/users') data = { content: [user], totalPages: 2, totalElements: 21 };
    else if (p === '/api/registration-requests') data = { content: [{ requestId: 1, user, requestedRole: { roleName: 'GROOM' }, status: 'PENDING' }], totalPages: 1 };
    else if (p === '/api/registration-requests/1') data = { requestId: 1, user, status: 'PENDING' };
    else if (p === '/api/registration-requests/1/approve') data = { requestId: 1, status: 'APPROVED' };
    else if (p === '/api/admin/permissions/catalog') data = [{ permissionName: 'MANAGE_TRAINING', description: 'Manage training' }];
    else if (p.endsWith('/audit-log')) data = [];
    else if (p === '/api/admin/permissions/revoke') data = null;
    else if (p.startsWith('/api/admin/permissions/')) data = ['MANAGE_TRAINING'];
    else { failures.push(`Unexpected request ${method} ${p}`); return route.fulfill({ status: 500, json: { message: 'Unexpected test endpoint' } }); }
    await route.fulfill({ json: { success: true, data } });
  });
  try {
    await page.goto('http://127.0.0.1:5183');
    if (authenticated) await page.locator('nav').waitFor();
    else await page.getByRole('button', { name: 'Register', exact: true }).waitFor();
    await run(page, requests);
    console.log(`PASS ${role} browser workflow`);
  } catch (error) { console.error('Page errors:', failures); console.error((await page.locator('body').innerText()).slice(0, 2500)); throw error; }
  finally { await context.close(); }
}

const nav = (page, pattern) => page.locator('nav').getByRole('button', { name: pattern }).click();
async function waitForCall(requests, path, method) {
  for (let i = 0; i < 100; i++) { if (requests.some(r => r.p === path && (!method || r.method === method))) return; await new Promise(resolve => setTimeout(resolve, 20)); }
  assert.fail('Expected request ' + path);
}
try {
  await scenario('USER', async (page, requests) => {
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    assert.equal(await page.getByRole('combobox').count(), 0);
    await page.getByPlaceholder('Full name', { exact: true }).fill('New owner');
    await page.getByPlaceholder('you@example.com', { exact: true }).fill('new@example.com');
    await page.getByPlaceholder('At least 8 characters', { exact: true }).fill('Password123!');
    await page.getByPlaceholder('Enter again', { exact: true }).fill('Password123!');
    await page.getByRole('button', { name: /Send OTP/ }).click();
    await page.getByPlaceholder('000000').fill('123456');
    await page.getByRole('button', { name: /Xác nhận|Confirm/ }).click();
    await waitForCall(requests, '/api/auth/verify-email', 'POST');
    assert.equal(requests.find(r => r.p === '/api/auth/register').body.requestedRoleId, 5);
    assert.equal(requests.find(r => r.p === '/api/auth/verify-email').body.otp, '123456');
  }, false);
  await scenario('HORSE_OWNER', async (page, requests) => {
    await nav(page, /Register a new horse|Đăng ký ngựa mới/i);
    await page.getByLabel(/Horse name|Tên ngựa/i).fill('New live horse');
    await page.getByLabel(/Date of birth|Ngày sinh/i).fill('2020-01-01');
    await page.getByLabel(/Coat colou?r|Màu lông/i).fill('Bay');
    await page.getByLabel(/Height.*cm|Chiều cao/i).fill('160');
    await page.getByLabel(/Weight.*kg|Cân nặng/i).fill('480');
    await page.getByRole('button', { name: /Gửi đăng ký|Submit registration/i }).click();
    await waitForCall(requests, '/api/horses', 'POST');
    const created = requests.find(r => r.p === '/api/horses' && r.method === 'POST');
    assert.equal(created.query.get('ownerId'), '5'); assert.equal(created.body.weight, 480); assert.equal(created.body.gender, 'Male');
    assert.equal(created.body.microchip, undefined);
    await nav(page, /My horses|Ngựa của tôi/i);
    await page.getByText('Live horse', { exact: true }).first().click();
    await page.getByText(/Request changes to approved profile/).waitFor();
    assert.equal(await page.getByRole('button', { name: /Submit change request/ }).isDisabled(), true);
  });
  await scenario('CLUB_MANAGER', async (page, requests) => {
    await nav(page, /Horses in the club|Ngựa trong trung tâm/i);
    const search = page.getByPlaceholder(/HRS/); await search.fill('HRS-000007');
    await page.getByText('Live horse', { exact: true }).waitFor();
    await search.fill('missing'); await page.getByText('Live horse', { exact: true }).waitFor({ state: 'hidden' });
    await search.fill(''); await page.getByRole('button', { name: 'Female', exact: true }).click();
    await page.getByText('Live horse', { exact: true }).waitFor({ state: 'hidden' });
    await nav(page, /Club staff|Nhân sự/i);
    await page.getByRole('heading', { name: /Admin.*staff accounts/ }).waitFor();
    assert.equal(await page.getByRole('button', { name: /Create staff account.*waiting/ }).isDisabled(), true);
    assert(!requests.some(r => r.method === 'POST' && r.p.startsWith('/api/users')));
  });
  await scenario('VETERINARIAN', async (page, requests) => {
    await nav(page, /Medical records|Lịch sử khám/i);
    await page.getByText(/MED-000013/).first().waitFor();
    await nav(page, /Health examination|Khám sức khỏe|Create medical record/i);
    const search = page.getByPlaceholder(/Red Comet/); await search.fill('HRS-000007');
    await page.getByRole('button', { name: /Live horse/ }).click();
    await page.getByText('Live horse', { exact: true }).first().waitFor();
    await page.getByRole('link', { name: /Rutgers/ }).waitFor();
    assert(!requests.some(r => r.p === '/api/medical/records' && r.method === 'POST'));
  });
  await scenario('HEAD_TRAINER', async (page, requests) => {
    await nav(page, /Training.*plans|Huấn luyện.*Lộ trình/i);
    await page.getByRole('button', { name: /Lập lộ trình|Create plan|Create training plan/i }).first().click();
    await page.getByRole('button', { name: /Live horse/ }).click();
    await page.getByRole('button', { name: /Tiếp tục|Continue|Next/i }).last().click();
    await page.getByText(/Condition.*Live horse|Tình trạng.*Live horse/i).waitFor();
    assert(!requests.some(r => r.p.endsWith('/training-plans') && r.method === 'POST'));
  });
  assert.deepEqual(failures, []);
} finally { await browser.close(); await server.close(); }
