import { type AppState, type Page } from '../../types/reference';
import { type Horse, computeTrainingSuggestion } from '../../data';
import { useState } from 'react';
import { sortHealthRecords } from '../../utils/trainingAlgorithm';
import { Badge } from '../../components/common/Badge';
import { Btn } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Textarea } from '../../components/common/Textarea';
import { ImageUpload } from '../../components/common/ImageUpload';
import { Select } from '../../components/common/Select';
import { TrainingAlgorithmTab } from '../../components/training/TrainingAlgorithmTab';

function HorseDetailContent({ state, navigate, onUpdateHorse, onShowSuccess }:
  { state: AppState; navigate: (p: Page) => void; onUpdateHorse: (h: Horse) => void; onShowSuccess: (m: string) => void }) {
  const user = state.user!;
  const horse = state.horses.find(h => h.id === state.selectedHorseId)!;
  const [tab, setTab] = useState('overview');
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: horse.name, biography: horse.biography, weight: String(horse.weight), height: String(horse.height), stable: horse.stable, stall: horse.stall, imageUrl: horse.imageUrl });
  const [newAch, setNewAch] = useState({ title: '', date: '', description: '', prize: '', position: '1' });
  const [showAchForm, setShowAchForm] = useState(false);
  const isOwner = false; // Editing is enabled in the next feature commit.

  const saveEdit = () => {
    onUpdateHorse({ ...horse, name: editForm.name, biography: editForm.biography, weight: Number(editForm.weight), height: Number(editForm.height), stable: editForm.stable, stall: editForm.stall, imageUrl: editForm.imageUrl });
    setEditMode(false); onShowSuccess('Đã cập nhật hồ sơ ngựa!');
  };

  const addAchievement = () => {
    if (!newAch.title) return;
    const updated: Horse = { ...horse, achievements: [...horse.achievements, { id: `a${Date.now()}`, title: newAch.title, date: newAch.date, description: newAch.description, prize: newAch.prize, position: Number(newAch.position) }] };
    onUpdateHorse(updated); setShowAchForm(false); setNewAch({ title: '', date: '', description: '', prize: '', position: '1' }); onShowSuccess('Đã thêm thành tích!');
  };

  const horseHealthRecords = sortHealthRecords(state.healthRecords.filter(r => r.horseId === horse.id));
  const latestHealth = horseHealthRecords[0];
  const suggestion = computeTrainingSuggestion(horse, latestHealth);

  const tabs = [['overview', 'Tổng quan'], ['health', 'Sức khỏe'], ['training', 'Tập luyện'], ['achievements', 'Thành tích'], ['race-history', 'Lịch sử đua'], ['ai-plan', '🤖 Giáo án AI']];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate('my-horses')} className="hover:text-[#c9973b]">Ngựa</button>
        <span>/</span><span className="text-[#0f1729] font-medium">{horse.name}</span>
      </div>
      <div className="relative rounded-xl overflow-hidden h-44">
        <img src={editMode ? editForm.imageUrl : horse.imageUrl} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f1729]/80 to-transparent" />
        <div className="absolute inset-0 flex items-end p-6">
          <div className="flex items-end gap-4 flex-1">
            <div>
              <div className="flex items-center gap-2 mb-1"><Badge status={horse.healthStatus} /><Badge status={horse.trainingStatus} />{horse.vetClearance && <span className="bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full">✓ Vet Cleared</span>}</div>
              <h2 className="text-white font-serif text-3xl font-bold">{horse.name}</h2>
              <p className="text-gray-300 text-sm">{horse.id} · {horse.breed} · {horse.age} tuổi · {horse.color}</p>
            </div>
            <div className="flex-1" />
            {isOwner && (
              <div className="flex gap-2">
                {editMode ? (
                  <><Btn variant="gold" onClick={saveEdit}>💾 Lưu</Btn><Btn variant="secondary" onClick={() => setEditMode(false)}>Huỷ</Btn></>
                ) : (
                  <Btn variant="gold" onClick={() => setEditMode(true)}>✏ Chỉnh sửa</Btn>
                )}
              </div>
            )}
            {user.role === 'veterinarian' && <Btn variant="gold" onClick={() => navigate('vet-health-form')}>🏥 Nhập khám</Btn>}
            {user.role === 'head_trainer' && <Btn variant="gold" onClick={() => navigate('training-hub')}>📋 Giáo án</Btn>}
          </div>
        </div>
      </div>
      <div className="flex gap-0 border-b border-gray-200 overflow-x-auto">
        {tabs.map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} className={`px-5 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap ${tab === t ? 'border-[#c9973b] text-[#c9973b]' : 'border-transparent text-gray-500 hover:text-[#0f1729]'}`}>{l}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2">
            <Card className="p-5">
              <h3 className="font-semibold mb-4">Thông tin ngựa</h3>
              {editMode ? (
                <div className="space-y-3">
                  <Input label="Tên ngựa" value={editForm.name} onChange={v => setEditForm(f => ({ ...f, name: v }))} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Cân nặng (kg)" value={editForm.weight} onChange={v => setEditForm(f => ({ ...f, weight: v }))} type="number" />
                    <Input label="Chiều cao (cm)" value={editForm.height} onChange={v => setEditForm(f => ({ ...f, height: v }))} type="number" />
                    <Input label="Chuồng" value={editForm.stable} onChange={v => setEditForm(f => ({ ...f, stable: v }))} />
                    <Input label="Ô" value={editForm.stall} onChange={v => setEditForm(f => ({ ...f, stall: v }))} />
                  </div>
                  <Textarea label="Lý lịch ngựa" value={editForm.biography} onChange={v => setEditForm(f => ({ ...f, biography: v }))} rows={3} />
                  <ImageUpload value={editForm.imageUrl} onChange={v => setEditForm(f => ({ ...f, imageUrl: v }))} onRemove={() => setEditForm(f => ({ ...f, imageUrl: '' }))} />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-4">
                    {[['Giống', horse.breed], ['Giới tính', horse.gender], ['Tuổi', `${horse.age} tuổi`], ['Màu lông', horse.color], ['Cân nặng', `${horse.weight} kg`], ['Chiều cao', `${horse.height} cm`], ['Chuồng', horse.stable], ['Ô', horse.stall]].map(([k, v]) => (
                      <div key={k as string} className="flex gap-2"><span className="text-sm text-gray-500 w-24">{k as string}</span><span className="text-sm font-medium">{v as string}</span></div>
                    ))}
                  </div>
                  {horse.biography && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 italic">"{horse.biography}"</p>}
                </>
              )}
            </Card>
          </div>
          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="font-semibold mb-4">Nhân sự phụ trách</h3>
              {[['🏇', 'Head Trainer', horse.headTrainerName || '—'], ['🩺', 'Thú y', horse.vetName || '—'], ['🧹', 'Groom', horse.groomName || '—'], ['👤', 'Chủ ngựa', horse.ownerName]].map(([ic, r, n]) => (
                <div key={r as string} className="flex items-center gap-3 mb-3"><span className="text-base">{ic}</span><div><div className="text-xs text-gray-500">{r as string}</div><div className="text-sm font-medium">{n as string}</div></div></div>
              ))}
            </Card>
            <Card className="p-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[['Đua', horse.totalRaces, 'text-[#0f1729]'], ['Thắng', horse.wins, 'text-emerald-700'], [`${horse.totalRaces > 0 ? Math.round(horse.wins / horse.totalRaces * 100) : 0}%`, 'Win', 'text-[#c9973b]']].map(([v, l, c]) => (
                  <div key={l as string} className="p-2 bg-gray-50 rounded-lg"><div className={`text-xl font-serif font-bold ${c}`}>{v}</div><div className="text-xs text-gray-500">{l as string}</div></div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'health' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="font-semibold">Lịch sử sức khỏe</h3>
            <div className="flex gap-2">
              <Btn variant="secondary" onClick={() => navigate('health-records')}>Xem đầy đủ →</Btn>
              {user.role === 'veterinarian' && <Btn variant="gold" onClick={() => navigate('vet-health-form')}>+ Thêm khám mới</Btn>}
            </div>
          </div>
          {latestHealth && (
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-1">Khám gần nhất</div>
          )}
          {horseHealthRecords.map((r, idx) => (
            <Card key={r.id} className={`p-4 ${idx === 0 ? 'border-[#c9973b] border-2' : ''}`}>
              {idx === 0 && <div className="text-xs font-semibold text-[#c9973b] mb-2 flex items-center gap-1">🩺 Khám gần nhất</div>}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <div className="font-medium">{r.type}</div>
                    {r.isPostTraining && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Sau tập</span>}
                    {r.autoEvaluation === 'pass'  && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">✓ Đạt chuẩn</span>}
                    {r.autoEvaluation === 'watch' && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">⚠ Cần theo dõi</span>}
                    {r.autoEvaluation === 'fail'  && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">✕ Không đủ điều kiện</span>}
                  </div>
                  <div className="text-sm text-gray-500">{r.date} · {r.vet}</div>
                  {r.trainingEligibility && (
                    <div className="mt-1 text-xs">
                      {r.trainingEligibility === 'eligible'    && <span className="text-emerald-700">🟢 Đủ điều kiện huấn luyện</span>}
                      {r.trainingEligibility === 'conditional' && <span className="text-amber-700">🟡 Huấn luyện có điều kiện</span>}
                      {r.trainingEligibility === 'not-eligible' && <span className="text-red-700">🔴 Không đủ điều kiện huấn luyện</span>}
                    </div>
                  )}
                  {r.vitals && <div className="mt-2 grid grid-cols-3 gap-2 text-xs">{[['Nhịp tim', r.vitals.heartRate + ' bpm'], ['Nhiệt độ', r.vitals.temperature + '°C'], ['Nhịp thở', r.vitals.respRate + '/p']].map(([k, v]) => v.trim() !== 'bpm' && v.trim() !== '°C' && v.trim() !== '/p' ? <div key={k as string} className="bg-gray-50 p-1.5 rounded text-center"><div className="text-gray-400">{k as string}</div><div className="font-medium">{v as string}</div></div> : null)}</div>}
                  {r.notes && <div className="text-sm text-gray-600 mt-1">{r.notes}</div>}
                </div>
                <Badge status={r.result} />
              </div>
            </Card>
          ))}
          {horseHealthRecords.length === 0 && (
            <Card className="p-8 text-center">
              <div className="text-gray-400 text-sm mb-2">Chưa có hồ sơ khám nào</div>
              {user.role === 'veterinarian' && <Btn variant="gold" onClick={() => navigate('vet-health-form')}>Nhập khám đầu tiên</Btn>}
            </Card>
          )}
        </div>
      )}

      {tab === 'training' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center"><h3 className="font-semibold">Giáo án huấn luyện</h3><Btn variant="gold" onClick={() => setTab('ai-plan')}>Xem giáo án AI →</Btn></div>
          {state.trainingPlans.filter(p => p.horseId === horse.id).map(p => (
            <Card key={p.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex gap-2 mb-2"><Badge status={p.phase} /><Badge status={p.status} /></div>
                  <div className="font-semibold">{p.phase}</div>
                  <div className="text-sm text-gray-500">{p.startDate} → {p.endDate} · {p.distance} · {p.workload}</div>
                  <div className="text-sm text-gray-600">Mục tiêu: {p.goals}</div>
                  {p.algorithmRationale && <div className="text-xs text-[#c9973b] mt-1">🤖 {p.algorithmRationale}</div>}
                  <div className="mt-2"><div className="flex justify-between text-xs text-gray-500 mb-1"><span>Tiến độ</span><span>{p.progress}%</span></div><div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-[#c9973b] h-2 rounded-full" style={{ width: `${p.progress}%` }} /></div></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'achievements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Thành tích của {horse.name}</h3>
            {isOwner && <Btn variant="gold" onClick={() => setShowAchForm(!showAchForm)}>+ Thêm thành tích</Btn>}
          </div>
          {showAchForm && isOwner && (
            <Card className="p-5 border-l-4 border-[#c9973b]">
              <h4 className="font-semibold mb-3">Thêm thành tích mới</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Input label="Tên giải / Sự kiện" value={newAch.title} onChange={v => setNewAch(a => ({ ...a, title: v }))} placeholder="VD: Saigon Sprint Cup" required /></div>
                <Input label="Ngày" value={newAch.date} onChange={v => setNewAch(a => ({ ...a, date: v }))} placeholder="VD: 10/09/2026" />
                <Select label="Hạng đạt được" value={newAch.position} onChange={v => setNewAch(a => ({ ...a, position: v }))} options={['1', '2', '3', '4', '5'].map(v => ({ value: v, label: `Hạng ${v}` }))} />
                <Input label="Giải thưởng" value={newAch.prize} onChange={v => setNewAch(a => ({ ...a, prize: v }))} placeholder="VD: 50,000,000 VND" />
                <div className="col-span-2"><Textarea label="Mô tả" value={newAch.description} onChange={v => setNewAch(a => ({ ...a, description: v }))} placeholder="Mô tả thành tích..." /></div>
              </div>
              <div className="flex gap-2 mt-3"><Btn variant="gold" onClick={addAchievement} disabled={!newAch.title}>✓ Lưu</Btn><Btn variant="secondary" onClick={() => setShowAchForm(false)}>Huỷ</Btn></div>
            </Card>
          )}
          {horse.achievements.length === 0 && <Card className="p-10 text-center"><div className="text-4xl mb-3">🏆</div><div className="text-gray-500 font-semibold">Chưa có thành tích</div>{isOwner && <div className="text-sm text-gray-400 mt-1">Nhấn "+ Thêm thành tích" để ghi nhận</div>}</Card>}
          {horse.achievements.map(a => (
            <Card key={a.id} className="p-5">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 ${a.position === 1 ? 'bg-[#c9973b] text-white' : a.position === 2 ? 'bg-gray-400 text-white' : 'bg-amber-700 text-white'}`}>#{a.position}</div>
                <div className="flex-1"><div className="font-semibold">{a.title}</div><div className="text-sm text-gray-500">{a.date}</div><div className="text-sm text-gray-600 mt-1">{a.description}</div>{a.prize && <div className="text-emerald-600 text-sm font-medium mt-1">🏆 {a.prize}</div>}</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'race-history' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center"><h3 className="font-semibold">Lịch sử đua</h3><div className="text-sm text-gray-500">{horse.totalRaces} lần đua · {horse.wins} lần thắng</div></div>
          {horse.raceHistory.length === 0 && <Card className="p-10 text-center"><div className="text-4xl mb-3">🏁</div><div className="text-gray-500">Chưa có lịch sử đua</div></Card>}
          {horse.raceHistory.map(r => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${r.position === 1 ? 'bg-[#c9973b] text-white' : r.position <= 3 ? 'bg-gray-400 text-white' : 'bg-gray-200 text-gray-600'}`}>{r.position === 1 ? '🥇' : `#${r.position}`}</div>
                <div className="flex-1">
                  <div className="font-semibold">{r.raceName}</div>
                  <div className="text-sm text-gray-500">{r.date} · {r.venue} · {r.distance}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Jockey: {r.jockey} · {r.totalHorses} ngựa tham dự · TG: {r.time}</div>
                </div>
                <div className="text-right"><div className={`text-lg font-mono font-bold ${r.position === 1 ? 'text-[#c9973b]' : 'text-gray-700'}`}>{r.time}</div>{r.prize !== '0 VND' && <div className="text-sm text-emerald-600 font-medium">{r.prize}</div>}</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'ai-plan' && <TrainingAlgorithmTab horse={horse} suggestion={suggestion} latestHealth={latestHealth} />}
    </div>
  );
}

export function HorseDetailPage(props: Parameters<typeof HorseDetailContent>[0]) {
  const horse = props.state.horses.find(item => item.id === props.state.selectedHorseId && item.ownerId === props.state.user?.id);
  if (!horse) return <Card className="p-10 text-center"><p>Không tìm thấy ngựa của bạn.</p><Btn variant="gold" onClick={() => props.navigate('my-horses')}>Về Ngựa của tôi</Btn></Card>;
  return <HorseDetailContent key={horse.id} {...props} />;
}
