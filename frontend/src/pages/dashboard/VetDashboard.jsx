import { Badge } from '../../components/ui/Badge';
import { Btn } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { sortHealthRecords } from '../../utils/health';
import { getLifecycle } from '../../utils/horse';

export function VetDashboard({ state, navigate }) {
  const horses = state.horses.filter(h => h.clubId === state.user.clubId);
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-serif font-bold text-[#0f1729]">Bảng điều khiển — Thú y</h2></div>
      {(() => {
        const awaiting = horses.filter(h => getLifecycle(h) === 'awaiting_vet' && h.approvalStatus === 'approved');
        const postPending = state.trainingSessions.filter(s => s.status === 'Completed' && !s.postExamDone && horses.some(h => h.id === s.horseId));
        const locked = horses.filter(h => h.lock);
        return <>
          {awaiting.length > 0 && <Card className="p-4 border-l-4 border-sky-400 bg-sky-50" onClick={() => navigate('post-exam')}><div className="flex items-center gap-3"><span className="text-xl">🩺</span><div className="flex-1"><div className="font-semibold text-sky-800">{awaiting.length} ngựa mới được duyệt cần khám trước huấn luyện</div><div className="text-sm text-sky-600">{awaiting.map(h => h.name).join(', ')}</div></div><span className="text-sky-600 text-sm font-medium">Xem →</span></div></Card>}
          {postPending.length > 0 && <Card className="p-4 border-l-4 border-amber-400 bg-amber-50" onClick={() => navigate('post-exam')}><div className="flex items-center gap-3"><span className="text-xl">🏇</span><div className="flex-1"><div className="font-semibold text-amber-800">{postPending.length} buổi tập chờ khám sau tập</div></div><span className="text-amber-600 text-sm font-medium">Khám →</span></div></Card>}
          {locked.length > 0 && <Card className="p-4 border-l-4 border-red-500 bg-red-50" onClick={() => navigate('post-exam')}><div className="flex items-center gap-3"><span className="text-xl">🔒</span><div className="flex-1"><div className="font-semibold text-red-800">{locked.length} ngựa đang bị khóa huấn luyện</div><div className="text-sm text-red-600">Chỉ Thú y mới có quyền gỡ khóa</div></div><span className="text-red-600 text-sm font-medium">Quản lý →</span></div></Card>}
        </>;
      })()}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Ngựa phụ trách" value={horses.length} color="navy" />
        <StatCard label="Đủ điều kiện" value={horses.filter(h => h.healthStatus === 'Eligible').length} color="green" />
        <StatCard label="Theo dõi" value={horses.filter(h => h.healthStatus === 'Monitor').length} color="gold" />
        <StatCard label="Chấn thương" value={horses.filter(h => h.healthStatus === 'Injured').length} color="red" />
      </div>
      <div className="grid grid-cols-2 gap-5">
        <Card className="p-5">
          <div className="flex justify-between items-center mb-4"><h3 className="font-semibold">Tình trạng sức khỏe</h3><Btn variant="gold" onClick={() => navigate('vet-health-form')}>+ Nhập khám</Btn></div>
          {horses.map(h => (
            <div key={h.id} onClick={() => navigate('vet-health-form')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-[#c9973b] transition-all mb-2">
              <img src={h.imageUrl} className="w-10 h-10 rounded-lg object-cover" />
              <div className="flex-1"><div className="font-medium text-sm">{h.name}</div><div className="text-xs text-gray-500">{h.vetClearance ? '✓ Đã xác nhận HLV' : '✗ Chưa xác nhận'}</div></div>
              <Badge status={h.healthStatus} />
            </div>
          ))}
        </Card>
        <Card className="p-5">
          <div className="flex justify-between items-center mb-4"><h3 className="font-semibold">Hồ sơ khám gần nhất</h3><Btn variant="ghost" onClick={() => navigate('health-records')}>Xem tất →</Btn></div>
          {sortHealthRecords(state.healthRecords.filter(r => horses.some(h => h.id === r.horseId))).slice(0, 3).map(r => (
            <div key={r.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 mb-2">
              <div className="flex items-center justify-between"><span className="font-medium text-sm">{r.type}</span><Badge status={r.result} /></div>
              <div className="text-xs text-gray-500 mt-0.5">{r.date} · {state.horses.find(h => h.id === r.horseId)?.name}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
