import type * as React from 'react';

export function Btn({ children, variant = 'primary', onClick, className = '', type = 'button', disabled = false, size = 'md' }:
  { children: React.ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'; onClick?: () => void; className?: string; type?: 'button' | 'submit'; disabled?: boolean; size?: 'sm' | 'md' }) {
  const s = { primary: 'bg-[#1a2844] text-white hover:bg-[#243558] border border-[#1a2844]', secondary: 'bg-white text-[#1a2844] hover:bg-gray-50 border border-gray-300', ghost: 'bg-transparent text-[#1a2844] hover:bg-gray-100 border border-transparent', danger: 'bg-red-600 text-white hover:bg-red-700 border border-red-600', gold: 'bg-[#c9973b] text-white hover:bg-[#b8852a] border border-[#c9973b]' };
  const sz = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';
  return <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center gap-2 ${sz} rounded-lg font-medium transition-all ${s[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}>{children}</button>;
}
