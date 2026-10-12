import { request, json } from './api.ts';
import { numericId, type MedicalCreateDto, type MedicalUpdateDto, type MedicalDto, type TrainingLockDto } from '../types/api.ts';
export const healthService = {
  list: (horseId: number) => request<MedicalDto[]>(`/api/medical/horses/${numericId(horseId)}/records`),
  previous: (horseId: number) => request<MedicalDto | undefined>(`/api/medical/horses/${numericId(horseId)}/previous-examination`),
  createDraft: (body: MedicalCreateDto) => { numericId(body.profileId); return request<MedicalDto>('/api/medical/records', json('POST', body)); },
  saveDraft: (id: number, body: MedicalUpdateDto) => request<MedicalDto>(`/api/medical/records/${numericId(id)}/draft`, json('PUT', body)),
  confirm: (id: number) => request<MedicalDto>(`/api/medical/records/${numericId(id)}/confirm`, json('POST')),
  lockHistory: (horseId: number) => request<TrainingLockDto[]>(`/api/medical/horses/${numericId(horseId)}/training-lock/history`),
  unlock: (horseId: number, reason: string) => { if (!reason.trim()) throw new Error('Nhập lý do mở khóa.'); return request<TrainingLockDto>(`/api/medical/horses/${numericId(horseId)}/training-lock/unlock`, json('POST', { reason: reason.trim() })); },
};
