import { useCallback, useState } from 'react';
import { permissionService } from '../../services/permissionService.ts';
import { useApiResource } from '../../hooks/useApiResource.js';
import { ApiFeedback } from '../../components/common/ApiFeedback.jsx';
export function ApiPermissionsPage() {
    const [role, setRole] = useState('HORSE_OWNER'), [code, setCode] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const load = useCallback(async () => ({ permissions: await permissionService.list(role), audit: await permissionService.audit(role) }), [role]);
    const r = useApiResource(load);
    async function mutate(action) { if (busy)
        return; setBusy(true); setError(''); try {
        await action();
        setCode('');
        await r.reload();
    }
    catch (e) {
        setError(e.message);
    }
    finally {
        setBusy(false);
    } }
    return <section className="space-y-4"><h1 className="text-2xl">Phân quyền theo vai trò</h1><p>Thay đổi áp dụng cho toàn bộ tài khoản thuộc vai trò được chọn.</p><select aria-label="Vai trò" disabled={busy} value={role} onChange={e => setRole(e.target.value)}>{['HORSE_OWNER', 'HEAD_TRAINER', 'VETERINARIAN', 'GROOM', 'CLUB_MANAGER', 'USER'].map(x => <option key={x}>{x}</option>)}</select><button disabled={busy || r.loading} onClick={r.reload}>Tải lại</button><ApiFeedback loading={busy || r.loading} error={error || r.error}/><form onSubmit={e => { e.preventDefault(); mutate(() => permissionService.grant(role, code.trim())); }}><label>Mã quyền<input required maxLength="100" value={code} onChange={e => setCode(e.target.value)}/></label><button disabled={busy || r.loading || !r.data}>Cấp quyền</button></form>{r.data?.permissions.map(x => <div key={x}>{x} <button disabled={busy || r.loading} onClick={() => mutate(() => permissionService.revoke(role, x))}>Thu hồi</button></div>)}<h2>Lịch sử thay đổi</h2><pre className="whitespace-pre-wrap break-all">{JSON.stringify(r.data?.audit || [], null, 2)}</pre></section>;
}
