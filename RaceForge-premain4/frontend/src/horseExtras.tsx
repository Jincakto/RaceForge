import { useState } from 'react';
import type { AppUser, Horse } from './data';
import { Badge, Btn, Card, Input, Select, Textarea } from './ui';
import { ReasonDialog } from './admin';

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
    if (!f.trainerId) e.trainerId = "Select a trainer.";
    if (!f.from) e.from = "Select a start date."; else if (f.from > toIso(today)) e.from = "Start date cannot be in the future.";
    if (f.note.length > 200) e.note = "Notes cannot exceed 200 characters.";
    setErrs(e);
    if (Object.keys(e).length) return;
    const t = trainers.find(x => x.id === f.trainerId)!;
    onChange([...list, { id: `th${Date.now()}`, trainerId: t.id, name: t.name, from: toVn(f.from), to: null, note: f.note.trim() || undefined }], `added trainer ${t.name}`);
    setAdding(false); setF({ trainerId: '', from: '', note: '' });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="font-semibold">Assigned trainers</h3><p className="text-sm text-gray-500">A horse may have multiple trainers, and a trainer may work with multiple horses. Removing a trainer ends the assignment while retaining its history.</p></div>
        {canEdit && <Btn variant="gold" size="sm" onClick={() => { setAdding(!adding); setErrs({}); }}>+ Add trainer</Btn>}
      </div>
      {adding && canEdit && (
        <Card className="space-y-3 border-l-4 border-[#c9973b] p-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Trainer" required value={f.trainerId} error={errs.trainerId} onChange={v => setF({ ...f, trainerId: v })} options={[{ value: '', label: "— Select a trainer —" }, ...available.map(t => ({ value: t.id, label: t.name }))]} hint={available.length ? undefined : "No more trainers available to add"} />
            <Input label="From date" required type="date" value={f.from} max={toIso(today)} error={errs.from} onChange={v => setF({ ...f, from: v })} />
            <div className="col-span-2"><Input label="Notes" value={f.note} maxLength={200} error={errs.note} hint="Assignment scope, e.g. sprint training" onChange={v => setF({ ...f, note: v })} /></div>
          </div>
          <div className="flex gap-2"><Btn variant="gold" size="sm" onClick={submit}>Save</Btn><Btn variant="secondary" size="sm" onClick={() => setAdding(false)}>Cancel</Btn></div>
        </Card>
      )}
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 bg-gray-50">{["Trainer", "From date", "To date", "Status", "Notes", ''].map(h => <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{h}</th>)}</tr></thead>
          <tbody>
            {list.map(t => (
              <tr key={t.id} className="border-b border-gray-100 last:border-0">
                <td className="px-5 py-3 font-medium text-[#0f1729]">{t.name}</td>
                <td className="px-5 py-3 text-gray-600">{t.from}</td>
                <td className="px-5 py-3 text-gray-600">{t.to || '—'}</td>
                <td className="px-5 py-3">{t.to ? <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">Ended</span> : <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">Currently assigned</span>}</td>
                <td className="px-5 py-3 text-xs italic text-gray-500">{t.note || '—'}</td>
                <td className="px-5 py-3 text-right">{canEdit && !t.to && <Btn size="sm" variant="danger" onClick={() => setRemoving(t)}>Remove</Btn>}</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">No trainers are assigned to this horse.</td></tr>}
          </tbody>
        </table>
      </Card>
      {removing && (
        <ReasonDialog title="Remove trainer" danger confirmLabel="End assignment" onClose={() => setRemoving(null)}
          description={<p>End the assignment for <b>{removing.name}</b>  with horse <b>{horse.name}</b>  from today ({today}).</p>}
          onConfirm={reason => { onChange(list.map(x => x.id === removing.id ? { ...x, to: today } : x), `removed trainer ${removing.name}`, reason); setRemoving(null); }} />
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
    if (bad) { setErr(`"${bad.name}" is not a PNG/JPG/WebP image.`); return; }
    const huge = arr.find(f => f.size > 5 * 1024 * 1024);
    if (huge) { setErr(`"${huge.name}" exceeds 5 MB.`); return; }
    if (photos.length + arr.length > 12) { setErr("Maximum 12 evidence images per horse."); return; }
    setErr('');
    Promise.all(arr.map(f => new Promise<string>(res => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f); }))).then(urls => onChange([...photos, ...urls]));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div><h3 className="font-semibold">Evidence images</h3><p className="text-sm text-gray-500">{photos.length}/12 images · PNG, JPG, WebP · up to 5 MB each</p></div>
        {canEdit && <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#c9973b] bg-[#c9973b] px-4 py-2 text-sm font-medium text-white hover:bg-[#b8852a]">+ Upload images<input type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => { add(e.target.files); e.target.value = ''; }} /></label>}
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {photos.length === 0 ? (
        <Card className="p-10 text-center"><div className="mb-2 text-4xl">🖼</div><div className="font-semibold text-gray-500">No evidence images yet</div><p className="mt-1 text-xs text-gray-400">Images of documents, stables or the horse's condition help managers review the application.</p></Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {photos.map((u, i) => (
            <div key={i} className="group relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
              <img src={u} alt={`Evidence images ${i + 1}`} onClick={() => setBig(u)} className="h-32 w-full cursor-zoom-in object-cover" />
              {canEdit && <button aria-label="Delete image" onClick={() => onChange(photos.filter((_, j) => j !== i))} className="absolute right-1.5 top-1.5 hidden h-6 w-6 rounded-full bg-red-600 text-xs text-white group-hover:block">✕</button>}
            </div>
          ))}
        </div>
      )}
      {big && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" onClick={() => setBig(null)}><img src={big} className="max-h-full max-w-full rounded-lg" /></div>}
    </div>
  );
}

