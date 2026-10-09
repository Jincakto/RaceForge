import { UserAvatarDropdown } from '../../components/layout/UserAvatarDropdown';
import { Badge } from '../../components/ui/Badge';

export function PendingPage({ user, clubs, navigate, memberRequests, onLogout }) {
  const myReqs = memberRequests.filter(r => r.userId === user.id);
  return (
    <div className="min-h-screen bg-[#0f1729] flex flex-col items-center justify-center px-6 relative">
      <div className="absolute top-5 right-6 z-10"><UserAvatarDropdown user={user} onLogout={onLogout} /></div>
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-2xl bg-amber-900/30 border border-amber-700/30 flex items-center justify-center text-4xl mx-auto mb-6">⏳</div>
        <h2 className="text-white font-serif text-2xl font-bold mb-2">Đang chờ duyệt</h2>
        <p className="text-gray-400 text-sm mb-8">Yêu cầu tham gia đang được Quản lý xem xét.</p>
        <div className="space-y-3 mb-8">
          {myReqs.map(r => {
            const club = clubs.find(c => c.id === r.clubId);
            return (
              <div key={r.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-lg bg-[#1a2844] flex items-center justify-center text-white font-bold">{club?.logoLetter || '?'}</div>
                <div className="flex-1"><div className="text-white text-sm font-medium">{club?.name}</div><div className="text-gray-500 text-xs">{r.requestedAt} · Hết hạn {r.expiresAt}</div></div>
                <Badge status={r.status} />
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('join-center')} className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white text-sm rounded-lg transition-all">Tìm trung tâm khác</button>
        </div>
      </div>
    </div>
  );
}
