import { request, json } from './api.ts';
import { numericId, type SchedulingPackageDto, type TrainingPackageDto, type HorsePackageDto, type ScheduleSessionDto, type ScheduleRecurringDto, type TrainingSessionDto } from '../types/api.ts';
const id = (value: string | number) => numericId(Number(value));
const catalog = () => request<TrainingPackageDto[]>('/api/training-packages');
export const trainingService = {
  catalog, getPackages: catalog,
  allPackages: () => request<TrainingPackageDto[]>('/api/training-packages/all'),
  getPackage: (packageId: number) => request<TrainingPackageDto>(`/api/training-packages/${id(packageId)}`),
  createPackage: (body: unknown) => request<TrainingPackageDto>('/api/training-packages', json('POST', body)),
  updatePackage: (packageId: string | number, body: unknown) => request<TrainingPackageDto>(`/api/training-packages/${id(packageId)}`, json('PUT', body)),
  togglePackageStatus: (packageId: string | number, isActive: boolean) => request<TrainingPackageDto>(`/api/training-packages/${id(packageId)}/status`, json('PATCH', { status: isActive ? 'ACTIVE' : 'INACTIVE' })),
  history: (horseId: number) => request<HorsePackageDto[]>(`/api/horse-packages/horse/${id(horseId)}`),
  register: (horseId: number, packageId: number) => request<HorsePackageDto>('/api/horse-packages/register', json('POST', { horseId: id(horseId), packageId: id(packageId) })),
  pay: (horsePackageId: number, successful: boolean, recovery = false) => request<HorsePackageDto>(`/api/horse-packages/${id(horsePackageId)}/${recovery ? 'simulate-recovery-payment' : 'simulate-payment'}`, json('POST', { successful })),
  approveRecovery: (horseId: number, recoveryPackageId: number, reason: string) => request<HorsePackageDto>(`/api/horse-packages/horse/${id(horseId)}/approve-recovery`, json('POST', { recoveryPackageId: id(recoveryPackageId), reason })),
  resume: (recoveryId: number, reason: string) => { if (!reason.trim()) throw new Error('Nhập lý do tiếp tục gói tập.'); return request<HorsePackageDto>(`/api/horse-packages/${id(recoveryId)}/resume-original`, json('POST', { reason: reason.trim() })); },
  getSchedules: (params: { horseId: number }) => request<TrainingSessionDto[]>(`/api/training-sessions/horse/${id(params.horseId)}`),
  createSingleSchedule: (body: ScheduleSessionDto) => request<TrainingSessionDto>('/api/training-sessions', json('POST', body)),
  schedulingPackages: (horseId: number) => request<SchedulingPackageDto[]>(`/api/training-sessions/horse/${id(horseId)}/scheduling-packages`),
  createRecurringSchedule: (body: ScheduleRecurringDto) => request<TrainingSessionDto[]>('/api/training-sessions/recurring', json('POST', body)),
};
// Previous implementation retained for reference.
// // Legacy import: import api from "./api";
// import { api } from "./apiClient.js";
// 
// export const trainingService = {
//   // Gói tập: tạo, sửa, bật/tắt
//   getPackages: (params?: any) => api.get("/training-packages", { params }),
//   createPackage: (data: any) => api.post("/training-packages", data),
//   updatePackage: (id: string | number, data: any) =>
//     api.put(`/training-packages/${id}`, data),
//   togglePackageStatus: (id: string | number, isActive: boolean) =>
//     api.patch(`/training-packages/${id}/status`, { isActive }),
// 
//   // Lịch tập: đơn và định kỳ
//   getSchedules: (params?: any) => api.get("/training-schedules", { params }),
//   createSingleSchedule: (data: any) =>
//     api.post("/training-schedules/single", data),
//   createRecurringSchedule: (data: any) =>
//     api.post("/training-schedules/recurring", data),
// };
// 