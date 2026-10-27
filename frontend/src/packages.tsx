import { PackageRoadmapPreview } from './roadmapView';
import { CreatePackageForm } from './packageCreateForm';
import { useState } from 'react';
import type { AppUser, Horse, Enrollment, TrainingPackage, Res } from './data';
import { Badge, Btn, Card, Input, Select } from './ui';
import { IdChip, Modal } from './admin';
import { money, TRAINER_STATUS_LABEL, isCurrent, daysLeft, type PackageDraft } from './trainingLogic';

export const TRAINER_PILL: Record<Enrollment['trainerStatus'], string> = {
  unassigned: 'bg-amber-100 text-amber-800 border-amber-200',
  pending: 'bg-sky-100 text-sky-800 border-sky-200',
  confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

export function TrainerStatusPill({ status }: { status: Enrollment['trainerStatus'] }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TRAINER_PILL[status]}`}>{TRAINER_STATUS_LABEL[status]}</span>;
}

// ── Danh mục gói (Quản lý) ───────────────────────────────────────────────────

interface CatalogProps {
  packages: TrainingPackage[];
  enrollments: Enrollment[];
  onSave: (d: PackageDraft) => Promise<Res<TrainingPackage>>;
  onToggle: (id: string, active: boolean) => Promise<Res<TrainingPackage>>;
}

export function PackageCatalogPage({ packages, enrollments, onSave }: CatalogProps) {
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const list = packages.filter(p => filter === 'all' || (filter === 'active' ? p.active : !p.active));
  const usage = (id: string) => enrollments.filter(e => e.packageId === id).length;

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#0f1729]">Training package catalogue</h2>
          <p className="text-sm text-gray-500">{packages.filter(p => p.active).length}/{packages.length}  active packages · Disabled packages are hidden from horse owners</p>
        </div>
        <Btn variant="gold" onClick={() => { setCreating(true); setActionError(''); }}>+ Create package</Btn>
      </div>

      <div className="flex gap-2">
        {([['all', "All"], ['active', "Active"], ['inactive', "Inactive"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full border px-3 py-1 text-xs font-medium ${filter === k ? 'border-[#1a2844] bg-[#1a2844] text-white' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}>{l}</button>
        ))}
      </div>

      {actionError && <Card className="border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700">{actionError}</Card>}

      {list.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="mb-2 text-4xl">📦</div>
          <div className="font-semibold text-gray-600">{packages.length === 0 ? "No training packages yet" : "No packages match this filter"}</div>
          {packages.length === 0 && <div className="mt-3"><Btn variant="gold" onClick={() => setCreating(true)}>+ Create your first package</Btn></div>}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map(p => (
            <Card key={p.id} className={`p-5 ${p.active ? '' : 'opacity-70'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <IdChip kind="PKG" id={p.id} />
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${p.active ? 'border-emerald-200 bg-emerald-100 text-emerald-800' : 'border-gray-200 bg-gray-100 text-gray-500'}`}>{p.active ? "Active" : "Inactive"}</span>
                    {p.popular && <span className="rounded-full bg-[#c9973b]/15 px-2 py-0.5 text-xs font-medium text-[#8a6420]">Popular</span>}
                  </div>
                  <h3 className="font-serif text-lg font-bold text-[#0f1729]">{p.name}</h3>
                </div>
                <div className="text-right">
                  <div className="font-serif text-xl font-bold text-[#c9973b]">{money(p.price)}</div>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-600">{p.description || "No description"}</p>
              <PackageRoadmapPreview packageId={p.id} />
              <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="rounded-lg bg-gray-50 p-2"><div className="text-gray-500">Duration</div><div className="font-mono text-sm font-bold">{p.durationDays}  days</div></div>
                <div className="rounded-lg bg-gray-50 p-2"><div className="text-gray-500">Registered</div><div className="font-mono text-sm font-bold">{usage(p.id)}</div></div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {creating && <CreatePackageForm packages={packages} onSave={onSave} onClose={()=>setCreating(false)} />}

    </div>
  );
}

// ── Phân công huấn luyện viên (Quản lý) ──────────────────────────────────────

interface AssignProps {
  user: AppUser;
  users: AppUser[];
  horses: Horse[];
  enrollments: Enrollment[];
  onAssign: (enrId: string, trainerId: string, reason: string) => Promise<Res<Enrollment>>;
}

export function TrainerAssignPage({ user, users, horses, enrollments, onAssign }: AssignProps) {
  const [tab, setTab] = useState<'unassigned' | 'pending' | 'confirmed' | 'all'>('unassigned');
  const [dlg, setDlg] = useState<Enrollment | null>(null);
  const [trainerId, setTrainerId] = useState('');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [openHistory, setOpenHistory] = useState<string | null>(null);
  const [flash, setFlash] = useState('');
  const [trainerSearch, setTrainerSearch] = useState('');

  const trainers = users.filter(u => u.role === 'head_trainer' && u.clubId === user.clubId && u.status === 'active' && !u.locked && !!u.trainerProfileId);
  const myEnr = enrollments.filter(e => isCurrent(e) && !e.directAssignmentId && e.apiStatus === 'ACTIVE' && e.paymentStatus === 'PAID' && horses.some(h => h.id === e.horseId && h.clubId === user.clubId));
  const count = (s: Enrollment['trainerStatus']) => myEnr.filter(e => e.trainerStatus === s).length;
  const rows = myEnr.filter(e => tab === 'all' || e.trainerStatus === tab);
  const load = (id: string) => new Set(myEnr.filter(e => e.trainerId === id && (e.trainerStatus === 'pending' || e.trainerStatus === 'confirmed')).map(e => e.horseId)).size;
  const replacing = !!dlg && dlg.trainerStatus !== 'unassigned' && !!dlg.trainerId;

  const open = (e: Enrollment) => { setDlg(e); setTrainerId(''); setTrainerSearch(''); setReason(''); setErr(''); };
  const submit = async () => {
    if (!dlg) return;
    if (!trainerId) { setErr("Select a trainer."); return; }
    if (replacing && reason.trim().length < 10) { setErr("Replacement reason must contain at least 10 characters."); return; }
    if (reason.length > 300) { setErr("Reason cannot exceed 300 characters."); return; }
    const r = await onAssign(dlg.id, trainerId, reason);
    if (!r.ok) { setErr(r.message); return; }
    setFlash(`Successfully ${replacing ? "replaced" : "assigned"} trainer for package ${dlg.id}.`);
    setDlg(null);
  };

  const tabs: { k: typeof tab; l: string; n: number }[] = [
    { k: 'unassigned', l: "Awaiting assignment", n: count('unassigned') },
    { k: 'pending', l: "Awaiting trainer confirmation", n: count('pending') },
    { k: 'confirmed', l: "Confirmed", n: count('confirmed') },
    { k: 'all', l: "All", n: myEnr.length },
  ];

  return (
    <div className="max-w-5xl space-y-5">
      <div>
        <h2 className="font-serif text-xl font-bold text-[#0f1729]">Assign trainers</h2>
        <p className="text-sm text-gray-500">After the owner pays, select a trainer · The trainer accepts or declines</p>
      </div>
      <div className="flex gap-0 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-all ${tab === t.k ? 'border-[#c9973b] text-[#c9973b]' : 'border-transparent text-gray-500 hover:text-[#0f1729]'}`}>
            {t.l} <span className="ml-1 rounded-full bg-gray-100 px-1.5 text-xs text-gray-600">{t.n}</span>
          </button>
        ))}
      </div>
      {flash && <Card className="flex items-center justify-between border-l-4 border-emerald-500 bg-emerald-50 p-3 text-sm text-emerald-800"><span>{flash}</span><button onClick={() => setFlash('')} className="text-emerald-600">✕</button></Card>}

      {trainers.length === 0 && <Card className="border-l-4 border-amber-400 bg-amber-50 p-4 text-sm text-amber-800">No active trainers are available for assignment.</Card>}

      {rows.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="mb-2 text-4xl">🧑‍🏫</div>
          <div className="font-semibold text-gray-600">{tab === 'unassigned' ? "No packages are awaiting assignment" : "No packages in this section"}</div>
        </Card>
      ) : rows.map(e => {
        const h = horses.find(x => x.id === e.horseId);
        const hist = openHistory === e.id;
        return (
          <Card key={e.id} className={`p-5 ${e.trainerStatus === 'unassigned' ? 'border-l-4 border-amber-400' : ''}`}>
            <div className="flex items-start gap-4">
              {h?.imageUrl ? <img src={h.imageUrl || undefined} alt="" className="h-12 w-12 rounded-lg bg-gray-200 object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-xl">🐎</div>}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[#0f1729]">{h?.name}</span>
                  <IdChip kind="ENR" id={e.id} />
                  <TrainerStatusPill status={e.trainerStatus} />
                  {e.status === 'paused' && <Badge status="Paused" />}
                </div>
                <div className="mt-1 text-sm text-gray-600">Horse Owner: {e.ownerName}  · Package {e.packageName} · Expires {e.expiresAt}  (remaining {Math.max(0, daysLeft(e))}  days)</div>
                <div className="mt-0.5 text-sm text-gray-500">Trainer: {e.trainerName || <span className="italic text-gray-400">not assigned</span>}</div>
                {hist && (
                  <div className="mt-3 space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
                    {e.assignHistory.length === 0 && <div className="text-xs text-gray-400">No assignment history.</div>}
                    {e.assignHistory.map((a, i) => (
                      <div key={i} className="text-xs text-gray-600">
                        <span className="font-mono text-gray-400">{a.time}</span> · <strong>{{ assign: "Assign", replace: "Replace", confirm: "Confirm", decline: "Reject" }[a.kind]}</strong>
                        {a.from ? ` ${a.from} → ${a.to}` : ` ${a.to}`}  · by {a.by}{a.reason ? ` — ${a.reason}` : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                {e.trainerStatus === 'unassigned'
                  ? <Btn size="sm" variant="gold" disabled={trainers.length === 0} onClick={() => open(e)}>Assign</Btn>
                  : <Btn size="sm" variant="secondary" disabled={trainers.length < 2} onClick={() => open(e)}>Replace</Btn>}
                <Btn size="sm" variant="ghost" onClick={() => setOpenHistory(hist ? null : e.id)}>{hist ? "Hide history" : "History"}</Btn>
              </div>
            </div>
          </Card>
        );
      })}

      {dlg && (
        <Modal title={replacing ? "Replace trainer" : "Assign trainers"} onClose={() => setDlg(null)}>
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
              <div className="flex items-center gap-2"><strong>{horses.find(x => x.id === dlg.horseId)?.name}</strong><IdChip kind="ENR" id={dlg.id} /></div>
              <div className="mt-0.5">Package {dlg.packageName}{replacing ? ` · Current: ${dlg.trainerName}` : ''}</div>
              <div className="mt-1">Valid: {dlg.startedAt} – {dlg.expiresAt} · Paid</div>
            </div>
            <Select label="Trainer" required value={trainerId} onChange={v => { setTrainerId(v); setErr(''); }}
              options={[{ value: '', label: "— Select a trainer —" }, ...trainers.filter(t => t.id !== dlg.trainerId || !replacing).map(t => ({ value: t.id, label: `${t.name} (${load(t.id)} horses assigned)` }))]}
              hint={`${trainerId ? `${load(trainerId)} horses currently assigned to this trainer. ` : ''}Counts unique horses in active paid packages, including assignments awaiting confirmation.`} />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Search trainers directly</label>
              <input value={trainerSearch} onChange={e => setTrainerSearch(e.target.value)} placeholder="Search by trainer name or ID…" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b]" />
              {trainerSearch && <div className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1">
                {trainers.filter(t => (t.id !== dlg.trainerId || !replacing) && `${t.name} ${t.id}`.toLowerCase().includes(trainerSearch.toLowerCase())).map(t =>
                  <button key={t.id} type="button" onClick={() => { setTrainerId(t.id); setTrainerSearch(t.name); setErr(''); }} className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-amber-50"><span className="font-medium">{t.name}</span><span className="text-xs text-gray-400">{t.id} · {load(t.id)} horses assigned</span></button>)}
              </div>}
            </div>
            {replacing && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Replacement reason <span className="text-red-500">*</span></label>
                <textarea value={reason} onChange={e => { setReason(e.target.value); setErr(''); }} rows={3} maxLength={300} className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b]" placeholder="State the reason — it is recorded in the assignment history and audit log" />
                <div className="text-right text-xs text-gray-400">{reason.length}/300 · at least 10 characters</div>
              </div>
            )}
            {err && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}
            <div className="flex justify-end gap-2">
              <Btn variant="secondary" onClick={() => setDlg(null)}>Cancel</Btn>
              <Btn variant="gold" onClick={submit}>{replacing ? "Confirm replacement" : "Confirm assignment"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
