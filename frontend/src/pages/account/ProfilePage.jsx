import { useState } from 'react';
import { Btn } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { ROLE_LABELS } from '../../data/constants';

export function ProfilePage({ user, state, navigate, onLogout, onSave }) {
  const [name, setName] = useState(user.name);
  const myClub = state.clubs.find(c => c.id === user.clubId);
  return (
    <div className="space-y-5 max-w-2xl">
      <h2 className="text-xl font-serif font-bold">Hồ sơ cá nhân</h2>
      <Card className="p-6">
        <div className="flex items-center gap-5 mb-6"><div className="w-20 h-20 rounded-full bg-[#1a2844] text-white flex items-center justify-center text-2xl font-bold">{user.avatar}</div><div><div className="text-xl font-semibold">{user.name}</div><div className="text-sm text-gray-500">{user.role ? ROLE_LABELS[user.role] : 'Chưa có vai trò'}</div>{myClub && <div className="text-sm text-[#c9973b] font-medium">🏛 {myClub.name}</div>}</div></div>
        <div className="grid grid-cols-2 gap-4"><Input label="Họ và tên" value={name} onChange={setName} /><Input label="Email" value={user.email} onChange={() => {}} />{user.phone && <Input label="Điện thoại" value={user.phone} onChange={() => {}} />}</div>
        {user.bio && <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 italic">"{user.bio}"</div>}
        {user.experience && <div className="mt-3"><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Kinh nghiệm</div><div className="text-sm text-gray-700">{user.experience}</div></div>}
        {user.certifications && <div className="mt-3"><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Chứng chỉ</div><div className="text-sm text-gray-700">{user.certifications}</div></div>}
        <Btn variant="gold" className="mt-4" onClick={() => onSave('Cập nhật hồ sơ thành công!')}>💾 Lưu</Btn>
      </Card>
      {myClub && <Card className="p-5"><h3 className="font-semibold mb-3">Trung tâm của tôi</h3><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-[#1a2844] text-white flex items-center justify-center font-serif font-bold text-lg">{myClub.logoLetter}</div><div><div className="font-semibold">{myClub.name}</div><div className="text-sm text-gray-500">📍 {myClub.location} · Thành lập {myClub.founded}</div></div></div></Card>}
      <Btn variant="danger" onClick={onLogout}>Đăng xuất</Btn>
    </div>
  );
}
