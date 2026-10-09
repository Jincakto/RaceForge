import { useState } from 'react';
import { Btn } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export function TrainerSelectPage({ user, state, navigate, onSelectTrainer }) {
  const horseId = state.trainerSelectHorseId;
  const horse = horseId ? state.horses.find(h => h.id === horseId) : null;
  const trainers = state.users.filter(u => u.role === 'head_trainer' && u.clubId === user.clubId);
  const [selected, setSelected] = useState('');
  return (
    <div className="space-y-5 max-w-2xl">
      <div><h2 className="text-xl font-serif font-bold">Chọn Head Trainer cho {horse?.name}</h2><p className="text-sm text-gray-500">Chọn huấn luyện viên sẽ phụ trách ngựa của bạn</p></div>
      {trainers.length === 0 && <Card className="p-10 text-center"><div className="text-4xl mb-3">🏇</div><div className="font-semibold text-gray-500">Trung tâm chưa có Head Trainer</div></Card>}
      {trainers.map(t => (
        <button key={t.id} onClick={() => setSelected(t.id)} className={`w-full p-5 rounded-xl border-2 text-left transition-all ${selected === t.id ? 'border-[#c9973b] bg-[#c9973b]/5' : 'border-gray-200 bg-white hover:border-[#c9973b]/50'}`}>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-[#1a2844] text-white flex items-center justify-center text-xl font-bold">{t.avatar}</div>
            <div className="flex-1">
              <div className="font-semibold text-lg">{t.name}</div>
              <div className="text-sm text-gray-500">{t.experience || 'Head Trainer'}</div>
              {t.certifications && <div className="text-xs text-[#c9973b] mt-1">📜 {t.certifications}</div>}
              {t.achievements && <div className="text-xs text-gray-500 mt-1">🏆 {t.achievements}</div>}
            </div>
            {selected === t.id && <div className="w-7 h-7 rounded-full bg-[#c9973b] flex items-center justify-center text-white text-sm">✓</div>}
          </div>
        </button>
      ))}
      <div className="flex gap-3"><Btn variant="secondary" onClick={() => navigate('my-horses')}>Bỏ qua</Btn><Btn variant="gold" disabled={!selected || !horseId} onClick={() => { if (selected && horseId) onSelectTrainer(horseId, selected); }}>Xác nhận →</Btn></div>
    </div>
  );
}
