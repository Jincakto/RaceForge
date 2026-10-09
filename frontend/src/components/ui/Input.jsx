export function Input({ label, value, onChange, type = 'text', placeholder = '', required = false, hint = '' }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b] focus:border-transparent" />
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}
