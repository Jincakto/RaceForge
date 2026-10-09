import { useState } from 'react';
import { Btn } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LOG_KIND } from '../../data/constants';
import { toISO } from '../../utils/date';
import { fmtQty } from '../../utils/format';

export function InventoryLogPage({ state, navigate }) {
  const clubId = state.user.clubId;
  const all = state.invLogs.filter(l => l.clubId === clubId).sort((a, b) => b.ts - a.ts);
  const [fItem, setFItem] = useState(''); const [fHorse, setFHorse] = useState('');
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [dir, setDir] = useState('all');
  const itemOpts = Array.from(new Map(all.map(l => [l.itemId, l.itemName])).entries());
  const horseOpts = Array.from(new Map(all.filter(l => l.horseId).map(l => [l.horseId, l.horseName || l.horseId])).entries());
  const logs = all.filter(l => (!fItem || l.itemId === fItem) && (!fHorse || l.horseId === fHorse) && (!from || toISO(l.date) >= from) && (!to || toISO(l.date) <= to)
    && (dir === 'all' || (dir === 'in' ? l.delta > 0 : l.delta < 0)));
  const byHorse = new Map();
  logs.filter(l => l.horseId && (l.kind === 'out' || l.kind === 'refund')).forEach(l => {
    const h = byHorse.get(l.horseId) || { name: l.horseName || l.horseId, items: new Map() };
    const it = h.items.get(l.itemId) || { name: l.itemName, unit: l.unit, qty: 0 };
    it.qty += -l.delta; h.items.set(l.itemId, it); byHorse.set(l.horseId, h);
  });
  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-serif font-bold">Lịch sử kho</h2><p className="text-sm text-gray-500">{logs.length} dòng · Nhập (+) và Xuất (−)</p></div><Btn variant="secondary" onClick={() => navigate('inventory')}>← Kho của tôi</Btn></div>
      <Card className="p-4">
        <div className="grid grid-cols-5 gap-3">
          <Select label="Vật tư" value={fItem} onChange={setFItem} options={[{ value: '', label: 'Tất cả' }, ...itemOpts.map(([v, l]) => ({ value: v, label: l }))]} />
          <Select label="Ngựa" value={fHorse} onChange={setFHorse} options={[{ value: '', label: 'Tất cả' }, ...horseOpts.map(([v, l]) => ({ value: v, label: l }))]} />
          <Input label="Từ ngày" type="date" value={from} onChange={setFrom} />
          <Input label="Đến ngày" type="date" value={to} onChange={setTo} />
          <Select label="Loại dòng" value={dir} onChange={v => setDir(v)} options={[{ value: 'all', label: 'Tất cả' }, { value: 'in', label: 'Nhập (+)' }, { value: 'out', label: 'Xuất (−)' }]} />
        </div>
      </Card>
      <section className="space-y-2">
        <h3 className="font-semibold">Lượng tiêu thụ theo từng ngựa</h3>
        {byHorse.size === 0 && <Card className="p-4 text-sm text-gray-400 text-center">Chưa có lượt sử dụng nào theo bộ lọc</Card>}
        <div className="grid grid-cols-2 gap-3">
          {Array.from(byHorse.entries()).map(([hid, h]) => (
            <Card key={hid} className="p-4"><div className="font-semibold mb-2">{h.name} <span className="text-xs text-gray-400 font-mono">{hid}</span></div><div className="flex flex-wrap gap-1.5">{Array.from(h.items.values()).map(it => <span key={it.name} className="text-xs px-2 py-1 rounded-full bg-red-50 border border-red-200 text-red-700">{it.name}: {fmtQty(it.qty)} {it.unit}</span>)}</div></Card>
          ))}
        </div>
      </section>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 text-left"><tr><th className="px-4 py-2.5">Thời gian</th><th className="px-3">Loại</th><th className="px-3">Vật tư</th><th className="px-3 text-right">Thay đổi</th><th className="px-3 text-right">Tồn sau</th><th className="px-3">Ngựa</th><th className="px-3">Việc / lý do</th><th className="px-3">Người thao tác</th></tr></thead>
          <tbody>
            {logs.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Không có dòng nào</td></tr>}
            {logs.map(l => (
              <tr key={l.id} className="border-t border-gray-100">
                <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">{l.at}</td>
                <td className="px-3"><span className={`text-xs px-2 py-0.5 rounded-full ${LOG_KIND[l.kind].cls}`}>{LOG_KIND[l.kind].label}</span></td>
                <td className="px-3">{l.itemName}</td>
                <td className={`px-3 text-right font-mono font-bold ${l.delta > 0 ? 'text-emerald-600' : l.delta < 0 ? 'text-red-600' : 'text-gray-400'}`}>{l.delta > 0 ? '+' : ''}{fmtQty(l.delta)} {l.unit}</td>
                <td className="px-3 text-right font-mono">{fmtQty(l.balance)}</td>
                <td className="px-3">{l.horseName || '—'}</td>
                <td className="px-3 text-gray-500">{[l.task, l.reason].filter(Boolean).join(' · ') || '—'}</td>
                <td className="px-3 text-gray-500 whitespace-nowrap">{l.byName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
