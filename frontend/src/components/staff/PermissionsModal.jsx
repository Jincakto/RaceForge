import { Btn } from '../ui/Button';
import { ROLE_LABELS } from '../../data/constants';
import { GRANTABLE_PAGES } from '../../data/navigation';

export function PermissionsModal({ member, grantedPages, rolePages, onToggle, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden">
        <div className="bg-[#1a2844] px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#c9973b] flex items-center justify-center text-white font-bold">{member.avatar}</div>
          <div className="flex-1"><div className="text-white font-semibold">{member.name}</div><div className="text-[#c9973b] text-xs">{member.role ? ROLE_LABELS[member.role] : '—'}</div></div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-500 mb-4">Trang mặc định theo vai trò được đánh dấu 🔒. Bật/tắt để cấp thêm quyền truy cập.</p>
          <div className="space-y-2">
            {GRANTABLE_PAGES.map(g => {
              const isDefault = rolePages.has(g.page);
              const isGranted = grantedPages.includes(g.page);
              const active = isDefault || isGranted;
              return (
                <div key={g.page} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${active ? 'border-[#c9973b] bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
                  <span className="text-lg">{g.icon}</span>
                  <span className="flex-1 text-sm font-medium">{g.label}</span>
                  {isDefault ? (
                    <span className="text-xs text-gray-400 flex items-center gap-1">🔒 Mặc định</span>
                  ) : (
                    <button
                      onClick={() => onToggle(g.page)}
                      className={`relative w-11 h-6 rounded-full transition-all flex-shrink-0 ${isGranted ? 'bg-[#c9973b]' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isGranted ? 'left-6' : 'left-1'}`} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="px-5 pb-5 flex justify-end"><Btn variant="gold" onClick={onClose}>Xong ✓</Btn></div>
      </div>
    </div>
  );
}
