import { useState } from 'react';
import { LifecycleBadge } from '../../components/horse/LifecycleBadge';
import { Badge } from '../../components/ui/Badge';
import { Btn } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { REHAB_PACKAGES } from '../../data/constants';

export function RehabCenterPage({ state, onActivate }) {
  const horses = state.horses.filter(h => h.clubId === state.user.clubId);
  const waiting = horses.filter(h => h.lock && !h.rehab);
  const active = horses.filter(h => h.lock && h.rehab);
  const [choice, setChoice] = useState({});
  const [errors, setErrors] = useState({});
  return (
    <div className="space-y-6 max-w-4xl">
      <div><h2 className="text-xl font-serif font-bold text-[#0f1729]">Gói phục hồi chức năng</h2><p className="text-sm text-gray-500">Kích hoạt gói phục hồi cho ngựa bị khóa huấn luyện · Gói huấn luyện gốc giữ trạng thái "Tạm dừng"</p></div>
      <section className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">Chờ kích hoạt <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{waiting.length}</span></h3>
        {waiting.length === 0 && <Card className="p-8 text-center text-gray-400 text-sm"><div className="text-3xl mb-2">✅</div>Không có ngựa nào cần gói phục hồi</Card>}
        {waiting.map(h => {
          const en = state.enrollments.find(e => e.horseId === h.id && e.status !== 'completed');
          return (
            <Card key={h.id} className="p-5 border-l-4 border-red-500">
              <div className="flex items-center gap-3 mb-3"><img src={h.imageUrl} className="w-12 h-12 rounded-lg object-cover bg-gray-200" /><div className="flex-1"><div className="font-semibold">{h.name} <span className="text-xs text-gray-400 font-normal">· Chủ: {h.ownerName}</span></div><div className="text-xs text-gray-500">Khóa bởi {h.lock.lockedByName} · {h.lock.lockedAt}</div></div><LifecycleBadge horse={h} /></div>
              <div className="p-3 bg-red-50 rounded-lg text-sm text-red-800 mb-3"><strong>Chẩn đoán Thú y:</strong> {h.lock.reason}{h.lock.notes ? ` — ${h.lock.notes}` : ''}</div>
              {en && <div className="text-xs text-gray-500 mb-3">Gói huấn luyện "{en.packageName}": <Badge status="Paused" /> · Giữ {en.sessionsDone}/{en.sessionsTotal} buổi</div>}
              <div className="grid grid-cols-3 gap-3">
                {REHAB_PACKAGES.map(p => (
                  <button key={p.id} onClick={() => setChoice(c => ({ ...c, [h.id]: p.id }))} className={`text-left p-3 rounded-xl border-2 bg-white transition-all ${choice[h.id] === p.id ? 'border-[#c9973b] bg-[#c9973b]/5' : 'border-gray-200 hover:border-[#c9973b]/50'}`}>
                    <div className="font-semibold text-sm">{p.name}</div><div className="text-xs text-[#c9973b] font-medium mb-1">{p.weeks} tuần</div>
                    <div className="text-xs text-gray-500 mb-2">{p.description}</div>
                    <ul className="space-y-0.5">{p.items.map(i => <li key={i} className="text-[11px] text-gray-600">• {i}</li>)}</ul>
                  </button>
                ))}
              </div>
              {errors[h.id] && <div className="text-sm text-red-600 mt-2">{errors[h.id]}</div>}
              <Btn variant="gold" className="mt-3" disabled={!choice[h.id]} onClick={() => setErrors(e => ({ ...e, [h.id]: onActivate(h.id, choice[h.id]) || '' }))}>Kích hoạt gói phục hồi →</Btn>
            </Card>
          );
        })}
      </section>
      {active.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold">Đang phục hồi</h3>
          {active.map(h => <Card key={h.id} className="p-4 flex items-center gap-3"><img src={h.imageUrl} className="w-11 h-11 rounded-lg object-cover bg-gray-200" /><div className="flex-1"><div className="font-semibold">{h.name}</div><div className="text-xs text-gray-500">{h.rehab.name} · {h.rehab.durationWeeks} tuần · từ {h.rehab.activatedAt}</div></div><LifecycleBadge horse={h} /><span className="text-xs text-gray-400">Chờ Thú y gỡ khóa</span></Card>)}
        </section>
      )}
    </div>
  );
}
