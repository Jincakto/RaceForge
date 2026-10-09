import { useState } from 'react';

export function UserAvatarDropdown({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="w-10 h-10 rounded-full bg-[#c9973b] flex items-center justify-center text-white text-sm font-bold hover:bg-[#b8852a] transition-all shadow-lg">{user.avatar}</button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="font-semibold text-[#0f1729] text-sm truncate">{user.name}</div>
              <div className="text-xs text-gray-500 truncate mt-0.5">{user.email}</div>
            </div>
            <button onClick={() => { setOpen(false); onLogout(); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-all text-left">→ Đăng xuất</button>
          </div>
        </>
      )}
    </div>
  );
}
