import { useState } from 'react';
import type { AppUser, Horse } from './data';
import { Badge, Btn, Card, Input, Select, Textarea } from './ui';
import { ReasonDialog } from './admin';
import { PendingNotice } from './pendingUi';

const nowStamp = () => {
  const t = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(t.getDate())}/${p(t.getMonth() + 1)}/${t.getFullYear()} ${p(t.getHours())}:${p(t.getMinutes())}`;
};

export function logChange(horse: Horse, by: string, text: string): NonNullable<Horse['changeLog']> {
  return [{ time: nowStamp(), by, text }, ...(horse.changeLog || [])];
}

// ── Trainer history (nhiều – nhiều) ───────────────────────────────────────

type TH = NonNullable<Horse['trainerHistory']>;

export function TrainerHistoryTab({ horse, trainers, canEdit, today, onChange }:
  { horse: Horse; trainers: AppUser[]; canEdit: boolean; today: string; onChange: (list: TH, text: string, reason?: string) => void }) {
  const list = horse.trainerHistory || [];
  const active = list.filter(t => !t.to);
  const available = trainers.filter(t => !active.some(a => a.id === t.id || a.trainerId === t.id));
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ trainerId: '', from: '', note: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<TH[number] | null>(null);
  const toIso = (d: string) => { const [dd, mm, yy] = d.split('/'); return `${yy}-${mm}-${dd}`; };
  const toVn = (iso: string) => { const [yy, mm, dd] = iso.split('-'); return `${dd}/${mm}/${yy}`; };

  const submit = () => {
    const e: Record<string, string> = {};
    if (!f.trainerId) e.trainerId = 'Vui lòng chọn huấn luyện viên.';
    if (!f.from) e.from = 'Chọn ngày bắt đầu.'; else if (f.from > toIso(today)) e.from = 'Ngày bắt đầu không được ở tương lai.';
    if (f.note.length > 200) e.note = 'Ghi chú tối đa 200 ký tự.';
    setErrs(e);
    if (Object.keys(e).length) return;
    const t = trainers.find(x => x.id === f.trainerId)!;
    onChange([...list, { id: `th${Date.now()}`, trainerId: t.id, name: t.name, from: toVn(f.from), to: null, note: f.note.trim() || undefined }], `thêm huấn luyện viên ${t.name}`);
    setAdding(false); setF({ trainerId: '', from: '', note: '' });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="font-semibold">Huấn luyện viên phụ trách</h3><p className="text-sm text-gray-500">Quan hệ nhiều – nhiều: một ngựa có thể có nhiều huấn luyện viên, một huấn luyện viên phụ trách nhiều ngựa. Gỡ là kết thúc phụ trách (giữ lại lịch sử).</p></div>
        {canEdit && <Btn variant="gold" size="sm" onClick={() => { setAdding(!adding); setErrs({}); }}>+ Thêm huấn luyện viên</Btn>}
      </div>
      {adding && canEdit && (
        <Card className="space-y-3 border-l-4 border-[#c9973b] p-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Huấn luyện viên" required value={f.trainerId} error={errs.trainerId} onChange={v => setF({ ...f, trainerId: v })} options={[{ value: '', label: '— Chọn huấn luyện viên —' }, ...available.map(t => ({ value: t.id, label: t.name }))]} hint={available.length ? undefined : 'Không còn huấn luyện viên nào để thêm'} />
            <Input label="Từ ngày" required type="date" value={f.from} max={toIso(today)} error={errs.from} onChange={v => setF({ ...f, from: v })} />
            <div className="col-span-2"><Input label="Ghi chú" value={f.note} maxLength={200} error={errs.note} hint="Phạm vi phụ trách, ví dụ: huấn luyện nước rút" onChange={v => setF({ ...f, note: v })} /></div>
          </div>
          <PendingNotice>Chờ API lưu nhiều HLV/ngựa và phê duyệt phân công. Việc nhập biểu mẫu không làm thay đổi danh sách đang phụ trách.</PendingNotice>
          <div className="flex gap-2"><Btn variant="gold" size="sm" disabled>Lưu — chờ API</Btn><Btn variant="secondary" size="sm" onClick={() => setAdding(false)}>Hủy</Btn></div>
        </Card>
      )}
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 bg-gray-50">{['Huấn luyện viên', 'Từ ngày', 'Đến ngày', 'Trạng thái', 'Ghi chú', ''].map(h => <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{h}</th>)}</tr></thead>
          <tbody>
            {list.map(t => (
              <tr key={t.id} className="border-b border-gray-100 last:border-0">
                <td className="px-5 py-3 font-medium text-[#0f1729]">{t.name}</td>
                <td className="px-5 py-3 text-gray-600">{t.from}</td>
                <td className="px-5 py-3 text-gray-600">{t.to || '—'}</td>
                <td className="px-5 py-3">{t.to ? <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">Đã kết thúc</span> : <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">Đang phụ trách</span>}</td>
                <td className="px-5 py-3 text-xs italic text-gray-500">{t.note || '—'}</td>
                <td className="px-5 py-3 text-right">{canEdit && !t.to && <Btn size="sm" variant="danger" disabled>Gỡ — chờ API</Btn>}</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">Chưa có huấn luyện viên nào phụ trách ngựa này.</td></tr>}
          </tbody>
        </table>
      </Card>
      {removing && (
        <ReasonDialog title="Gỡ huấn luyện viên" danger confirmLabel="Gỡ phụ trách" onClose={() => setRemoving(null)}
          description={<p>Kết thúc phụ trách của <b>{removing.name}</b> với ngựa <b>{horse.name}</b> từ hôm nay ({today}).</p>}
          onConfirm={reason => { onChange(list.map(x => x.id === removing.id ? { ...x, to: today } : x), `gỡ huấn luyện viên ${removing.name}`, reason); setRemoving(null); }} />
      )}
    </div>
  );
}

// ── Evidence photos ───────────────────────────────────────────────────────────

export function PhotosTab({ horse, canEdit, onChange }: { horse: Horse; canEdit: boolean; onChange: (photos: string[]) => void }) {
  const photos = horse.photos || [];
  const [err, setErr] = useState('');
  const [big, setBig] = useState<string | null>(null);

  const add = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    const bad = arr.find(f => !/^image\/(png|jpe?g|webp)$/.test(f.type));
    if (bad) { setErr(`"${bad.name}" không phải ảnh PNG/JPG/WebP.`); return; }
    const huge = arr.find(f => f.size > 5 * 1024 * 1024);
    if (huge) { setErr(`"${huge.name}" vượt quá 5 MB.`); return; }
    if (photos.length + arr.length > 12) { setErr('Tối đa 12 ảnh minh chứng cho mỗi ngựa.'); return; }
    setErr('');
    Promise.all(arr.map(f => new Promise<string>(res => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f); }))).then(urls => onChange([...photos, ...urls]));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div><h3 className="font-semibold">Ảnh minh chứng</h3><p className="text-sm text-gray-500">{photos.length}/12 ảnh · PNG, JPG, WebP · tối đa 5 MB mỗi ảnh</p></div>
        {canEdit && <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#c9973b] bg-[#c9973b] px-4 py-2 text-sm font-medium text-white hover:bg-[#b8852a]">+ Tải ảnh lên<input type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => { add(e.target.files); e.target.value = ''; }} /></label>}
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {photos.length === 0 ? (
        <Card className="p-10 text-center"><div className="mb-2 text-4xl">🖼</div><div className="font-semibold text-gray-500">Chưa có ảnh minh chứng</div><p className="mt-1 text-xs text-gray-400">Ảnh giấy tờ, chuồng trại hoặc thể trạng ngựa giúp Quản lý duyệt nhanh hơn.</p></Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {photos.map((u, i) => (
            <div key={i} className="group relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
              <img src={u} alt={`Ảnh minh chứng ${i + 1}`} onClick={() => setBig(u)} className="h-32 w-full cursor-zoom-in object-cover" />
              {canEdit && <button aria-label="Xóa ảnh" onClick={() => onChange(photos.filter((_, j) => j !== i))} className="absolute right-1.5 top-1.5 hidden h-6 w-6 rounded-full bg-red-600 text-xs text-white group-hover:block">✕</button>}
            </div>
          ))}
        </div>
      )}
      {big && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" onClick={() => setBig(null)}><img src={big} className="max-h-full max-w-full rounded-lg" /></div>}
    </div>
  );
}

