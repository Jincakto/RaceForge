import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { TODAY } from '../../data/constants';
import { dailyTasks, isLow } from '../../utils/care';
import { fmtQty } from '../../utils/format';
import { needsTreatment } from '../../utils/horse';

export function GroomDashboard({ state, navigate }) {
  const clubId = state.user.clubId;
  const horses = state.horses.filter(h => h.clubId === clubId && h.approvalStatus === 'approved');
  const done = state.careRecords.filter(r => r.clubId === clubId && r.date === TODAY).length;
  const total = horses.reduce((n, h) => n + dailyTasks(h).length, 0);
  const low = state.inventory.filter(i => i.clubId === clubId && isLow(i));
  const treating = horses.filter(needsTreatment);
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-serif font-bold text-[#0f1729]">Bảng điều khiển — Groom</h2><p className="text-sm text-gray-500">Hôm nay {TODAY}</p></div>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Ngựa phụ trách" value={horses.length} color="navy" />
        <StatCard label="Việc đã xong" value={`${done}/${total}`} color="green" />
        <StatCard label="Đang trị thương" value={treating.length} color="red" />
        <StatCard label="Vật tư sắp hết" value={low.length} color="gold" />
      </div>
      {low.length > 0 && <Card className="p-4 border-l-4 border-amber-400 bg-amber-50" onClick={() => navigate('inventory')}><div className="text-sm text-amber-800">📦 <strong>Sắp hết:</strong> {low.map(i => `${i.name} (${fmtQty(i.qty)} ${i.unit})`).join(', ')}</div></Card>}
      {treating.map(h => <Card key={h.id} className="p-4 border-l-4 border-red-400" onClick={() => navigate('care-hub')}><div className="flex items-center gap-3"><span className="text-xl">🩹</span><div className="flex-1"><div className="font-semibold">{h.name} — cần chăm sóc trị thương</div><div className="text-sm text-gray-500">{h.stable}, Ô {h.stall}{h.rehab ? ` · Phục hồi: ${h.rehab.name}` : ''}</div></div><span className="text-sm text-[#c9973b] font-medium">Xem hướng dẫn →</span></div></Card>)}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5" onClick={() => navigate('care-hub')}><div className="text-2xl mb-1">🌿</div><div className="font-semibold">Chăm sóc & Cho ăn</div><div className="text-sm text-gray-500">Sơ đồ chuồng, khẩu phần, công việc, báo sự cố</div></Card>
        <Card className="p-5" onClick={() => navigate('inventory')}><div className="text-2xl mb-1">📦</div><div className="font-semibold">Kho của tôi</div><div className="text-sm text-gray-500">Nhập, kiểm kê, theo dõi tồn kho</div></Card>
      </div>
    </div>
  );
}
