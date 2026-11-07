import type { AppUser, Horse, HealthRecord, Enrollment } from './data';

export function memberHorses(member: AppUser, horses: Horse[], records: HealthRecord[], enrollments: Enrollment[]) {
  const clubHorses = horses.filter(h => h.clubId === member.clubId);
  const examined = new Set(records.filter(r => r.vetId === member.id && r.status === 'confirmed').map(r => r.horseId));
  const training = enrollments.filter(e => e.trainerId === member.id && e.status !== 'completed'
    && (!e.apiStatus || e.apiStatus === 'ACTIVE') && (!e.paymentStatus || e.paymentStatus === 'PAID'));
  return clubHorses.flatMap(h => {
    const labels: string[] = [];
    if (member.role === 'owner' && h.ownerId === member.id) labels.push('Owned horse');
    if (member.role === 'veterinarian') {
      if (h.vetId === member.id && h.vetAssign?.status !== 'declined') labels.push(h.vetAssign?.status === 'pending' ? 'Awaiting acceptance' : 'Currently assigned');
      if (examined.has(h.id)) labels.push('Examined');
    }
    if (member.role === 'head_trainer') {
      const packages = training.filter(e => e.horseId === h.id);
      if (h.trainerIds?.includes(member.id) || packages.some(e => e.trainerStatus === 'confirmed')) labels.push('Currently training');
      else if (packages.some(e => e.trainerStatus === 'pending')) labels.push('Awaiting acceptance');
    }
    return labels.length ? [{ horse: h, labels }] : [];
  });
}
