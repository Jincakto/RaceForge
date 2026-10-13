import "./LiveRegisterPage.css";
import { useState } from 'react';
import { authService } from '../../services/authService.ts';
import type { Page } from '../../types/reference.ts';
export function LiveRegisterPage({ navigate }: {
    navigate: (page: Page) => void;
}) {
    const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '', requestedRoleId: null as number | null });
    const [stage, setStage] = useState<'register' | 'verify' | 'done'>('register');
    const [otp, setOtp] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    async function run(action: () => Promise<void>) { if (busy || stage === 'done')
        return; setBusy(true); setError(''); try {
        await action();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Yêu cầu thất bại.');
    }
    finally {
        setBusy(false);
    } }
    return <main className="min-h-screen bg-[#0f1729] text-white flex items-center justify-center p-6"><form className="w-full max-w-md space-y-4" onSubmit={e => { e.preventDefault(); run(async () => { if (stage === 'register') {
        await authService.register({ ...form, email: form.email.trim(), fullName: form.fullName.trim() });
        setStage('verify');
        setNotice('Kiểm tra email để nhận OTP.');
    }
    else {
        await authService.verify(form.email, otp);
        setNotice('Xác thực email thành công. Bạn có thể đăng nhập; vai trò yêu cầu có thể cần quản lý duyệt.');
        setStage('done');
    } }); }}><h1 className="text-3xl font-serif">{stage === 'register' ? 'Đăng ký RaceForge' : stage === 'done' ? 'Đăng ký thành công' : 'Xác thực email'}</h1>{stage === 'register' ? <>{(['fullName', 'email', 'password', 'phone'] as const).map(key => <label className="block" key={key}>{key}<input required className="block w-full bg-white/10 border border-white/20 rounded p-3" maxLength={key === 'password' ? 100 : key === 'fullName' ? 150 : key === 'email' ? 255 : 20} type={key === 'password' ? 'password' : key === 'email' ? 'email' : 'text'} minLength={key === 'password' ? 8 : undefined} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}/></label>)}<label className="block">Vai trò muốn đăng ký<select className="registration-role block w-full bg-white/10 border border-white/20 rounded p-3" value={form.requestedRoleId ?? ''} onChange={e => setForm(f => ({ ...f, requestedRoleId: e.target.value ? Number(e.target.value) : null }))}><option value="">Tài khoản cơ bản</option><option value="2">Head Trainer</option><option value="3">Thú y</option><option value="4">Groom</option><option value="5">Chủ ngựa</option></select></label></> : <><p>{form.email}</p><input aria-label="OTP" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" value={otp} onChange={e => setOtp(e.target.value)} className="w-full bg-white/10 border rounded p-3"/><button type="button" disabled={busy || stage === 'done'} onClick={() => run(async () => { await authService.resend(form.email); setNotice('Đã yêu cầu gửi lại OTP.'); })}>Gửi lại OTP</button></>}{error && <p role="alert" className="text-red-300">{error}</p>}{notice && <p role="status">{notice}</p>}<button disabled={busy || stage === 'done'} className="w-full rounded bg-[#c9973b] p-3">{busy ? 'Đang gửi...' : stage === 'register' ? 'Đăng ký' : 'Xác thực'}</button><button type="button" onClick={() => navigate('login')}>← Đăng nhập</button></form></main>;
}
