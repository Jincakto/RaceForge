export function Badge({ status }) {
  const map = {
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
  };
  const labels = {
    'Not Performed': 'Không thực hiện', Paused: 'Tạm dừng',
    manager: 'Quản lý TT', head_trainer: 'Head Trainer',
    veterinarian: 'Thú y', groom: 'Groom', owner: 'Chủ ngựa',
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${map[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>{labels[status] || status}</span>;
}
