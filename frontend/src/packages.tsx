import { useState } from 'react';
import type { AppUser, Horse, Enrollment, TrainingPackage, Res } from './data';
import { Badge, Btn, Card, Input, Select } from './ui';
import { IdChip, Modal } from './admin';
import { money, validatePackage, TRAINER_STATUS_LABEL, isCurrent, daysLeft, type PackageDraft } from './trainingLogic';

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
  onSave: (d: PackageDraft) => Res<TrainingPackage>;
  onToggle: (id: string, active: boolean) => Res<TrainingPackage>;
}

export function PackageCatalogPage({ packages, enrollments, onSave, onToggle }: CatalogProps) {
  const [editing, setEditing] = useState<TrainingPackage | 'new' | null>(null);
  const [confirmOff, setConfirmOff] = useState<TrainingPackage | null>(null);
  const [actionError, setActionError] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const list = packages.filter(p => filter === 'all' || (filter === 'active' ? p.active : !p.active));
  const usage = (id: string) => enrollments.filter(e => e.packageId === id).length;

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#0f1729]">Danh mục gói huấn luyện</h2>
          <p className="text-sm text-gray-500">{packages.filter(p => p.active).length}/{packages.length} gói đang áp dụng · Gói tắt sẽ bị ẩn khỏi chủ ngựa</p>
        </div>
        <Btn variant="gold" onClick={() => { setEditing('new'); setActionError(''); }}>+ Tạo gói mới</Btn>
      </div>

      <div className="flex gap-2">
        {([['all', 'Tất cả'], ['active', 'Đang áp dụng'], ['inactive', 'Đã tắt']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full border px-3 py-1 text-xs font-medium ${filter === k ? 'border-[#1a2844] bg-[#1a2844] text-white' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}>{l}</button>
        ))}
      </div>

      {actionError && <Card className="border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700">{actionError}</Card>}

      {list.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="mb-2 text-4xl">📦</div>
          <div className="font-semibold text-gray-600">{packages.length === 0 ? 'Chưa có gói huấn luyện nào' : 'Không có gói nào ở bộ lọc này'}</div>
          {packages.length === 0 && <div className="mt-3"><Btn variant="gold" onClick={() => setEditing('new')}>+ Tạo gói đầu tiên</Btn></div>}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map(p => (
            <Card key={p.id} className={`p-5 ${p.active ? '' : 'opacity-70'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <IdChip kind="PKG" id={p.id} />
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${p.active ? 'border-emerald-200 bg-emerald-100 text-emerald-800' : 'border-gray-200 bg-gray-100 text-gray-500'}`}>{p.active ? 'Đang áp dụng' : 'Đã tắt'}</span>
                    {p.popular && <span className="rounded-full bg-[#c9973b]/15 px-2 py-0.5 text-xs font-medium text-[#8a6420]">Phổ biến</span>}
                  </div>
                  <h3 className="font-serif text-lg font-bold text-[#0f1729]">{p.name}</h3>
                </div>
                <div className="text-right">
                  <div className="font-serif text-xl font-bold text-[#c9973b]">{money(p.price)}</div>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-600">{p.description || 'Chưa có mô tả'}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-gray-50 p-2"><div className="text-gray-500">Số buổi</div><div className="font-mono text-sm font-bold">{p.sessions}</div></div>
                <div className="rounded-lg bg-gray-50 p-2"><div className="text-gray-500">Thời hạn</div><div className="font-mono text-sm font-bold">{p.durationDays} ngày</div></div>
                <div className="rounded-lg bg-gray-50 p-2"><div className="text-gray-500">Đã đăng ký</div><div className="font-mono text-sm font-bold">{usage(p.id)}</div></div>
              </div>
              <div className="mt-4 flex gap-2">
                <Btn size="sm" variant="secondary" onClick={() => { setEditing(p); setActionError(''); }}>Chỉnh sửa</Btn>
                {p.active
                  ? <Btn size="sm" variant="danger" onClick={() => setConfirmOff(p)}>Tắt áp dụng</Btn>
                  : <Btn size="sm" variant="gold" onClick={() => { const r = onToggle(p.id, true); setActionError(r.ok ? '' : r.message); }}>Bật áp dụng</Btn>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && <PackageForm pkg={editing === 'new' ? null : editing} others={packages} onSave={onSave} onClose={() => setEditing(null)} />}

      {confirmOff && (
        <Modal title="Tắt áp dụng gói?" onClose={() => setConfirmOff(null)}>
          <p className="text-sm text-gray-600">Gói <strong>{confirmOff.name}</strong> sẽ bị ẩn khỏi danh sách đăng ký của chủ ngựa. Các gói đã đăng ký vẫn tiếp tục bình thường{usage(confirmOff.id) > 0 ? ` (${usage(confirmOff.id)} đăng ký hiện có)` : ''}.</p>
          <div className="mt-5 flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setConfirmOff(null)}>Hủy</Btn>
            <Btn variant="danger" onClick={() => { const r = onToggle(confirmOff.id, false); setActionError(r.ok ? '' : r.message); setConfirmOff(null); }}>Xác nhận tắt</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PackageForm({ pkg, others, onSave, onClose }: { pkg: TrainingPackage | null; others: TrainingPackage[]; onSave: (d: PackageDraft) => Res<TrainingPackage>; onClose: () => void }) {
  const [f, setF] = useState({ name: pkg?.name ?? '', description: pkg?.description ?? '', sessions: String(pkg?.sessions ?? ''), durationDays: String(pkg?.durationDays ?? ''), price: String(pkg?.price ?? '') });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const set = (k: keyof typeof f) => (v: string) => { setF(p => ({ ...p, [k]: v })); setErrs(e => ({ ...e, [k]: '' })); setSubmitError(''); };
  const num = (s: string) => (s.trim() === '' || !/^-?\d+$/.test(s.trim()) ? NaN : Number(s.trim()));

  const submit = () => {
    const draft: PackageDraft = { id: pkg?.id, name: f.name, description: f.description, sessions: num(f.sessions), durationDays: num(f.durationDays), price: num(f.price) };
    const e = validatePackage(draft, others);
    setErrs(e);
    if (Object.keys(e).length) return;
    const r = onSave(draft);
    if (!r.ok) { setSubmitError(r.message); return; }
    onClose();
  };

  return (
    <Modal title={pkg ? 'Chỉnh sửa gói huấn luyện' : 'Tạo gói huấn luyện'} onClose={onClose} wide>
      <div className="space-y-4">
        {pkg && <div className="flex items-center gap-2 text-sm text-gray-500">Mã gói: <IdChip kind="PKG" id={pkg.id} /><span className="text-xs">(chỉ đọc)</span></div>}
        <Input label="Tên gói" required value={f.name} onChange={set('name')} maxLength={60} placeholder="VD: Hiệu suất" hint="3–60 ký tự, không trùng tên gói khác" error={errs.name} />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Mô tả</label>
          <textarea value={f.description} onChange={e => set('description')(e.target.value)} rows={3} className={`w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b] ${errs.description ? 'border-red-400 bg-red-50/40' : 'border-gray-300'}`} placeholder="Nội dung chính của gói" />
          <div className="flex justify-between text-xs"><span className="text-red-600">{errs.description}</span><span className="text-gray-400">{f.description.length}/300</span></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Số buổi tập" required type="number" value={f.sessions} onChange={set('sessions')} hint="Từ 1 đến 200 buổi" error={errs.sessions} />
          <Input label="Thời hạn (ngày)" required type="number" value={f.durationDays} onChange={set('durationDays')} hint="Từ 7 đến 365 ngày" error={errs.durationDays} />
        </div>
        <Input label="Giá (VND)" required type="number" value={f.price} onChange={set('price')} hint={Number.isFinite(num(f.price)) && num(f.price) > 0 ? `= ${money(num(f.price))}` : 'Số nguyên lớn hơn 0'} error={errs.price} />
        {submitError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{submitError}</div>}
        <div className="flex justify-end gap-2 pt-1">
          <Btn variant="secondary" onClick={onClose}>Hủy</Btn>
          <Btn variant="gold" onClick={submit}>{pkg ? 'Lưu thay đổi' : 'Tạo gói'}</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ── Phân công huấn luyện viên (Quản lý) ──────────────────────────────────────

interface AssignProps {
  user: AppUser;
  users: AppUser[];
  horses: Horse[];
  enrollments: Enrollment[];
  onAssign: (enrId: string, trainerId: string, reason: string) => Res<Enrollment>;
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

  const trainers = users.filter(u => u.role === 'head_trainer' && u.clubId === user.clubId && u.status === 'active');
  const myEnr = enrollments.filter(e => isCurrent(e) && horses.some(h => h.id === e.horseId && h.clubId === user.clubId));
  const count = (s: Enrollment['trainerStatus']) => myEnr.filter(e => e.trainerStatus === s).length;
  const rows = myEnr.filter(e => tab === 'all' || e.trainerStatus === tab);
  const load = (id: string) => myEnr.filter(e => e.trainerId === id).length;
  const replacing = !!dlg && dlg.trainerStatus !== 'unassigned' && !!dlg.trainerId;

  const open = (e: Enrollment) => { setDlg(e); setTrainerId(''); setTrainerSearch(''); setReason(''); setErr(''); };
  const submit = () => {
    if (!dlg) return;
    if (!trainerId) { setErr('Vui lòng chọn huấn luyện viên.'); return; }
    if (replacing && reason.trim().length < 10) { setErr('Lý do thay thế phải có ít nhất 10 ký tự.'); return; }
    if (reason.length > 300) { setErr('Lý do tối đa 300 ký tự.'); return; }
    const r = onAssign(dlg.id, trainerId, reason);
    if (!r.ok) { setErr(r.message); return; }
    setFlash(`Đã ${replacing ? 'thay thế' : 'phân công'} huấn luyện viên cho gói ${dlg.id}.`);
    setDlg(null);
  };

  const tabs: { k: typeof tab; l: string; n: number }[] = [
    { k: 'unassigned', l: 'Chờ phân công', n: count('unassigned') },
    { k: 'pending', l: 'Chờ HLV xác nhận', n: count('pending') },
    { k: 'confirmed', l: 'Đã xác nhận', n: count('confirmed') },
    { k: 'all', l: 'Tất cả', n: myEnr.length },
  ];

  return (
    <div className="max-w-5xl space-y-5">
      <div>
        <h2 className="font-serif text-xl font-bold text-[#0f1729]">Phân công huấn luyện viên</h2>
        <p className="text-sm text-gray-500">Sau khi chủ ngựa thanh toán, bạn chọn huấn luyện viên · Huấn luyện viên xác nhận hoặc từ chối</p>
      </div>
      <div className="flex gap-0 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-all ${tab === t.k ? 'border-[#c9973b] text-[#c9973b]' : 'border-transparent text-gray-500 hover:text-[#0f1729]'}`}>
            {t.l} <span className="ml-1 rounded-full bg-gray-100 px-1.5 text-xs text-gray-600">{t.n}</span>
          </button>
        ))}
      </div>
      {flash && <Card className="flex items-center justify-between border-l-4 border-emerald-500 bg-emerald-50 p-3 text-sm text-emerald-800"><span>{flash}</span><button onClick={() => setFlash('')} className="text-emerald-600">✕</button></Card>}

      {trainers.length === 0 && <Card className="border-l-4 border-amber-400 bg-amber-50 p-4 text-sm text-amber-800">Trung tâm chưa có huấn luyện viên đang hoạt động để phân công.</Card>}

      {rows.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="mb-2 text-4xl">🧑‍🏫</div>
          <div className="font-semibold text-gray-600">{tab === 'unassigned' ? 'Không có gói nào đang chờ phân công' : 'Không có gói nào ở mục này'}</div>
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
                <div className="mt-1 text-sm text-gray-600">Chủ ngựa: {e.ownerName} · Gói {e.packageName} · {e.sessionsTotal} buổi · Hạn {e.expiresAt} (còn {Math.max(0, daysLeft(e))} ngày)</div>
                <div className="mt-0.5 text-sm text-gray-500">Huấn luyện viên: {e.trainerName || <span className="italic text-gray-400">chưa phân công</span>}</div>
                {hist && (
                  <div className="mt-3 space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
                    {e.assignHistory.length === 0 && <div className="text-xs text-gray-400">Chưa có lịch sử phân công.</div>}
                    {e.assignHistory.map((a, i) => (
                      <div key={i} className="text-xs text-gray-600">
                        <span className="font-mono text-gray-400">{a.time}</span> · <strong>{{ assign: 'Phân công', replace: 'Thay thế', confirm: 'Xác nhận', decline: 'Từ chối' }[a.kind]}</strong>
                        {a.from ? ` ${a.from} → ${a.to}` : ` ${a.to}`} · bởi {a.by}{a.reason ? ` — ${a.reason}` : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                {e.trainerStatus === 'unassigned'
                  ? <Btn size="sm" variant="gold" disabled={trainers.length === 0} onClick={() => open(e)}>Phân công</Btn>
                  : <Btn size="sm" variant="secondary" disabled={trainers.length < 2} onClick={() => open(e)}>Thay thế</Btn>}
                <Btn size="sm" variant="ghost" onClick={() => setOpenHistory(hist ? null : e.id)}>{hist ? 'Ẩn lịch sử' : 'Lịch sử'}</Btn>
              </div>
            </div>
          </Card>
        );
      })}

      {dlg && (
        <Modal title={replacing ? 'Thay thế huấn luyện viên' : 'Phân công huấn luyện viên'} onClose={() => setDlg(null)}>
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
              <div className="flex items-center gap-2"><strong>{horses.find(x => x.id === dlg.horseId)?.name}</strong><IdChip kind="ENR" id={dlg.id} /></div>
              <div className="mt-0.5">Gói {dlg.packageName}{replacing ? ` · Hiện tại: ${dlg.trainerName}` : ''}</div>
            </div>
            <Select label="Huấn luyện viên" required value={trainerId} onChange={v => { setTrainerId(v); setErr(''); }}
              options={[{ value: '', label: '— Chọn huấn luyện viên —' }, ...trainers.filter(t => t.id !== dlg.trainerId || !replacing).map(t => ({ value: t.id, label: `${t.name} (${load(t.id)} gói đang phụ trách)` }))]}
              hint={replacing ? 'Chọn người thay thế' : 'Huấn luyện viên sẽ nhận thông báo và phải xác nhận'} />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Search trainers directly</label>
              <input value={trainerSearch} onChange={e => setTrainerSearch(e.target.value)} placeholder="Search by trainer name or ID…" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b]" />
              {trainerSearch && <div className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1">
                {trainers.filter(t => (t.id !== dlg.trainerId || !replacing) && `${t.name} ${t.id}`.toLowerCase().includes(trainerSearch.toLowerCase())).map(t =>
                  <button key={t.id} type="button" onClick={() => { setTrainerId(t.id); setTrainerSearch(t.name); setErr(''); }} className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-amber-50"><span className="font-medium">{t.name}</span><span className="text-xs text-gray-400">{t.id} · {load(t.id)} active</span></button>)}
              </div>}
            </div>
            {replacing && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Lý do thay thế <span className="text-red-500">*</span></label>
                <textarea value={reason} onChange={e => { setReason(e.target.value); setErr(''); }} rows={3} maxLength={300} className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b]" placeholder="Nêu rõ lý do — được lưu vào lịch sử và nhật ký" />
                <div className="text-right text-xs text-gray-400">{reason.length}/300 · tối thiểu 10 ký tự</div>
              </div>
            )}
            {err && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}
            <div className="flex justify-end gap-2">
              <Btn variant="secondary" onClick={() => setDlg(null)}>Hủy</Btn>
              <Btn variant="gold" onClick={submit}>{replacing ? 'Xác nhận thay thế' : 'Xác nhận phân công'}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
