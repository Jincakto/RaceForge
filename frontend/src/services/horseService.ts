import { request, json } from './api.ts';
import { numericId, type HorseDto, type HorseWriteDto } from '../types/api.ts';
export const horseService = {
  list: () => request<HorseDto[]>('/api/horses'),
  get: (horseId: number) => request<HorseDto>(`/api/horses/${numericId(horseId)}`),
  create: (ownerId: number, body: HorseWriteDto) => request<HorseDto>(`/api/horses?ownerId=${numericId(ownerId)}`, json('POST', body)),
  update: (horseId: number, body: HorseWriteDto) => request<HorseDto>(`/api/horses/${numericId(horseId)}`, json('PUT', body)),
};
// CM approval is deliberately absent: activate is not an approval endpoint.
