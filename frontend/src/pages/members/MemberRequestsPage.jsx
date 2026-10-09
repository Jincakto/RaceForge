import { useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Btn } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';

export function MemberRequestsPage({ state, navigate, onApprove, onReject, onViewTrainer }) {
  const myClub = state.clubs.find(c => c.managerId === state.user.id);
  const myReqs = state.memberRequests.filter(r => r.clubId === myClub?.id);
  const [roles, setRoles] = useState({});
  const roleOpts = [
    { value: 'head_trainer', label: 'Head Trainer' }, { value: 'veterinarian', label: 'Veterinarian' },
    { value: 'groom', label: 'Groom' }, { value: 'owner', label: 'Chủ ngựa' },
  ];
  return (
    <div className="space-y-5 max-w-3xl">
      <div><h2 className="text-xl font-serif font-bold">Yêu cầu tham gia</h2><p className="text-sm text-gray-500">{myReqs.filter(r => r.status === 'pending').length} chờ duyệt</p></div>
      {myReqs.filter(r => r.status === 'pending').length === 0 && <Card className="p-10 text-center"><div className="text-4xl mb-3">🤝</div><div className="font-semibold text-gray-600">Không có yêu cầu nào đang chờ</div></Card>}
      {myReqs.filter(r => r.status === 'pending').map(req => (
        <Card key={req.id} className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[#1a2844] text-white flex items-center justify-center font-bold">{req.userAvatar}</div>
            <div className="flex-1">
              <div className="font-semibold">{req.userName}</div>
              <div className="text-sm text-gray-500">{req.userEmail}</div>
              {req.userRole && <Badge status={req.userRole} />}
              <div className="text-xs text-gray-400 mt-1">Yêu cầu {req.requestedAt} · Hết hạn {req.expiresAt}</div>
            </div>
            <div className="flex flex-col gap-2">
              <Badge status="pending" />
              {req.userRole === 'head_trainer' && (
                <button onClick={() => onViewTrainer(req.userId)} className="text-xs text-[#c9973b] hover:underline font-medium">📋 Xem hồ sơ HLV →</button>
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1"><Select label="" value={roles[req.id] || (req.userRole || '')} onChange={v => setRoles(p => ({ ...p, [req.id]: v }))} options={[{ value: '', label: '— Chọn vai trò —' }, ...roleOpts]} /></div>
            <Btn variant="gold" disabled={!roles[req.id] && !req.userRole} onClick={() => { const role = (roles[req.id] || req.userRole); if (role) onApprove(req.id, role); }}>✓ Duyệt</Btn>
            <Btn variant="danger" onClick={() => onReject(req.id)}>✕ Từ chối</Btn>
          </div>
        </Card>
      ))}
    </div>
  );
}
