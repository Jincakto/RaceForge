import { type Page } from '../../types/reference';
import { type AppUser } from '../../data';
import { useState, useRef } from 'react';
import { OTPModal } from '../../components/common/OTPModal';

export function RegisterPage({ navigate, onRegister }: { navigate: (p: Page) => void; onRegister: (u: AppUser) => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const otpCode = useRef('');
  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));
  const di = 'w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b]';

  const handleSubmit = () => {
    if (!form.name || !form.email || !form.password) { setError('Vui lòng điền đầy đủ thông tin'); return; }
    if (form.password !== form.confirm) { setError('Mật khẩu xác nhận không khớp'); return; }
    if (form.password.length < 6) { setError('Mật khẩu tối thiểu 6 ký tự'); return; }
    otpCode.current = String(Math.floor(100000 + Math.random() * 900000));
    setError(''); setShowOtp(true);
  };

  const handleVerified = () => {
    const initials = form.name.trim().split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
    onRegister({ id: `u${Date.now()}`, name: form.name, email: form.email, password: form.password, avatar: initials, role: null, clubId: null, status: 'active', phone: form.phone, verified: true });
  };

  return (
    <>
      {showOtp && <OTPModal email={form.email} code={otpCode.current} onVerify={handleVerified} onClose={() => setShowOtp(false)} />}
      <div className="min-h-screen bg-[#0f1729] flex">
        <div className="flex-1 flex flex-col items-center justify-center px-10">
          <div className="w-full max-w-sm">
            <button onClick={() => navigate('home')} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-8 transition-colors">← Trang chủ</button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#c9973b] flex items-center justify-center text-xl">🐎</div>
              <div><div className="text-white font-serif font-bold text-xl">RaceForce</div><div className="text-[#c9973b] text-xs">Horse Racing Management</div></div>
            </div>
            <h2 className="text-white font-serif text-3xl font-bold mb-2">Tạo tài khoản</h2>
            <p className="text-gray-400 text-sm mb-6">Đăng ký để tạo hoặc tham gia trung tâm huấn luyện.</p>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Họ và tên <span className="text-red-400">*</span></label><input value={form.name} onChange={e => set('name')(e.target.value)} placeholder="Nguyễn Văn A" className={di} /></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Email <span className="text-red-400">*</span></label><input type="email" value={form.email} onChange={e => set('email')(e.target.value)} placeholder="you@example.com" className={di} /></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Số điện thoại</label><input value={form.phone} onChange={e => set('phone')(e.target.value)} placeholder="0912 345 678" className={di} /></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Mật khẩu <span className="text-red-400">*</span></label><input type="password" value={form.password} onChange={e => set('password')(e.target.value)} placeholder="Tối thiểu 6 ký tự" className={di} /></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Xác nhận mật khẩu <span className="text-red-400">*</span></label><input type="password" value={form.confirm} onChange={e => set('confirm')(e.target.value)} placeholder="Nhập lại" className={di} onKeyDown={e => e.key === 'Enter' && handleSubmit()} /></div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={handleSubmit} className="w-full py-3 bg-[#c9973b] hover:bg-[#b8852a] text-white font-semibold rounded-xl transition-all text-sm">Gửi mã OTP →</button>
            </div>
            <p className="text-center text-gray-500 text-sm mt-5">Đã có tài khoản? <button onClick={() => navigate('login')} className="text-[#c9973b] hover:underline font-medium">Đăng nhập</button></p>
          </div>
        </div>
        <div className="w-[42%] relative hidden lg:block">
          <img src="https://images.unsplash.com/photo-1566288623394-377af472d81b?w=800&h=1000&fit=crop&auto=format" alt="Horse" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f1729] to-transparent" />
        </div>
      </div>
    </>
  );
}
