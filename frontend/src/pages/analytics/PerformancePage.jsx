import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { PERFORMANCE_DATA } from '../../data/horses';

export function PerformancePage() {
  const radar = [{ subject: 'Tốc độ', A: 92 }, { subject: 'Sức bền', A: 85 }, { subject: 'Sức mạnh', A: 80 }, { subject: 'Nhanh nhẹn', A: 87 }, { subject: 'Phục hồi', A: 94 }, { subject: 'Tập trung', A: 78 }];
  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-serif font-bold">Hiệu suất — Thunder King</h2></div>
      <div className="grid grid-cols-4 gap-4"><StatCard label="Tốc độ đỉnh" value="58.6 km/h" sub="Kỷ lục cá nhân 23/09" color="gold" /><StatCard label="Thể lực" value="87%" sub="↑ 6% tháng 9" color="green" /><StatCard label="Điểm AI" value="88/100" sub="Competition Prep" color="navy" /><StatCard label="Tỷ lệ thắng" value="58%" sub="7/12 lần đua" color="navy" /></div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2"><Card className="p-5"><h3 className="font-semibold mb-4">Tốc độ & Thể lực theo tháng</h3><ResponsiveContainer width="100%" height={250}><LineChart data={PERFORMANCE_DATA}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="month" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Legend /><Line type="monotone" dataKey="speed" stroke="#c9973b" strokeWidth={2.5} dot={{ r: 4 }} name="Tốc độ (km/h)" /><Line type="monotone" dataKey="fitness" stroke="#1a4a3a" strokeWidth={2.5} dot={{ r: 4 }} name="Thể lực %" /></LineChart></ResponsiveContainer></Card></div>
        <Card className="p-5"><h3 className="font-semibold mb-4">Năng lực tổng thể</h3><ResponsiveContainer width="100%" height={250}><RadarChart data={radar}><PolarGrid stroke="#e5e7eb" /><PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} /><Radar dataKey="A" stroke="#c9973b" fill="#c9973b" fillOpacity={0.25} strokeWidth={2} /></RadarChart></ResponsiveContainer></Card>
      </div>
    </div>
  );
}
