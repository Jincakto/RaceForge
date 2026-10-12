import { demoId } from './demoId.ts';
export { demoId } from './demoId.ts';
import type { Horse } from '../data.ts';
import type { HorseDto, MedicalDto, HorsePackageDto, TrainingLockDto, TrainingPackageDto } from '../types/api.ts';
export interface HorseWorkflowData { records: MedicalDto[]; packages: HorsePackageDto[]; locks: TrainingLockDto[] }
export interface WorkflowStore { horses: HorseDto[]; byHorse: Record<number, HorseWorkflowData>; catalog: TrainingPackageDto[] }
export const emptyHorseData = (): HorseWorkflowData => ({ records: [], packages: [], locks: [] });
export function legacyHorse(horse: Horse): HorseDto {
  return { horseId: horse.id, ownerId: horse.ownerId, headTrainerId: horse.headTrainerId || null, horseName: horse.name, dateOfBirth: `${new Date().getFullYear()-horse.age}-01-01`, gender: horse.gender, breed: horse.breed, coatColor: horse.color, weight: horse.weight, height: horse.height, background: horse.biography, imageUrl: horse.imageUrl, healthStatus: horse.healthStatus === 'Injured' ? 'INJURED' : horse.vetClearance ? 'READY' : null, trainingLocked: horse.healthStatus === 'Injured', status: horse.approvalStatus === 'approved' ? 'ACTIVE' : 'INACTIVE' };
}
export const demoCatalog: TrainingPackageDto[] = [
  { packageId: 101, packageName: 'Foundation', packageType: 'BASIC', description: 'Gói tập cơ bản', durationDays: 30, price: 3000000, status: 'ACTIVE', createdAt: '', updatedAt: '' },
  { packageId: 102, packageName: 'Recovery', packageType: 'RECOVERY', description: 'Phục hồi dưới giám sát thú y', durationDays: 14, price: 1500000, status: 'ACTIVE', createdAt: '', updatedAt: '' },
];
export function demoPackage(horseId: number, pkg: TrainingPackageDto): HorsePackageDto { return { horsePackageId: demoId(), horseId, packageId: pkg.packageId, packageName: pkg.packageName, packageType: pkg.packageType, status: 'PENDING', paymentStatus: 'PENDING', totalPrice: pkg.price, registeredAt: new Date().toISOString(), paidAt: null, startDate: null, endDate: null, remainingDays: null, replacedHorsePackageId: null }; }
export function withPayment(pkg: HorsePackageDto, successful: boolean, days: number): HorsePackageDto { const today = new Date(); const end = new Date(today); end.setDate(end.getDate()+days-1); return { ...pkg, status: successful ? 'ACTIVE' : 'CANCELLED', paymentStatus: successful ? 'PAID' : 'FAILED', paidAt: successful ? today.toISOString() : null, startDate: successful ? today.toISOString().slice(0,10) : null, endDate: successful ? end.toISOString().slice(0,10) : null }; }
export function remainingDays(pkg: HorsePackageDto) { if (!pkg.endDate) return 0; const today = new Date(); const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()); return Math.max(0, Math.floor((Date.parse(pkg.endDate+'T00:00:00Z')-todayUtc)/86400000)+1); }
