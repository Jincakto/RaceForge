import { getBackendHealth, getOversightOverview, type OverviewMetrics } from "./api/oversightApi";
import { isEditableRolePermission, PAGE_PERMISSIONS, API_ENFORCED_CODES } from "./api/permissionApi";
import { listSystemAuditLogs, type AuditLogFilters, type AuditLogPageResult } from "./api/auditLogsApi";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { AppUser, Club, Role } from '../../shared/data/data';
import { Badge, Btn, Card, Input, Select, Textarea } from '../../shared/ui/ui';

// ── Identifiers ───────────────────────────────────────────────────────────────

export type IdKind = 'HRS' | 'USR' | 'MED' | 'PKG' | 'ENR' | 'PLN' | 'SES' | 'RCE';

export function dispId(kind: IdKind, raw: string): string {
  return raw || '—';
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

export const GENDER_LABEL: Record<string, string> = { Stallion: 'Male', Mare: 'Female', Gelding: 'Male', STALLION: 'Male', MARE: 'Female', GELDING: 'Male', Male: 'Male', Female: 'Female', MALE: 'Male', FEMALE: 'Female', Đực: 'Male', Cái: 'Female', 'Đực thiến': 'Male' };

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
  { page: 'post-exam', label: 'Health examination: pending exams, locks & protocols', icon: '🩺', group: 'Veterinary' },
  { page: 'training-register', label: 'Training package registration', icon: '🎯', group: 'Training' },
  { page: 'package-catalog', label: 'Training package catalogue', icon: '📦', group: 'Training' },
  { page: 'trainer-assign', label: 'Trainer assignments', icon: '🧑‍🏫', group: 'Training' },
  { page: 'training-hub', label: 'Training & plans', icon: '📋', group: 'Training' },
  { page: 'performance', label: 'Performance', icon: '📈', group: 'Training' },
  { page: 'care-hub', label: 'Care & stables', icon: '🌿', group: 'Care' },
  { page: 'inventory', label: 'Inventory', icon: '📦', group: 'Care' },
  { page: 'inventory-log', label: 'Inventory history', icon: '📜', group: 'Care' },
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
  { title: string; description: React.ReactNode; confirmLabel: string; danger?: boolean; onConfirm: (reason: string) => void | Promise<unknown>; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const inflight = useRef(false);
  const submit = async () => {
    if (inflight.current) return;
    const r = reason.trim();
    if (r.length < 10) { setErr('The reason must contain at least 10 characters.'); return; }
    if (r.length > 300) { setErr('The reason cannot exceed 300 characters.'); return; }
    inflight.current = true;
    setBusy(true);
    try { await onConfirm(r); }
    catch (e) { setErr((e as Error).message); }
    finally { inflight.current = false; setBusy(false); }
  };
  return (
    <Modal title={title} onClose={() => { if (!inflight.current) onClose(); }}>
      <div className="mb-4 text-sm text-gray-600">{description}</div>
      <label className="mb-1 block text-sm font-medium text-gray-700">Reason <span className="text-red-500">*</span></label>
      <Textarea value={reason} onChange={v => { setReason(v); setErr(''); }} placeholder="Provide a clear reason — it will be recorded in the audit log" />
      <div className="mt-0.5 flex justify-between text-xs"><span className="text-red-600">{err}</span><span className="text-gray-400">{reason.length}/300</span></div>
      <div className="mt-5 flex justify-end gap-2">
        <Btn variant="secondary" disabled={busy} onClick={onClose}>Cancel</Btn>
        <Btn variant={danger ? 'danger' : 'primary'} disabled={busy} onClick={submit}>{busy ? "Processing…" : confirmLabel}</Btn>
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

export function NoPermission({ text = "You do not have permission to access this feature." }: { text?: string }) {
  return (
    <Card className="mx-auto mt-10 max-w-md p-10 text-center">
      <div className="mb-3 text-4xl">🔒</div>
      <h3 className="font-serif text-lg font-bold text-[#0f1729]">Access denied</h3>
      <p className="mt-1 text-sm text-gray-500">{text}</p>
      <p className="mt-3 text-xs text-gray-400">Contact your administrator if you believe this is a mistake.</p>
    </Card>
  );
}

// ── Admin dashboard ───────────────────────────────────────────────────────────

export function AdminDashboard({ users, audit, navigate }: { users: AppUser[]; audit: AuditEntry[]; navigate: (p: any) => void }) {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [heartbeat, setHeartbeat] = useState('Checking…');
  const [metricError, setMetricError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let alive = true;
    setMetricError('');
    getBackendHealth().then(result => { if (alive) setHeartbeat(result.status === 'UP' ? 'UP' : result.status); })
      .catch(() => { if (alive) setHeartbeat('Unavailable'); });
    getOversightOverview().then(result => { if (alive) setMetrics(result); })
      .catch(err => { if (alive) { setMetrics(null); setMetricError((err as Error).message); } });
    return () => { alive = false; };
  }, [refresh]);

  const count = (r: Role) => users.filter(u => u.role === r).length;
  const locked = users.filter(u => u.locked).length;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-xl font-bold text-[#0f1729]">System administration</h2>
        <p className="text-sm text-gray-500">Accounts, permissions and change history.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { l: "Total accounts", v: users.length }, { l: "Club staff", v: STAFF_ROLES.reduce((a, r) => a + count(r), 0) },
          { l: "Horse Owner", v: count('owner') }, { l: "Locked accounts", v: locked },
        ].map(s => (
          <Card key={s.l} className="p-5"><div className="text-xs font-medium uppercase tracking-wider text-gray-500">{s.l}</div><div className="mt-1 font-serif text-3xl font-bold text-[#1a2844]">{s.v}</div></Card>
        ))}
      </div>
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h3 className="font-semibold text-[#0f1729]">Operational overview</h3><p className="text-xs text-slate-500">Counts retrieved directly from SQL Server, not placeholder values.</p><p className="mt-1 text-xs text-slate-500">Backend heartbeat: <strong>{heartbeat}</strong> · Database queries: <strong>{metrics ? 'Responding' : metricError ? 'Unavailable' : 'Checking…'}</strong>. Supabase/PayOS external status is not inferred.</p></div>
          <Btn variant="secondary" size="sm" onClick={() => setRefresh(v => v + 1)}>Refresh</Btn>
        </div>
        {metricError && <p role="alert" className="mt-3 text-sm text-red-700">Cannot load operational counts: {metricError}</p>}
        {metrics ? <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {([
            ['Horses', metrics.horses, 'admin-horses'],
            ['Admission in progress', metrics.awaitingAdmission, 'admin-horses'],
            ['Training-locked horses', metrics.lockedHorses, 'admin-horses'],
            ['Active paid packages', metrics.activePackages, 'package-registrations'],
            ['Completed packages', metrics.completedPackages, 'package-registrations'],
            ['Pending PayOS orders', metrics.pendingPayments, 'payment-monitor'],
            ['Paid but not applied', metrics.paidNotApplied, 'payment-monitor'],
          ] as [string, number, string][]).map(([label, count, page]) =>
            <button key={label} className="rounded-lg border border-slate-200 p-3 text-left hover:border-amber-400" onClick={() => navigate(page)}>
              <div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-2xl font-semibold">{count}</div>
            </button>)}
        </div> : !metricError && <p role="status" className="mt-3 text-sm text-slate-500">Loading operational metrics…</p>}
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        {[
          { p: 'accounts', t: "Account management", d: 'Create staff accounts and lock or unlock access.' },
          { p: 'permissions', t: "Permissions", d: "Role and feature permissions, with a reason recorded for each change." },
          { p: 'audit-log', t: "Audit log", d: "Who changed what and when — all sensitive operations." },
          { p: 'reports', t: "Revenue reports", d: "Read confirmed PayOS collections and export CSV." },
        ].map(c => (
          <Card key={c.p} onClick={() => navigate(c.p)} className="p-5"><div className="font-semibold text-[#0f1729]">{c.t}</div><p className="mt-1 text-sm text-gray-500">{c.d}</p></Card>
        ))}
      </div>
      <Card className="p-5">
        <h3 className="mb-3 font-semibold text-[#0f1729]">Recent activity</h3>
        {audit.slice(0, 5).map(a => (
          <div key={a.id} className="flex items-baseline gap-3 border-b border-gray-100 py-2 text-sm last:border-0">
            <span className="w-32 shrink-0 font-mono text-xs text-gray-400">{a.time}</span>
            <span><b>{a.actor}</b> {a.action} <span className="text-gray-500">{a.target}</span></span>
          </div>
        ))}
        {audit.length === 0 && <p className="text-sm text-gray-400">No activity yet.</p>}
      </Card>
    </div>
  );
}

