import { useState } from 'react';
import { Btn } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { FOOD_KIND_LABEL, INV_CAT_LABEL, INV_UNITS, TODAY } from '../../data/constants';
import { isLow } from '../../utils/care';
import { toISO } from '../../utils/date';
import { fmtQty, numOf } from '../../utils/format';

export function InventoryPage({ state, navigate, onAdd, onReceive, onEdit, onAdjust, onDelete }) {
  const clubId = state.user.clubId;
  const items = state.inventory.filter(i => i.clubId === clubId);
  const [panel, setPanel] = useState(null);
  const [f, setF] = useState({ name: '', category: 'food', foodKind: 'grain', unit: 'kg', qty: '', threshold: '', date: toISO(TODAY), reason: '' });
  const [err, setErr] = useState('');
  const target = items.find(i => i.id === panel?.itemId);
  const open = (mode, it) => {
    setErr(''); setPanel({ mode, itemId: it?.id });
    setF(p => ({ ...p, name: it?.name || '', category: it?.category || 'food', foodKind: it?.foodKind || 'other', unit: it?.unit || 'kg', qty: mode === 'adjust' && it ? fmtQty(it.qty) : '', threshold: it ? fmtQty(it.threshold) : '', date: toISO(TODAY), reason: '' }));
  };
  const submit = () => {
    let e = null;
    if (panel?.mode === 'add') e = onAdd({ name: f.name, category: f.category, foodKind: f.foodKind, unit: f.unit, qty: numOf(f.qty || '0'), threshold: numOf(f.threshold || '0') });
    if (panel?.mode === 'receive' && target) e = onReceive(target.id, numOf(f.qty), f.date);
    if (panel?.mode === 'adjust' && target) e = onAdjust(target.id, numOf(f.qty), f.reason);
    if (panel?.mode === 'edit' && target) e = onEdit(target.id, { name: f.name, category: f.category, foodKind: f.foodKind, unit: f.unit, threshold: numOf(f.threshold || '0') });
    if (e) setErr(e); else { setPanel(null); setErr(''); }
  };
  const catSelect = <Select label="Nhóm" value={f.category} onChange={v => setF(p => ({ ...p, category: v }))} options={(Object.keys(INV_CAT_LABEL)).map(k => ({ value: k, label: INV_CAT_LABEL[k] }))} />;
  const kindSelect = f.category === 'food' && <Select label="Loại thức ăn (dùng cho khẩu phần)" value={f.foodKind} onChange={v => setF(p => ({ ...p, foodKind: v }))} options={(Object.keys(FOOD_KIND_LABEL)).map(k => ({ value: k, label: FOOD_KIND_LABEL[k] }))} />;
  const unitSelect = <Select label="Đơn vị" value={f.unit} onChange={v => setF(p => ({ ...p, unit: v }))} options={INV_UNITS.map(u => ({ value: u, label: u }))} />;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-xl font-serif font-bold">Kho của tôi</h2><p className="text-sm text-gray-500">Groom tự quản lý · {items.length} vật tư · {items.filter(isLow).length} sắp hết</p></div>
        <div className="flex gap-2"><Btn variant="secondary" onClick={() => navigate('inventory-log')}>📜 Lịch sử kho</Btn><Btn variant="gold" onClick={() => open('add')}>＋ Thêm vật tư</Btn></div>
      </div>

      {panel && (
        <Card className="p-5 border-l-4 border-[#c9973b]">
          <h3 className="font-semibold mb-4">{panel.mode === 'add' ? 'Thêm vật tư mới' : panel.mode === 'receive' ? `Nhập thêm hàng — ${target?.name}` : panel.mode === 'adjust' ? `Kiểm kê / chỉnh số tồn — ${target?.name}` : `Sửa vật tư — ${target?.name}`}</h3>
          <div className="grid grid-cols-2 gap-4">
            {(panel.mode === 'add' || panel.mode === 'edit') && <><div className="col-span-2"><Input label="Tên vật tư" required value={f.name} onChange={v => setF(p => ({ ...p, name: v }))} /></div>{catSelect}{unitSelect}{kindSelect}</>}
            {panel.mode === 'add' && <Input label="Số lượng ban đầu" type="number" value={f.qty} onChange={v => setF(p => ({ ...p, qty: v }))} />}
            {(panel.mode === 'add' || panel.mode === 'edit') && <Input label="Ngưỡng cảnh báo sắp hết" type="number" value={f.threshold} onChange={v => setF(p => ({ ...p, threshold: v }))} />}
            {panel.mode === 'receive' && <><Input label={`Số lượng nhận thêm (${target?.unit})`} required type="number" value={f.qty} onChange={v => setF(p => ({ ...p, qty: v }))} /><Input label="Ngày nhập" required type="date" value={f.date} onChange={v => setF(p => ({ ...p, date: v }))} /><div className="col-span-2 text-sm text-gray-500">Tồn hiện tại {fmtQty(target?.qty || 0)} {target?.unit} → sau nhập {fmtQty((target?.qty || 0) + (numOf(f.qty) || 0))} {target?.unit}</div></>}
            {panel.mode === 'adjust' && <><Input label={`Số tồn thực tế sau kiểm kê (${target?.unit})`} required type="number" value={f.qty} onChange={v => setF(p => ({ ...p, qty: v }))} /><Input label="Lý do điều chỉnh" required value={f.reason} onChange={v => setF(p => ({ ...p, reason: v }))} placeholder="VD: Kiểm kê cuối tuần, hao hụt" /></>}
          </div>
          {err && <div className="mt-3 text-sm text-red-600">⚠ {err}</div>}
          <div className="flex gap-2 mt-4"><Btn variant="gold" onClick={submit}>💾 Lưu</Btn><Btn variant="secondary" onClick={() => setPanel(null)}>Huỷ</Btn></div>
        </Card>
      )}

      {(Object.keys(INV_CAT_LABEL)).map(cat => {
        const list = items.filter(i => i.category === cat);
        return (
          <section key={cat} className="space-y-2">
            <h3 className="font-semibold text-[#0f1729]">{cat === 'food' ? '🌾' : cat === 'medical' ? '💊' : '🧰'} {INV_CAT_LABEL[cat]} <span className="text-xs text-gray-400 font-normal">({list.length})</span></h3>
            {list.length === 0 && <Card className="p-4 text-sm text-gray-400 text-center">Chưa có vật tư trong nhóm này</Card>}
            {list.map(i => (
              <Card key={i.id} className={`p-4 ${isLow(i) ? 'border-l-4 border-amber-400' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap"><span className="font-semibold">{i.name}</span>{i.foodKind && i.foodKind !== 'other' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{FOOD_KIND_LABEL[i.foodKind]}</span>}{isLow(i) && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-medium">Sắp hết</span>}</div>
                    <div className="text-xs text-gray-400 mt-0.5">Ngưỡng cảnh báo: {fmtQty(i.threshold)} {i.unit}</div>
                  </div>
                  <div className="text-right"><div className={`text-2xl font-bold font-mono ${isLow(i) ? 'text-amber-600' : 'text-[#1a2844]'}`}>{fmtQty(i.qty)}</div><div className="text-xs text-gray-500">{i.unit} tồn</div></div>
                  <div className="flex gap-1.5 flex-wrap justify-end w-64">
                    <Btn size="sm" variant="gold" onClick={() => open('receive', i)}>＋ Nhập</Btn>
                    <Btn size="sm" variant="secondary" onClick={() => open('adjust', i)}>Kiểm kê</Btn>
                    <Btn size="sm" variant="secondary" onClick={() => open('edit', i)}>Sửa</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => { if (window.confirm(`Xóa vật tư "${i.name}"? Lịch sử kho vẫn được giữ lại.`)) { const e = onDelete(i.id); if (e) setErr(e); } }}>🗑</Btn>
                  </div>
                </div>
              </Card>
            ))}
          </section>
        );
      })}
    </div>
  );
}
