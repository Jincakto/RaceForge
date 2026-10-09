import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Badge } from '../../components/ui/Badge';
import { Btn } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PERFORMANCE_DATA } from '../../data/horses';

export function ReportsPage() {
  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-serif font-bold">Báo cáo</h2></div>
      <div className="grid grid-cols-2 gap-5">
        {[{ title: 'Báo cáo hiệu suất tháng 9/2026', icon: '📈', type: 'Performance' }, { title: 'Báo cáo y tế & thú y', icon: '🏥', type: 'Health' }, { title: 'Kế hoạch tập luyện tháng', icon: '📋', type: 'Training' }, { title: 'Tổng kết mùa đua 2026', icon: '🏆', type: 'Racing' }].map(r => (
          <Card key={r.title} className="p-5 cursor-pointer hover:border-[#c9973b]"><div className="flex items-start gap-4"><div className="w-12 h-12 rounded-xl bg-[#1a2844]/10 flex items-center justify-center text-2xl">{r.icon}</div><div className="flex-1"><div className="font-semibold">{r.title}</div></div></div><div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100"><Badge status={r.type} /><Btn variant="secondary">⬇ Tải PDF</Btn></div></Card>
        ))}
      </div>
      <Card className="p-5"><h3 className="font-semibold mb-4">Tổng quan mùa giải 2026</h3><ResponsiveContainer width="100%" height={220}><BarChart data={PERFORMANCE_DATA}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="month" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Legend /><Bar dataKey="fitness" fill="#1a4a3a" name="Thể lực %" radius={[3, 3, 0, 0]} /><Bar dataKey="speed" fill="#c9973b" name="Tốc độ km/h" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></Card>
    </div>
  );
}
