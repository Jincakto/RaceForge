import { useState } from 'react';
import { authService } from '../../services/authService.ts';
import { ApiFeedback } from '../../components/common/ApiFeedback.jsx';
export function PasswordRecoveryPage({ reset = false, navigate }) {
    const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [confirm, setConfirm] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
    const token = new URLSearchParams(window.location.search).get('token') || '';
    return <main className="max-w-md mx-auto p-8 space-y-4"><h1 className="text-2xl">{reset ? 'Đặt lại mật khẩu' : 'Quên mật khẩu'}</h1><form className="grid gap-4" onSubmit={async (e) => { e.preventDefault(); if (busy)
        return; setError(''); setNotice(''); if (reset && (!token || password !== confirm)) {
        setError(!token ? 'Liên kết thiếu token.' : 'Mật khẩu xác nhận không khớp.');
        return;
    } setBusy(true); try {
        if (reset) {
            await authService.resetPassword(token, password);
            setNotice('Đã đổi mật khẩu. Vui lòng đăng nhập lại.');
            setPassword('');
            setConfirm('');
        }
        else {
            await authService.forgotPassword(email.trim());
            setNotice('Nếu email hợp lệ, hướng dẫn đặt lại mật khẩu sẽ được gửi đến hộp thư.');
        }
    }
    catch (e) {
        setError(e.message);
    }
    finally {
        setBusy(false);
    } }}>{reset ? <><label>Mật khẩu mới<input required type="password" minLength="8" maxLength="100" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)}/></label><label>Xác nhận mật khẩu<input required type="password" value={confirm} onChange={e => setConfirm(e.target.value)}/></label></> : <label>Email<input required type="email" value={email} onChange={e => setEmail(e.target.value)}/></label>}<button disabled={busy || (reset && !token)}>Gửi yêu cầu</button></form><ApiFeedback loading={busy} error={error} notice={notice}/><button onClick={() => navigate('login')}>← Đăng nhập</button></main>;
}
