import { useState } from 'react';
import { LifecycleBadge } from '../../components/horse/LifecycleBadge';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';

export function HorseListPage({ navigate, horses, role, clubId, onSelectHorse }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Tất cả');
  const list = (clubId ? horses.filter(h => h.clubId === clubId) : horses).filter(h => {
    const ms = h.name.toLowerCase().includes(search.toLowerCase()) || h.id.toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'Tất cả' || h.healthStatus === filter || h.trainingStatus === filter;
    return ms && mf;
  });
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-serif font-bold text-[#0f1729]">Ngựa trong trung tâm</h2><p className="text-sm text-gray-500">{list.length} ngựa</p></div>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm ngựa..." className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b] bg-white" /><span className="absolute left-2.5 top-2.5 text-gray-400 text-sm">🔍</span></div>
        {['Tất cả', 'Eligible', 'Monitor', 'Injured', 'Active', 'Resting', 'Inactive'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${filter === f ? 'bg-[#1a2844] text-white border-[#1a2844]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#c9973b]'}`}>{f}</button>
        ))}
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">{['Ngựa', 'Mã', 'Head Trainer', 'Sức khỏe', 'Tập luyện', 'Trạng thái', 'T/R', ''].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
          <tbody>
            {list.map((h, i) => (
              <tr key={h.id} onClick={() => { onSelectHorse(h.id); navigate('horse-detail'); }} className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                <td className="px-5 py-3"><div className="flex items-center gap-3"><img src={h.imageUrl} className="w-9 h-9 rounded-lg object-cover bg-gray-200" /><div><div className="font-semibold text-[#0f1729]">{h.name}</div><div className="text-xs text-gray-500">{h.breed} · {h.age}t</div></div></div></td>
                <td className="px-5 py-3 font-mono text-xs text-gray-600">{h.id}</td>
                <td className="px-5 py-3 text-gray-600 text-xs">{h.headTrainerName || '—'}</td>
                <td className="px-5 py-3"><Badge status={h.healthStatus} /></td>
                <td className="px-5 py-3"><Badge status={h.trainingStatus} /></td>
                <td className="px-5 py-3"><LifecycleBadge horse={h} /></td>
                <td className="px-5 py-3 font-mono text-xs">{h.wins}/{h.totalRaces}</td>
                <td className="px-5 py-3"><span className="text-[#c9973b] text-xs font-medium">Xem →</span></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400">Không tìm thấy</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