// ── AccountManagementPage ─────────────────────────────────────────────────────

type AccountDialog =
  | { kind: 'lock'; user: AppUser }
  | null;

const PAGE_SIZE = 8;

export function AccountManagementPage({ actor, users, clubs, onCreate, onToggleLock, onResendInvitation }: {
  actor: AppUser; users: AppUser[]; clubs: Club[];
  onCreate: (u: AppUser) => Promise<unknown>;
  onToggleLock: (id: string, reason: string) => Promise<unknown>;
  onResendInvitation: (id: string) => Promise<unknown>;
}) {
  const [q, setQ] = useState('');
  const [roleF, setRoleF] = useState('all');
  const [statusF, setStatusF] = useState('all');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [dialog, setDialog] = useState<AccountDialog>(null);
  const [newPwd, setNewPwd] = useState<{ name: string; pwd: string } | null>(null);
  const [inviteBusy, setInviteBusy] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState('');

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
        <div><h2 className="font-serif text-xl font-bold text-[#0f1729]">Account management</h2><p className="text-sm text-gray-500">{filtered.length}  accounts · Horse owners register publicly; staff accounts are created by an administrator.</p></div>
        <Btn onClick={() => setShowCreate(true)}>+ Create account</Btn>
        {inviteError && <p role="alert" className="text-sm text-red-700">Invitation failed: {inviteError}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search by account name or ID…" aria-label="Search accounts by name or ID" className="w-72 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b]" />
        <div className="w-48"><Select value={roleF} onChange={v => { setRoleF(v); setPage(1); }} options={[{ value: 'all', label: "All roles" }, ...(Object.keys(ROLE_NAME) as Role[]).map(r => ({ value: r, label: ROLE_NAME[r] }))]} /></div>
        <div className="w-40"><Select value={statusF} onChange={v => { setStatusF(v); setPage(1); }} options={[{ value: 'all', label: "All statuses" }, { value: 'active', label: "Active" }, { value: 'locked', label: "Locked" }]} /></div>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 bg-gray-50">{["ID", "User", "Role", "Club", "Status", "Actions"].map(h => <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map(u => {
              const club = clubs.find(c => c.id === u.clubId);
              const self = u.id === actor.id;
              return (
                <tr key={u.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-5 py-3"><IdChip kind="USR" id={u.id} />{u.trainerProfileId && <div className="mt-1 text-xs text-gray-500">Profile: {u.trainerProfileId}</div>}</td>
                  <td className="px-5 py-3"><div className="font-medium text-[#0f1729]">{u.name}</div><div className="text-xs text-gray-500">{u.email}</div></td>
                  <td className="px-5 py-3">{u.role ? <Badge status={u.role} /> : <span className="text-xs text-gray-400">No role assigned</span>}</td>
                  <td className="px-5 py-3 text-xs text-gray-600">{club?.name || '—'}</td>
                  <td className="px-5 py-3">{u.locked ? <span className="rounded-full border border-red-200 bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Locked</span> : u.status === 'active' ? <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">Active</span> : <span className="rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">Invited / pending</span>}</td>
                  <td className="px-5 py-3">
                    {self ? <span className="text-xs text-gray-400">Your account</span> : (
                      <div className="flex flex-wrap gap-1.5">
                        {(u.status === 'active' || u.locked) && <Btn size="sm" variant={u.locked ? 'secondary' : 'danger'} onClick={() => setDialog({ kind: 'lock', user: u })}>{u.locked ? "Unlock" : "Lock"}</Btn>}
                        {u.role !== 'owner' && u.role !== 'admin' && u.status !== 'active' && !u.locked &&
                          <Btn size="sm" variant="secondary" disabled={inviteBusy !== null} onClick={async () => {
                            if (inviteBusy) return;
                            setInviteError(''); setInviteBusy(u.id);
                            try { await onResendInvitation(u.id); }
                            catch (err) { setInviteError((err as Error).message); }
                            finally { setInviteBusy(null); }
                          }}>{inviteBusy === u.id ? 'Sending…' : 'Resend invitation'}</Btn>}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400">No accounts match the filters.</td></tr>}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
          <span>Trang {cur}/{pages}</span>
          <div className="flex gap-2"><Btn size="sm" variant="secondary" disabled={cur <= 1} onClick={() => setPage(cur - 1)}>← Previous</Btn><Btn size="sm" variant="secondary" disabled={cur >= pages} onClick={() => setPage(cur + 1)}>Sau →</Btn></div>
        </div>
      </Card>

      {showCreate && <CreateAccountModal users={users} clubs={clubs} onClose={() => setShowCreate(false)} onCreate={async u => { await onCreate(u); setShowCreate(false); }} />}

      {dialog?.kind === 'lock' && (
        <ReasonDialog title={dialog.user.locked ? "Unlock account" : "Lock account"} danger={!dialog.user.locked} confirmLabel={dialog.user.locked ? "Unlock" : "Lock account"} onClose={() => setDialog(null)}
          description={<p>{dialog.user.locked ? "The user will be able to sign in again." : "The user cannot sign in until the account is unlocked."}  Account: <b>{dialog.user.name}</b>.</p>}
          onConfirm={async reason => { await onToggleLock(dialog.user.id, reason); setDialog(null); }} />
      )}
      {newPwd && (
        <Modal title="Temporary password" onClose={() => setNewPwd(null)}>
          <p className="text-sm text-gray-600">Password for <b>{newPwd.name}</b>  — shown once only:</p>
          <div className="my-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 font-mono text-lg tracking-wider text-[#1a2844]">{newPwd.pwd}<Btn size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(newPwd.pwd)}>Copy</Btn></div>
          <div className="flex justify-end"><Btn onClick={() => setNewPwd(null)}>Done</Btn></div>
        </Modal>
      )}
    </div>
  );
}

function genPassword() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => c[Math.floor(Math.random() * c.length)]).join('');
}

