import { useMemo, useState } from 'react';
import type { AppUser, Horse, HealthRecord } from './data';
import { Btn, Card, Input, Select } from './ui';
import { IdChip, dispId } from './admin';
import { vetVisible } from './intake';
import {
  VITAL_DEFS, REGION_DEFS, THRESHOLD_SOURCE, DECISION_LABEL, DecisionPill, VitalStatusPill,
  evalVital, fmtNum, rangeText, recordDecision, type VitalDef,
} from './vetForm';

type RecState = { user: AppUser | null; users: AppUser[]; horses: Horse[]; healthRecords: HealthRecord[] };

const PAGE_SIZE = 8;

function dateKey(d: string): number {
  const p = d.split('/');
  return p.length === 3 ? +p[2] * 10000 + +p[1] * 100 + +p[0] : 0;
}
function isoKey(iso: string): number { return iso ? Number(iso.replace(/-/g, '')) : 0; }
function sortDesc(a: HealthRecord, b: HealthRecord) { return dateKey(b.date) - dateKey(a.date) || (b.createdAt ?? 0) - (a.createdAt ?? 0); }

function OverlayModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1729]/60 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h3 className="font-serif text-lg font-bold text-[#0f1729]">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/** Mũi tên so sánh: xanh = tiến gần ngưỡng bình thường, đỏ = xa hơn, xám = không đổi / không có ngưỡng. */
function Delta({ cur, prev, def, unit }: { cur: number; prev: number; def?: VitalDef; unit: string }) {
  if (isNaN(cur) || isNaN(prev)) return <span className="text-gray-300">—</span>;
  const diff = Math.round((cur - prev) * 100) / 100;
  if (diff === 0) return <span className="text-gray-500">＝ Unchanged</span>;
  const dist = (v: number) => (def ? (v < def.lo ? def.lo - v : v > def.hi ? v - def.hi : 0) : 0);
  let tone = 'text-gray-600';
  if (def) tone = dist(cur) < dist(prev) ? 'text-emerald-600' : dist(cur) > dist(prev) ? 'text-red-600' : 'text-gray-600';
  return <span className={`font-medium ${tone}`}>{diff > 0 ? "▲ increased" : "▼ decreased"} {fmtNum(Math.abs(diff))} {unit}</span>;
}

function regionsOf(r: HealthRecord): { key: string; label: string; ok: boolean; note: string }[] {
  return REGION_DEFS.map(d => {
    if (r.regions?.[d.key]) return { key: d.key, label: d.label, ok: r.regions[d.key].ok, note: r.regions[d.key].note };
    const legacy = (r.clinical as Record<string, string> | undefined)?.[d.legacy];
    if (legacy) return { key: d.key, label: d.label, ok: legacy !== 'abnormal', note: r.injuryDetails?.[d.legacy]?.issue || '' };
    return null;
  }).filter(Boolean) as { key: string; label: string; ok: boolean; note: string }[];
}

