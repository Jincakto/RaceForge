import { useCallback, useState } from 'react';
import { staffService } from '../../services/staffService.ts';
import { useApiResource } from '../../hooks/useApiResource.js';
import { useApp } from '../../hooks/useApp.js';
import { ApiFeedback } from '../../components/common/ApiFeedback.jsx';
import { ApiPager } from '../../components/common/ApiPager.jsx';
export function ApiStaffPage() {
    const { state } = useApp();
    const [search, setSearch] = useState(''), [filter, setFilter] = useState(''), [page, setPage] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const load = useCallback(() => staffService.list(page, search, filter), [search, filter, page]);
    const r = useApiResource(load);
    return <section className="space-y-4"><h1 className="text-2xl">Tài khoản & nhân sự</h1><input aria-label="Tìm tài khoản" placeholder="Tên hoặc email" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}/><select aria-label="Trạng thái" value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }}>{['', 'ACTIVE', 'INACTIVE', 'PENDING', 'UNVERIFIED'].map(x => <option key={x} value={x}>{x || 'Tất cả'}</option>)}</select><button disabled={r.loading || busy} onClick={r.reload}>Tải lại</button><ApiFeedback loading={r.loading || busy} error={error || r.error}/>{!r.loading && r.data?.content.length === 0 && <p>Không có tài khoản.</p>}{r.data?.content.map(u => <article key={u.userId} className="border rounded p-4"><strong>{u.fullName}</strong><p>{u.email} · {u.role?.roleName} · {u.status}</p>{['ACTIVE', 'INACTIVE'].includes(u.status) && u.userId !== state.user.id && u.role?.roleName !== 'CLUB_MANAGER' && <button disabled={busy || r.loading} onClick={async () => { setBusy(true); setError(''); try {
        await staffService.status(u.userId, u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
        await r.reload();
    }
    catch (e) {
        setError(e.message);
    }
    finally {
        setBusy(false);
    } }}>{u.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}</button>}</article>)}<ApiPager page={page} totalPages={r.data?.totalPages || 0} busy={busy || r.loading} onPage={setPage}/></section>;
}
