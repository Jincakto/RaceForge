import React, { useMemo, useState } from 'react';
import type { AppUser, Club, Role } from './data';
import { Badge, Btn, Card, Input, Select, Textarea } from './ui';

// ── Identifiers ───────────────────────────────────────────────────────────────

export type IdKind = 'HRS' | 'USR' | 'MED' | 'PKG' | 'ENR' | 'PLN' | 'SES' | 'RCE';

export function dispId(kind: IdKind, raw: string): string {
  if (/^[A-Z]+-\d+$/.test(raw)) return raw;
  const digits = (raw.match(/\d+/g) || ['0']).join('');
  return `${kind}-${digits.slice(-6).padStart(6, '0')}`;
}

export function IdChip({ kind, id, className = '' }: { kind: IdKind; id: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const code = dispId(kind, id);
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 pl-2 pr-1 py-0.5 font-mono text-[11px] text-gray-700 ${className}`} title="Identification Code — read only">
      {code}
      <button
        type="button"
        aria-label={`Copy ${code}`}
        onClick={e => { e.stopPropagation(); navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
        className="rounded px-1 text-[10px] text-gray-400 hover:bg-gray-200 hover:text-gray-700"
      >{copied ? '✓' : '⧉'}</button>
    </span>
  );
}

export const GENDER_LABEL: Record<string, string> = { Male: 'Male', Female: 'Female', MALE: 'Male', FEMALE: 'Female', Stallion: 'Male', Mare: 'Female', Gelding: 'Male', Đực: 'Male', Cái: 'Female', 'Đực thiến': 'Male' };

// ── Audit log ─────────────────────────────────────────────────────────────────

export interface AuditEntry { id: string; time: string; actor: string; actorRole: string; action: string; target: string; reason?: string }

// ── Role metadata ─────────────────────────────────────────────────────────────

export const ROLE_NAME: Record<Role, string> = {
  admin: 'Administrator', manager: 'Club Manager', head_trainer: 'Trainer',
  veterinarian: 'Veterinarian', groom: 'Groom', owner: 'Horse Owner',
};
const STAFF_ROLES: Role[] = ['manager', 'head_trainer', 'veterinarian', 'groom'];
const MATRIX_ROLES: Role[] = ['manager', 'head_trainer', 'veterinarian', 'groom', 'owner'];

export const FEATURES: { page: string; label: string; icon: string; group: string }[] = [
  { page: 'horse-list', label: 'View club horses', icon: '🐎', group: 'Horses' },
  { page: 'my-horses', label: 'My horses', icon: '🐎', group: 'Horses' },
  { page: 'horse-create', label: 'Register a new horse', icon: '➕', group: 'Horses' },
  { page: 'center-requests', label: 'Horse intake', icon: '📋', group: 'Horses' },
  { page: 'health-records', label: 'Medical records', icon: '🏥', group: 'Veterinary' },
  { page: 'vet-health-form', label: 'Create medical record', icon: '📝', group: 'Veterinary' },
  { page: 'vet-assign', label: 'Veterinarian assignments', icon: '🧑‍⚕️', group: 'Veterinary' },
  { page: 'post-exam', label: 'Post-training exams & locks', icon: '🩺', group: 'Veterinary' },
  { page: 'rehab-center', label: 'Rehabilitation packages', icon: '🩹', group: 'Veterinary' },
  { page: 'training-register', label: 'Training package registration', icon: '🎯', group: 'Training' },
  { page: 'package-catalog', label: 'Training package catalogue', icon: '📦', group: 'Training' },
  { page: 'trainer-assign', label: 'Trainer assignments', icon: '🧑‍🏫', group: 'Training' },
  { page: 'training-hub', label: 'Training & plans', icon: '📋', group: 'Training' },
  { page: 'performance', label: 'Performance', icon: '📈', group: 'Training' },
  { page: 'race-results', label: 'Race results', icon: '🏆', group: 'Training' },
  { page: 'care-hub', label: 'Care & stables', icon: '🌿', group: 'Care' },
  { page: 'inventory', label: 'Inventory', icon: '📦', group: 'Care' },
  { page: 'staff', label: 'Club staff', icon: '👥', group: 'Administration' },
  { page: 'reports', label: 'Reports', icon: '📊', group: 'Administration' },
];

// ── Shared dialogs ────────────────────────────────────────────────────────────

export function Modal({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1729]/60 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} className={`w-full ${wide ? 'max-w-xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="font-serif text-lg font-bold text-[#0f1729]">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function ReasonDialog({ title, description, confirmLabel, danger = false, onConfirm, onClose }:
  { title: string; description: React.ReactNode; confirmLabel: string; danger?: boolean; onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const submit = () => {
    const r = reason.trim();
    if (r.length < 10) { setErr('The reason must contain at least 10 characters.'); return; }
    if (r.length > 300) { setErr('The reason cannot exceed 300 characters.'); return; }
    onConfirm(r);
  };
  return (
    <Modal title={title} onClose={onClose}>
      <div className="mb-4 text-sm text-gray-600">{description}</div>
      <label className="mb-1 block text-sm font-medium text-gray-700">Reason <span className="text-red-500">*</span></label>
      <Textarea value={reason} onChange={v => { setReason(v); setErr(''); }} placeholder="Provide a clear reason — it will be recorded in the audit log" />
      <div className="mt-0.5 flex justify-between text-xs"><span className="text-red-600">{err}</span><span className="text-gray-400">{reason.length}/300</span></div>
      <div className="mt-5 flex justify-end gap-2">
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn variant={danger ? 'danger' : 'primary'} onClick={submit}>{confirmLabel}</Btn>
      </div>
    </Modal>
  );
}

function Field({ label, error, required, hint, children }: { label: string; error?: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}{required && <span className="ml-0.5 text-red-500">*</span>}</label>
      {children}
      {error ? <p className="mt-0.5 text-xs text-red-600">{error}</p> : hint ? <p className="mt-0.5 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

export function NoPermission({ text = 'Bạn không có quyền truy cập chức năng này.' }: { text?: string }) {
  return (
    <Card className="mx-auto mt-10 max-w-md p-10 text-center">
      <div className="mb-3 text-4xl">🔒</div>
      <h3 className="font-serif text-lg font-bold text-[#0f1729]">Không có quyền truy cập</h3>
      <p className="mt-1 text-sm text-gray-500">{text}</p>
      <p className="mt-3 text-xs text-gray-400">Liên hệ Quản trị viên nếu bạn cho rằng đây là nhầm lẫn.</p>
    </Card>
  );
}

// ── Admin dashboard ───────────────────────────────────────────────────────────

export function AdminDashboard({ users, audit, navigate, dataAvailable = true }: { users: AppUser[]; audit: AuditEntry[]; navigate: (p: any) => void; dataAvailable?: boolean }) {
  const count = (r: Role) => users.filter(u => u.role === r).length;
  const locked = users.filter(u => u.locked).length;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-xl font-bold text-[#0f1729]">Quản trị hệ thống</h2>
        <p className="text-sm text-gray-500">Tài khoản, phân quyền và nhật ký thay đổi.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { l: 'Tổng tài khoản', v: users.length }, { l: 'Nhân sự CLB', v: STAFF_ROLES.reduce((a, r) => a + count(r), 0) },
          { l: 'Chủ ngựa', v: count('owner') }, { l: 'Đang bị khóa', v: locked },
        ].map(s => (
          <Card key={s.l} className="p-5"><div className="text-xs font-medium uppercase tracking-wider text-gray-500">{s.l}</div><div className="mt-1 font-serif text-3xl font-bold text-[#1a2844]">{dataAvailable ? s.v : '—'}</div></Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {[
          { p: 'accounts', t: 'Quản lý tài khoản', d: 'Create staff accounts, lock or unlock access, and reset passwords.' },
          { p: 'permissions', t: 'Phân quyền', d: 'Ma trận vai trò × chức năng, bật/tắt quyền có ghi lý do.' },
          { p: 'audit-log', t: 'Nhật ký thay đổi', d: 'Ai, lúc nào, làm gì — toàn bộ thao tác nhạy cảm.' },
        ].map(c => (
          <Card key={c.p} onClick={() => navigate(c.p)} className="p-5"><div className="font-semibold text-[#0f1729]">{c.t}</div><p className="mt-1 text-sm text-gray-500">{c.d}</p></Card>
        ))}
      </div>
      <Card className="p-5">
        <h3 className="mb-3 font-semibold text-[#0f1729]">Hoạt động gần đây</h3>
        {audit.slice(0, 5).map(a => (
          <div key={a.id} className="flex items-baseline gap-3 border-b border-gray-100 py-2 text-sm last:border-0">
            <span className="w-32 shrink-0 font-mono text-xs text-gray-400">{a.time}</span>
            <span><b>{a.actor}</b> {a.action} <span className="text-gray-500">{a.target}</span></span>
          </div>
        ))}
        {audit.length === 0 && <p className="text-sm text-gray-400">{dataAvailable ? 'Chưa có hoạt động nào.' : 'Waiting for access to the admin audit API.'}</p>}
      </Card>
    </div>
  );
}

// ── AccountManagementPage ─────────────────────────────────────────────────────

type AccountDialog =
  | { kind: 'lock'; user: AppUser }
  | { kind: 'reset'; user: AppUser }
  | null;

const PAGE_SIZE = 8;

export function AccountManagementPage({ actor, users, clubs, onCreate, onToggleLock, onResetPassword, readOnly = false }: {
  actor: AppUser; users: AppUser[]; clubs: Club[];
  onCreate: (u: AppUser) => void;
  onToggleLock: (id: string, reason: string) => void;
  onResetPassword: (id: string, reason: string) => string;
  readOnly?: boolean;
}) {
  const [q, setQ] = useState('');
  const [roleF, setRoleF] = useState('all');
  const [statusF, setStatusF] = useState('all');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [dialog, setDialog] = useState<AccountDialog>(null);
  const [newPwd, setNewPwd] = useState<{ name: string; pwd: string } | null>(null);

  const filtered = useMemo(() => users.filter(u => {
    const s = q.trim().toLowerCase();
    const okQ = !s || u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || dispId('USR', u.id).toLowerCase().includes(s);
    const okR = roleF === 'all' || u.role === roleF;
    const okS = statusF === 'all' || (statusF === 'locked' ? !!u.locked : !u.locked);
    return okQ && okR && okS;
  }), [users, q, roleF, statusF]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const rows = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div><h2 className="font-serif text-xl font-bold text-[#0f1729]">Quản lý tài khoản</h2><p className="text-sm text-gray-500">{readOnly ? 'Account directory — waiting for Admin API' : `${filtered.length} tài khoản · Chủ ngựa tự đăng ký công khai; nhân sự do Admin tạo.`}</p></div>
        <Btn disabled={readOnly} onClick={() => setShowCreate(true)}>{readOnly ? 'Create staff account — waiting for API' : '+ Tạo tài khoản nhân sự'}</Btn>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search by account name or ID…" aria-label="Search accounts by name or ID" className="w-72 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b]" />
        <div className="w-48"><Select value={roleF} onChange={v => { setRoleF(v); setPage(1); }} options={[{ value: 'all', label: 'Mọi vai trò' }, ...(Object.keys(ROLE_NAME) as Role[]).map(r => ({ value: r, label: ROLE_NAME[r] }))]} /></div>
        <div className="w-40"><Select value={statusF} onChange={v => { setStatusF(v); setPage(1); }} options={[{ value: 'all', label: 'Mọi trạng thái' }, { value: 'active', label: 'Đang hoạt động' }, { value: 'locked', label: 'Đã khóa' }]} /></div>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 bg-gray-50">{['Mã', 'Người dùng', 'Vai trò', 'Trung tâm', 'Trạng thái', 'Thao tác'].map(h => <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map(u => {
              const club = clubs.find(c => c.id === u.clubId);
              const self = u.id === actor.id;
              return (
                <tr key={u.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-5 py-3"><IdChip kind="USR" id={u.id} /></td>
                  <td className="px-5 py-3"><div className="font-medium text-[#0f1729]">{u.name}</div><div className="text-xs text-gray-500">{u.email}</div></td>
                  <td className="px-5 py-3">{u.role ? <Badge status={u.role} /> : <span className="text-xs text-gray-400">Chưa có vai trò</span>}</td>
                  <td className="px-5 py-3 text-xs text-gray-600">{club?.name || '—'}</td>
                  <td className="px-5 py-3">{u.locked ? <span className="rounded-full border border-red-200 bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Đã khóa</span> : <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">Hoạt động</span>}</td>
                  <td className="px-5 py-3">
                    {self ? <span className="text-xs text-gray-400">Tài khoản của bạn</span> : (
                      <div className="flex flex-wrap gap-1.5">
                        <Btn disabled={readOnly} size="sm" variant="secondary" onClick={() => setDialog({ kind: 'reset', user: u })}>Đặt lại MK</Btn>
                        <Btn disabled={readOnly} size="sm" variant={u.locked ? 'secondary' : 'danger'} onClick={() => setDialog({ kind: 'lock', user: u })}>{u.locked ? 'Mở khóa' : 'Khóa'}</Btn>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400">{readOnly ? 'Waiting for access to the Admin account directory API.' : 'Không có tài khoản phù hợp với bộ lọc.'}</td></tr>}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
          <span>Trang {cur}/{pages}</span>
          <div className="flex gap-2"><Btn size="sm" variant="secondary" disabled={cur <= 1} onClick={() => setPage(cur - 1)}>← Trước</Btn><Btn size="sm" variant="secondary" disabled={cur >= pages} onClick={() => setPage(cur + 1)}>Sau →</Btn></div>
        </div>
      </Card>

      {showCreate && <CreateAccountModal users={users} clubs={clubs} onClose={() => setShowCreate(false)} onCreate={u => { onCreate(u); setShowCreate(false); setNewPwd({ name: u.name, pwd: u.password }); }} />}

      {dialog?.kind === 'lock' && (
        <ReasonDialog title={dialog.user.locked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'} danger={!dialog.user.locked} confirmLabel={dialog.user.locked ? 'Mở khóa' : 'Khóa tài khoản'} onClose={() => setDialog(null)}
          description={<p>{dialog.user.locked ? 'Người dùng sẽ đăng nhập lại được.' : 'Người dùng sẽ không thể đăng nhập cho đến khi được mở khóa.'} Tài khoản: <b>{dialog.user.name}</b>.</p>}
          onConfirm={reason => { onToggleLock(dialog.user.id, reason); setDialog(null); }} />
      )}
      {dialog?.kind === 'reset' && (
        <ReasonDialog title="Đặt lại mật khẩu" confirmLabel="Đặt lại" onClose={() => setDialog(null)}
          description={<p>Hệ thống sinh mật khẩu tạm thời cho <b>{dialog.user.name}</b>. Hãy chuyển cho người dùng qua kênh an toàn.</p>}
          onConfirm={reason => { const pwd = onResetPassword(dialog.user.id, reason); setNewPwd({ name: dialog.user.name, pwd }); setDialog(null); }} />
      )}
      {newPwd && (
        <Modal title="Mật khẩu tạm thời" onClose={() => setNewPwd(null)}>
          <p className="text-sm text-gray-600">Mật khẩu của <b>{newPwd.name}</b> — chỉ hiển thị một lần:</p>
          <div className="my-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 font-mono text-lg tracking-wider text-[#1a2844]">{newPwd.pwd}<Btn size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(newPwd.pwd)}>Sao chép</Btn></div>
          <div className="flex justify-end"><Btn onClick={() => setNewPwd(null)}>Đã ghi lại</Btn></div>
        </Modal>
      )}
    </div>
  );
}

function genPassword() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => c[Math.floor(Math.random() * c.length)]).join('');
}

function CreateAccountModal({ users, clubs, onCreate, onClose }: { users: AppUser[]; clubs: Club[]; onCreate: (u: AppUser) => void; onClose: () => void }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', role: 'veterinarian' as Role, clubId: clubs[0]?.id || '', password: genPassword() });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: string) => (v: string) => { setF(p => ({ ...p, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const submit = () => {
    const e: Record<string, string> = {};
    const name = f.name.trim();
    if (!name) e.name = 'Vui lòng nhập họ tên.'; else if (name.length < 2 || name.length > 60) e.name = 'Họ tên từ 2 đến 60 ký tự.';
    if (!f.email.trim()) e.email = 'Vui lòng nhập email.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = 'Email không hợp lệ (ví dụ: ten@raceforce.vn).';
    else if (users.some(u => u.email.toLowerCase() === f.email.trim().toLowerCase())) e.email = 'Email này đã được sử dụng.';
    if (f.phone && !/^0\d{9}$/.test(f.phone.replace(/\s/g, ''))) e.phone = 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.';
    if (!f.clubId) e.clubId = 'Vui lòng chọn trung tâm.';
    if (f.password.length < 8) e.password = 'Mật khẩu tối thiểu 8 ký tự.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const initials = name.split(/\s+/).map(w => w[0]).slice(-2).join('').toUpperCase();
    onCreate({ id: `u${Date.now()}`, name, email: f.email.trim().toLowerCase(), password: f.password, avatar: initials, role: f.role, clubId: f.clubId, status: 'active', phone: f.phone, verified: true, mustChangePassword: true });
  };

  return (
    <Modal title="Tạo tài khoản nhân sự" onClose={onClose} wide>
      <div className="space-y-4">
        <Field label="Họ và tên" required error={errors.name}><Input value={f.name} onChange={set('name')} placeholder="Nguyễn Văn A" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" required error={errors.email}><Input value={f.email} onChange={set('email')} placeholder="ten@raceforce.vn" /></Field>
          <Field label="Số điện thoại" error={errors.phone}><Input value={f.phone} onChange={set('phone')} placeholder="0912345678" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Vai trò" required><Select value={f.role} onChange={set('role')} options={STAFF_ROLES.map(r => ({ value: r, label: ROLE_NAME[r] }))} /></Field>
          <Field label="Trung tâm" required error={errors.clubId}><Select value={f.clubId} onChange={set('clubId')} options={clubs.map(c => ({ value: c.id, label: c.name }))} /></Field>
        </div>
        <Field label="Mật khẩu tạm thời" required error={errors.password} hint="Người dùng nên đổi mật khẩu ở lần đăng nhập đầu tiên.">
          <div className="flex gap-2"><div className="flex-1"><Input value={f.password} onChange={set('password')} /></div><Btn variant="secondary" onClick={() => set('password')(genPassword())}>Tạo lại</Btn></div>
        </Field>
      </div>
      <div className="mt-6 flex justify-end gap-2"><Btn variant="secondary" onClick={onClose}>Hủy</Btn><Btn onClick={submit}>Tạo tài khoản</Btn></div>
    </Modal>
  );
}

// ── PermissionMatrixPage ──────────────────────────────────────────────────────

export function PermissionMatrixPage({ rolePerms, audit, onToggle }: {
  rolePerms: Record<string, string[]>; audit: AuditEntry[];
  onToggle: (role: Role, page: string, on: boolean, reason: string) => void;
}) {
  const [pending, setPending] = useState<{ role: Role; page: string; on: boolean } | null>(null);
  const groups = Array.from(new Set(FEATURES.map(f => f.group)));
  const feat = pending && FEATURES.find(f => f.page === pending.page);
  const permLog = audit.filter(a => a.action.startsWith('Phân quyền')).slice(0, 6);
  return (
    <div className="space-y-5">
      <div><h2 className="font-serif text-xl font-bold text-[#0f1729]">Phân quyền</h2><p className="text-sm text-gray-500">Ma trận vai trò × chức năng. Mỗi thay đổi cần lý do và được ghi nhật ký. Menu của từng vai trò cập nhật ngay.</p></div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Chức năng</th>
              {MATRIX_ROLES.map(r => <th key={r} className="px-3 py-3 text-center text-xs font-semibold text-gray-500">{ROLE_NAME[r]}</th>)}
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500">Quản trị viên</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(g => (
              <React.Fragment key={g}>
                <tr><td colSpan={MATRIX_ROLES.length + 2} className="bg-[#1a2844]/5 px-5 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#1a2844]">{g}</td></tr>
                {FEATURES.filter(f => f.group === g).map(f => (
                  <tr key={f.page} className="border-b border-gray-100">
                    <td className="px-5 py-2.5">{f.icon} {f.label}</td>
                    {MATRIX_ROLES.map(r => {
                      const on = (rolePerms[r] || []).includes(f.page);
                      return (
                        <td key={r} className="px-3 py-2.5 text-center">
                          <button role="switch" aria-checked={on} aria-label={`${f.label} — ${ROLE_NAME[r]}`} onClick={() => setPending({ role: r, page: f.page, on: !on })}
                            className={`relative h-5 w-9 rounded-full transition-colors ${on ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-center text-xs text-gray-400">Toàn quyền</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </Card>
      <Card className="p-5">
        <h3 className="mb-3 font-semibold text-[#0f1729]">Thay đổi phân quyền gần đây</h3>
        {permLog.map(a => <div key={a.id} className="border-b border-gray-100 py-2 text-sm last:border-0"><span className="font-mono text-xs text-gray-400">{a.time}</span> · <b>{a.actor}</b> {a.action} <span className="text-gray-500">{a.target}</span>{a.reason && <span className="block text-xs italic text-gray-400">Lý do: {a.reason}</span>}</div>)}
        {permLog.length === 0 && <p className="text-sm text-gray-400">Chưa có thay đổi nào.</p>}
      </Card>
      {pending && feat && (
        <ReasonDialog title={pending.on ? 'Cấp quyền' : 'Thu hồi quyền'} danger={!pending.on} confirmLabel="Xác nhận" onClose={() => setPending(null)}
          description={<p>{pending.on ? 'Cấp' : 'Thu hồi'} quyền <b>{feat.label}</b> {pending.on ? 'cho' : 'của'} vai trò <b>{ROLE_NAME[pending.role]}</b>.</p>}
          onConfirm={reason => { onToggle(pending.role, pending.page, pending.on, reason); setPending(null); }} />
      )}
    </div>
  );
}

// ── AuditLogPage ──────────────────────────────────────────────────────────────

export function AuditLogPage({ audit }: { audit: AuditEntry[] }) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const list = audit.filter(a => !q.trim() || `${a.actor} ${a.action} ${a.target} ${a.reason || ''}`.toLowerCase().includes(q.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(list.length / 10));
  const cur = Math.min(page, pages);
  return (
    <div className="space-y-5">
      <div><h2 className="font-serif text-xl font-bold text-[#0f1729]">Nhật ký thay đổi</h2><p className="text-sm text-gray-500">{list.length} bản ghi · chỉ đọc</p></div>
      <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Tìm theo người thực hiện, hành động, đối tượng…" className="w-80 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b]" />
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 bg-gray-50">{['Thời gian', 'Người thực hiện', 'Hành động', 'Đối tượng', 'Lý do'].map(h => <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{h}</th>)}</tr></thead>
          <tbody>
            {list.slice((cur - 1) * 10, cur * 10).map(a => (
              <tr key={a.id} className="border-b border-gray-100 align-top last:border-0">
                <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-gray-500">{a.time}</td>
                <td className="px-5 py-3"><div className="font-medium">{a.actor}</div><div className="text-xs text-gray-400">{a.actorRole}</div></td>
                <td className="px-5 py-3">{a.action}</td>
                <td className="px-5 py-3 text-gray-600">{a.target}</td>
                <td className="px-5 py-3 text-xs italic text-gray-500">{a.reason || '—'}</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">Chưa có bản ghi nào.</td></tr>}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
          <span>Trang {cur}/{pages}</span>
          <div className="flex gap-2"><Btn size="sm" variant="secondary" disabled={cur <= 1} onClick={() => setPage(cur - 1)}>← Trước</Btn><Btn size="sm" variant="secondary" disabled={cur >= pages} onClick={() => setPage(cur + 1)}>Sau →</Btn></div>
        </div>
      </Card>
    </div>
  );
}
