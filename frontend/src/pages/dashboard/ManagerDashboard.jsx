import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LifecycleBadge } from '../../components/horse/LifecycleBadge';
import { Btn } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { PERFORMANCE_DATA } from '../../data/horses';

export function ManagerDashboard({ state, navigate }) {
  const myClub = state.clubs.find(c => c.managerId === state.user.id);
  const horses = state.horses.filter(h => h.clubId === myClub?.id);
  const pendingMembers = myClub ? state.memberRequests.filter(r => r.clubId === myClub.id && r.status === 'pending') : [];
  const pendingHorses = myClub ? state.horseClubRequests.filter(r => r.clubId === myClub.id && r.status === 'pending') : [];
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-serif font-bold text-[#0f1729]">{myClub?.name || 'Trung tâm'} — Tổng quan</h2></div>
      {pendingMembers.length > 0 && <Card className="p-4 border-l-4 border-amber-400 bg-amber-50" onClick={() => navigate('member-requests')}><div className="flex items-center gap-3"><span className="text-xl">📨</span><div className="flex-1"><div className="font-semibold text-amber-800">{pendingMembers.length} yêu cầu tham gia chờ duyệt</div><div className="text-sm text-amber-600">Xem hồ sơ và phân công vai trò</div></div><span className="text-amber-600 text-sm font-medium">Xem →</span></div></Card>}
      {pendingHorses.length > 0 && <Card className="p-4 border-l-4 border-sky-400 bg-sky-50" onClick={() => navigate('center-requests')}><div className="flex items-center gap-3"><span className="text-xl">🐎</span><div className="flex-1"><div className="font-semibold text-sky-800">{pendingHorses.length} đơn đăng ký ngựa chờ duyệt</div><div className="text-sm text-sky-600">Tự từ chối sau 7 ngày</div></div><span className="text-sky-600 text-sm font-medium">Duyệt →</span></div></Card>}
      {horses.filter(h => h.lock && !h.rehab).map(h => <Card key={h.id} className="p-4 border-l-4 border-red-500 bg-red-50" onClick={() => navigate('rehab-center')}><div className="flex items-center gap-3"><span className="text-xl">🔒</span><div className="flex-1"><div className="font-semibold text-red-800">{h.name} bị khóa huấn luyện — cần kích hoạt gói phục hồi</div><div className="text-sm text-red-600">Chẩn đoán: {h.lock.reason}</div></div><span className="text-red-600 text-sm font-medium">Chọn gói →</span></div></Card>)}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Ngựa trong trung tâm" value={horses.length} color="navy" />
        <StatCard label="Đủ điều kiện" value={horses.filter(h => h.healthStatus === 'Eligible').length} color="green" />
        <StatCard label="Chấn thương" value={horses.filter(h => h.healthStatus === 'Injured').length} color="red" />
        <StatCard label="Thành viên" value={myClub?.memberCount || 0} color="navy" />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Ngựa trong trung tâm</h3><Btn variant="ghost" onClick={() => navigate('horse-list')}>Xem tất cả →</Btn></div>
          {horses.map(h => (
            <div key={h.id} onClick={() => navigate('horse-detail')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-[#c9973b] transition-all mb-1">
              <img src={h.imageUrl} alt={h.name} className="w-10 h-10 rounded-lg object-cover bg-gray-200" />
              <div className="flex-1"><div className="font-medium text-sm">{h.name}</div><div className="text-xs text-gray-500">{h.breed} · {h.age}t</div></div>
              <LifecycleBadge horse={h} />
            </div>
          ))}
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Hiệu suất — Thunder King</h3>
          <ResponsiveContainer width="100%" height={200}><LineChart data={PERFORMANCE_DATA}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="speed" stroke="#c9973b" strokeWidth={2} dot={false} name="Tốc độ km/h" /><Line type="monotone" dataKey="fitness" stroke="#1a4a3a" strokeWidth={2} dot={false} name="Thể lực %" /></LineChart></ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
