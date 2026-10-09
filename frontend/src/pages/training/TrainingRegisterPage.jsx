import { useState } from 'react';
import { LifecycleBadge } from '../../components/horse/LifecycleBadge';
import { Badge } from '../../components/ui/Badge';
import { Btn } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { TRAINING_PACKAGES } from '../../data/constants';
import { getLifecycle } from '../../utils/horse';

export function TrainingRegisterPage({ state, navigate, onEnroll }) {
  const user = state.user;
  const myHorses = state.horses.filter(h => h.ownerId === user.id && h.clubId === user.clubId);
  const [horseId, setHorseId] = useState(myHorses.find(h => getLifecycle(h) === 'ready')?.id || myHorses[0]?.id || '');
  const [pkgId, setPkgId] = useState('');
  const [error, setError] = useState('');
  const horse = myHorses.find(h => h.id === horseId);
  const enrollment = horse ? state.enrollments.find(e => e.horseId === horse.id && e.status !== 'completed') : undefined;
  const lc = horse ? getLifecycle(horse) : 'pending';

  const blockedReason = {
    pending: 'Hồ sơ ngựa đang chờ Quản lý duyệt.',
    awaiting_vet: 'Ngựa đang chờ Thú y khám sức khỏe và xác nhận "Đủ điều kiện huấn luyện".',
    ready: '', training: '', locked: '', rehab: '',
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div><h2 className="text-xl font-serif font-bold text-[#0f1729]">Đăng ký huấn luyện</h2><p className="text-sm text-gray-500">Chỉ ngựa "Sẵn sàng huấn luyện" mới đăng ký được · Mỗi ngựa chọn đúng một gói</p></div>
      {myHorses.length === 0 ? (
        <Card className="p-10 text-center"><div className="text-4xl mb-3">🐎</div><div className="font-semibold text-gray-600 mb-3">Bạn chưa có ngựa nào trong trung tâm</div><Btn variant="gold" onClick={() => navigate('horse-create')}>+ Đăng ký ngựa mới</Btn></Card>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          <div className="space-y-2">
            {myHorses.map(h => {
              const en = state.enrollments.find(e => e.horseId === h.id && e.status !== 'completed');
              return (
                <button key={h.id} onClick={() => { setHorseId(h.id); setPkgId(''); setError(''); }} className={`w-full text-left p-3 rounded-xl border-2 transition-all bg-white ${horseId === h.id ? 'border-[#c9973b]' : 'border-gray-200 hover:border-[#c9973b]/50'}`}>
                  <div className="flex items-center gap-3"><img src={h.imageUrl} className="w-11 h-11 rounded-lg object-cover bg-gray-200" /><div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{h.name}</div><div className="mt-1"><LifecycleBadge horse={h} /></div></div></div>
                  {en && <div className="text-xs text-gray-500 mt-2">Gói {en.packageName} · {en.sessionsDone}/{en.sessionsTotal} buổi</div>}
                </button>
              );
            })}
          </div>
          <div className="col-span-2 space-y-4">
            {horse && enrollment && (
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-1"><h3 className="font-semibold">{horse.name} · Gói {enrollment.packageName}</h3><Badge status={enrollment.status === 'paused' ? 'Paused' : 'Active'} /></div>
                <div className="text-sm text-gray-500">Head Trainer phụ trách (tự động phân công): <strong className="text-[#0f1729]">{enrollment.trainerName}</strong></div>
                <div className="mt-3"><div className="flex justify-between text-xs text-gray-500 mb-1"><span>Đã tập {enrollment.sessionsDone}/{enrollment.sessionsTotal} buổi</span><span>Còn {enrollment.sessionsTotal - enrollment.sessionsDone} buổi</span></div><div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-[#c9973b] h-2 rounded-full" style={{ width: `${Math.round(enrollment.sessionsDone / enrollment.sessionsTotal * 100)}%` }} /></div></div>
                {enrollment.status === 'paused' && horse.lock && <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">🔒 Gói huấn luyện đang tạm dừng (không hủy, giữ nguyên tiến độ). Tình trạng: {horse.lock.reason}{horse.rehab ? ` · Đang phục hồi: ${horse.rehab.name}` : ''}</div>}
                <div className="mt-3 text-xs text-gray-400">Mỗi ngựa chỉ có một gói huấn luyện tại một thời điểm.</div>
              </Card>
            )}
            {horse && !enrollment && lc !== 'ready' && (
              <Card className="p-8 text-center"><div className="text-4xl mb-3">⏳</div><div className="font-semibold text-gray-700 mb-1">{horse.name} chưa thể đăng ký huấn luyện</div><div className="text-sm text-gray-500">{blockedReason[lc] || 'Ngựa chưa ở trạng thái "Sẵn sàng huấn luyện".'}</div><div className="mt-3"><LifecycleBadge horse={horse} /></div></Card>
            )}
            {horse && !enrollment && lc === 'ready' && (
              <>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">✓ {horse.name} đã được Thú y xác nhận đủ điều kiện. Chọn một gói — hệ thống sẽ tự động gán Head Trainer.</div>
                <div className="grid grid-cols-3 gap-3">
                  {TRAINING_PACKAGES.map(p => (
                    <button key={p.id} onClick={() => { setPkgId(p.id); setError(''); }} className={`relative text-left p-4 rounded-xl border-2 transition-all bg-white ${pkgId === p.id ? 'border-[#c9973b] bg-[#c9973b]/5 shadow-md' : 'border-gray-200 hover:border-[#c9973b]/50'}`}>
                      {p.popular && <span className="absolute -top-2.5 left-4 bg-[#c9973b] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">PHỔ BIẾN</span>}
                      <div className="flex items-center justify-between"><div className="font-serif font-bold text-lg">{p.name}</div>{pkgId === p.id && <span className="w-6 h-6 rounded-full bg-[#c9973b] text-white text-xs flex items-center justify-center">✓</span>}</div>
                      <div className="text-xs text-gray-500 mt-0.5 mb-3">{p.tagline}</div>
                      <div className="text-sm font-semibold text-[#1a2844]">{p.sessions} buổi · {p.weeks} tuần</div>
                      <div className="text-sm text-[#c9973b] font-medium mb-3">{p.price}</div>
                      <ul className="space-y-1">{p.focus.map(f => <li key={f} className="text-xs text-gray-600 flex gap-1.5"><span className="text-emerald-500">✓</span>{f}</li>)}</ul>
                    </button>
                  ))}
                </div>
                {error && <div className="text-sm text-red-600">{error}</div>}
                <div className="flex items-center gap-3"><Btn variant="gold" disabled={!pkgId} onClick={() => setError(onEnroll(horse.id, pkgId) || '')}>Xác nhận gói huấn luyện →</Btn><span className="text-xs text-gray-400">Sau khi xác nhận không thể chọn thêm gói khác cho ngựa này.</span></div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
