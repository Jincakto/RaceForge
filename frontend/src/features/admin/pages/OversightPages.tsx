import { Fragment, useEffect, useMemo, useState } from 'react';
import { Card, Btn } from '../../../shared/ui/ui';
import { PackageCatalogPage } from '../../packages/packages';
import type { TrainingPackage } from '../../../shared/data/data';
import {
  listOversightHorses, listOversightPackages, listOversightPayments, listOversightRegistrations,
  type OversightHorse, type OversightPackage, type OversightPayment, type OversightRegistration,
} from '../api/oversightApi';

const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} ₫`;
const date = (value?: string | null) => value ? value.slice(0, 10) : '—';
const statusClass = (value: string) =>
  ['COMPLETED', 'PAID', 'APPROVED', 'ACTIVE'].includes(value) ? 'text-emerald-700 bg-emerald-50' :
  ['LOCKED', 'FAILED', 'REJECTED', 'CANCELLED'].includes(value) ? 'text-red-700 bg-red-50' :
  'text-amber-800 bg-amber-50';
const pill = (value?: string | null) => <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(value || '')}`}>{value || '—'}</span>;

function useRows<T>(fetchRows: () => Promise<T[]>) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    fetchRows().then(result => { if (alive) setRows(result); })
      .catch(err => { if (alive) { setRows([]); setError((err as Error).message); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [fetchRows, refresh]);
  return { rows, loading, error, refresh: () => setRefresh(n => n + 1) };
}

function Heading({ title, description, count, refresh, loading }: {
  title: string; description: string; count: number; refresh: () => void; loading: boolean;
}) {
  return <div className="flex flex-wrap items-start justify-between gap-3">
    <div><h2 className="font-serif text-xl font-bold text-[#0f1729]">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">{description} · {count} records loaded</p></div>
    <Btn variant="secondary" disabled={loading} onClick={refresh}>Refresh</Btn>
  </div>;
}
function LoadState({ loading, error }: { loading: boolean; error: string }) {
  if (error) return <div role="alert" className="rounded-xl border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-800">{error}</div>;
  if (loading) return <p role="status" className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Loading from database…</p>;
  return null;
}

/** Admin uses the CM horse-directory visual language, but only its read-only oversight projection. */
export function AdminHorsesPage() {
  const { rows, loading, error, refresh } = useRows<OversightHorse>(listOversightHorses);
  const [search, setSearch] = useState('');
  const [health, setHealth] = useState('all');
  const [admission, setAdmission] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [pageNo, setPageNo] = useState(1);
  const pageSize = 6;
  const filtered = useMemo(() => rows.filter(h => {
    const q = search.toLowerCase().trim();
    return (!q || `${h.horseId} ${h.horseName} ${h.ownerId} ${h.ownerName} ${h.registrationNumber || ''}`.toLowerCase().includes(q))
      && (health === 'all' || (health === 'LOCKED' ? h.trainingLocked || h.healthStatus === 'LOCKED' : h.healthStatus === health))
      && (admission === 'all' || h.admissionStatus === admission);
  }), [rows, search, health, admission]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(pageNo, pages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const filterClass = (isActive: boolean) => `rounded-lg border px-3 py-1.5 text-xs font-medium ${isActive ? 'border-[#1a2844] bg-[#1a2844] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#c9973b]'}`;
  return <div className="space-y-5">
    <Heading title="All horses" description="Read-only horse directory, including pending and rejected admissions" count={rows.length} refresh={refresh} loading={loading} />
    <LoadState loading={loading} error={error} />
    <div className="space-y-3">
      <input aria-label="Search horses" className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Search name, ID, owner or UELN…" value={search} onChange={e => { setSearch(e.target.value); setPageNo(1); }} />
      <div className="flex flex-wrap items-center gap-2"><span className="w-20 text-xs text-slate-500">Health</span>{[['all', 'All'], ['READY', 'Ready'], ['MONITOR', 'Monitor'], ['LOCKED', 'Locked']].map(([value, title]) => <button key={value} className={filterClass(health === value)} onClick={() => { setHealth(value); setPageNo(1); }}>{title}</button>)}</div>
      <div className="flex flex-wrap items-center gap-2"><span className="w-20 text-xs text-slate-500">Admission</span>{[['all', 'All'], ['APPROVED', 'Approved'], ['PENDING', 'Pending'], ['REJECTED', 'Rejected']].map(([value, title]) => <button key={value} className={filterClass(admission === value)} onClick={() => { setAdmission(value); setPageNo(1); }}>{title}</button>)}</div>
    </div>
    <Card className="overflow-hidden">
      <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm">
        <thead><tr className="border-b bg-slate-50 text-xs font-semibold uppercase text-slate-500">{['Horse', 'ID / UELN', 'Owner', 'Gender', 'Health', 'Admission', 'Training lock', ''].map(v => <th key={v} className="px-4 py-3">{v}</th>)}</tr></thead>
        <tbody>{visible.map(h => <Fragment key={h.horseId}>
          <tr className="cursor-pointer border-b border-slate-100 hover:bg-blue-50" onClick={() => setSelected(prev => prev === h.horseId ? null : h.horseId)}>
            <td className="px-4 py-3"><div className="flex items-center gap-3"><img src={h.imageUrl || undefined} alt={h.horseName} className="h-10 w-10 rounded-lg bg-slate-100 object-cover" /><strong>{h.horseName}</strong></div></td>
            <td className="px-4 py-3 font-mono text-xs">{h.horseId}<div className="text-slate-500">{h.registrationNumber || '—'}</div></td>
            <td className="px-4 py-3">{h.ownerName}<div className="text-xs text-slate-500">{h.ownerId}</div></td>
            <td className="px-4 py-3">{h.gender || '—'}</td><td className="px-4 py-3">{pill(h.healthStatus)}</td><td className="px-4 py-3">{pill(h.admissionStatus)}</td>
            <td className="px-4 py-3">{h.trainingLocked ? pill('LOCKED') : 'No'}</td>
            <td className="px-4 py-3"><button aria-expanded={selected === h.horseId} aria-label={`${selected === h.horseId ? 'Close' : 'View'} ${h.horseName} details`} className="text-xs font-semibold text-[#8a6420]" onClick={event => { event.stopPropagation(); setSelected(prev => prev === h.horseId ? null : h.horseId); }}>{selected === h.horseId ? 'Close ↑' : 'View ↓'}</button></td>
          </tr>
          {selected === h.horseId && <tr className="bg-slate-50"><td colSpan={8} className="px-5 py-4"><div className="mb-2 font-semibold text-[#0f1729]">Horse profile · read only</div><div className="grid gap-3 text-sm text-slate-700 md:grid-cols-3"><p><span className="text-slate-500">Breed:</span> {h.breed || '—'}</p><p><span className="text-slate-500">Gender:</span> {h.gender || '—'}</p><p><span className="text-slate-500">Born:</span> {date(h.dateOfBirth)}</p><p><span className="text-slate-500">Club status:</span> {h.horseStatus || '—'}</p><p><span className="text-slate-500">Health:</span> {h.healthStatus || '—'}</p><p><span className="text-slate-500">Registration:</span> {h.registrationNumber || '—'}</p></div></td></tr>}
        </Fragment>)}</tbody>
      </table></div>
      {!loading && !error && filtered.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-500">No horses match these filters.</p>}
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500"><span>Page {currentPage}/{pages} · {filtered.length} horses</span><div className="flex gap-2"><Btn variant="secondary" size="sm" disabled={currentPage <= 1} onClick={() => setPageNo(n => Math.max(1, n - 1))}>← Previous</Btn><Btn variant="secondary" size="sm" disabled={currentPage >= pages} onClick={() => setPageNo(n => Math.min(pages, n + 1))}>Next →</Btn></div></div>
    </Card>
  </div>;
}

/** Reuse the same expandable package cards as the CM, with a read-only Admin data source. */
export function AdminPackageCataloguePage() {
  const { rows, loading, error, refresh } = useRows<OversightPackage>(listOversightPackages);
  const packages = useMemo<TrainingPackage[]>(() => rows.map(row => ({
    id: row.packageId, name: row.packageName, description: row.description || '',
    packageType: row.packageType, sessions: 0, durationDays: row.durationDays,
    price: Number(row.price), active: row.status === 'ACTIVE',
  })), [rows]);
  return <div className="space-y-4">
    <div className="flex justify-end"><Btn variant="secondary" disabled={loading} onClick={refresh}>Refresh catalogue</Btn></div>
    <LoadState loading={loading} error={error} />
    {!error && !loading && <PackageCatalogPage packages={packages} enrollments={[]} readOnly />}
  </div>;
}

export function PaymentMonitorPage() {
  const { rows, loading, error, refresh } = useRows<OversightPayment>(listOversightPayments);
  const [filter, setFilter] = useState('all');
  const filtered = rows.filter(r => filter === 'all' || filter === 'unapplied' && r.paymentState === 'PAID' && !r.applied || r.paymentState === filter);
  return <div className="space-y-5">
    <Heading title="Payment monitor" description="Latest 300 persisted PayOS orders. No payment actions are available here" count={rows.length} refresh={refresh} loading={loading} />
    <LoadState loading={loading} error={error} />
    <div className="flex flex-wrap gap-2">{[['all', 'All'], ['PENDING', 'Pending'], ['PAID', 'Paid'], ['unapplied', 'Paid, not applied'], ['CANCELLED', 'Cancelled'], ['FAILED', 'Failed']].map(([v, label]) => <button key={v} className={`rounded-lg border px-3 py-2 text-xs ${filter === v ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`} onClick={() => setFilter(v)}>{label}</button>)}</div>
    <Card className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm">
      <thead><tr className="border-b bg-slate-50 text-xs uppercase text-slate-500">{['Order', 'Horse / owner', 'Package', 'Amount', 'PayOS state', 'Applied', 'Confirmed (UTC)', 'Registration'].map(v => <th key={v} className="px-4 py-3">{v}</th>)}</tr></thead>
      <tbody>{filtered.map(r => <tr key={r.orderCode} className="border-b border-slate-100">
        <td className="px-4 py-3 font-mono text-xs">{r.orderCode}<div>{r.horsePackageId}</div></td>
        <td className="px-4 py-3"><b>{r.horseName}</b><div className="text-xs text-slate-500">{r.ownerName}</div></td>
        <td className="px-4 py-3">{r.packageName}</td><td className="px-4 py-3 whitespace-nowrap">{money(r.amount)}</td>
        <td className="px-4 py-3">{pill(r.paymentState)}</td><td className="px-4 py-3">{r.applied ? 'Yes' : r.paymentState === 'PAID' ? pill('NOT APPLIED') : 'No'}</td>
        <td className="px-4 py-3 text-xs">{r.confirmedAtUtc || 'Undated'}</td><td className="px-4 py-3">{pill(r.registrationStatus)}</td>
      </tr>)}</tbody></table>{!loading && !error && filtered.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No matching orders.</p>}</Card>
  </div>;
}

export function PackageRegistrationsPage() {
  const { rows, loading, error, refresh } = useRows<OversightRegistration>(listOversightRegistrations);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = rows.filter(r => (filter === 'all' || r.status === filter) && `${r.horseName} ${r.horseId} ${r.ownerName} ${r.packageName} ${r.horsePackageId}`.toLowerCase().includes(search.toLowerCase().trim()));
  return <div className="space-y-5">
    <Heading title="Package registrations" description="Read-only owner, horse, payment and trainer assignment history; all package versions are preserved" count={rows.length} refresh={refresh} loading={loading} />
    <LoadState loading={loading} error={error} />
    <div className="flex flex-wrap gap-3"><input aria-label="Search registrations" className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Search owner, horse or package…" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Registration status" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={filter} onChange={e => setFilter(e.target.value)}>{['all','PENDING','ACTIVE','PAUSED','COMPLETED','EXPIRED','CANCELLED','FAILED'].map(v => <option key={v} value={v}>{v === 'all' ? 'All statuses' : v}</option>)}</select></div>
    <Card className="overflow-x-auto"><table className="w-full min-w-[940px] text-left text-sm"><thead><tr className="border-b bg-slate-50 text-xs uppercase text-slate-500">{['Registration', 'Owner / horse', 'Package', 'Paid', 'Training status', 'Trainer', 'Details'].map(t => <th key={t} className="px-4 py-3">{t}</th>)}</tr></thead>
    <tbody>{filtered.map(r => <Fragment key={r.horsePackageId}>
      <tr key={r.horsePackageId} className="border-b border-slate-100"><td className="px-4 py-3 font-mono text-xs">{r.horsePackageId}</td>
        <td className="px-4 py-3"><b>{r.horseName}</b> <span className="font-mono text-xs">{r.horseId}</span><div className="text-xs text-slate-500">{r.ownerName}</div></td>
        <td className="px-4 py-3">{r.packageName}<div className="text-xs text-slate-500">{r.packageType} · {r.packageId}</div></td>
        <td className="px-4 py-3">{pill(r.paymentStatus)}</td><td className="px-4 py-3">{pill(r.status)}</td>
        <td className="px-4 py-3">{r.trainerName || 'Unassigned'}{r.trainerEndedAt && <div className="text-xs text-slate-500">Assignment ended</div>}</td>
        <td className="px-4 py-3"><button className="font-medium text-blue-700 underline" onClick={() => setSelected(selected === r.horsePackageId ? null : r.horsePackageId)}>{selected === r.horsePackageId ? 'Close' : 'View'}</button></td>
      </tr>
      {selected === r.horsePackageId && <tr key={`${r.horsePackageId}-detail`} className="bg-slate-50"><td colSpan={7} className="px-5 py-4 text-sm text-slate-700"><p>Owner: {r.ownerName} ({r.ownerId}) · Horse: {r.horseName} ({r.horseId})</p><p>Registered: {date(r.registeredAt)} · Start: {date(r.startDate)} · End: {date(r.endDate)} · Remaining days: {r.remainingDays ?? '—'}</p><p>Agreed price: {money(r.totalPrice)} · Trainer: {r.trainerName || '—'} ({r.trainerUserId || '—'}) · Assignment: {r.trainerAssignmentStatus || '—'}</p><p className="mt-2 text-xs text-slate-500">COMPLETED indicates the package lifecycle only. Medical READY/MONITOR/LOCKED is a separate state.</p></td></tr>}
    </Fragment>)}</tbody></table>{!loading && !error && filtered.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No matching registrations.</p>}</Card>
  </div>;
}
