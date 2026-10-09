import { useState } from 'react';
import { LifecycleBadge } from '../../components/horse/LifecycleBadge';
import { Btn } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { VetHealthFormPage } from './VetHealthFormPage';
import { getLifecycle } from '../../utils/horse';

export function PostExamPage({ state, navigate, onSave, onPostExam, onUnlock, onManualLock }) {
  const horses = state.horses.filter(h => h.clubId === state.user.clubId);
  const awaiting = horses.filter(h => getLifecycle(h) === 'awaiting_vet' && h.approvalStatus === 'approved');
  const pending = state.trainingSessions.filter(s => s.status === 'Completed' && !s.postExamDone && horses.some(h => h.id === s.horseId));
  const locked = horses.filter(h => h.lock);
  const [unlockNotes, setUnlockNotes] = useState({});
  const [errors, setErrors] = useState({});
  const [activeId, setActiveId] = useState(null);
  const lockable = horses.filter(h => !h.lock && getLifecycle(h) === 'training');
  const [manualHorseId, setManualHorseId] = useState(lockable[0]?.id || '');
  const [manualReason, setManualReason] = useState('');
  const [manualError, setManualError] = useState('');
  const activeSession = state.trainingSessions.find(x => x.id === activeId);

  if (activeSession) {
    return <VetHealthFormPage key={activeSession.id} state={state} navigate={navigate} onSave={onSave} onSaveRecord={() => {}} postSession={activeSession} onPostSubmit={onPostExam} onBack={() => setActiveId(null)} />;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div><h2 className="text-xl font-serif font-bold text-[#0f1729]">Khám sau tập & Khóa huấn luyện</h2><p className="text-sm text-gray-500">Chỉ Thú y mới có quyền kích hoạt và gỡ KHÓA HUẤN LUYỆN</p></div>

      <section className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">🩺 Chờ khám trước huấn luyện <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">{awaiting.length}</span></h3>
        {awaiting.length === 0 && <Card className="p-5 text-sm text-gray-400 text-center">Không có ngựa nào đang chờ khám</Card>}
        {awaiting.map(h => (
          <Card key={h.id} className="p-4 flex items-center gap-3">
            <img src={h.imageUrl} className="w-12 h-12 rounded-lg object-cover bg-gray-200" />
            <div className="flex-1"><div className="font-semibold">{h.name}</div><div className="text-xs text-gray-500">Chủ: {h.ownerName} · {h.breed} · {h.age}t</div></div>
            <LifecycleBadge horse={h} />
            <Btn variant="gold" size="sm" onClick={() => navigate('vet-health-form')}>Khám & ghi hồ sơ →</Btn>
          </Card>
        ))}
        <p className="text-xs text-gray-400">Trong form nhập liệu, kết quả "Đủ điều kiện huấn luyện" sẽ chuyển ngựa sang "Sẵn sàng huấn luyện" và báo cho Chủ ngựa.</p>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">🏇 Buổi tập chờ khám lại <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{pending.length}</span></h3>
        {pending.length === 0 && <Card className="p-5 text-sm text-gray-400 text-center">Chưa có buổi tập nào hoàn thành cần khám</Card>}
        {pending.map(s => {
          const h = state.horses.find(x => x.id === s.horseId);
          return (
            <Card key={s.id} className="p-4 flex items-center gap-3">
              <img src={h.imageUrl} className="w-11 h-11 rounded-lg object-cover bg-gray-200" />
              <div className="flex-1"><div className="font-semibold">{h.name} · {s.type} {s.distance}</div><div className="text-xs text-gray-500">{s.date} · {s.time} · HLV {s.trainerName}</div></div>
              <Btn variant="gold" size="sm" onClick={() => setActiveId(s.id)}>Khám sau tập chi tiết →</Btn>
            </Card>
          );
        })}
        <p className="text-xs text-gray-400">Khám sau tập dùng đúng biểu mẫu và tiêu chuẩn của khám định kỳ (sinh hiệu, lâm sàng, đánh giá tự động). Kết quả "Không đủ điều kiện" tự động KHÓA HUẤN LUYỆN.</p>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">Khóa thủ công</h3>
        <Card className="p-5 border-l-4 border-orange-400">
          <p className="text-sm text-gray-600 mb-4">Dùng khi Thú y cần dừng huấn luyện ngay dù hệ thống chưa tự động kết luận mức nặng.</p>
          {lockable.length === 0 ? (
            <p className="text-sm text-gray-400">Không có ngựa đang huấn luyện có thể khóa.</p>
          ) : (
            <div className="space-y-3">
              <Select label="Ngựa cần khóa" value={manualHorseId} onChange={setManualHorseId} options={lockable.map(h => ({ value: h.id, label: h.name }))} />
              <Textarea label="Lý do / chỉ định của Thú y" value={manualReason} onChange={setManualReason} rows={2} placeholder="VD: Khập khiễng tăng sau vận động, cần dừng tập để chẩn đoán hình ảnh" />
              {manualError && <div className="text-sm text-red-600">{manualError}</div>}
              <Btn variant="danger" onClick={() => {
                const err = onManualLock(manualHorseId, manualReason);
                setManualError(err || '');
                if (!err) setManualReason('');
              }}>Khóa huấn luyện thủ công</Btn>
            </div>
          )}
        </Card>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">🔒 Ngựa đang bị khóa <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{locked.length}</span></h3>
        {locked.length === 0 && <Card className="p-5 text-sm text-gray-400 text-center">Không có ngựa nào bị khóa</Card>}
        {locked.map(h => (
          <Card key={h.id} className="p-5 border-l-4 border-red-500">
            <div className="flex items-center gap-3 mb-3"><img src={h.imageUrl} className="w-11 h-11 rounded-lg object-cover bg-gray-200" /><div className="flex-1"><div className="font-semibold">{h.name}</div><div className="text-xs text-gray-500">Khóa {h.lock.lockedAt} · {h.lock.lockedByName}</div></div><LifecycleBadge horse={h} /></div>
            <div className="text-sm text-gray-700 mb-1"><strong>Chẩn đoán:</strong> {h.lock.reason}</div>
            {h.lock.notes && <div className="text-sm text-gray-500 mb-1">{h.lock.notes}</div>}
            <div className="text-xs text-gray-500 mb-3">{h.rehab ? `Gói phục hồi: ${h.rehab.name} (${h.rehab.durationWeeks} tuần)` : 'Chờ Quản lý kích hoạt gói phục hồi'}</div>
            <Textarea label="Cập nhật sức khỏe khi ngựa đủ điều kiện" value={unlockNotes[h.id] || ''} onChange={v => setUnlockNotes(n => ({ ...n, [h.id]: v }))} rows={2} placeholder="VD: Hết sưng, siêu âm gân bình thường, nhịp tim nghỉ 34 bpm — đủ điều kiện quay lại tập" />
            {errors[h.id] && <div className="text-sm text-red-600 mt-2">{errors[h.id]}</div>}
            <Btn variant="primary" className="mt-3" onClick={() => setErrors(e => ({ ...e, [h.id]: onUnlock(h.id, unlockNotes[h.id] || '') || '' }))}>🔓 Cập nhật sức khỏe & Gỡ khóa</Btn>
          </Card>
        ))}
      </section>
    </div>
  );
}
