import { accountService } from '../../services/accountService.ts';
import { useApiResource } from '../../hooks/useApiResource.js';
import { ApiFeedback } from '../../components/common/ApiFeedback.jsx';
import { useApp } from '../../hooks/useApp.js';
const load = () => accountService.registration();
export function ApiAccountStatusPage() { const { handleLogout, navigate } = useApp(); const r = useApiResource(load); return <main className="p-8 space-y-4"><h1>Trạng thái đăng ký tài khoản</h1><ApiFeedback loading={r.loading} error={r.error}/>{r.data && <><p>{r.data.status} · {r.data.requestedRole?.roleName}</p><p>{r.data.reviewNote}</p></>}<button disabled={r.loading} onClick={r.reload}>Tải lại</button><button onClick={() => navigate('profile')}>Hồ sơ cá nhân</button><button onClick={handleLogout}>Đăng xuất</button></main>; }
