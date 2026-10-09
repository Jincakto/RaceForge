import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';

export function RaceResultsPage({ horses }) {
  const allRaces = horses.flatMap(h => h.raceHistory.map(r => ({ ...r, horseName: h.name })));
  allRaces.sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-serif font-bold">Kết quả đua</h2></div>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Tổng lần đua" value={allRaces.length} color="navy" />
        <StatCard label="Hạng 1" value={allRaces.filter(r => r.position === 1).length} color="gold" />
        <StatCard label="Top 3" value={allRaces.filter(r => r.position <= 3).length} color="green" />
        <StatCard label="Giải thưởng" value="185M VND" color="navy" />
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">{['Hạng', 'Tên giải', 'Ngựa', 'Ngày', 'Cự ly', 'Thời gian', 'Giải thưởng'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
          <tbody>
            {allRaces.map((r, i) => (
              <tr key={r.id} className={`border-b border-gray-50 hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                <td className="px-4 py-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${r.position === 1 ? 'bg-[#c9973b] text-white' : r.position <= 3 ? 'bg-gray-400 text-white' : 'bg-gray-200 text-gray-600'}`}>#{r.position}</div></td>
                <td className="px-4 py-3"><div className="font-medium">{r.raceName}</div><div className="text-xs text-gray-500">{r.venue}</div></td>
                <td className="px-4 py-3 text-gray-700">{r.horseName}</td>
                <td className="px-4 py-3 text-gray-600">{r.date}</td>
                <td className="px-4 py-3 text-gray-600">{r.distance}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.time}</td>
                <td className="px-4 py-3 font-medium text-emerald-600">{r.prize !== '0 VND' ? r.prize : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
