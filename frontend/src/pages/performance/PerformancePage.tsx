import { type Horse } from '../../data';
import { useState } from 'react';
import { StatCard } from '../../components/common/StatCard';
import { Card } from '../../components/common/Card';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { PERFORMANCE_DATA } from '../../data';

export function PerformancePage({ horses }: { horses: Horse[] }) {
  const [selected, setSelected] = useState(horses[0]?.id || '');
  const horse = horses.find(item => item.id === selected) || horses[0];
  if (!horse) return <Card className="p-10 text-center">Chưa có ngựa để xem hiệu suất.</Card>;
  const radar = [{ subject: 'Tốc độ', A: 92 }, { subject: 'Sức bền', A: 85 }, { subject: 'Sức mạnh', A: 80 }, { subject: 'Nhanh nhẹn', A: 87 }, { subject: 'Phục hồi', A: 94 }, { subject: 'Tập trung', A: 78 }];
  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-serif font-bold">Hiệu suất — {horse.name}</h2></div>
      <div className="flex items-center gap-3"><label htmlFor="performance-horse" className="text-sm font-medium">Chọn ngựa</label><select id="performance-horse" className="px-3 py-2 rounded-lg border border-gray-200" value={horse.id} onChange={event => setSelected(event.target.value)}>{horses.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><span className="text-xs text-gray-400">Biểu đồ dùng dữ liệu mẫu cố định</span></div>
      <div className="grid grid-cols-4 gap-4"><StatCard label="Tốc độ đỉnh" value="58.6 km/h" sub="Kỷ lục cá nhân 23/09" color="gold" /><StatCard label="Thể lực" value="87%" sub="↑ 6% tháng 9" color="green" /><StatCard label="Điểm AI" value="88/100" sub="Competition Prep" color="navy" /><StatCard label="Tỷ lệ thắng" value={horse.totalRaces ? `${Math.round(horse.wins / horse.totalRaces * 100)}%` : '—'} sub={`${horse.wins}/${horse.totalRaces} lần đua`} color="navy" /></div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2"><Card className="p-5"><h3 className="font-semibold mb-4">Tốc độ & Thể lực theo tháng</h3><ResponsiveContainer width="100%" height={250}><LineChart data={PERFORMANCE_DATA}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="month" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Legend /><Line type="monotone" dataKey="speed" stroke="#c9973b" strokeWidth={2.5} dot={{ r: 4 }} name="Tốc độ (km/h)" /><Line type="monotone" dataKey="fitness" stroke="#1a4a3a" strokeWidth={2.5} dot={{ r: 4 }} name="Thể lực %" /></LineChart></ResponsiveContainer></Card></div>
        <Card className="p-5"><h3 className="font-semibold mb-4">Năng lực tổng thể</h3><ResponsiveContainer width="100%" height={250}><RadarChart data={radar}><PolarGrid stroke="#e5e7eb" /><PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} /><Radar dataKey="A" stroke="#c9973b" fill="#c9973b" fillOpacity={0.25} strokeWidth={2} /></RadarChart></ResponsiveContainer></Card>
      </div>
    </div>
  );
}
