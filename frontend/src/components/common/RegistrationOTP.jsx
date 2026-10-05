import { useEffect, useRef, useState } from 'react'
import { createChallenge, verifyChallenge } from '../../services/demoAuth'

export default function RegistrationOTP({ email, onVerified, onCancel }) {
  const [challenge, setChallenge] = useState(createChallenge)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now)
  const [busy, setBusy] = useState(false)
  const input = useRef(null)
  useEffect(() => {
    input.current?.focus()
    const timer = setInterval(() => setNow(Date.now()), 1000)
    const escape = event => { if (event.key === 'Escape') onCancel() }
    window.addEventListener('keydown', escape)
    return () => { clearInterval(timer); window.removeEventListener('keydown', escape) }
  }, [onCancel])
  const remaining = Math.max(0, Math.ceil((challenge.expiresAt - now) / 1000))
  const cooldown = Math.max(0, Math.ceil((challenge.resendAt - now) / 1000))
  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    try { const updated = { ...challenge }; setChallenge(updated); verifyChallenge(updated, code); await onVerified() } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  function resend() {
    if (Date.now() < challenge.resendAt) return
    setChallenge(createChallenge())
    setCode(''); setError(''); setNow(Date.now()); input.current?.focus()
  }
  return <div className="otp-backdrop"><section className="otp-dialog" role="dialog" aria-modal="true" aria-labelledby="otp-title">
    <h2 id="otp-title">Xác thực đăng ký</h2><p>Nhập mã OTP cho <strong>{email}</strong>.</p>
    <p className="otp-demo">Chế độ mô phỏng, chưa gửi email. Mã thử: <strong>{challenge.code}</strong></p>
    <form onSubmit={submit}><label htmlFor="otp-code">Mã xác thực 6 chữ số</label><input ref={input} id="otp-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))}/>
      <p aria-live="polite">Mã hết hạn sau {remaining} giây.</p>{error && <p role="alert" className="form-error">{error}</p>}
      <button className="button button-gold" disabled={busy || !remaining || code.length !== 6}>Xác thực tài khoản</button>
    </form><div className="otp-actions"><button disabled={busy || cooldown > 0} onClick={resend}>Gửi lại mã {cooldown > 0 && `(${cooldown}s)`}</button><button disabled={busy} onClick={onCancel}>Hủy đăng ký</button></div>
  </section></div>
}
