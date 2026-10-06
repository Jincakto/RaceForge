import { validateHorseFields, validDisplayDate } from '../../utils/ownerActions';
import { type AppUser, type Horse, type RaceHistoryEntry } from '../../data';
import { type AppState, type Page } from '../../types/reference';
import { useState } from 'react';
import { Btn } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Textarea } from '../../components/common/Textarea';
import { ImageUpload } from '../../components/common/ImageUpload';

export function HorseCreatePage({ user, state, navigate, onCreateHorse }:
  { user: AppUser; state: AppState; navigate: (p: Page) => void; onCreateHorse: (h: Horse) => void }) {
  const [form, setForm] = useState({ name: '', breed: 'Thoroughbred', age: '3', color: '', gender: 'Stallion', weight: '', height: '', biography: '', imageUrl: '' });
  const [raceHistory, setRaceHistory] = useState<RaceHistoryEntry[]>([]);
  const [showRaceForm, setShowRaceForm] = useState(false);
  const [newRace, setNewRace] = useState({ date: '', raceName: '', distance: '1200m', position: '1', totalHorses: '10', time: '', venue: '', jockey: '', prize: '' });
  const [error, setError] = useState('');
  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const addRace = () => {
    if (!newRace.raceName.trim() || !validDisplayDate(newRace.date)) { setError('Nhập tên giải và ngày đua dạng DD/MM/YYYY.'); return; }
    if (Number(newRace.position) > Number(newRace.totalHorses)) { setError('Thứ hạng không thể lớn hơn số ngựa tham gia.'); return; }
    setError('');
    setRaceHistory(r => [...r, { id: crypto.randomUUID(), ...newRace, raceName: newRace.raceName.trim(), position: Number(newRace.position), totalHorses: Number(newRace.totalHorses) }]);
    setNewRace({ date: '', raceName: '', distance: '1200m', position: '1', totalHorses: '10', time: '', venue: '', jockey: '', prize: '' });
    setShowRaceForm(false);
  };

  const handle = () => {
    const invalid = validateHorseFields({ name: form.name, color: form.color, age: Number(form.age), weight: Number(form.weight), height: Number(form.height) });
    if (invalid) { setError(invalid); return; }
    const id = `RH-${crypto.randomUUID()}`;
    onCreateHorse({
      id, name: form.name, breed: form.breed, age: Number(form.age), color: form.color, gender: form.gender,
      weight: Number(form.weight), height: Number(form.height), stable: '', stall: '', clubId: null,
      ownerId: user.id, ownerName: user.name, headTrainerId: '', headTrainerName: '',
      vetId: '', vetName: '', groomId: '', groomName: '',
      healthStatus: 'Pending Vet', trainingStatus: 'Pending Approval', approvalStatus: 'pending',
      registrationDate: new Date().toLocaleDateString('vi-VN'), approvedAt: null, totalRaces: raceHistory.length,
      wins: raceHistory.filter(r => r.position === 1).length,
      vetClearance: false, biography: form.biography, imageUrl: form.imageUrl, achievements: [], raceHistory,
    });
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-gray-500"><button onClick={() => navigate('my-horses')} className="hover:text-[#c9973b]">Ngựa của tôi</button><span>/</span><span className="font-medium text-[#0f1729]">Đăng ký ngựa mới</span></div>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-serif font-bold text-[#0f1729]">Đăng ký hồ sơ ngựa</h2><p className="text-sm text-gray-500">Hồ sơ sẽ chờ Quản lý duyệt trước khi vào trung tâm</p></div>
        <div className="flex gap-2"><Btn variant="secondary" onClick={() => navigate('my-horses')}>Huỷ</Btn><Btn variant="gold" onClick={handle}>Gửi đăng ký →</Btn></div>
      </div>

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold text-[#0f1729]">Thông tin cơ bản</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Input label="Tên ngựa" value={form.name} onChange={set('name')} placeholder="VD: Silver Arrow" required /></div>
          <Select label="Giống ngựa" value={form.breed} onChange={set('breed')} options={['Thoroughbred', 'Arabian', 'Quarter Horse', 'Warmblood', 'Appaloosa'].map(v => ({ value: v, label: v }))} />
          <Select label="Giới tính" value={form.gender} onChange={set('gender')} options={[{ value: 'Stallion', label: 'Đực (Stallion)' }, { value: 'Mare', label: 'Cái (Mare)' }, { value: 'Gelding', label: 'Thiến (Gelding)' }]} />
          <Input label="Tuổi" value={form.age} onChange={set('age')} type="number" required />
          <Input label="Màu lông" value={form.color} onChange={set('color')} placeholder="Bay, Grey, Chestnut..." required />
          <Input label="Cân nặng (kg)" value={form.weight} onChange={set('weight')} type="number" placeholder="500" required />
          <Input label="Chiều cao (cm)" value={form.height} onChange={set('height')} type="number" placeholder="160" required />
          <div className="col-span-2"><Textarea label="Lý lịch ngựa" value={form.biography} onChange={set('biography')} placeholder="Nguồn gốc, huyết thống, đặc điểm nổi bật..." /></div>
          <div className="col-span-2"><ImageUpload value={form.imageUrl} onChange={v => setForm(f => ({ ...f, imageUrl: v }))} onRemove={() => setForm(f => ({ ...f, imageUrl: '' }))} /></div>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </Card>

      {/* Race History */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div><h3 className="font-semibold text-[#0f1729]">Lịch sử đua (nộp kèm hồ sơ)</h3><p className="text-xs text-gray-400 mt-0.5">Không bắt buộc — cung cấp để trung tâm đánh giá tốt hơn</p></div>
          <Btn variant="secondary" onClick={() => setShowRaceForm(!showRaceForm)}>+ Thêm kết quả</Btn>
        </div>
        {showRaceForm && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Tên giải đua" value={newRace.raceName} onChange={v => setNewRace(r => ({ ...r, raceName: v }))} placeholder="VD: Saigon Sprint Cup" />
              <Input label="Ngày đua" value={newRace.date} onChange={v => setNewRace(r => ({ ...r, date: v }))} placeholder="VD: 10/09/2026" />
              <Select label="Cự ly" value={newRace.distance} onChange={v => setNewRace(r => ({ ...r, distance: v }))} options={['800m', '1000m', '1200m', '1400m', '1600m', '2000m'].map(v => ({ value: v, label: v }))} />
              <Select label="Hạng đạt" value={newRace.position} onChange={v => setNewRace(r => ({ ...r, position: v }))} options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Hạng ${i + 1}` }))} />
              <Input label="Thời gian" value={newRace.time} onChange={v => setNewRace(r => ({ ...r, time: v }))} placeholder="VD: 1:11.24" />
              <Input label="Trường đua" value={newRace.venue} onChange={v => setNewRace(r => ({ ...r, venue: v }))} placeholder="VD: Phú Thọ Racecourse" />
              <Input label="Jockey" value={newRace.jockey} onChange={v => setNewRace(r => ({ ...r, jockey: v }))} placeholder="Tên jockey" />
              <Input label="Giải thưởng" value={newRace.prize} onChange={v => setNewRace(r => ({ ...r, prize: v }))} placeholder="VD: 50,000,000 VND" />
            </div>
            <div className="flex gap-2"><Btn variant="gold" onClick={addRace} disabled={!newRace.raceName}>✓ Thêm</Btn><Btn variant="secondary" onClick={() => setShowRaceForm(false)}>Huỷ</Btn></div>
          </div>
        )}
        {raceHistory.length > 0 ? raceHistory.map(r => (
          <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100 mb-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${r.position === 1 ? 'bg-[#c9973b] text-white' : 'bg-gray-400 text-white'}`}>#{r.position}</div>
            <div className="flex-1"><div className="text-sm font-medium">{r.raceName}</div><div className="text-xs text-gray-500">{r.date} · {r.distance} · {r.time}</div></div>
            <button onClick={() => setRaceHistory(h => h.filter(x => x.id !== r.id))} className="text-red-400 hover:text-red-600 text-xs">✕ Xóa</button>
          </div>
        )) : <div className="text-center py-4 text-gray-400 text-sm">Chưa có lịch sử đua — Nhấn "+ Thêm kết quả" để nộp kèm</div>}
      </Card>
    </div>
  );
}
