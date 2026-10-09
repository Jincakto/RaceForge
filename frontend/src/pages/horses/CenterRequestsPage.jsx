import { useState } from 'react';
import { PedigreeBlock } from '../../components/horse/PedigreeBlock';
import { Badge } from '../../components/ui/Badge';
import { Btn } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export function CenterRequestsPage({ state, navigate, onApprove, onReject }) {
  const myClub = state.clubs.find(c => c.managerId === state.user.id);
  const pending = state.horseClubRequests.filter(r => r.clubId === myClub?.id && r.status === 'pending');
  const reviewed = state.horseClubRequests.filter(r => r.clubId === myClub?.id && r.status !== 'pending');
  const [notes, setNotes] = useState({});
  return (
    <div className="space-y-6 max-w-3xl">
      <div><h2 className="text-xl font-serif font-bold text-[#0f1729]">Duyệt đăng ký ngựa</h2><p className="text-sm text-gray-500">{pending.length} đơn chờ · Tự từ chối sau 7 ngày</p></div>
      {pending.length === 0 && <Card className="p-10 text-center"><div className="text-4xl mb-3">🐎</div><div className="font-semibold text-gray-600">Không có đơn nào đang chờ</div></Card>}
      {pending.map(req => {
        const horse = state.horses.find(h => h.id === req.horseId);
        return (
          <Card key={req.id} className="overflow-hidden">
            {horse?.imageUrl && <div className="relative h-28"><img src={horse.imageUrl} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-[#0f1729]/80 to-transparent" /><div className="absolute inset-0 flex items-center px-5"><div><div className="text-white font-serif text-xl font-bold">{req.horseName}</div><div className="text-gray-300 text-sm">{req.horseBreed} · Chủ: {req.ownerName}</div></div></div></div>}
            <div className="p-5">
              {horse && <div className="grid grid-cols-3 gap-3 mb-4 text-sm">{[['Giống', horse.breed], ['Tuổi', `${horse.age}t`], ['Màu', horse.color], ['Cân', `${horse.weight}kg`], ['Cao', `${horse.height}cm`], ['Đua', `${horse.totalRaces}R / ${horse.wins}T`]].map(([k, v]) => <div key={k}><div className="text-gray-400 text-xs">{k}</div><div className="font-medium">{v}</div></div>)}</div>}
              {horse?.biography && <p className="text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded-lg italic">"{horse.biography}"</p>}
              {horse && <div className="mb-4"><PedigreeBlock horse={horse} /></div>}
              {horse && horse.raceHistory.length > 0 && (
                <div className="mb-4"><div className="text-xs font-semibold text-gray-500 uppercase mb-2">Lịch sử đua (do chủ ngựa nộp)</div>
                  {horse.raceHistory.slice(0, 3).map(r => <div key={r.id} className="flex items-center gap-2 text-xs text-gray-600 mb-1"><span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${r.position === 1 ? 'bg-[#c9973b]' : 'bg-gray-400'}`}>#{r.position}</span><span>{r.raceName} · {r.date} · {r.distance}</span></div>)}
                </div>
              )}
              <div className="text-xs text-gray-400 mb-4">Nộp {req.submittedAt} · Hết hạn {req.expiresAt}</div>
              <div className="flex gap-3">
                <Btn variant="gold" onClick={() => onApprove(req.id)}>✓ Chấp thuận</Btn>
                <div className="flex-1 flex gap-2">
                  <input value={notes[req.id] || ''} onChange={e => setNotes(p => ({ ...p, [req.id]: e.target.value }))} placeholder="Lý do từ chối (tuỳ chọn)..." className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                  <Btn variant="danger" onClick={() => onReject(req.id, notes[req.id] || '')}>✕ Từ chối</Btn>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
      {reviewed.length > 0 && <><h3 className="font-semibold mt-4">Đã xử lý</h3>{reviewed.map(req => <Card key={req.id} className="p-4 mb-2"><div className="flex items-center gap-3"><img src={req.horseImageUrl} className="w-12 h-12 rounded-xl object-cover" /><div className="flex-1"><div className="font-semibold">{req.horseName}</div><div className="text-xs text-gray-500">Chủ: {req.ownerName} · {req.submittedAt}</div>{req.reviewNote && <div className="text-xs text-gray-400 italic">"{req.reviewNote}"</div>}</div><Badge status={req.status} /></div></Card>)}</>}
    </div>
  );
}
