import { useState } from 'react';

export function OTPModal({ email, code, onVerify, onClose }: { email: string; code: string; onVerify: () => void; onClose: () => void }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const verify = () => { if (input === code) onVerify(); else setError('Mã OTP không đúng. Vui lòng thử lại.'); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7 z-10">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#c9973b]/15 flex items-center justify-center text-3xl mx-auto mb-4">📧</div>
          <h3 className="font-serif font-bold text-xl text-[#0f1729]">Xác thực OTP</h3>
          <p className="text-gray-500 text-sm mt-1">Mã đã gửi đến <strong className="text-[#0f1729]">{email}</strong></p>
        </div>
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
          <div className="text-xs text-amber-600 font-medium mb-1">🔐 Mã OTP (demo mode)</div>
          <div className="font-mono text-2xl font-bold text-[#c9973b] tracking-[0.4em]">{code}</div>
        </div>
        <div className="space-y-4">
          <input value={input} onChange={e => setInput(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-2xl font-mono tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-[#c9973b]"
            onKeyDown={e => e.key === 'Enter' && verify()} />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button onClick={verify} className="w-full py-3 bg-[#c9973b] hover:bg-[#b8852a] text-white font-semibold rounded-xl transition-all">Xác nhận →</button>
        </div>
      </div>
    </div>
  );
}
