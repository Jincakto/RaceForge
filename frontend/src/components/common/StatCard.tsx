

export function StatCard({ label, value, sub, color = 'navy' }: { label: string; value: string | number; sub?: string; color?: string }) {
  const c: Record<string, string> = { navy: 'from-[#1a2844] to-[#243558]', gold: 'from-[#c9973b] to-[#e8b85a]', green: 'from-[#1a4a3a] to-[#236b54]', red: 'from-red-600 to-red-500', purple: 'from-purple-700 to-purple-500' };
  return (
    <div className={`bg-gradient-to-br ${c[color] || c.navy} text-white rounded-xl p-5 shadow-md`}>
      <p className="text-xs font-medium opacity-70 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold mt-1 font-serif">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
    </div>
  );
}
