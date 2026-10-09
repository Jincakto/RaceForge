import { Btn } from '../ui/Button';
import { fmtQty } from '../../utils/format';

export function SupplyPicker({ items, rows, setRows }) {
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex gap-2 items-center">
          <select value={r.itemId} onChange={e => setRows(rows.map((x, j) => j === i ? { ...x, itemId: e.target.value } : x))} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
            <option value="">— Chọn vật tư —</option>
            {items.map(it => <option key={it.id} value={it.id}>{it.name} (còn {fmtQty(it.qty)} {it.unit})</option>)}
          </select>
          <input value={r.qty} onChange={e => setRows(rows.map((x, j) => j === i ? { ...x, qty: e.target.value } : x))} placeholder="SL" inputMode="decimal" className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <span className="text-xs text-gray-400 w-8">{items.find(it => it.id === r.itemId)?.unit}</span>
          <button onClick={() => setRows(rows.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">✕</button>
        </div>
      ))}
      <Btn variant="ghost" size="sm" onClick={() => setRows([...rows, { itemId: '', qty: '' }])}>＋ Thêm vật tư đã dùng</Btn>
    </div>
  );
}
