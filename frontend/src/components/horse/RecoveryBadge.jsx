export function RecoveryBadge({ horse }) {
  if (!horse.recoveryBadge) return null;
  return <span title={horse.recoveryBadge.note} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-teal-50 text-teal-700 border-teal-200">Đã hồi phục</span>;
}
