// Browser-only prototype adapter. Replace with server authentication before deployment.
const accountsKey = 'raceforge-accounts-v1'
const sessionKey = 'raceforge-session-v1'
export function readJson(storage, key, fallback) {
  try { return JSON.parse(storage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}
const publicUser = ({ id, name, email, phone, role }) => ({ id, name, email, phone, role })
async function hash(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bytes = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256)
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')
}
export function getSession() {
  const session = readJson(sessionStorage, sessionKey, null) || readJson(localStorage, sessionKey, null)
  if (!session || session.expiresAt < Date.now()) { logout(); return null }
  return session.user
}
function saveSession(user, remember) {
  logout()
  const storage = remember ? localStorage : sessionStorage
  storage.setItem(sessionKey, JSON.stringify({ user: publicUser(user), expiresAt: Date.now() + (remember ? 7 : 1) * 86400000 }))
  return publicUser(user)
}
export function logout() {
  sessionStorage.removeItem(sessionKey)
  localStorage.removeItem(sessionKey)
}
export function createChallenge() {
  const values = new Uint32Array(1)
  crypto.getRandomValues(values)
  return { code: String(values[0] % 1000000).padStart(6, '0'), expiresAt: Date.now() + 300000, resendAt: Date.now() + 30000, attempts: 0 }
}
export function verifyChallenge(challenge, code) {
  if (Date.now() >= challenge.expiresAt) throw new Error('OTP đã hết hạn. Hãy gửi lại mã.')
  if (challenge.attempts >= 5) throw new Error('Đã vượt quá 5 lần thử. Hãy gửi lại mã.')
  challenge.attempts += 1
  if (!/^\d{6}$/.test(code) || code !== challenge.code) throw new Error('Mã OTP không chính xác.')
}
export async function prepareRegistration(form) {
  const email = form.email.trim().toLowerCase()
  const name = form.name.trim()
  if (!name) throw new Error('Vui lòng nhập họ tên.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email không hợp lệ.')
  if (form.password.length < 8) throw new Error('Mật khẩu cần ít nhất 8 ký tự.')
  const accounts = readJson(localStorage, accountsKey, [])
  if (accounts.some(account => account.email === email)) throw new Error('Email đã được đăng ký.')
  const salt = crypto.randomUUID()
  return { id: crypto.randomUUID(), name, email, phone: form.phone.trim(), role: 'member', salt, passwordHash: await hash(form.password, salt) }
}
export function finishRegistration(account) {
  const accounts = readJson(localStorage, accountsKey, [])
  if (accounts.some(item => item.email === account.email)) throw new Error('Email đã được đăng ký.')
  localStorage.setItem(accountsKey, JSON.stringify([...accounts, account]))
  return saveSession(account, false)
}
export async function login(email, password, remember) {
  const account = readJson(localStorage, accountsKey, []).find(item => item.email === email.trim().toLowerCase())
  if (!account || account.passwordHash !== await hash(password, account.salt)) throw new Error('Email hoặc mật khẩu không chính xác.')
  return saveSession(account, remember)
}
