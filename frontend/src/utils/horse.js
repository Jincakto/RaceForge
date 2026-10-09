export function isHeavySession(type) {
  return !/recovery|hydro|walk|trot|rehab/i.test(type);
}

export function getLifecycle(h) {
  if (h.lifecycle) return h.lifecycle;
  if (h.approvalStatus !== 'approved' || !h.clubId) return 'pending';
  if (h.lock) return h.rehab ? 'rehab' : 'locked';
  if (h.healthStatus === 'Pending Vet') return 'awaiting_vet';
  return h.trainingStatus === 'Active' ? 'training' : 'awaiting_vet';
}

export function needsTreatment(h) { return !!h.lock || !!h.rehab || h.healthStatus === 'Injured'; }

export function lockMessage(h, action) {
  return `Ngựa "${h.name}" đang bị KHÓA HUẤN LUYỆN (${h.lock?.reason || 'theo chỉ định Thú y'}). Không thể ${action}. Gói huấn luyện đang tạm dừng; chỉ Thú y mới gỡ được khóa.`;
}
