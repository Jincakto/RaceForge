import { useState } from 'react';
import { notificationService } from '../../services/notificationService.ts';
import { useApiResource } from '../../hooks/useApiResource.js';
import { ApiFeedback } from '../../components/common/ApiFeedback.jsx';
const load = () => notificationService.list();
export function ApiNotificationsPage() { const r = useApiResource(load); const [busy, setBusy] = useState(false), [error, setError] = useState(''); return <section className="space-y-4"><h1 className="text-2xl">Thông báo ({r.data?.filter(n => !n.read).length || 0} chưa đọc)</h1><button disabled={busy || r.loading} onClick={r.reload}>Tải lại</button><ApiFeedback loading={busy || r.loading} error={error || r.error}/>{!r.loading && r.data?.length === 0 && <p>Chưa có thông báo.</p>}{r.data?.map(n => <article key={n.notificationId} className="border rounded p-4"><h2>{n.title}</h2><p>{n.message}</p><time>{new Date(n.createdAt).toLocaleString('vi-VN')}</time>{n.read ? <span> · Đã đọc</span> : <button disabled={busy || r.loading} onClick={async () => { setBusy(true); setError(''); try {
    await notificationService.read(n.notificationId);
    await r.reload();
}
catch (e) {
    setError(e.message);
}
finally {
    setBusy(false);
} }}>Đánh dấu đã đọc</button>}</article>)}</section>; }
