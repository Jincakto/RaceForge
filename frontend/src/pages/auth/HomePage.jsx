export function HomePage({ navigate }) {
  return (
    <div className="min-h-screen bg-[#0f1729] overflow-x-hidden">
      <nav className="flex items-center justify-between px-10 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#c9973b] flex items-center justify-center text-white text-lg">🐎</div>
          <div>
            <div className="text-white font-serif font-bold text-lg leading-none">RaceForce</div>
            <div className="text-[#c9973b] text-[10px] tracking-widest uppercase">Horse Racing Management</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('login')} className="px-5 py-2 text-sm text-gray-300 hover:text-white font-medium transition-colors">Đăng nhập</button>
          <button onClick={() => navigate('register')} className="px-5 py-2 bg-[#c9973b] hover:bg-[#b8852a] text-white text-sm font-semibold rounded-lg transition-all">Đăng ký</button>
        </div>
      </nav>
      <div className="max-w-6xl mx-auto px-10 pt-20 pb-16 grid grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#c9973b]/20 border border-[#c9973b]/30 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c9973b] animate-pulse" />
            <span className="text-[#c9973b] text-xs font-medium tracking-wider uppercase">Nền tảng quản lý đua ngựa</span>
          </div>
          <h1 className="text-white font-serif text-5xl font-bold leading-tight mb-5">
            Quản lý trung tâm<br /><span className="text-[#c9973b]">huấn luyện ngựa đua</span><br />chuyên nghiệp
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed mb-8">Sức khỏe, giáo án AI, chăm sóc và kết quả đua — tất cả trong một hệ thống duy nhất.</p>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('register')} className="px-7 py-3.5 bg-[#c9973b] hover:bg-[#b8852a] text-white font-semibold rounded-xl transition-all text-base shadow-lg shadow-[#c9973b]/20">Bắt đầu miễn phí →</button>
            <button onClick={() => navigate('login')} className="px-7 py-3.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl transition-all text-base border border-white/20">Đăng nhập</button>
          </div>
        </div>
        <div className="relative">
          <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
            <img src="https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=700&h=500&fit=crop&auto=format" alt="Racehorse" className="w-full h-80 object-cover" />
          </div>
          <div className="absolute -bottom-4 -left-4 bg-white rounded-xl p-4 shadow-xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 text-lg">✓</div>
              <div><div className="font-semibold text-sm">Thunder King</div><div className="text-xs text-gray-500">Đủ điều kiện thi đấu</div></div>
            </div>
          </div>
          <div className="absolute -top-4 -right-4 bg-[#1a2844] rounded-xl p-4 shadow-xl">
            <div className="text-white text-xs font-medium opacity-60 mb-1">Thuật toán AI</div>
            <div className="text-[#c9973b] font-serif text-lg font-bold">Competition</div>
            <div className="text-white text-xs opacity-60">Prep · 88/100</div>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-10 pb-20">
        <div className="grid grid-cols-3 gap-6">
          {[
            { icon: '🤖', title: 'Giáo án thông minh', desc: 'Thuật toán tự động đề xuất lộ trình tập dựa trên sức khỏe, tuổi, cân nặng và kết quả vet.' },
            { icon: '🏥', title: 'Form khám sức khỏe', desc: 'Vet nhập liệu sinh hiệu, chẩn đoán đầy đủ. Kết quả tự động feed vào thuật toán giáo án.' },
            { icon: '👥', title: '5 vai trò rõ ràng', desc: 'Manager · Head Trainer · Vet · Groom · Chủ ngựa. Mỗi vai trò có luồng công việc riêng.' },
          ].map(f => (
            <div key={f.title} className="p-6 bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl transition-all">
              <div className="text-3xl mb-4">{f.icon}</div>
              <div className="text-white font-semibold mb-2">{f.title}</div>
              <div className="text-gray-400 text-sm leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10 py-6 px-10 flex items-center justify-between">
        <div className="text-white text-sm font-serif font-bold">RaceForce <span className="text-gray-600">© 2026</span></div>
        <div className="text-gray-600 text-sm">Hệ thống quản lý trung tâm huấn luyện ngựa đua</div>
      </div>
    </div>
  );
}
