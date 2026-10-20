import { useEffect, useState } from 'react';
import { api, ApiError, type User } from './api';
import { AdminDashboard, AuditLogPage, IdChip, Modal, ROLE_NAME, type AuditEntry } from './admin';
import { ADMIN_ROLES, STAFF_ROLE_IDS, activateStaff, listPermissionCatalog, resendStaffInvitation, createStaff, listAccounts, listPermissionAudit, listRolePermissions, setRolePermission, updateAccountStatus } from './adminApi';
import { toAppUser } from './backendBridge';
import type { AppUser, Role } from './data';
import { Btn, Card, Input, Select } from './ui';

type AdminPage = 'dashboard' | 'accounts' | 'permissions' | 'audit-log';
export function StaffActivationPage() {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { window.history.replaceState(null, '', window.location.pathname + '?invitation=true'); }, []);
  const submit = async () => {
    if (busy) return;
    if (!token) { setError('Invitation token is missing. Open the complete link from your email.'); return; }
    if (password.length < 8 || password.length > 100 || password !== confirm) { setError('Use 8–100 characters and matching passwords.'); return; }
    setBusy(true); setError('');
    try { await activateStaff(token, password); setDone(true); setPassword(''); setConfirm(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Activation failed'); }
    finally { setBusy(false); }
  };
  return <div className="min-h-screen bg-[#0f1729] flex items-center justify-center p-6" data-ui-translate="off"><Card className="p-8 max-w-lg w-full space-y-4">
    <h1 className="font-serif text-xl font-bold">Activate staff account</h1>
    {done ? <><p role="status">Password set. Your staff account is active.</p><a href="/" className="text-blue-700 underline">Return to sign in</a></> : <form className="space-y-4" onSubmit={e => { e.preventDefault(); void submit(); }}>
      <p>Set your password using the single-use invitation sent by Admin.</p>
      <Input label="New password" type="password" required value={password} onChange={setPassword} />
      <Input label="Confirm password" type="password" required value={confirm} onChange={setConfirm} />
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {!token && <p role="alert" className="text-red-700">Invitation token is missing. Ask Admin to resend your invitation.</p>}
      <Btn type="submit" disabled={busy || !token}>{busy ? 'Activating…' : 'Activate account'}</Btn>
    </form>}
  </Card></div>;
}
export function PasswordRecoveryPage() {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') || '');
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
  useEffect(()=>{ if(token)window.history.replaceState(null,'',window.location.pathname); },[]);
  const submit=async()=>{if(busy)return;setBusy(true);setError('');try{if(token){if(password.length<8||password.length>100||password!==confirm)throw new Error('Use 8–100 characters and matching passwords.');await api('/api/auth/reset-password','POST',{token,newPassword:password});}else await api('/api/auth/forgot-password','POST',{email});setDone(true);setPassword('');setConfirm('');}catch(e){setError(e instanceof Error?e.message:'Request failed');}finally{setBusy(false);}};
  return <div className="min-h-screen bg-[#0f1729] flex items-center justify-center p-6" data-ui-translate="off"><Card className="p-8 max-w-lg w-full space-y-4"><h1 className="font-serif text-xl font-bold">{token?'Reset password':'Forgot password'}</h1>{done?<><p role="status">{token?'Password changed. You can sign in.':'If the account is eligible, the backend will email a reset link.'}</p><a href="/" className="underline">Return to sign in</a></>:<form className="space-y-4" onSubmit={e=>{e.preventDefault();void submit();}}>{token?<><Input label="New password" type="password" required value={password} onChange={setPassword}/><Input label="Confirm password" type="password" required value={confirm} onChange={setConfirm}/></>:<Input label="Email" type="email" required value={email} onChange={setEmail}/>}<p role="alert" className="text-red-700">{error}</p><Btn type="submit" disabled={busy}>{busy?'Sending…':token?'Reset password':'Send reset link'}</Btn></form>}</Card></div>;
}
export function AdminServerPage({ page, actor, navigate }: { page: AdminPage; actor: AppUser; navigate: (page: any) => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [catalog, setCatalog] = useState<{ permissionName: string; description: string }[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [create, setCreate] = useState(false);
  const [change, setChange] = useState<{ title: string; run: () => Promise<unknown> } | null>(null);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', role: 'veterinarian' as Role });
  const message = (e: unknown) => e instanceof ApiError && e.status === 403
    ? `Backend denied this Admin action (403). Check ADMIN permissions on the running backend. ${e.message}`
    : e instanceof Error ? e.message : 'API error';
  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    const load = async () => {
      if (page === 'accounts' || page === 'dashboard') {
        const rows = await listAccounts(); if (alive) setUsers(rows);
      }
      if (page === 'permissions') {
        const [grants, options] = await Promise.all([listRolePermissions(), listPermissionCatalog()]);
        if (alive) { setPermissions(grants); setCatalog(options); }
      }
      if (page === 'audit-log' || page === 'dashboard') {
        const logs = await listPermissionAudit(); if (alive) setAudit(logs);
      }
    };
    void load().catch(e => { if (alive) setError(message(e)); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [page, revision]);
  const mutate = async (work: () => Promise<unknown>, success: string) => {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await work();
      setNotice(success); setChange(null); setCreate(false);
      setForm({ fullName: '', email: '', phone: '', role: 'veterinarian' });
      setRevision(n => n + 1);
    } catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  };
  const roleOptions = Object.entries(ADMIN_ROLES).map(([role]) => ({ value: role, label: ROLE_NAME[role as Role] }));
  const rows = users.filter(u => (roleFilter === 'all' || u.role.roleName === roleFilter) && `${u.userId} ${u.fullName} ${u.email}`.toLowerCase().includes(search.trim().toLowerCase()));
  const codes = [...new Set([...catalog.map(p => p.permissionName), ...Object.values(permissions).flat()])];
  return <div className="space-y-5" data-ui-translate="off">
    {error && <Card className="p-4"><p role="alert" className="text-red-700">{error}</p><Btn disabled={loading || busy} onClick={() => setRevision(n => n + 1)}>Retry loading</Btn></Card>}
    {notice && <p role="status" className="text-emerald-700">{notice}</p>}
    {loading ? <p role="status">Loading Admin data from backend…</p> : <>
      {page === 'dashboard' && !error && <><h2 className="font-serif text-xl font-bold">Administrator</h2><p>{actor.name} · {actor.email}</p><AdminDashboard users={users.map(toAppUser)} audit={audit} navigate={navigate} /><p className="text-sm text-gray-500">Recent activity includes permission changes only. System-wide audit is not exposed by this API.</p></>}
      {page === 'accounts' && <>
        <div className="flex justify-between items-center"><h2 className="font-serif text-xl font-bold">Account management</h2><Btn disabled={busy || !!error} onClick={() => setCreate(true)}>Create staff account</Btn></div>
        <p className="text-sm text-gray-500">Owners register publicly. Admin invites staff by email. Accounts stay INVITED until staff set a password using the emailed link. Admin password reset has no API yet.</p>
        <div className="flex gap-3"><Input value={search} onChange={setSearch} placeholder="Search name, email or ID" /><Select value={roleFilter} onChange={setRoleFilter} options={[{ value: 'all', label: 'All roles' }, ...Object.values(ADMIN_ROLES).map(r => ({ value: r, label: r }))]} /></div>
        {!error && <Card className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50">{['ID', 'Name / email', 'Role', 'Status', 'Actions'].map(s => <th key={s} className="p-3 text-left">{s}</th>)}</tr></thead><tbody>
          {rows.map(u => { const self = toAppUser(u).id === actor.id; const admin = u.role.roleName === 'ADMIN'; const currentRole = Object.entries(ADMIN_ROLES).find(([, name]) => name === u.role.roleName)?.[0] || '';
            return <tr key={u.userId} className="border-t border-gray-100"><td className="p-3"><IdChip kind="USR" id={String(u.userId)} /></td><td className="p-3">{u.fullName}<div className="text-xs text-gray-500">{u.email}</div></td><td className="p-3">{currentRole ? ROLE_NAME[currentRole as Role] : u.role.roleName}</td><td className="p-3">{u.status}</td><td className="p-3">{self ? 'Your account' : u.status === 'INVITED' ? <Btn size="sm" disabled={busy} variant="secondary" onClick={() => setChange({ title: `Resend invitation to ${u.email}? Previous links will be invalidated.`, run: () => resendStaffInvitation(u.userId) })}>Resend invitation</Btn> : <Btn size="sm" disabled={admin || busy || !['ACTIVE', 'INACTIVE'].includes(u.status)} variant="secondary" onClick={() => setChange({ title: `${u.status === 'INACTIVE' ? 'Unlock' : 'Lock'} ${u.fullName}'s account?`, run: () => updateAccountStatus(u.userId, u.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE') })}>{u.status === 'INACTIVE' ? 'Unlock' : 'Lock'}</Btn>}</td></tr>;
          })}
          {!rows.length && <tr><td colSpan={5} className="p-8 text-center text-gray-500">No matching accounts.</td></tr>}
        </tbody></table></Card>}
      </>}
      {page === 'permissions' && !error && <>
        <h2 className="font-serif text-xl font-bold">Permissions</h2><p className="text-sm text-gray-500">Backend permission codes. Role restrictions in backend controllers still apply after granting a permission.</p>
        <Card className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50"><th className="p-3 text-left">Permission</th>{Object.entries(ADMIN_ROLES).map(([role, name]) => <th key={name} className="p-3">{ROLE_NAME[role as Role]}</th>)}</tr></thead><tbody>{codes.map(code => <tr key={code} className="border-t border-gray-100"><td className="p-3 font-mono">{code}</td>{Object.values(ADMIN_ROLES).map(role => { const enabled = permissions[role]?.includes(code) || false; return <td key={role} className="p-3 text-center"><button role="switch" aria-label={`${code} — ${role}`} aria-checked={enabled} disabled={busy || code === 'MANAGE_PERMISSION'} className={`rounded-full px-3 py-1 disabled:opacity-50 ${enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`} onClick={() => setChange({ title: `${enabled ? 'Revoke' : 'Grant'} ${code} ${enabled ? 'from' : 'to'} ${role}?`, run: () => setRolePermission(role, code, !enabled) })}>{enabled ? 'On' : 'Off'}</button></td>; })}</tr>)}</tbody></table></Card>
        <p className="text-xs text-gray-500">MANAGE_PERMISSION is reserved for Admin and cannot be revoked from Admin.</p>
      </>}
      {page === 'audit-log' && !error && <><p className="text-sm text-gray-500">Permission grant/revoke history from the backend. Other system activity is not included.</p><AuditLogPage audit={audit} /></>}
    </>}
    {create && <Modal title="Create staff account" onClose={() => { if (!busy) setCreate(false); }}>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); void mutate(() => createStaff(form), 'Staff invitation sent. The account remains INVITED until password setup.'); }}>
        <Input label="Full name" required value={form.fullName} onChange={fullName => setForm(f => ({ ...f, fullName }))} />
        <Input label="Email" type="email" required value={form.email} onChange={email => setForm(f => ({ ...f, email }))} />
        <Input label="Phone" value={form.phone} onChange={phone => setForm(f => ({ ...f, phone }))} />
        <Select label="Role" value={form.role} onChange={role => setForm(f => ({ ...f, role: role as Role }))} options={roleOptions.filter(o => STAFF_ROLE_IDS[o.value as Role])} />
        <p className="text-xs text-gray-500">The backend emails a single-use password setup link. No password is generated or saved by the frontend.</p>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <Btn disabled={busy} onClick={() => {}} type="submit">{busy ? 'Saving…' : 'Send invitation'}</Btn>
      </form>
    </Modal>}
    {change && <Modal title="Confirm change" onClose={() => { if (!busy) setChange(null); }}><p className="mb-4">{change.title}</p>{error && <p role="alert" className="text-red-700 mb-3">{error}</p>}<Btn disabled={busy} onClick={() => { void mutate(change.run, 'Change saved on the server.'); }}>{busy ? 'Saving…' : 'Confirm'}</Btn></Modal>}
  </div>;
}