export function HealthRecordsPage({ state, navigate }: { state: RecState; navigate: (p: 'vet-health-form') => void }) {
  const user = state.user!;
  const isVet = user.role === 'veterinarian';

  const horses = useMemo(() => state.horses.filter(h => {
    if (user.role === 'veterinarian') return vetVisible(h, user);
    if (user.role === 'owner') return h.ownerId === user.id;
    if (user.role === 'admin') return true;
    return !!user.clubId && h.clubId === user.clubId;
  }), [state.horses, user]);
  const horseMap = useMemo(() => new Map(horses.map(h => [h.id, h])), [horses]);
  const vetName = (r: HealthRecord) => (r.vetId && state.users.find(u => u.id === r.vetId)?.name) || r.vet;

  const all = useMemo(() => state.healthRecords.filter(r => horseMap.has(r.horseId)).sort(sortDesc), [state.healthRecords, horseMap]);

  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [dec, setDec] = useState('all');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter(r => {
      const h = horseMap.get(r.horseId)!;
      if (s) {
        const hay = [h.name, h.id, dispId('HRS', h.id), r.id, dispId('MED', r.id), vetName(r)].join(' ').toLowerCase();
        if (!hay.includes(s)) return false;
      }
      const k = dateKey(r.date);
      if (from && k < isoKey(from)) return false;
      if (to && k > isoKey(to)) return false;
      if (dec !== 'all' && recordDecision(r) !== dec) return false;
      return true;
    });
  }, [all, horseMap, q, from, to, dec]); // eslint-disable-line react-hooks/exhaustive-deps

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const rows = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const hasFilter = !!(q || from || to || dec !== 'all');
  const reset = () => { setQ(''); setFrom(''); setTo(''); setDec('all'); setPage(1); };
  const dateErr = from && to && isoKey(from) > isoKey(to) ? "Start date must precede end date." : '';

  const togglePick = (r: HealthRecord) => setPicked(p => {
    if (p.includes(r.id)) return p.filter(x => x !== r.id);
    const first = all.find(x => x.id === p[0]);
    if (first && first.horseId !== r.horseId) return [r.id];
    return p.length >= 3 ? p : [...p, r.id];
  });
  const pickedRecs = picked.map(id => all.find(r => r.id === id)!).filter(Boolean).sort((a, b) => dateKey(a.date) - dateKey(b.date) || (a.createdAt ?? 0) - (b.createdAt ?? 0));
  const open = openId ? all.find(r => r.id === openId) : undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#0f1729]">Medical records</h2>
          <p className="text-sm text-gray-500">{isVet ? "Examination records for horses assigned to you." : user.role === 'owner' ? "Examination records for your horses." : "Examination records for horses in the club."}</p>
        </div>
        {isVet
          ? <Btn variant="gold" onClick={() => navigate('vet-health-form')}>+ New examination</Btn>
          : <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">Read only — only veterinarians may create examination records</div>}
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <Input label="Search" value={q} onChange={v => { setQ(v); setPage(1); }} placeholder="Horse name, MED/HRS ID or veterinarian name" hint="e.g. Red Comet, MED-000004, Le Thi An." />
          </div>
          <Select label="Decision" value={dec} onChange={v => { setDec(v); setPage(1); }} hint="Filter by the veterinarian's conclusion."
            options={[{ value: 'all', label: "All" }, { value: 'eligible', label: DECISION_LABEL.eligible }, { value: 'conditional', label: DECISION_LABEL.conditional }, { value: 'not-eligible', label: DECISION_LABEL['not-eligible'] }]} />
          <div className="flex items-end"><Btn variant="secondary" onClick={reset} disabled={!hasFilter}>Clear filters</Btn></div>
          <Input label="From date" type="date" value={from} onChange={v => { setFrom(v); setPage(1); }} hint="Earliest examination date." error={dateErr} />
          <Input label="To date" type="date" value={to} onChange={v => { setTo(v); setPage(1); }} hint="Latest examination date." />
        </div>
      </Card>

      {picked.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#c9973b]/40 bg-[#c9973b]/10 px-4 py-2.5 text-sm">
          <span>Selected <b>{picked.length}</b>/3 records for {horseMap.get(pickedRecs[0]?.horseId)?.name}. Only records for the same horse can be compared.</span>
          <Btn size="sm" variant="gold" disabled={picked.length < 2} onClick={() => setComparing(true)}>Compare</Btn>
          <Btn size="sm" variant="ghost" onClick={() => setPicked([])}>Clear selection</Btn>
        </div>
      )}

      {filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="mb-3 text-4xl">🏥</div>
          <div className="font-serif text-lg font-bold text-[#0f1729]">{all.length === 0 ? "No medical records yet" : "No records match the filters"}</div>
          <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">{all.length === 0 ? (isVet ? "Examine an assigned horse to create the first record." : "Records will appear after the veterinarian completes the first examination.") : "Try another search term or a wider date range."}</p>
          {all.length === 0 && isVet ? <Btn variant="gold" className="mt-4" onClick={() => navigate('vet-health-form')}>Examine now</Btn> : hasFilter && <Btn variant="secondary" className="mt-4" onClick={reset}>Clear filters</Btn>}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr><th className="w-10 px-3 py-3" title="Select to compare"></th><th className="px-3 py-3">Record ID</th><th className="px-3 py-3">Examination date</th><th className="px-3 py-3">Veterinarian</th><th className="px-3 py-3">Horses</th><th className="px-3 py-3">Decision</th><th className="px-3 py-3"></th></tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const h = horseMap.get(r.horseId)!;
                  const on = picked.includes(r.id);
                  return (
                    <tr key={r.id} className={`border-t border-gray-100 hover:bg-[#c9973b]/5 ${on ? 'bg-[#c9973b]/10' : ''}`}>
                      <td className="px-3 py-3"><input type="checkbox" checked={on} onChange={() => togglePick(r)} aria-label={`Select ${dispId('MED', r.id)} to compare`} className="h-4 w-4 accent-[#c9973b]" /></td>
                      <td className="px-3 py-3"><IdChip kind="MED" id={r.id} /></td>
                      <td className="whitespace-nowrap px-3 py-3 text-gray-700">{r.date}</td>
                      <td className="px-3 py-3 text-gray-700">{vetName(r)}</td>
                      <td className="px-3 py-3"><div className="flex items-center gap-2">{h.imageUrl ? <img src={h.imageUrl || undefined} alt="" className="h-8 w-8 rounded-lg bg-gray-200 object-cover" /> : <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">🐎</div>}<div><div className="font-medium text-[#0f1729]">{h.name}</div><div className="text-[11px] text-gray-400">{dispId('HRS', h.id)}</div></div></div></td>
                      <td className="max-w-xs px-3 py-3"><DecisionPill d={recordDecision(r)} small /><div className="mt-1 line-clamp-2 text-xs text-gray-500">{r.conclusion || r.diagnosis || r.notes}</div></td>
                      <td className="px-3 py-3 text-right"><Btn size="sm" variant="secondary" onClick={() => setOpenId(r.id)}>Details</Btn></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
            <span>Showing {(cur - 1) * PAGE_SIZE + 1}–{Math.min(cur * PAGE_SIZE, filtered.length)}  of {filtered.length}  records</span>
            <div className="flex items-center gap-2">
              <Btn size="sm" variant="secondary" disabled={cur <= 1} onClick={() => setPage(cur - 1)}>← Previous</Btn>
              <span>Trang {cur}/{pages}</span>
              <Btn size="sm" variant="secondary" disabled={cur >= pages} onClick={() => setPage(cur + 1)}>Sau →</Btn>
            </div>
          </div>
        </Card>
      )}

      {open && <RecordDetail rec={open} horse={horseMap.get(open.horseId)!} vet={vetName(open)} all={all} onClose={() => setOpenId(null)} />}
      {comparing && pickedRecs.length >= 2 && <CompareModal recs={pickedRecs} horse={horseMap.get(pickedRecs[0].horseId)!} vetName={vetName} onClose={() => setComparing(false)} />}
    </div>
  );
}

