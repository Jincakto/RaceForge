import type { AppState } from '../../types/reference.ts';
import { liveApi } from '../../services/api.ts';
export function CenterRequestsPage({ state, onChange }: { state: AppState; onChange: (state: AppState) => void }) {
  const requests = state.horseClubRequests.filter(r => r.clubId === state.user?.clubId);
  function review(id: number, approve: boolean) {
    if (liveApi || state.user?.role !== 'manager') return;
    const request = requests.find(r => r.id === id && r.status === 'pending');
    if (!request) return;
    onChange({ ...state, horseClubRequests: state.horseClubRequests.map(r => r.id === id ? { ...r, status: approve ? 'approved' : 'rejected', reviewNote: approve ? 'Chờ Initial Medical' : 'CM từ chối' } : r), horses: state.horses.map(h => h.id === request.horseId ? { ...h, approvalStatus: approve ? 'approved' : 'rejected', clubId: approve ? request.clubId : null, approvedAt: approve ? new Date().toISOString() : null, vetClearance: false, healthStatus: 'Pending Vet', trainingStatus: 'Pending Approval' } : h) });
  }
  return <section className="space-y-4"><h2 className="text-2xl font-bold">Duyệt đăng ký ngựa</h2><p>Đăng ký → CM Approval → Initial Medical → đăng ký gói tập.</p>{liveApi && <p role="status" className="text-amber-700">BE hiện chưa có endpoint CM Approval; không thể duyệt trên API.</p>}{requests.length === 0 && <p>Chưa có yêu cầu thuộc trung tâm của bạn.</p>}{requests.map(r => <article key={r.id} className="bg-white border rounded-xl p-5"><h3 className="font-semibold">{r.horseName} · #{r.horseId}</h3><p>{r.ownerName} · {r.status} · {r.reviewNote}</p>{r.status === 'pending' && <div className="flex gap-3 mt-3"><button disabled={liveApi} onClick={() => review(r.id, true)} className="px-4 py-2 bg-emerald-700 text-white rounded disabled:opacity-40">Duyệt — chờ khám ban đầu</button><button disabled={liveApi} onClick={() => review(r.id, false)} className="px-4 py-2 border rounded disabled:opacity-40">Từ chối</button></div>}</article>)}</section>;
}