function CreateAccountModal({ users, clubs, onCreate, onClose }: { users: AppUser[]; clubs: Club[]; onCreate: (u: AppUser) => Promise<unknown>; onClose: () => void }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', role: 'veterinarian' as Role, clubId: clubs[0]?.id || '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const createFlight = useRef(false);
  const set = (k: string) => (v: string) => { setF(p => ({ ...p, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const submit = async () => {
    if (createFlight.current) return;
    const e: Record<string, string> = {};
    const name = f.name.trim();
    if (!name) e.name = "Enter a full name."; else if (name.length < 2 || name.length > 60) e.name = "Full name must contain 2–60 characters.";
    if (!f.email.trim()) e.email = "Enter an email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = "Enter a valid email address (e.g. name@raceforce.vn).";
    else if (users.some(u => u.email.toLowerCase() === f.email.trim().toLowerCase())) e.email = "This email address is already in use. For an unfinished Trainer profile, close this dialog and use Create trainer profile on the account row.";
    if (f.phone && !/^0\d{9}$/.test(f.phone.replace(/\s/g, ''))) e.phone = "Phone number must contain 10 digits and start with 0.";
    setErrors(e);
    if (Object.keys(e).length) return;
    const initials = name.split(/\s+/).map(w => w[0]).slice(-2).join('').toUpperCase();
    createFlight.current = true;
    setCreating(true);
    try { await onCreate({ id: `u${Date.now()}`, name, email: f.email.trim().toLowerCase(), password: f.password, avatar: initials, role: f.role, clubId: f.clubId, status: 'active', phone: f.phone, verified: false, mustChangePassword: false }); } catch (err) { setErrors({ email: (err as Error).message }); }
    finally { createFlight.current = false; setCreating(false); }
  };

  return (
    <Modal title="Create account" onClose={() => { if (!createFlight.current) onClose(); }} wide>
      <fieldset disabled={creating} className="space-y-4">
        <Field label="Full name" required error={errors.name}><Input value={f.name} onChange={set('name')} placeholder="Alex Smith" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" required error={errors.email}><Input value={f.email} onChange={set('email')} placeholder="ten@raceforce.vn" /></Field>
          <Field label="Phone number" error={errors.phone}><Input value={f.phone} onChange={set('phone')} placeholder="0912345678" /></Field>
        </div>
        <Field label="Role" required><Select value={f.role} onChange={set('role')} options={STAFF_ROLES.map(r => ({ value: r, label: ROLE_NAME[r] }))} /></Field>
        <Field label="Set password" hint="An invitation email will be sent. Staff set their own password using the email link.">
          <Input value="Send invitation email" onChange={() => {}} />
        </Field>
      </fieldset>
      <div className="mt-6 flex justify-end gap-2"><Btn variant="secondary" disabled={creating} onClick={onClose}>Cancel</Btn><Btn disabled={creating} onClick={submit}>{creating ? 'Creating...' : 'Create account'}</Btn></div>
    </Modal>
  );
}

// ── PermissionMatrixPage ──────────────────────────────────────────────────────

// Preserve the original grouped layout. Toggle codes are restricted to eligible
// roles. Some entries are UI-visibility only; their label makes that explicit.
// Backend checks still enforce role, ownership, and assignment restrictions.
type PermissionMatrixRow = { page: string; label: string; icon: string; group: string };
const MATRIX_ROWS: PermissionMatrixRow[] = [
  ...FEATURES,
  { page: 'training-read-access', label: 'Read training information', icon: '📖', group: 'Training' },
];
const MATRIX_GROUPS = Array.from(new Set(MATRIX_ROWS.map(row => row.group)));
const MATRIX_CODES = PAGE_PERMISSIONS;
const MATRIX_DESCRIPTIONS: Record<string, string> = {
  'trainer-assign': 'ASSIGN_TRAINER — assign or replace a trainer for an eligible paid package',
  'training-hub': 'MANAGE_TRAINING — manage training plans, schedules and results',
  'training-read-access': 'VIEW_TRAINING — still limited to authorized horses and packages',
  reports: 'VIEW_REPORTS — view confirmed PayOS revenue (Club Manager only)',
  'post-exam': 'Uses WRITE_MEDICAL_RECORD — the same permission as Health examination',
  'vet-assign': 'Manage veterinary assignments (Club Manager) or view assigned horses (Veterinarian)',
  'inventory-log': 'Uses VIEW_INVENTORY — the same permission as Inventory',
};

export function PermissionMatrixPage({ grants, audit, onToggle }: {
  grants?: Record<string, string[]>; audit: AuditEntry[];
  onToggle: (role: Role, code: string, on: boolean, reason: string) => Promise<unknown>;
}) {
  const [pending, setPending] = useState<{ role: Role; code: string; label: string; on: boolean } | null>(null);
  const permLog = audit.filter(a => a.action.startsWith('Permissions')).slice(0, 6);
  const loaded = grants !== undefined;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-xl font-bold text-[#0f1729]">Permissions</h2>
        <p className="mt-1 text-sm text-gray-500">
          Grouped by feature area. Active switches can grant/revoke a role's existing feature access,
          without bypassing ownership or assignment. Some features currently only control page visibility.
        </p>
      </div>
      {!loaded && (
        <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Permission data has not loaded. Refresh and check the backend connection before changing grants.
        </div>
      )}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span><span className="mr-1 text-emerald-600">●</span> API-enforced permission</span>
        <span><span className="mr-1 text-amber-600">●</span> Page visibility only (not API security)</span>
        <span><span className="mr-1 text-gray-400">—</span> Not grantable to this role</span>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Feature / permission</th>
              {MATRIX_ROLES.map(role => <th key={role} className="px-3 py-3 text-center text-xs font-semibold text-gray-500">{ROLE_NAME[role]}</th>)}
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500">Administrator</th>
            </tr>
          </thead>
          <tbody>
            {MATRIX_GROUPS.map(group => (
              <React.Fragment key={group}>
                <tr><td colSpan={MATRIX_ROLES.length + 2}
                  className="bg-[#1a2844]/5 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-[#1a2844]">{group}</td></tr>
                {MATRIX_ROWS.filter(row => row.group === group).map(row => (
                  <tr key={row.page} className="border-b border-gray-100 last:border-0">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-800">{row.icon} {row.label}</div>
                      {MATRIX_DESCRIPTIONS[row.page] &&
                        <div className="mt-1 max-w-lg text-xs text-gray-500">{MATRIX_DESCRIPTIONS[row.page]}</div>}
                      {Object.values(MATRIX_CODES[row.page] || {}).some(code => code && !API_ENFORCED_CODES.has(code)) &&
                        <div className="mt-1 text-xs text-amber-700">Visibility-only: this page has no independent backend action to enforce yet</div>}
                    </td>
                    {MATRIX_ROLES.map(role => {
                      const code = MATRIX_CODES[row.page]?.[role];
                      const editable = !!code && isEditableRolePermission(role, code);
                      const enabled = !!code && grants?.[role]?.includes(code) === true;
                      return (
                        <td key={role} className="px-3 py-3 text-center">
                          {editable && code ? (
                            <button type="button" role="switch" disabled={!loaded}
                              title={loaded ? code : 'Permission data unavailable'}
                              aria-checked={enabled} aria-label={`${row.label} — ${ROLE_NAME[role]}`}
                              onClick={() => setPending({ role, code, label: row.label, on: !enabled })}
                              className={`relative h-5 w-9 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${enabled ? 'left-[18px]' : 'left-0.5'}`} />
                            </button>
                          ) : <span title="Access is fixed by backend role and record rules" className="text-gray-400">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-center text-xs text-gray-400" title="Administrator access is governed by backend API policies, not delegated here">Policy</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-gray-500">
        Permissions only apply to eligible roles, with existing record-level checks still enforced.
        Amber visibility-only rows do not protect API calls; do not use them to grant access to sensitive records.
      </p>
      <Card className="p-5">
        <h3 className="mb-3 font-semibold text-[#0f1729]">Recent permission changes</h3>
        {permLog.map(a => <div key={a.id} className="border-b border-gray-100 py-2 text-sm last:border-0"><span className="font-mono text-xs text-gray-400">{a.time}</span> · <b>{a.actor}</b> {a.action} <span className="text-gray-500">{a.target}</span>{a.reason && <span className="block text-xs italic text-gray-400">Reason: {a.reason}</span>}</div>)}
        {permLog.length === 0 && <p className="text-sm text-gray-400">No changes yet.</p>}
      </Card>
      {pending && (
        <ReasonDialog title={pending.on ? 'Grant permission' : 'Revoke permission'} danger={!pending.on}
          confirmLabel="Confirm" onClose={() => setPending(null)}
          description={<p>{pending.on ? 'Grant' : 'Revoke'} <b>{pending.label}</b> ({pending.code}) for <b>{ROLE_NAME[pending.role]}</b>. A reason is required and recorded.</p>}
          onConfirm={async reason => { await onToggle(pending.role, pending.code, pending.on, reason); setPending(null); }} />
      )}
    </div>
  );
}

// ── AuditLogPage ──────────────────────────────────────────────────────────────

export function AuditLogPage() {
  const [inputs, setInputs] = useState<AuditLogFilters>({});
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<AuditLogPageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const invalidRange = !!inputs.from && !!inputs.to && inputs.from > inputs.to;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    listSystemAuditLogs(filters, page, 20)
      .then(data => { if (active) setResult(data); })
      .catch(e => { if (active) { setResult(null); setError((e as Error).message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, page, refresh]);

  const change = (key: keyof AuditLogFilters, value: string) =>
    setInputs(prev => ({ ...prev, [key]: value }));
  const apply = () => {
    if (invalidRange) return;
    setPage(0);
    setFilters({ ...inputs });
    setRefresh(v => v + 1);
  };
  const reset = () => { setInputs({}); setFilters({}); setPage(0); setRefresh(v => v + 1); };
  const pages = result?.totalPages || 0;
  const records = result?.content || [];
  const fieldClass = 'mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-xl font-bold text-[#0f1729]">System audit log</h2>
        <p className="text-sm text-gray-500">Read-only events stored in Audit_Log. Times are shown as stored in the database; this screen does not include the separate permission history.</p>
      </div>
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium text-gray-600">Search
            <input className={fieldClass} value={inputs.q || ''} onChange={e => change('q', e.target.value)} placeholder="Actor, action, entity, horse…" />
          </label>
          <label className="text-xs font-medium text-gray-600">Actor ID
            <input className={fieldClass} value={inputs.actorId || ''} onChange={e => change('actorId', e.target.value)} placeholder="USR-001" />
          </label>
          <label className="text-xs font-medium text-gray-600">Action contains
            <input className={fieldClass} value={inputs.action || ''} onChange={e => change('action', e.target.value)} placeholder="MEDICAL_RECORD" />
          </label>
          <label className="text-xs font-medium text-gray-600">Entity type
            <input className={fieldClass} value={inputs.entityType || ''} onChange={e => change('entityType', e.target.value)} placeholder="HORSE" />
          </label>
          <label className="text-xs font-medium text-gray-600">Entity ID
            <input className={fieldClass} value={inputs.entityId || ''} onChange={e => change('entityId', e.target.value)} placeholder="Record ID" />
          </label>
          <label className="text-xs font-medium text-gray-600">Horse ID
            <input className={fieldClass} value={inputs.horseId || ''} onChange={e => change('horseId', e.target.value)} placeholder="HOR-001" />
          </label>
          <label className="text-xs font-medium text-gray-600">Result
            <input className={fieldClass} value={inputs.result || ''} onChange={e => change('result', e.target.value)} placeholder="SUCCESS / FAILED" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-gray-600">From date
              <input type="date" className={fieldClass} value={inputs.from || ''} onChange={e => change('from', e.target.value)} />
            </label>
            <label className="text-xs font-medium text-gray-600">To date
              <input type="date" className={fieldClass} value={inputs.to || ''} onChange={e => change('to', e.target.value)} />
            </label>
          </div>
        </div>
        {invalidRange && <p role="alert" className="mt-2 text-sm text-red-700">End date cannot precede start date.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn onClick={apply} disabled={invalidRange || loading}>Apply filters</Btn>
          <Btn variant="secondary" onClick={reset} disabled={loading}>Reset filters</Btn>
          <Btn variant="ghost" onClick={() => setRefresh(v => v + 1)} disabled={loading}>Refresh</Btn>
        </div>
      </Card>
      {error && <div role="alert"><Card className="border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-800">Cannot load stored audit events: {error}</Card></div>}
      <Card className="overflow-x-auto">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-5 py-3 text-sm text-gray-500">
          <span>{loading ? 'Loading audit events…' : `${result?.totalElements ?? 0} stored records`}</span>
          <span>{pages ? `Page ${page + 1} of ${pages}` : 'No pages'}</span>
        </div>
        <table className="w-full min-w-[900px] text-sm">
          <thead><tr className="border-b border-gray-200 bg-gray-50">{['Time', 'Actor ID', 'Action', 'Entity', 'Horse', 'Result', 'Reason'].map(h =>
            <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{h}</th>)}</tr></thead>
          <tbody>
            {!loading && !error && records.map(a => (
              <tr key={a.auditId} className="border-b border-gray-100 align-top last:border-0">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500">{a.createdAt ? `${a.createdAt.slice(8,10)}/${a.createdAt.slice(5,7)}/${a.createdAt.slice(0,4)} ${a.createdAt.slice(11,19)}` : '—'}</td>
                <td className="px-4 py-3 font-mono">{a.actorId || 'System / unknown'}</td>
                <td className="px-4 py-3 font-medium">{a.action}</td>
                <td className="px-4 py-3 text-gray-600">{[a.entityType, a.entityId].filter(Boolean).join(' #') || '—'}</td>
                <td className="px-4 py-3 font-mono text-gray-600">{a.horseId || '—'}</td>
                <td className="px-4 py-3">{a.result || '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{a.reason || '—'}</td>
              </tr>
            ))}
            {!loading && !error && records.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-500">No stored audit events match the filters.</td></tr>}
            {loading && <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-500">Loading…</td></tr>}
          </tbody>
        </table>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <Btn size="sm" variant="secondary" disabled={loading || page === 0} onClick={() => setPage(p => p - 1)}>Previous</Btn>
          <Btn size="sm" variant="secondary" disabled={loading || page + 1 >= pages} onClick={() => setPage(p => p + 1)}>Next</Btn>
        </div>
      </Card>
    </div>
  );
}
