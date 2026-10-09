import { useState } from 'react';
import { UserAvatarDropdown } from '../../components/layout/UserAvatarDropdown';

export function JoinCenterPage({ user, clubs, navigate, onJoinRequest, onLogout }) {
  const [requested, setRequested] = useState(new Set());
  const [search, setSearch] = useState('');
  const filtered = clubs.filter(c => c.managerId !== user.id && c.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="min-h-screen bg-[#0f1729] px-6 py-10 relative">
      <div className="absolute top-5 right-6 z-10"><UserAvatarDropdown user={user} onLogout={onLogout} /></div>
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate('onboarding')} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-8">← Quay lại</button>
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-800/50 border border-emerald-700/30 flex items-center justify-center text-3xl mx-auto mb-4">🤝</div>
          <h2 className="text-white font-serif text-3xl font-bold mb-2">Tham gia trung tâm</h2>
          <p className="text-gray-400 text-sm">Gửi yêu cầu và chờ Quản lý phân công vai trò</p>
        </div>
        <div className="relative mb-6"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tên trung tâm..." className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b]" /><span className="absolute left-3.5 top-3.5 text-gray-400">🔍</span></div>
        <div className="space-y-4">
          {filtered.map(club => {
            const sent = requested.has(club.id);
            return (
              <div key={club.id} className="bg-white/5 border border-white/15 rounded-xl p-5 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#1a2844] border border-white/10 flex items-center justify-center text-white font-serif font-bold text-lg">{club.logoLetter}</div>
                <div className="flex-1"><div className="text-white font-semibold">{club.name}</div><div className="text-gray-400 text-xs mt-0.5">📍 {club.location} · 👥 {club.memberCount} thành viên · {club.founded}</div><div className="text-gray-500 text-xs mt-1">{club.description}</div></div>
                <button onClick={() => { if (!sent) { setRequested(p => new Set([...p, club.id])); onJoinRequest(club.id); } }}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${sent ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/30 cursor-default' : 'bg-[#c9973b] hover:bg-[#b8852a] text-white'}`}>
                  {sent ? '✓ Đã gửi' : 'Gửi yêu cầu'}
                </button>
              </div>
            );
          })}
        </div>
        {requested.size > 0 && (
          <div className="mt-8 p-5 bg-emerald-900/30 border border-emerald-700/30 rounded-xl text-center">
            <div className="text-emerald-400 font-semibold mb-1">✓ Yêu cầu đã được gửi!</div>
            <div className="text-emerald-600 text-sm">Quản lý sẽ xem xét và phân công vai trò.</div>
            <button onClick={() => navigate('pending')} className="mt-4 px-5 py-2 bg-emerald-700/40 hover:bg-emerald-700/60 text-emerald-300 text-sm rounded-lg transition-all">Xem trạng thái →</button>
          </div>
        )}
      </div>
    </div>
  );
}
