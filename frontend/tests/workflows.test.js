import test, { beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createChallenge, verifyChallenge, prepareRegistration, finishRegistration, login, getSession, logout } from '../src/services/demoAuth.js'
import { decideRequest, seedClub, csvReport, loadClub, saveClub } from '../src/services/clubStore.js'

class MemoryStorage {
  values = new Map()
  getItem(key) { return this.values.get(key) ?? null }
  setItem(key, value) { this.values.set(key, String(value)) }
  removeItem(key) { this.values.delete(key) }
}
beforeEach(() => {
  globalThis.localStorage = new MemoryStorage()
  globalThis.sessionStorage = new MemoryStorage()
})
const accountForm = { name: 'Nguyễn Minh', email: ' MINH@example.com ', phone: '', password: 'Raceforge123' }

test('registration stays pending until verified; multiple accounts and duplicate rejection', async () => {
  const pending = await prepareRegistration(accountForm)
  assert.equal(getSession(), null)
  assert.equal(localStorage.getItem('raceforge-accounts-v1'), null)
  assert.equal(pending.email, 'minh@example.com')
  assert.equal(pending.password, undefined)
  assert.notEqual(pending.passwordHash, accountForm.password)
  finishRegistration(pending)
  assert.equal(getSession().passwordHash, undefined)
  await assert.rejects(prepareRegistration(accountForm), /đã được đăng ký/)
  logout()
  const second = await prepareRegistration({ ...accountForm, email: 'second@example.com' })
  finishRegistration(second)
  logout()
  const user = await login('MINH@example.com', accountForm.password, true)
  assert.equal(user.email, 'minh@example.com')
  assert.ok(localStorage.getItem('raceforge-session-v1'))
  assert.equal(sessionStorage.getItem('raceforge-session-v1'), null)
  await assert.rejects(login('minh@example.com', 'wrong-password', false), /không chính xác/)
  logout()
  assert.equal(getSession(), null)
})
test('session-only login, expiration, malformed storage and input validation', async () => {
  await assert.rejects(prepareRegistration({ ...accountForm, name: '  ' }), /họ tên/)
  await assert.rejects(prepareRegistration({ ...accountForm, password: 'short' }), /8 ký tự/)
  await assert.rejects(prepareRegistration({ ...accountForm, email: 'invalid' }), /Email/)
  finishRegistration(await prepareRegistration(accountForm))
  assert.ok(sessionStorage.getItem('raceforge-session-v1'))
  assert.equal(localStorage.getItem('raceforge-session-v1'), null)
  sessionStorage.setItem('raceforge-session-v1', JSON.stringify({ expiresAt: 0, user: { name: 'Expired' } }))
  assert.equal(getSession(), null)
  localStorage.setItem('raceforge-accounts-v1', '{broken')
  await assert.rejects(login('minh@example.com', accountForm.password, false), /không chính xác/)
})
test('OTP accepts six digits, rejects incorrect/expired codes and enforces attempt limit', () => {
  const challenge = createChallenge()
  assert.match(challenge.code, /^\d{6}$/)
  assert.ok(challenge.resendAt > Date.now())
  assert.throws(() => verifyChallenge(challenge, 'invalid'), /không chính xác/)
  verifyChallenge(challenge, challenge.code)
  assert.throws(() => verifyChallenge({ ...challenge, expiresAt: 0 }, challenge.code), /hết hạn/)
  assert.throws(() => verifyChallenge({ ...challenge, attempts: 5 }, challenge.code), /5 lần/)
})
test('approval adds horses once and assigns member roles; rejection adds no staff', () => {
  const initial = structuredClone(seedClub)
  const horseClub = decideRequest(initial, 'horse', 'HR-01', true)
  assert.equal(horseClub.horses.length, initial.horses.length + 1)
  assert.equal(horseClub.horseRequests[0].status, 'approved')
  assert.equal(decideRequest(horseClub, 'horse', 'HR-01', true).horses.length, horseClub.horses.length)
  const memberClub = decideRequest(horseClub, 'member', 'MR-01', true, 'Head Trainer')
  assert.equal(memberClub.staff.at(-1).role, 'Head Trainer')
  const rejected = decideRequest(memberClub, 'member', 'MR-02', false)
  assert.equal(rejected.staff.length, memberClub.staff.length)
  assert.equal(rejected.memberRequests[1].status, 'rejected')
  assert.equal(initial.horseRequests[0].status, 'pending')
  saveClub(rejected)
  assert.deepEqual(loadClub(), rejected)
})
test('CSV supports Vietnamese and escapes quotes, commas and formula-like input', () => {
  const club = structuredClone(seedClub)
  club.horses[0].name = '=SUM(1,2)'
  club.horses[0].owner = 'Nguyễn "Minh", Anh'
  const csv = csvReport(club)
  assert.ok(csv.startsWith('\uFEFF'))
  assert.ok(csv.includes('"\'=SUM(1,2)"'))
  assert.ok(csv.includes('"Nguyễn ""Minh"", Anh"'))
})
