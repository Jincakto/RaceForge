import { useCallback, useState } from 'react';
import { registrationService } from '../../services/registrationService.ts';
import { useApiResource } from '../../hooks/useApiResource.js';
import { ApiFeedback } from '../../components/common/ApiFeedback.jsx';
import { ApiPager } from '../../components/common/ApiPager.jsx';
export function ApiRequestsPage() {
    const [search, setSearch] = useState(''), [status, setStatus] = useState('PENDING'), [page, setPage] = useState(0), [notes, setNotes] = useState({}), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const load = useCallback(() => registrationService.list(search, status, page), [search, status, page]);
    const r = useApiResource(load);
    async function review(id, approve) { if (busy)
        return; const note = (notes[id] || '').trim(); if (!approve && !note) {
        setError('Nhập lý do từ chối.');
        return;
    } setBusy(true); setError(''); try {
        await (approve ? registrationService.approve(id, note) : registrationService.reject(id, note));
        await r.reload();
    }
    catch (e) {
        setError(e.message);
    }
    finally {
        setBusy(false);
    } }
    return <section className="space-y-4"><h1 className="text-2xl">Duyệt đăng ký tài khoản</h1><input aria-label="Tìm yêu cầu" placeholder="Tìm kiếm" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}/><select value={status} aria-label="Trạng thái yêu cầu" onChange={e => { setStatus(e.target.value); setPage(0); }}>{['', 'PENDING', 'APPROVED', 'REJECTED'].map(x => <option key={x} value={x}>{x || 'Tất cả'}</option>)}</select><button disabled={busy || r.loading} onClick={r.reload}>Tải lại</button><ApiFeedback loading={busy || r.loading} error={error || r.error}/>{!r.loading && r.data?.content.length === 0 && <p>Không có yêu cầu.</p>}{r.data?.content.map(x => <article key={x.requestId} className="border rounded p-4 space-y-3"><h2>{x.user.fullName} · {x.user.email}</h2><p>{x.requestedRole?.roleName} · {x.status}</p><p>{x.reviewNote}</p>{x.status === 'PENDING' && <><textarea aria-label="Ghi chú duyệt hoặc lý do từ chối" maxLength="500" value={notes[x.requestId] || ''} onChange={e => setNotes(n => ({ ...n, [x.requestId]: e.target.value }))}/><button disabled={busy || r.loading} onClick={() => review(x.requestId, true)}>Duyệt vai trò đã yêu cầu</button><button disabled={busy || r.loading} onClick={() => review(x.requestId, false)}>Từ chối</button></>}</article>)}<ApiPager page={page} totalPages={r.data?.totalPages || 0} busy={busy || r.loading} onPage={setPage}/></section>;
}
