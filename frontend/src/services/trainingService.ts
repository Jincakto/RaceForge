import { request, json } from './api.ts';
import { numericId, type TrainingPackageDto, type HorsePackageDto } from '../types/api.ts';
export const trainingService = {
  catalog: () => request<TrainingPackageDto[]>('/api/training-packages'),
  history: (horseId: number) => request<HorsePackageDto[]>(`/api/horse-packages/horse/${numericId(horseId)}`),
  register: (horseId: number, packageId: number) => request<HorsePackageDto>('/api/horse-packages/register', json('POST', { horseId: numericId(horseId), packageId: numericId(packageId) })),
  pay: (id: number, successful: boolean, recovery = false) => request<HorsePackageDto>(`/api/horse-packages/${numericId(id)}/${recovery ? 'simulate-recovery-payment' : 'simulate-payment'}`, json('POST', { successful })),
  approveRecovery: (horseId: number, recoveryPackageId: number, reason: string) => request<HorsePackageDto>(`/api/horse-packages/horse/${numericId(horseId)}/approve-recovery`, json('POST', { recoveryPackageId: numericId(recoveryPackageId), reason: reason.trim() })),
  resume: (recoveryId: number, reason: string) => { if (!reason.trim()) throw new Error('Nhập lý do Resume.'); return request<HorsePackageDto>(`/api/horse-packages/${numericId(recoveryId)}/resume-original`, json('POST', { reason: reason.trim() })); },
};
