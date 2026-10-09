import { useState } from 'react';
import { SupplyPicker } from './SupplyPicker';
import { Btn } from '../ui/Button';
import { Card } from '../ui/Card';
import { toISO } from '../../utils/date';
import { fmtQty, numOf } from '../../utils/format';

export function CareTaskRow({ horse, task, date, isToday, record, inventory, onComplete, onUndo, onReceive, navigate, defaultOpen = false }) {
  const isFeed = task.key.startsWith('feed-');
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(defaultOpen);
  const [fail, setFail] = useState(null);
  const [recvQty, setRecvQty] = useState({});
  const [askRecv, setAskRecv] = useState(false);
  const [err, setErr] = useState('');

  const run = () => {
    setErr('');
    const supplies = [];
    if (!isFeed) {
      for (const r of rows) {
        if (!r.itemId && !r.qty) continue;
        const q = numOf(r.qty);
        if (!r.itemId || !(q > 0)) { setErr('Mỗi dòng vật tư cần chọn vật tư và nhập số lượng > 0.'); return; }
        supplies.push({ itemId: r.itemId, qty: q });
      }
    }
    const res = onComplete(horse.id, task.key, supplies);
    if (res.ok) { setFail(null); setAskRecv(false); setRows([]); setOpen(false); } else { setFail(res); setAskRecv(false); setRecvQty({}); }
  };

  return (
    <Card className={`p-4 ${record ? 'border-l-4 border-emerald-500' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#1a2844]/10 flex items-center justify-center text-xl flex-shrink-0">{task.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap"><span className={`font-semibold ${record ? 'line-through text-gray-400' : ''}`}>{task.label}</span><span className="font-mono text-xs text-[#c9973b]">{task.time}</span></div>
          <div className="text-sm text-gray-500 mt-0.5">{task.desc}</div>
          {record && (
            <div className="mt-2 text-xs text-emerald-700">✓ Hoàn thành lúc {record.doneAt.split(' ')[1]} · {record.byName}
              {record.deductions.length > 0 && <div className="flex flex-wrap gap-1.5 mt-1.5">{record.deductions.map((d, i) => <span key={i} className="px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700">−{fmtQty(d.qty)} {d.unit} {d.itemName}</span>)}</div>}
            </div>
          )}
        </div>
        {record
          ? (isToday && <Btn variant="secondary" size="sm" onClick={() => { if (window.confirm('Hủy hoàn thành? Vật tư đã trừ sẽ được cộng lại vào kho.')) { const e = onUndo(record.id); if (e) setErr(e); } }}>↩ Hủy hoàn thành</Btn>)
          : isToday ? (
            <div className="flex flex-col gap-2 items-end">
              <Btn variant="gold" size="sm" onClick={run}>{isFeed ? '✓ Đã cho ăn' : 'Xong ✓'}</Btn>
              {!isFeed && <button onClick={() => setOpen(!open)} className="text-xs text-[#c9973b] hover:underline">{open ? 'Ẩn vật tư' : '＋ Vật tư đã dùng'}</button>}
            </div>
          ) : <span className="text-xs text-gray-400">Chưa làm</span>}
      </div>
      {!record && isToday && !isFeed && open && <div className="mt-3 pt-3 border-t border-gray-100"><div className="text-xs font-medium text-gray-600 mb-2">Vật tư đã dùng (tự động trừ kho)</div><SupplyPicker items={inventory} rows={rows} setRows={setRows} /></div>}
      {err && <div className="mt-3 text-sm text-red-600">⚠ {err}</div>}
      {fail && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 space-y-2">
          <div>⛔ {fail.message}</div>
          {fail.shortages.length > 0 && !askRecv && (
            <div className="flex items-center gap-2"><span>Bạn có muốn nhập thêm vào kho không?</span><Btn size="sm" variant="gold" onClick={() => { setAskRecv(true); setRecvQty(Object.fromEntries(fail.shortages.map(s => [s.itemId, fmtQty(Math.ceil((s.need - s.have) * 100) / 100)]))); }}>Nhập thêm</Btn><Btn size="sm" variant="secondary" onClick={() => setFail(null)}>Bỏ qua</Btn></div>
          )}
          {fail.shortages.length === 0 && <div className="flex gap-2"><Btn size="sm" variant="gold" onClick={() => navigate('inventory')}>Đi tới Kho của tôi</Btn><Btn size="sm" variant="secondary" onClick={() => setFail(null)}>Đóng</Btn></div>}
          {askRecv && (
            <div className="space-y-2">
              {fail.shortages.map(s => (
                <div key={s.itemId} className="flex items-center gap-2 text-gray-700"><span className="flex-1">{s.name}: nhận thêm</span><input value={recvQty[s.itemId] || ''} onChange={e => setRecvQty(p => ({ ...p, [s.itemId]: e.target.value }))} inputMode="decimal" className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-sm bg-white" /><span>{s.unit}</span></div>
              ))}
              <div className="flex gap-2">
                <Btn size="sm" variant="gold" onClick={() => {
                  for (const s of fail.shortages) {
                    const q = numOf(recvQty[s.itemId] || '');
                    if (!(q > 0)) { setErr('Nhập số lượng nhận thêm > 0.'); return; }
                  }
                  for (const s of fail.shortages) { const e = onReceive(s.itemId, numOf(recvQty[s.itemId]), toISO(date)); if (e) { setErr(e); return; } }
                  setFail(null); setAskRecv(false); setErr('');
                }}>Nhập vào kho</Btn>
                <Btn size="sm" variant="secondary" onClick={() => setAskRecv(false)}>Huỷ</Btn>
              </div>
              <div className="text-xs text-gray-500">Sau khi nhập kho, bấm lại nút hoàn thành.</div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