function RecordDetail({ rec, horse, vet, all, onClose }: { rec: HealthRecord; horse: Horse; vet: string; all: HealthRecord[]; onClose: () => void }) {
  const same = all.filter(r => r.horseId === rec.horseId).sort(sortDesc);
  const idx = same.findIndex(r => r.id === rec.id);
  const prev = same.slice(idx + 1).find(r => r.vitals);
  const regs = regionsOf(rec);
  const prevRegs = prev ? regionsOf(prev) : [];
  const abn = regs.filter(r => !r.ok).length;
  const dec = recordDecision(rec);
  const val = (r: HealthRecord | undefined, k: 'temperature' | 'heartRate' | 'respRate' | 'weight') => { const t = r?.vitals?.[k]; return t && t.trim() ? Number(t.replace(',', '.')) : NaN; };

  return (
    <OverlayModal title="Medical record details" onClose={onClose}>
      <div className="space-y-5 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          {horse.imageUrl ? <img src={horse.imageUrl || undefined} alt="" className="h-14 w-14 rounded-xl bg-gray-200 object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-xl">🐎</div>}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2"><span className="font-serif text-lg font-bold text-[#0f1729]">{horse.name}</span><IdChip kind="HRS" id={horse.id} /></div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500"><IdChip kind="MED" id={rec.id} /><span>{rec.date}</span><span>· Veterinarian {vet}</span><span>· {rec.type}</span></div>
          </div>
          <DecisionPill d={dec} />
        </div>

        <div className="rounded-xl border-l-4 border-[#c9973b] bg-[#c9973b]/10 p-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#8a6620]">Veterinarian decision</div>
          <p className="text-gray-800">{rec.conclusion || rec.diagnosis || rec.notes || "This record has no conclusion."}</p>
          {rec.recommendations && <p className="mt-2 text-xs text-gray-600"><b>Recommendations:</b> {rec.recommendations}</p>}
          {rec.medications && rec.medications !== 'None' && <p className="mt-1 text-xs text-gray-600"><b>Medication / instructions:</b> {rec.medications}</p>}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between"><h4 className="font-serif text-base font-bold text-[#0f1729]">Vital signs</h4>
            <span className="text-xs text-gray-500">{prev ? `Compared with examination ${prev.date} (${dispId('MED', prev.id)})` : "First examination"}</span></div>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-3 py-2">Measurement</th><th className="px-3 py-2">Value</th><th className="px-3 py-2">Reference range</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Compared with previous</th></tr></thead>
              <tbody>
                {VITAL_DEFS.map(d => {
                  const raw = rec.vitals?.[d.key] ?? '';
                  const s = evalVital(d, raw);
                  const c = val(rec, d.key);
                  return (
                    <tr key={d.key} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-medium">{d.label}</td>
                      <td className="px-3 py-2">{raw.trim() ? `${fmtNum(c)} ${d.unit}` : '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{rangeText(d)}</td>
                      <td className="px-3 py-2">{raw.trim() ? <VitalStatusPill s={s} /> : '—'}</td>
                      <td className="px-3 py-2 text-xs">{prev ? <Delta cur={c} prev={val(prev, d.key)} def={d} unit={d.unit} /> : <span className="text-gray-400">First examination</span>}</td>
                    </tr>
                  );
                })}
                {rec.vitals?.weight?.trim() && (
                  <tr className="border-t border-gray-100"><td className="px-3 py-2 font-medium">Weight</td><td className="px-3 py-2">{fmtNum(val(rec, 'weight'))} kg</td><td className="px-3 py-2 text-gray-400">—</td><td className="px-3 py-2 text-gray-400">—</td>
                    <td className="px-3 py-2 text-xs">{prev ? <Delta cur={val(rec, 'weight')} prev={val(prev, 'weight')} unit="kg" /> : <span className="text-gray-400">First examination</span>}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-[11px] italic text-amber-700">{THRESHOLD_SOURCE}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">Arrow color: green = closer to the reference range; red = further away.</p>
        </div>

        {regs.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between"><h4 className="font-serif text-base font-bold text-[#0f1729]">Regional clinical examination</h4>
              <span className="text-xs text-gray-500">{abn}  abnormal regions{prev && prevRegs.length ? ` (previous: ${prevRegs.filter(r => !r.ok).length})` : ''}</span></div>
            <div className="grid gap-2 sm:grid-cols-2">
              {regs.map(r => (
                <div key={r.key} className={`rounded-lg border px-3 py-2 ${r.ok ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-center justify-between"><span className="font-medium text-gray-800">{r.label}</span><span className={`text-xs font-medium ${r.ok ? 'text-emerald-700' : 'text-red-700'}`}>{r.ok ? "✓ Normal" : "⚠ Abnormal"}</span></div>
                  {!r.ok && r.note && <div className="mt-0.5 text-xs text-gray-600">{r.note}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
        {!prev && <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">First examination for this horse — no previous data to compare.</p>}
      </div>
    </OverlayModal>
  );
}

function CompareModal({ recs, horse, vetName, onClose }: { recs: HealthRecord[]; horse: Horse; vetName: (r: HealthRecord) => string; onClose: () => void }) {
  const num = (r: HealthRecord, k: 'temperature' | 'heartRate' | 'respRate' | 'weight') => { const t = r.vitals?.[k]; return t && t.trim() ? Number(t.replace(',', '.')) : NaN; };
  const metrics: { key: 'temperature' | 'heartRate' | 'respRate' | 'weight'; label: string; unit: string; def?: VitalDef }[] = [
    ...VITAL_DEFS.map(d => ({ key: d.key, label: d.label, unit: d.unit, def: d })),
    { key: 'weight' as const, label: "Weight", unit: 'kg' },
  ];
  return (
    <OverlayModal title={`Compare examinations — ${horse.name}`} onClose={onClose}>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr><th className="px-3 py-2"></th>{recs.map(r => <th key={r.id} className="px-3 py-2"><IdChip kind="MED" id={r.id} /><div className="mt-1 normal-case tracking-normal">{r.date}</div><div className="font-normal normal-case tracking-normal text-gray-400">{vetName(r)}</div></th>)}</tr>
          </thead>
          <tbody>
            {metrics.map(m => (
              <tr key={m.key} className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium">{m.label}{m.def && <div className="text-[11px] font-normal text-gray-400">{rangeText(m.def)}</div>}</td>
                {recs.map((r, i) => {
                  const c = num(r, m.key);
                  return (
                    <td key={r.id} className="px-3 py-2 align-top">
                      <div>{isNaN(c) ? '—' : `${fmtNum(c)} ${m.unit}`}</div>
                      {i > 0 && <div className="text-xs"><Delta cur={c} prev={num(recs[i - 1], m.key)} def={m.def} unit={m.unit} /></div>}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t border-gray-100"><td className="px-3 py-2 font-medium">Abnormal regions</td>{recs.map(r => { const g = regionsOf(r); return <td key={r.id} className="px-3 py-2">{g.length ? `${g.filter(x => !x.ok).length}/${g.length}` : '—'}</td>; })}</tr>
            <tr className="border-t border-gray-100"><td className="px-3 py-2 font-medium">Decision</td>{recs.map(r => <td key={r.id} className="px-3 py-2 align-top"><DecisionPill d={recordDecision(r)} small /><div className="mt-1 text-xs text-gray-500">{r.conclusion || r.diagnosis || ''}</div></td>)}</tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-gray-400">Examinations are ordered by time; arrows compare with the immediately preceding record (green = closer to the reference range; red = further away).</p>
    </OverlayModal>
  );
}
