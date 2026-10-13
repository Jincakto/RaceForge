import { request, json } from './api.ts';
import { numericId, type HorseDto, type HorseWriteDto } from '../types/api.ts';
const id = (value: string | number) => numericId(Number(value));
const list = () => request<HorseDto[]>('/api/horses');
const get = (horseId: string | number) => request<HorseDto>(`/api/horses/${id(horseId)}`);
const update = (horseId: string | number, body: HorseWriteDto) => request<HorseDto>(`/api/horses/${id(horseId)}`, json('PUT', body));
export const horseService = {
  list, get, update,
  activate: (horseId: number) => request<HorseDto>(`/api/horses/${id(horseId)}/activate`, json('PATCH')),
  deactivate: (horseId: number) => request<HorseDto>(`/api/horses/${id(horseId)}/deactivate`, json('PATCH')),
  getHorses: list, getHorseById: get, updateHorse: update,
  create: (ownerId: number, body: HorseWriteDto) => request<HorseDto>(`/api/horses?ownerId=${id(ownerId)}`, json('POST', body)),
  submit: (horseId: number) => request<HorseDto>(`/api/horses/${id(horseId)}/admission`, json('POST')),
  review: (horseId: number, approved: boolean, note: string) => request<HorseDto>(`/api/horses/${id(horseId)}/admission/${approved ? 'approve' : 'reject'}`, json('POST', { note })),
  profile: (horseId: number) => request<number>(`/api/horses/${id(horseId)}/health-profile`),
  assign: (horseId: number, trainerId: number) => request<HorseDto>(`/api/horses/${id(horseId)}/trainer`, json('PUT', { trainerId: id(trainerId) })),
};
// Previous implementation retained for reference.
// // Legacy import: import api from "./api";
// import { api } from "./apiClient.js";
// 
// export const horseService = {
//   getHorses: (params?: {
//     page?: number;
//     limit?: number;
//     search?: string;
//     status?: string;
//   }) => api.get("/horses", { params }),
// 
//   getHorseById: (id: string | number) => api.get(`/horses/${id}`),
// 
//   updateHorse: (id: string | number, data: any) =>
//     api.put(`/horses/${id}`, data),
// };
// 