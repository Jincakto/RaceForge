import { liveApi } from '../../services/api.ts';
import { authService } from '../../services/authService.ts';
import { useCallback, useState } from 'react';
import { GoogleLoginButton } from '../../components/auth/GoogleLoginButton.tsx';

export function LoginPage({ navigate, users, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordSetupToken, setPasswordSetupToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const di = 'w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b]';

  const handle = async () => {
    if (loading) return;
    setError('');
    if (!email || !password) { setError('Vui lòng nhập email và mật khẩu'); return; }
    setLoading(true);
    if(liveApi){try{onLogin(await authService.login(email,password));}catch(e){setError(e instanceof Error?e.message:'Đăng nhập thất bại.');}finally{setLoading(false);}return;}
    setTimeout(() => {
      const u = users.find(u => u.email === email && u.password === password);
      if (u) { if (!u.verified) { setError('Tài khoản chưa được xác thực email. Vui lòng kiểm tra hộp thư.'); setLoading(false); } else onLogin(u); }
      else { setError('Email hoặc mật khẩu không đúng'); setLoading(false); }
    }, 400);
  };
  const googleError = useCallback(message => setError(message), []);
  const handleGoogle = useCallback(async idToken => {
    setError(''); setLoading(true);
    try {
      const result = await authService.googleLogin(idToken);
      if (result.passwordSetupRequired) setPasswordSetupToken(result.passwordSetupToken);
      else onLogin(result.user);
    } catch (e) { setError(e instanceof Error ? e.message : 'Đăng nhập Google thất bại.'); }
    finally { setLoading(false); }
  }, [onLogin]);
  const setupPassword = async () => {
    if (newPassword.length < 8) { setError('Mật khẩu phải có ít nhất 8 ký tự.'); return; }
    setError(''); setLoading(true);
    try { onLogin(await authService.googleSetPassword(passwordSetupToken, newPassword)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không thể đặt mật khẩu.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0f1729] flex">
      <div className="flex-1 flex flex-col items-center justify-center px-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #c9973b 0%, transparent 60%)' }} />
        <div className="relative z-10 w-full max-w-sm">
          <button onClick={() => navigate('home')} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-8 transition-colors">← Trang chủ</button>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#c9973b] flex items-center justify-center text-xl">🐎</div>
            <div><div className="text-white font-serif font-bold text-xl">RaceForce</div><div className="text-[#c9973b] text-xs">Horse Racing Management</div></div>
          </div>
          <h2 className="text-white font-serif text-3xl font-bold mb-6">Đăng nhập</h2>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" className={di} /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Mật khẩu</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={di} onKeyDown={e => e.key === 'Enter' && handle()} /></div>
            {error && <div className="p-3 bg-red-900/30 border border-red-700/40 rounded-lg text-red-400 text-sm">{error}</div>}
            <button onClick={handle} disabled={loading} className="w-full py-3 bg-[#c9973b] hover:bg-[#b8852a] text-white font-semibold rounded-xl transition-all text-sm disabled:opacity-60">{loading ? 'Đang đăng nhập...' : 'Đăng nhập →'}</button>
          </div>
          {liveApi && <button onClick={() => navigate('forgot-password')} className="mt-4 text-[#c9973b]">Quên mật khẩu?</button>}
          {liveApi && <div className="mt-5">
            <div className="mb-4 flex items-center gap-3"><span className="h-px flex-1 bg-white/10"/><span className="text-xs text-gray-500">hoặc</span><span className="h-px flex-1 bg-white/10"/></div>
            <GoogleLoginButton onCredential={handleGoogle} onError={googleError} disabled={loading} />
          </div>}
          <p className="text-center text-gray-500 text-sm mt-5">Chưa có tài khoản? <button onClick={() => navigate('register')} className="text-[#c9973b] hover:underline font-medium">Đăng ký</button></p>


        </div>
      </div>
      <div className="w-[42%] relative hidden lg:block">
        <img src="https://images.unsplash.com/photo-1598974357801-cbca100e65d3?w=800&h=1000&fit=crop&auto=format" alt="Horse" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f1729] to-transparent" />
        <div className="absolute bottom-12 left-8 right-8">
          <blockquote className="text-white font-serif text-xl font-bold leading-snug">"Mỗi buổi tập là một bước tiến<br />đến chiến thắng tiếp theo."</blockquote>
          <p className="text-[#c9973b] text-sm mt-2">RaceForce · Nền tảng đua ngựa chuyên nghiệp</p>
        </div>
      </div>
      {passwordSetupToken && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-sm rounded-lg border border-white/15 bg-[#13213a] p-6 text-white shadow-2xl">
          <h3 className="font-serif text-xl font-bold">Tạo mật khẩu RaceForge</h3>
          <p className="mt-2 text-sm text-gray-300">Google đã xác minh email. Hãy tạo mật khẩu để hoàn tất tài khoản.</p>
          <label className="mt-5 block text-sm">Mật khẩu mới
            <input autoFocus type="password" minLength="8" maxLength="100" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className={`${di} mt-2`} />
          </label>
          <div className="mt-5 flex gap-3">
            <button onClick={()=>{setPasswordSetupToken('');setNewPassword('');}} disabled={loading} className="flex-1 border border-white/20 px-4 py-2.5 text-sm">Hủy</button>
            <button onClick={setupPassword} disabled={loading} className="flex-1 bg-[#c9973b] px-4 py-2.5 text-sm font-semibold disabled:opacity-60">{loading?'Đang lưu...':'Hoàn tất'}</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
