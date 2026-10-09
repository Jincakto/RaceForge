export function Select({ label, value, onChange, options }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b] bg-white">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
