export function Card({ children, className = '', onClick }) {
  return <div onClick={onClick} className={`bg-white rounded-xl border border-gray-200 shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md hover:border-[#c9973b] transition-all' : ''} ${className}`}>{children}</div>;
}
