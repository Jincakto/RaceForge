import { useState } from 'react';
import { DEMO_ACCOUNTS } from '../../data/constants';

export function LoginPage({ navigate, users, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const di = 'w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b]';

  const handle = () => {
    if (!email || !password) { setError('Vui lòng nhập email và mật khẩu'); return; }
    setLoading(true);
    setTimeout(() => {
      const u = users.find(u => u.email === email && u.password === password);
      if (u) { if (!u.verified) { setError('Tài khoản chưa được xác thực email. Vui lòng kiểm tra hộp thư.'); setLoading(false); } else onLogin(u); }
      else { setError('Email hoặc mật khẩu không đúng'); setLoading(false); }
    }, 400);
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
          <p className="text-center text-gray-500 text-sm mt-5">Chưa có tài khoản? <button onClick={() => navigate('register')} className="text-[#c9973b] hover:underline font-medium">Đăng ký</button></p>

          {/* Quick Login Demo */}
          <div className="mt-7 border-t border-white/10 pt-6">
            <p className="text-gray-500 text-xs text-center mb-3 uppercase tracking-wider font-medium">Đăng nhập nhanh (demo)</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map(acc => (
                <button key={acc.email} onClick={() => { setEmail(acc.email); setPassword(acc.password); setTimeout(() => { const u = users.find(u => u.email === acc.email); if (u) onLogin(u); }, 100); }}
                  className="flex items-center gap-2 p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-left">
                  <span className={`w-7 h-7 rounded-lg ${acc.color} flex items-center justify-center text-white text-sm flex-shrink-0`}>{acc.icon}</span>
                  <div className="min-w-0"><div className="text-white text-xs font-medium truncate">{acc.role}</div></div>
                </button>
              ))}
            </div>
          </div>
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
    </div>
  );
}
