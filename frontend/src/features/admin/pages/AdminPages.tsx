import { listAccounts, updateCurrentAccount } from "../api/adminApi";
import { Card, Badge, Btn, Input, Select } from "../../../shared/ui/ui";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from "recharts";
import { type AppUser, type Role } from "../../../shared/data/data";
import { type Page, type AppState } from "../../../app/appTypes";
import { ROLE_LABELS, GRANTABLE_PAGES, NAV_ITEMS } from "../../../app/AppLayout";
import { useState, useEffect } from "react";
import { revenueSummary, revenueTransactions, revenueExport, type RevenueSummary, type RevenueTransaction, type RevenueFilter } from "../api/reportsApi";

import { userFromApi } from "../../../app/remote";
import { memberHorses } from "../../horses/memberHorses";
import { TrainerProfileForm } from "../../trainers/trainerProfileForm";

export function ReportsPage() {
  const [inputs, setInputs] = useState<RevenueFilter>({});
  const [filters, setFilters] = useState<RevenueFilter>({});
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [transactions, setTransactions] = useState<RevenueTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const currency = (amount: number) => `${Math.round(amount).toLocaleString('vi-VN')} ₫`;
  useEffect(() => {
    let live = true;
    setLoading(true); setError('');
    Promise.all([revenueSummary(filters), revenueTransactions(filters)])
      .then(([overview, rows]) => { if (live) { setSummary(overview); setTransactions(rows); } })
      .catch(e => { if (live) { setSummary(null); setTransactions([]); setError((e as Error).message); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [filters]);
  const exportCsv = async () => {
    if (exporting || loading || error) return;
    setExporting(true);
    try {
      const file = await revenueExport(filters);
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url; link.download = 'RaceForge-revenue.csv';
      link.click(); URL.revokeObjectURL(url);
    } catch (e) { setError((e as Error).message); }
    finally { setExporting(false); }
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-serif font-bold">Revenue reports</h2>
          <p className="text-sm text-gray-500">Verified PayOS collections (gross, before refunds). Date is based on the payment confirmation in Vietnam time.</p></div>
        <Btn variant="secondary" disabled={loading || !!error || exporting} onClick={exportCsv}>{exporting ? 'Exporting…' : '⬇ Export CSV'}</Btn>
      </div>
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-gray-600">From date <input aria-label="From date" type="date" value={inputs.from || ''} onChange={e => setInputs(p => ({...p, from:e.target.value}))} className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
          <label className="text-xs text-gray-600">To date <input aria-label="To date" type="date" value={inputs.to || ''} onChange={e => setInputs(p => ({...p, to:e.target.value}))} className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
          <label className="text-xs text-gray-600">Package type <select aria-label="Package type" value={inputs.packageType || ''} onChange={e => setInputs(p => ({...p, packageType:e.target.value}))} className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">All types</option><option value="BASIC">Basic</option><option value="PERFORMANCE">Performance</option><option value="RACING">Racing</option>
          </select></label>
          <Btn disabled={loading || (!!inputs.from && !!inputs.to && inputs.from > inputs.to)} onClick={() => setFilters({...inputs})}>Apply filters</Btn>
          <Btn variant="ghost" onClick={() => {setInputs({}); setFilters({});}}>Reset</Btn>
        </div>
        {inputs.from && inputs.to && inputs.from > inputs.to && <p className="mt-2 text-sm text-red-700">End date must be on or after start date.</p>}
      </Card>
      {loading && <Card className="p-7 text-center text-gray-500">Loading confirmed payments…</Card>}
      {error && (
        <div role="alert">
          <Card className="border-l-4 border-red-500 bg-red-50 p-4 text-red-800">
            Unable to load revenue report: {error}
          </Card>
        </div>
      )}
      {!loading && !error && summary && <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[['Gross collected', currency(summary.totalCollected)], ['Paid orders', String(summary.paidOrderCount)], ['Average payment', currency(summary.averagePayment)], ['Paid, not activated', String(summary.notAppliedCount)]].map(([label, value]) =>
            <Card key={label} className="p-4"><p className="text-xs text-gray-500">{label}</p><p className="mt-2 text-lg font-bold text-[#0f1729]">{value}</p></Card>)}
        </div>
        {summary.historicalUndatedPaidCount > 0 && <Card className="border-l-4 border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">
          {summary.historicalUndatedPaidCount} historical PAID order(s) have no trustworthy confirmation timestamp. They count in unfiltered totals, but cannot be assigned to a dated reporting period.
        </Card>}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5"><h3 className="mb-3 font-semibold">Collections by month</h3>
            {summary.byMonth.length ? <ResponsiveContainer width="100%" height={240}><BarChart data={summary.byMonth}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/><XAxis dataKey="label" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><Tooltip formatter={value => currency(Number(value))}/><Bar dataKey="amount" name="Collected (VND)" fill="#c9973b" radius={[3,3,0,0]}/></BarChart></ResponsiveContainer> : <p className="py-8 text-center text-sm text-gray-500">No paid orders in the selected period.</p>}
          </Card>
          <Card className="p-5"><h3 className="mb-3 font-semibold">Collections by package type</h3>
            {summary.byType.length ? <div className="divide-y divide-gray-100">{summary.byType.map(row => <div key={row.label} className="flex justify-between gap-3 py-3 text-sm"><span>{row.label} <span className="text-gray-500">({row.orderCount} orders)</span></span><strong>{currency(row.amount)}</strong></div>)}</div> : <p className="py-8 text-center text-sm text-gray-500">No collections to summarize.</p>}
          </Card>
        </div>
        <Card className="overflow-x-auto p-5"><h3 className="mb-3 font-semibold">Confirmed payment transactions</h3>
          {transactions.length ? <table className="w-full text-left text-sm"><thead><tr className="border-b border-gray-200 text-xs text-gray-500"><th className="pb-2 pr-4">Order</th><th className="pb-2 pr-4">Registration</th><th className="pb-2 pr-4">Package</th><th className="pb-2 pr-4">Amount</th><th className="pb-2 pr-4">Confirmed (UTC)</th><th className="pb-2">Activation</th></tr></thead><tbody>
          {transactions.map(tx => <tr key={tx.orderCode} className="border-b border-gray-100"><td className="py-2 pr-4 font-mono">{tx.orderCode}</td><td className="py-2 pr-4">{tx.horsePackageId}</td><td className="py-2 pr-4">{tx.packageName} ({tx.packageType})</td><td className="py-2 pr-4 whitespace-nowrap">{currency(tx.amount)}</td><td className="py-2 pr-4 whitespace-nowrap">{tx.confirmedAtUtc ? tx.confirmedAtUtc.replace('T', ' ') : 'Unknown (legacy)'}</td><td className="py-2">{tx.applied ? <span className="text-emerald-700">Applied</span> : <span className="text-amber-700">Needs review</span>}</td></tr>)}</tbody></table> : <p className="py-8 text-center text-sm text-gray-500">No confirmed payments match the current filters.</p>}
        </Card>
        <p className="text-xs text-gray-500">Source: PayOS_Order.payment_state = PAID. This is gross cash collected, not net revenue or profit. Cancelled/unpaid orders are excluded.</p>
      </>}
    </div>
  );
}

function PermissionsModal({
  member,
  grantedPages,
  rolePages,
  onToggle,
  onClose,
}: {
  member: AppUser;
  grantedPages: Page[];
  rolePages: Set<Page>;
  onToggle: (p: Page) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden">
        <div className="bg-[#1a2844] px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#c9973b] flex items-center justify-center text-white font-bold">
            {member.avatar}
          </div>
          <div className="flex-1">
            <div className="text-white font-semibold">{member.name}</div>
            <div className="text-[#c9973b] text-xs">
              {member.role ? ROLE_LABELS[member.role] : "—"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none"
          >
            ✕
          </button>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-500 mb-4">
            Default role pages are marked 🔒. Toggle additional access
            permissions.
          </p>
          <div className="space-y-2">
            {GRANTABLE_PAGES.map((g) => {
              const isDefault = rolePages.has(g.page);
              const isGranted = grantedPages.includes(g.page);
              const active = isDefault || isGranted;
              return (
                <div
                  key={g.page}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${active ? "border-[#c9973b] bg-amber-50" : "border-gray-100 bg-gray-50"}`}
                >
                  <span className="text-lg">{g.icon}</span>
                  <span className="flex-1 text-sm font-medium">{g.label}</span>
                  {isDefault ? (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      🔒 Default
                    </span>
                  ) : (
                    <button
                      onClick={() => onToggle(g.page)}
                      className={`relative w-11 h-6 rounded-full transition-all flex-shrink-0 ${isGranted ? "bg-[#c9973b]" : "bg-gray-300"}`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isGranted ? "left-6" : "left-1"}`}
                      />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="px-5 pb-5 flex justify-end">
          <Btn variant="gold" onClick={onClose}>
            Xong ✓
          </Btn>
        </div>
      </div>
    </div>
  );
}

export function StaffPage({
  state,
  navigate,
  onUpdatePermissions,
}: {
  state: AppState;
  navigate: (p: Page) => void;
  onUpdatePermissions: (userId: string, pages: Page[]) => void;
}) {
  const [accounts, setAccounts] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [detailId, setDetailId] = useState<string | null>(null);
  const normalizeMemberSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [accountsError, setAccountsError] = useState('');
  const [accountsVersion, setAccountsVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setLoadingAccounts(true);
    setAccountsError('');
    listAccounts().then(rows => {
      const users = rows.map(userFromApi);
      if (active) setAccounts(users);
    }).catch(error => {
      if (active) setAccountsError((error as Error).message);
    }).finally(() => { if (active) setLoadingAccounts(false); });
    return () => { active = false; };
  }, [state.user!.id, accountsVersion]);
  const members = accounts.filter(
    (u) => !!state.user!.clubId && u.clubId === state.user!.clubId && u.id !== state.user!.id,
  );
  const [permModalUserId, setPermModalUserId] = useState<string | null>(null);
  const filteredMembers = members.filter(m => (roleFilter === 'all' || m.role === roleFilter)
    && normalizeMemberSearch(`${m.name} ${m.email}`).includes(normalizeMemberSearch(search.trim())));
  const detailMember = members.find(m => m.id === detailId);
  const permMember = members.find((m) => m.id === permModalUserId);
  const rolePages = (role: Role | null): Set<Page> =>
    new Set((role ? NAV_ITEMS[role] || [] : []).map((i) => i.page));
  const grantedPages = (userId: string) => state.userPermissions[userId] || [];

  const handleToggle = (userId: string, page: Page) => {
    const current = grantedPages(userId);
    const next = current.includes(page)
      ? current.filter((p) => p !== page)
      : [...current, page];
    onUpdatePermissions(userId, next);
  };

  if (detailMember) {
    const related = memberHorses(detailMember, state.horses, state.healthRecords, state.enrollments);
    const examinedCount = related.filter(row => row.labels.includes('Examined')).length;
    const activeCount = related.filter(row => row.labels.some(label => label === 'Currently assigned' || label === 'Currently training' || label === 'Owned horse')).length;
    const pendingCount = related.filter(row => row.labels.includes('Awaiting acceptance')).length;
    return <div className="mx-auto max-w-6xl space-y-5">
      <Btn variant="ghost" onClick={() => setDetailId(null)}>← Back to staff</Btn>
      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1a2844] text-xl font-bold text-white">{detailMember.avatar}</div>
          <div className="flex-1"><h2 className="font-serif text-2xl font-bold text-[#1a2844]">{detailMember.name}</h2><p className="mt-1 text-sm text-gray-500">{detailMember.email}</p><p className="mt-1 text-sm text-gray-500">{detailMember.phone || 'No phone number provided'}</p></div>
          {detailMember.role && <Badge status={detailMember.role} />}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4"><div className="text-2xl font-bold text-[#1a2844]">{activeCount}</div><p className="mt-1 text-sm text-gray-500">{detailMember.role === 'owner' ? 'Horses owned' : detailMember.role === 'veterinarian' ? 'Currently assigned horses' : 'Horses in training'}</p></div>
          {detailMember.role === 'veterinarian' && <div className="rounded-xl bg-emerald-50 p-4"><div className="text-2xl font-bold text-emerald-800">{examinedCount}</div><p className="mt-1 text-sm text-emerald-700">Horses examined</p></div>}
          {detailMember.role !== 'owner' && <div className="rounded-xl bg-amber-50 p-4"><div className="text-2xl font-bold text-amber-800">{pendingCount}</div><p className="mt-1 text-sm text-amber-700">Awaiting acceptance</p></div>}
        </div>
      </Card>
      <div><h3 className="text-lg font-semibold text-[#1a2844]">{detailMember.role === 'owner' ? 'Owned horses' : 'Associated horses'} · {related.length}</h3><p className="mt-1 text-xs text-gray-500">Each horse is counted once. Examination totals use confirmed records available in this club.</p></div>
      <div className="grid gap-4 md:grid-cols-2">
        {related.map(({horse, labels}) => <Card key={horse.id} className="p-5">
          <div className="flex items-center gap-4">
            {horse.imageUrl ? <img src={horse.imageUrl} alt="" className="h-16 w-16 rounded-xl bg-gray-100 object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-100 text-2xl">🐎</div>}
            <div className="min-w-0 flex-1"><h4 className="font-semibold">{horse.name}</h4><p className="mt-1 font-mono text-xs text-gray-500">{horse.id}</p><p className="mt-1 text-sm text-gray-500">{horse.breed} · {horse.age} years old</p></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">{labels.map(label => <span key={label} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{label}</span>)}</div>
        </Card>)}
      </div>
      {related.length === 0 && <Card className="p-10 text-center text-sm text-gray-500">No associated horses are available for this member in the club.</Card>}
    </div>;
  }

  return (
    <>
      {permMember && (
        <PermissionsModal
          member={permMember}
          grantedPages={grantedPages(permMember.id)}
          rolePages={rolePages(permMember.role)}
          onToggle={(p) => handleToggle(permMember.id, p)}
          onClose={() => setPermModalUserId(null)}
        />
      )}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-serif font-bold">Staff</h2>
            <p className="text-sm text-gray-500">
              {loadingAccounts ? 'Loading members...' : accountsError ? 'Unable to load members' : `${members.length} members`} · staff accounts are issued by an
              administrator
            </p>
          </div>
          <Btn variant="secondary" disabled={loadingAccounts} onClick={() => setAccountsVersion(v => v + 1)}>Refresh list</Btn>
        </div>
        {accountsError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">Unable to load staff accounts: {accountsError}</p>}
        <Card className="p-4">
          <div className="grid gap-4 md:grid-cols-[1fr_240px_auto] md:items-end">
            <Input label="Search by name or email" value={search} onChange={setSearch} placeholder="Enter a name or email..." />
            <Select label="Role" value={roleFilter} onChange={setRoleFilter} options={[{value:'all',label:'All roles'}, ...Array.from(new Set(members.map(m => m.role).filter((role): role is Role => !!role))).map(role => ({value:role,label:ROLE_LABELS[role]}))]} />
            {(search || roleFilter !== 'all') && <Btn variant="ghost" onClick={() => {setSearch(''); setRoleFilter('all');}}>Clear filters</Btn>}
          </div>
          <p role="status" className="mt-3 text-xs text-gray-500">Showing {filteredMembers.length} of {members.length} members</p>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          {filteredMembers.map((m) => {
            const extraCount = grantedPages(m.id).filter(
              (p) => !rolePages(m.role).has(p),
            ).length;
            return (
              <Card key={m.id} className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#1a2844] text-white flex items-center justify-center font-bold">
                    {m.avatar}
                  </div>
                  <div className="flex-1">
                    {m.role && ['owner', 'veterinarian', 'head_trainer'].includes(m.role)
                      ? <button type="button" onClick={() => setDetailId(m.id)} className="text-left font-semibold text-[#1a2844] hover:text-[#a47622] hover:underline">{m.name}</button>
                      : <div className="font-semibold">{m.name}</div>}
                    <div className="text-sm text-gray-500">
                      {m.role ? ROLE_LABELS[m.role] : "Not assigned"}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {m.email}
                    </div>
                    {m.experience && (
                      <div className="text-xs text-[#c9973b] mt-1">
                        {m.experience.split(" · ")[0]}
                      </div>
                    )}
                    {extraCount > 0 && (
                      <div className="text-xs text-emerald-600 mt-1">
                        +{extraCount} additional pages granted
                      </div>
                    )}
                  </div>
                  {m.role && <Badge status={m.role} />}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  {m.role && ['owner', 'veterinarian', 'head_trainer'].includes(m.role) && <Btn variant="ghost" size="sm" className="mr-2" onClick={() => setDetailId(m.id)}>View horses · {memberHorses(m, state.horses, state.healthRecords, state.enrollments).length}</Btn>}
                  <Btn
                    variant="secondary"
                    size="sm"
                    onClick={() => setPermModalUserId(m.id)}
                  >
                    🔑 Grant access
                  </Btn>
                </div>
              </Card>
            );
          })}
        </div>
        {!loadingAccounts && !accountsError && filteredMembers.length === 0 && (
          <Card className="p-10 text-center">
            <div className="text-4xl mb-3">👥</div>
            <div className="font-semibold text-gray-600">{members.length ? 'No members match your filters' : 'No members yet'}</div>
            <div className="text-sm text-gray-400 mt-1">
              {members.length ? 'Try another name, email or role.' : 'Contact your administrator to create a staff account.'}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

export function ProfilePage({
  user,
  state,
  navigate,
  onLogout,
  onSave,
  onError,
}: {
  user: AppUser;
  state: AppState;
  navigate: (p: Page) => void;
  onLogout: () => void;
  onSave: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState(user.name);
  const myClub = state.clubs.find((c) => c.id === user.clubId);
  return (
    <div className="space-y-5 max-w-2xl">
      <h2 className="text-xl font-serif font-bold">Profile</h2>
      <Card className="p-6">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-20 h-20 rounded-full bg-[#1a2844] text-white flex items-center justify-center text-2xl font-bold">
            {user.avatar}
          </div>
          <div>
            <div className="text-xl font-semibold">{user.name}</div>
            <div className="text-sm text-gray-500">
              {user.role ? ROLE_LABELS[user.role] : "No role assigned"}
            </div>
            {myClub && (
              <div className="text-sm text-[#c9973b] font-medium">
                🏛 {myClub.name}
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Full name" value={name} onChange={setName} />
          <Input label="Email" value={user.email} onChange={() => {}} />
          {user.phone && (
            <Input label="Phone" value={user.phone} onChange={() => {}} />
          )}
        </div>
        {user.bio && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 italic">
            "{user.bio}"
          </div>
        )}
        {user.experience && (
          <div className="mt-3">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
              Experience
            </div>
            <div className="text-sm text-gray-700">{user.experience}</div>
          </div>
        )}
        {user.certifications && (
          <div className="mt-3">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
              Certifications
            </div>
            <div className="text-sm text-gray-700">{user.certifications}</div>
          </div>
        )}
        <Btn
          variant="gold"
          className="mt-4"
          onClick={async () => {
            try {
              await updateCurrentAccount({
                fullName: name.trim(),
                phone: user.phone || "",
                avatarUrl: user.avatarUrl || null,
              });
              onSave("Profile updated successfully.");
            } catch (e) {
              onError((e as Error).message);
            }
          }}
        >
          Save
        </Btn>
      </Card>
      {user.role === "head_trainer" && (
        <TrainerProfileForm
          key={user.id}
          user={state.users.find((u) => u.id === user.id) || user}
        />
      )}
      <Btn variant="danger" onClick={onLogout}>
        Sign out
      </Btn>
    </div>
  );
}
