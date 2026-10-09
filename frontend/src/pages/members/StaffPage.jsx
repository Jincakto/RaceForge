import { useState } from 'react';
import { PermissionsModal } from '../../components/staff/PermissionsModal';
import { Badge } from '../../components/ui/Badge';
import { Btn } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ROLE_LABELS } from '../../data/constants';
import { NAV_ITEMS } from '../../data/navigation';

export function StaffPage({ state, navigate, onUpdatePermissions }) {
  const myClub = state.clubs.find(c => c.managerId === state.user.id);
  const members = state.users.filter(u => u.clubId === myClub?.id && u.id !== state.user.id);
  const [permModalUserId, setPermModalUserId] = useState(null);
  const permMember = members.find(m => m.id === permModalUserId);
  const rolePages = (role) => new Set((role ? NAV_ITEMS[role] || [] : []).map(i => i.page));
  const grantedPages = (userId) => state.userPermissions[userId] || [];

  const handleToggle = (userId, page) => {
    const current = grantedPages(userId);
    const next = current.includes(page) ? current.filter(p => p !== page) : [...current, page];
    onUpdatePermissions(userId, next);
  };

  return (
    <>
      {permMember && (
        <PermissionsModal
          member={permMember}
          grantedPages={grantedPages(permMember.id)}
          rolePages={rolePages(permMember.role)}
          onToggle={p => handleToggle(permMember.id, p)}
          onClose={() => setPermModalUserId(null)}
        />
      )}
      <div className="space-y-5">
        <div className="flex items-center justify-between"><div><h2 className="text-xl font-serif font-bold">Nhân sự</h2><p className="text-sm text-gray-500">{members.length} thành viên</p></div><Btn variant="gold" onClick={() => navigate('member-requests')}>📨 Yêu cầu tham gia</Btn></div>
        <div className="grid grid-cols-2 gap-4">
          {members.map(m => {
            const extraCount = grantedPages(m.id).filter(p => !rolePages(m.role).has(p)).length;
            return (
              <Card key={m.id} className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#1a2844] text-white flex items-center justify-center font-bold">{m.avatar}</div>
                  <div className="flex-1">
                    <div className="font-semibold">{m.name}</div>
                    <div className="text-sm text-gray-500">{m.role ? ROLE_LABELS[m.role] : 'Chưa phân công'}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{m.email}</div>
                    {m.experience && <div className="text-xs text-[#c9973b] mt-1">{m.experience.split(' · ')[0]}</div>}
                    {extraCount > 0 && <div className="text-xs text-emerald-600 mt-1">+{extraCount} trang được cấp thêm</div>}
                  </div>
                  {m.role && <Badge status={m.role} />}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <Btn variant="secondary" size="sm" onClick={() => setPermModalUserId(m.id)}>🔑 Cấp quyền truy cập</Btn>
                </div>
              </Card>
            );
          })}
        </div>
        {members.length === 0 && <Card className="p-10 text-center"><div className="text-4xl mb-3">👥</div><div className="font-semibold text-gray-600">Chưa có thành viên nào</div><div className="text-sm text-gray-400 mt-1">Duyệt yêu cầu tham gia để thêm nhân sự</div></Card>}
      </div>
    </>
  );
}
