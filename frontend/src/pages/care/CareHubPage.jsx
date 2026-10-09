import { useState } from 'react';
import { CareTaskRow } from '../../components/care/CareTaskRow';
import { Btn } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ImageUpload } from '../../components/ui/ImageUpload';
import { Select } from '../../components/ui/Select';
import { StatCard } from '../../components/ui/StatCard';
import { Textarea } from '../../components/ui/Textarea';
import { RATIONS } from '../../data/care';
import { TODAY } from '../../data/constants';
import { dailyTasks, isLow } from '../../utils/care';
import { shiftDate } from '../../utils/date';
import { fmtQty } from '../../utils/format';
import { sortHealthRecords } from '../../utils/health';
import { needsTreatment } from '../../utils/horse';

export function CareHubPage({ state, navigate, onComplete, onUndo, onReceive, onReport }) {
  const me = state.user;
  const horses = state.horses.filter(h => h.clubId === me.clubId && h.approvalStatus === 'approved');
  const inventory = state.inventory.filter(i => i.clubId === me.clubId);
  const [tab, setTab] = useState('map');
  const [horseId, setHorseId] = useState(horses[0]?.id || '');
  const [dayOffset, setDayOffset] = useState(0);
  const date = shiftDate(TODAY, dayOffset);
  const isToday = dayOffset === 0;
  const horse = horses.find(h => h.id === horseId) || horses[0];
  const recFor = (hId, key) => state.careRecords.find(r => r.horseId === hId && r.date === date && r.taskKey === key);
  const doneCount = (h) => dailyTasks(h).filter(t => recFor(h.id, t.key)).length;
  const lowItems = inventory.filter(isLow);

  const [inc, setInc] = useState({ horseId: horse?.id || '', type: 'Bỏ ăn', description: '', imageUrl: '' });
  const [incErr, setIncErr] = useState('');
  const incidents = state.incidents.filter(i => i.clubId === me.clubId);

  const stables = Array.from(new Set(horses.map(h => h.stable))).sort();
  const treatHorses = horses.filter(needsTreatment);
  const guide = (h) => {
    const recs = state.healthRecords.filter(r => r.horseId === h.id && (r.diagnosis || r.recommendations || r.medications));
    return sortHealthRecords(recs)[0];
  };

  const tabs = [['map', '🗺 Sơ đồ & lịch'], ['ration', '🌾 Khẩu phần'], ['tasks', '✅ Công việc'], ['treat', '🩹 Trị thương'], ['incident', '🚨 Báo sự cố']];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-xl font-serif font-bold">Chăm sóc & Chuồng trại</h2><p className="text-sm text-gray-500">Groom · {horses.length} ngựa trong khu vực</p></div>
        <div className="flex items-center gap-2 bg-white border rounded-xl px-2 py-1.5 text-sm">
          <button onClick={() => setDayOffset(d => Math.max(-30, d - 1))} className="w-7 h-7 rounded-lg hover:bg-gray-100">‹</button>
          <span className="font-mono min-w-24 text-center">{date}{isToday ? ' · Hôm nay' : ''}</span>
          <button onClick={() => setDayOffset(d => Math.min(0, d + 1))} disabled={isToday} className="w-7 h-7 rounded-lg hover:bg-gray-100 disabled:opacity-30">›</button>
        </div>
      </div>
      {!isToday && <Card className="p-3 bg-gray-50 text-sm text-gray-600">Đang xem lịch ngày {date} (chỉ xem). Chỉ đánh dấu hoàn thành được cho ngày hôm nay.</Card>}
      {lowItems.length > 0 && <Card className="p-3 border-l-4 border-amber-400 bg-amber-50" onClick={() => navigate('inventory')}><div className="text-sm text-amber-800">📦 <strong>Sắp hết:</strong> {lowItems.map(i => `${i.name} (${fmtQty(i.qty)} ${i.unit})`).join(', ')} — nhấn để mở kho</div></Card>}

      <div className="flex gap-0 border-b border-gray-200 overflow-x-auto">
        {tabs.map(([t, l]) => <button key={t} onClick={() => setTab(t)} className={`px-5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${tab === t ? 'border-[#c9973b] text-[#c9973b]' : 'border-transparent text-gray-500 hover:text-[#0f1729]'}`}>{l}</button>)}
      </div>

      {tab !== 'treat' && horses.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {horses.map(h => <button key={h.id} onClick={() => { setHorseId(h.id); setInc(i => ({ ...i, horseId: h.id })); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm ${horse?.id === h.id ? 'bg-[#1a2844] text-white border-[#1a2844]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#c9973b]'}`}><img src={h.imageUrl} className="w-6 h-6 rounded-full object-cover bg-gray-200" />{h.name}</button>)}
        </div>
      )}
      {horses.length === 0 && <Card className="p-8 text-center text-sm text-gray-400">Chưa có ngựa nào trong trung tâm</Card>}

      {horse && tab === 'map' && (
        <div className="space-y-4">
          {stables.map(st => (
            <Card key={st} className="p-5">
              <h3 className="font-semibold mb-3">🏠 {st}</h3>
              <div className="grid grid-cols-4 gap-3">
                {horses.filter(h => h.stable === st).sort((a, b) => a.stall.localeCompare(b.stall)).map(h => {
                  const total = dailyTasks(h).length; const done = doneCount(h);
                  return (
                    <button key={h.id} onClick={() => setHorseId(h.id)} className={`text-left p-3 rounded-xl border-2 transition-all ${horse.id === h.id ? 'border-[#c9973b] bg-[#c9973b]/5' : 'border-gray-200 hover:border-[#c9973b]'}`}>
                      <div className="flex items-center justify-between text-xs mb-2"><span className="font-mono font-bold text-[#1a2844]">Ô {h.stall}</span>{needsTreatment(h) && <span className="text-red-600">🩹</span>}</div>
                      <img src={h.imageUrl} className="w-full h-20 object-cover rounded-lg bg-gray-200 mb-2" />
                      <div className="font-medium text-sm truncate">{h.name}</div>
                      <div className="mt-1.5 w-full bg-gray-200 rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.round(done / total * 100)}%` }} /></div>
                      <div className="text-[11px] text-gray-500 mt-1">{done}/{total} việc</div>
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
          <Card className="p-5">
            <h3 className="font-semibold mb-1">Lịch sinh hoạt — {horse.name} <span className="text-xs text-gray-400 font-normal">· {horse.stable}, Ô {horse.stall} · {date}</span></h3>
            <div className="mt-3 space-y-2">
              {dailyTasks(horse).map(t => { const r = recFor(horse.id, t.key); return (
                <div key={t.key} className="flex items-center gap-3 text-sm py-1.5 border-b border-gray-50 last:border-0">
                  <span className="font-mono text-xs text-[#c9973b] w-12">{t.time}</span><span>{t.icon}</span>
                  <span className={`flex-1 ${r ? 'line-through text-gray-400' : ''}`}>{t.label}</span>
                  {r ? <span className="text-xs text-emerald-600">✓ {r.doneAt.split(' ')[1]}</span> : <span className="text-xs text-gray-400">Chờ</span>}
                </div>
              ); })}
            </div>
          </Card>
        </div>
      )}

      {horse && tab === 'ration' && (() => {
        const ration = RATIONS[horse.id];
        if (!ration) return <Card className="p-8 text-center text-sm text-gray-500">🌾 <strong>{horse.name}</strong> chưa có khẩu phần được duyệt. Cần Thú y duyệt khẩu phần trước khi cho ăn.</Card>;
        const kinds = { grain: inventory.find(i => i.foodKind === 'grain'), hay: inventory.find(i => i.foodKind === 'hay'), vitamin: inventory.find(i => i.foodKind === 'vitamin') };
        return (
          <div className="space-y-4">
            <div className="text-sm text-gray-500">Khẩu phần đã duyệt bởi {ration.approvedBy} · {ration.approvedAt}</div>
            <div className="grid grid-cols-3 gap-4">
              <StatCard label="Ngũ cốc / ngày" value={`${ration.meals.reduce((a, m) => a + m.grain, 0)} kg`} color="gold" />
              <StatCard label="Cỏ / ngày" value={`${ration.meals.reduce((a, m) => a + m.hay, 0)} kg`} color="green" />
              <StatCard label="Vitamin / ngày" value={`${ration.meals.reduce((a, m) => a + m.vitamin, 0)} gói`} color="navy" />
            </div>
            {ration.meals.map(m => (
              <Card key={m.meal} className="p-5">
                <div className="flex items-center gap-2 mb-3"><span className="font-mono text-sm text-[#c9973b] font-bold">{m.time}</span><span className="font-semibold">Bữa {m.meal.toLowerCase()}</span>{recFor(horse.id, `feed-${m.meal}`) && <span className="text-xs text-emerald-600">✓ Đã cho ăn</span>}</div>
                <div className="grid grid-cols-4 gap-3 text-sm">
                  {[['Ngũ cốc', `${m.grain} kg`, kinds.grain?.name], ['Cỏ', `${m.hay} kg`, kinds.hay?.name], ['Vitamin', m.vitamin ? `${m.vitamin} gói` : '—', m.vitamin ? (m.vitaminName || kinds.vitamin?.name) : undefined], ['Nước', `${m.water} lít`, undefined]].map(([k, v, sub]) => (
                    <div key={k} className="p-3 bg-gray-50 rounded-lg"><div className="text-xs text-gray-500">{k}</div><div className="font-bold">{v}</div>{sub && <div className="text-[11px] text-gray-400 truncate">{sub}</div>}</div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        );
      })()}

      {horse && tab === 'tasks' && (
        <div className="space-y-3">
          <div className="text-sm text-gray-500">{horse.name} · {horse.stable}, Ô {horse.stall} · hoàn thành {doneCount(horse)}/{dailyTasks(horse).length} việc</div>
          {dailyTasks(horse).filter(t => t.key !== 'treat').map(t => (
            <CareTaskRow key={`${horse.id}-${date}-${t.key}`} horse={horse} task={t} date={date} isToday={isToday} record={recFor(horse.id, t.key)} inventory={inventory} onComplete={onComplete} onUndo={onUndo} onReceive={onReceive} navigate={navigate} />
          ))}
          {needsTreatment(horse) && <Card className="p-3 bg-red-50 border border-red-200 text-sm text-red-700">🩹 {horse.name} đang điều trị — xem tab "Trị thương" để thực hiện theo hướng dẫn Thú y.</Card>}
        </div>
      )}

      {tab === 'treat' && (
        <div className="space-y-4">
          {treatHorses.length === 0 && <Card className="p-8 text-center text-sm text-gray-400">Không có ngựa nào đang điều trị hoặc phục hồi</Card>}
          {treatHorses.map(h => {
            const g = guide(h); const task = dailyTasks(h).find(t => t.key === 'treat');
            return (
              <div key={h.id} className="space-y-2">
                <Card className="p-5 border-l-4 border-red-400">
                  <div className="flex items-center gap-3 mb-3"><img src={h.imageUrl} className="w-12 h-12 rounded-lg object-cover bg-gray-200" /><div className="flex-1"><div className="font-semibold">{h.name}</div><div className="text-xs text-gray-500">{h.stable}, Ô {h.stall}{h.rehab ? ` · Phục hồi: ${h.rehab.name}` : ''}</div></div></div>
                  {h.lock && <div className="text-sm text-red-700 mb-2"><strong>Chẩn đoán hiện tại:</strong> {h.lock.reason}</div>}
                  {g ? (
                    <div className="space-y-2 text-sm">
                      <div className="text-xs text-gray-400">Thú y {g.vet} ghi ngày {g.date}</div>
                      {g.diagnosis && <div><strong>Chẩn đoán:</strong> {g.diagnosis}</div>}
                      {g.medications && g.medications !== 'None' && <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg"><strong>Thuốc / điều trị:</strong> {g.medications}</div>}
                      {g.recommendations && <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg"><strong>Hướng dẫn chăm sóc:</strong> {g.recommendations}</div>}
                      {g.notes && <div className="text-gray-500">Ghi chú: {g.notes}</div>}
                    </div>
                  ) : <div className="text-sm text-gray-400">Thú y chưa ghi hướng dẫn chăm sóc cho ngựa này.</div>}
                </Card>
                <CareTaskRow key={`${h.id}-${date}-treat`} horse={h} task={task} date={date} isToday={isToday} record={recFor(h.id, 'treat')} inventory={inventory} onComplete={onComplete} onUndo={onUndo} onReceive={onReceive} navigate={navigate} defaultOpen />
              </div>
            );
          })}
        </div>
      )}

      {tab === 'incident' && (
        <div className="space-y-4">
          <Card className="p-5 border-l-4 border-red-400">
            <h3 className="font-semibold mb-4">🚨 Báo cáo sự cố đột xuất</h3>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Ngựa" value={inc.horseId} onChange={v => setInc(i => ({ ...i, horseId: v }))} options={horses.map(h => ({ value: h.id, label: `${h.name} (${h.stable}, Ô ${h.stall})` }))} />
              <Select label="Loại sự cố" value={inc.type} onChange={v => setInc(i => ({ ...i, type: v }))} options={['Bỏ ăn', 'Dấu hiệu đau bụng', 'Sốt', 'Móng bị xước', 'Khác'].map(v => ({ value: v, label: v }))} />
              <div className="col-span-2"><Textarea label="Mô tả *" value={inc.description} onChange={v => setInc(i => ({ ...i, description: v }))} placeholder="Quan sát được gì, từ lúc nào, mức độ..." /></div>
              <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Hình ảnh</label><ImageUpload value={inc.imageUrl} onChange={u => setInc(i => ({ ...i, imageUrl: u }))} onRemove={() => setInc(i => ({ ...i, imageUrl: '' }))} /></div>
            </div>
            {incErr && <div className="mt-3 text-sm text-red-600">⚠ {incErr}</div>}
            <Btn variant="danger" className="mt-4" onClick={() => { const e = onReport(inc); setIncErr(e || ''); if (!e) setInc(i => ({ ...i, description: '', imageUrl: '' })); }}>Gửi báo cáo cho Thú y & Quản lý</Btn>
          </Card>
          <h3 className="font-semibold">Báo cáo đã gửi</h3>
          {incidents.length === 0 && <Card className="p-5 text-sm text-gray-400 text-center">Chưa có báo cáo nào</Card>}
          {incidents.map(i => (
            <Card key={i.id} className="p-4 flex gap-3">
              {i.imageUrl && <img src={i.imageUrl} className="w-20 h-20 rounded-lg object-cover bg-gray-200" />}
              <div className="flex-1 text-sm"><div className="font-semibold">{i.horseName} · {i.type}</div><div className="text-gray-600 mt-0.5">{i.description}</div><div className="text-xs text-gray-400 mt-1">{i.at} · {i.reportedByName}</div></div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
