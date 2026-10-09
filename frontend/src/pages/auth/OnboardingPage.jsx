import { UserAvatarDropdown } from '../../components/layout/UserAvatarDropdown';

export function OnboardingPage({ user, navigate, onLogout }) {
  return (
    <div className="min-h-screen bg-[#0f1729] flex flex-col items-center justify-center px-6 relative">
      <div className="absolute top-5 right-6 z-10"><UserAvatarDropdown user={user} onLogout={onLogout} /></div>
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-[#c9973b] flex items-center justify-center text-3xl mx-auto mb-5">🐎</div>
          <h2 className="text-white font-serif text-3xl font-bold mb-2">Chào mừng, {user.name.split(' ').pop()}!</h2>
          <p className="text-gray-400">Tài khoản đã xác thực. Hãy tham gia một trung tâm huấn luyện.</p>
        </div>
        <div className="max-w-md w-full">
          <button onClick={() => navigate('join-center')} className="w-full p-8 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-[#c9973b]/50 rounded-2xl text-left transition-all">
            <div className="w-14 h-14 rounded-xl bg-emerald-900/40 border border-emerald-700/30 flex items-center justify-center text-2xl mb-5">🤝</div>
            <h3 className="text-white font-serif text-xl font-bold mb-2">Tham gia trung tâm huấn luyện</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">Tìm và gửi yêu cầu vào trung tâm. Quản lý sẽ xét duyệt và phân công vai trò cho bạn.</p>
            <div className="text-emerald-400 text-sm font-semibold">Tìm trung tâm →</div>
          </button>
        </div>
      </div>
    </div>
  );
}
