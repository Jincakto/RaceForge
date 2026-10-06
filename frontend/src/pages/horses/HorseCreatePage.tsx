import { validateHorseFields } from '../../utils/ownerActions';
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
  const raceHistory: RaceHistoryEntry[] = [];
  const [error, setError] = useState('');
  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

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

    </div>
  );
}
