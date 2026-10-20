import React from 'react';

export function Badge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Eligible: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Monitor: 'bg-amber-100 text-amber-800 border-amber-200',
    Injured: 'bg-red-100 text-red-700 border-red-200',
    Retired: 'bg-gray-100 text-gray-500 border-gray-200',
    'Pending Vet': 'bg-sky-100 text-sky-700 border-sky-200',
    Active: 'bg-blue-100 text-blue-800 border-blue-200',
    Resting: 'bg-purple-100 text-purple-800 border-purple-200',
    Inactive: 'bg-gray-100 text-gray-500 border-gray-200',
    'Pending Approval': 'bg-amber-100 text-amber-700 border-amber-200',
    Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
    'Not Performed': 'bg-red-100 text-red-700 border-red-200',
    Paused: 'bg-orange-100 text-orange-800 border-orange-200',
    'In Progress': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    Pending: 'bg-amber-100 text-amber-700 border-amber-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    expired: 'bg-gray-100 text-gray-500 border-gray-200',
    admin: 'bg-rose-100 text-rose-800 border-rose-200',
    manager: 'bg-[#1a2844]/10 text-[#1a2844] border-[#1a2844]/20',
    head_trainer: 'bg-blue-100 text-blue-800 border-blue-200',
    veterinarian: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    groom: 'bg-amber-100 text-amber-700 border-amber-200',
    owner: 'bg-purple-100 text-purple-800 border-purple-200',
    Normal: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Competition Prep': 'bg-orange-100 text-orange-800 border-orange-200',
    'Base Building': 'bg-blue-100 text-blue-800 border-blue-200',
    Foundation: 'bg-teal-100 text-teal-800 border-teal-200',
    Recovery: 'bg-gray-100 text-gray-600 border-gray-200',
    'Chuẩn bị thi đấu': 'bg-orange-100 text-orange-800 border-orange-200',
    'Xây nền tảng': 'bg-blue-100 text-blue-800 border-blue-200',
    'Làm quen': 'bg-teal-100 text-teal-800 border-teal-200',
    'Phục hồi': 'bg-gray-100 text-gray-600 border-gray-200',
    'Tăng cường': 'bg-amber-100 text-amber-800 border-amber-200',
  };
  const labels: Record<string, string> = {
    Eligible: 'Eligible', Monitor: 'Needs monitoring', Injured: 'Injured', Retired: 'Retired', 'Pending Vet': 'Awaiting examination',
    Active: 'Active', Resting: 'Resting', Inactive: 'Inactive', 'Pending Approval': 'Pending approval', Completed: 'Completed',
    Scheduled: 'Scheduled', 'Not Performed': 'Not performed', Paused: 'Paused', 'In Progress': 'In progress', Pending: 'Pending',
    pending: 'Pending', approved: 'Approved', rejected: 'Rejected', expired: 'Expired', Normal: 'Normal',
    admin: 'Administrator', manager: 'Club Manager', head_trainer: 'Trainer', veterinarian: 'Veterinarian', groom: 'Groom', owner: 'Horse Owner',
    'Competition Prep': 'Race preparation', 'Base Building': 'Base building', Foundation: 'Orientation', Recovery: 'Recovery',
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${map[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>{labels[status] || status}</span>;
}

export function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return <div onClick={onClick} className={`bg-white rounded-xl border border-gray-200 shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md hover:border-[#c9973b] transition-all' : ''} ${className}`}>{children}</div>;
}

export function Btn({ children, variant = 'primary', onClick, className = '', type = 'button', disabled = false, size = 'md' }:
  { children: React.ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'; onClick?: () => void; className?: string; type?: 'button' | 'submit'; disabled?: boolean; size?: 'sm' | 'md' }) {
  const s = { primary: 'bg-[#1a2844] text-white hover:bg-[#243558] border border-[#1a2844]', secondary: 'bg-white text-[#1a2844] hover:bg-gray-50 border border-gray-300', ghost: 'bg-transparent text-[#1a2844] hover:bg-gray-100 border border-transparent', danger: 'bg-red-600 text-white hover:bg-red-700 border border-red-600', gold: 'bg-[#c9973b] text-white hover:bg-[#b8852a] border border-[#c9973b]' };
  const sz = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';
  return <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center gap-2 ${sz} rounded-lg font-medium transition-all ${s[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}>{children}</button>;
}

export function Input({ label, value, onChange, type = 'text', placeholder = '', required = false, hint = '', error = '', maxLength, max, min }:
  { label?: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean; hint?: string; error?: string; maxLength?: number; max?: string; min?: string }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
      <input aria-label={label} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} max={max} min={min} aria-invalid={!!error}
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b] focus:border-transparent ${error ? 'border-red-400 bg-red-50/40' : 'border-gray-300'}`} />
      {error ? <p className="text-xs text-red-600 mt-0.5">{error}</p> : hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export function Select({ label, value, onChange, options, error = '', hint = '', required = false }:
  { label?: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; error?: string; hint?: string; required?: boolean }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
      <select aria-label={label} value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b] bg-white">
        {options.map((o, index) => <option key={`${o.value}-${index}`} value={o.value}>{o.label}</option>)}
      </select>
      {error ? <p className="text-xs text-red-600 mt-0.5">{error}</p> : hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export function Textarea({ label, value, onChange, placeholder = '', rows = 3, required = false, hint = '' }:
  { label?: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; required?: boolean; hint?: string }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
      <textarea aria-label={label} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b] resize-none" />
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}
