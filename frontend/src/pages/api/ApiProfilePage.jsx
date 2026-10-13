import { useEffect, useState } from 'react';
import { accountService } from '../../services/accountService.ts';
import { toAppUser } from '../../services/authService.ts';
import { useApp } from '../../hooks/useApp.js';
import { ApiFeedback } from '../../components/common/ApiFeedback.jsx';
export function ApiProfilePage() {
    const { setState, handleLogout } = useApp();
    const [form, setForm] = useState({ fullName: '', phone: '', avatarUrl: '' }), [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
    const [current, setCurrent] = useState(''), [password, setPassword] = useState(''), [confirm, setConfirm] = useState('');
    useEffect(() => { let active = true; accountService.me().then(u => { if (active) {
        setForm({ fullName: u.fullName, phone: u.phone || '', avatarUrl: u.avatarUrl || '' });
        setLoaded(true);
    } }).catch(e => active && setError(e.message)); return () => { active = false; }; }, []);
    async function run(action) { if (busy)
        return; setBusy(true); setError(''); setNotice(''); try {
        await action();
    }
    catch (e) {
        setError(e.message);
    }
    finally {
        setBusy(false);
    } }
    return <section className="space-y-6"><h1 className="text-2xl">Hồ sơ cá nhân</h1><ApiFeedback loading={busy || (!loaded && !error)} error={error} notice={notice}/><form className="grid gap-4 max-w-lg" onSubmit={e => { e.preventDefault(); run(async () => { const u = await accountService.update(form); setState(s => ({ ...s, user: toAppUser(u) })); setNotice('Đã lưu hồ sơ.'); }); }}><fieldset disabled={!loaded || busy} className="grid gap-4">{['fullName', 'phone', 'avatarUrl'].map(key => <label key={key}>{key}<input className="border rounded p-2 block w-full" required={key === 'fullName'} maxLength={key === 'fullName' ? 150 : key === 'phone' ? 20 : 500} type={key === 'avatarUrl' ? 'url' : 'text'} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}/></label>)}<button>Lưu hồ sơ</button></fieldset></form><form className="grid gap-3 max-w-lg" onSubmit={e => { e.preventDefault(); run(async () => { if (password !== confirm)
        throw new Error('Mật khẩu xác nhận không khớp.'); await accountService.changePassword(current, password); await handleLogout(); }); }}><h2>Đổi mật khẩu</h2><input aria-label="Mật khẩu hiện tại" required type="password" autoComplete="current-password" placeholder="Mật khẩu hiện tại" value={current} onChange={e => setCurrent(e.target.value)}/><input aria-label="Mật khẩu mới" required type="password" autoComplete="new-password" minLength="8" maxLength="100" placeholder="Mật khẩu mới" value={password} onChange={e => setPassword(e.target.value)}/><input aria-label="Xác nhận mật khẩu" required type="password" placeholder="Xác nhận mật khẩu" value={confirm} onChange={e => setConfirm(e.target.value)}/><p>Đổi mật khẩu thành công sẽ đăng xuất phiên hiện tại.</p><button disabled={busy}>Đổi mật khẩu</button></form><button disabled={busy} onClick={handleLogout}>Đăng xuất</button></section>;
}
