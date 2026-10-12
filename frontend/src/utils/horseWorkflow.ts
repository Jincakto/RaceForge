import type { HorseDto, MedicalDto, HorsePackageDto } from '../types/api.ts';
export function applyConfirmedMedical(horse: HorseDto, record: MedicalDto): HorseDto {
  if (record.status !== 'CONFIRMED') return horse;
  return { ...horse, healthStatus: record.healthStatus, trainingLocked: horse.trainingLocked || record.healthStatus !== 'READY' };
}
export function canRegisterPackage(horse: HorseDto, records: MedicalDto[], packages: HorsePackageDto[]) {
  return horse.healthStatus === 'READY' && !horse.trainingLocked && records.some(r => r.examType === 'INITIAL' && r.status === 'CONFIRMED') && !packages.some(p => ['PENDING', 'ACTIVE', 'PAUSED'].includes(p.status));
}
export function reconcileResume(packages: HorsePackageDto[], recoveryId: number, original: HorsePackageDto) {
  const recovery = packages.find(p => p.horsePackageId === recoveryId);
  if (recovery && recovery.replacedHorsePackageId !== original.horsePackageId) throw new Error('Response Resume không khớp gói gốc. Hãy tải lại dữ liệu.');
  return [...packages.filter(p => p.horsePackageId !== original.horsePackageId).map(p => p.horsePackageId === recoveryId ? { ...p, status: 'COMPLETED' } : p), original];
}
export function canResume(horse: HorseDto, recovery: HorsePackageDto, packages: HorsePackageDto[]) {
  const original = packages.find(p => p.horsePackageId === recovery.replacedHorsePackageId);
  return !horse.trainingLocked && horse.healthStatus === 'READY' && recovery.packageType === 'RECOVERY' && recovery.status === 'ACTIVE' && recovery.paymentStatus === 'PAID' && original?.horseId === horse.horseId && recovery.horseId === horse.horseId && original.packageType !== 'RECOVERY' && !packages.some(p=>p.status === 'ACTIVE' && p.horsePackageId !== recovery.horsePackageId) && original.status === 'PAUSED' && original.paymentStatus === 'PAID' && (original.remainingDays || 0) > 0;
}
