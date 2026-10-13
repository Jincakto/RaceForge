import { request, json } from './api.ts';
import { numericId, type HorseDto, type HorseWriteDto } from '../types/api.ts';
import { query } from "./query.ts";

export const horseService = {
  list: () => request<HorseDto[]>('/api/horses'),
  get: (horseId: number) => request<HorseDto>(`/api/horses/${numericId(horseId)}`),
  create: (ownerId: number, body: HorseWriteDto) => request<HorseDto>(`/api/horses?ownerId=${numericId(ownerId)}`, json('POST', body)),
  update: (horseId: number, body: HorseWriteDto) => request<HorseDto>(`/api/horses/${numericId(horseId)}`, json('PUT', body)),

  activate: (id: number) => request<HorseDto>(`/api/horses/${numericId(id)}/activate`, json("PATCH")),
  deactivate: (id: number) => request<HorseDto>(`/api/horses/${numericId(id)}/deactivate`, json("PATCH")),
  getHorses: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) => request("/api/horses" + (params ? `?${query(params)}` : "")),

  getHorseById: (id: string | number) => request(`/api/horses/${id}`),

  updateHorse: (id: string | number, data: any) =>
    request(`/api/horses/${id}`, json("PUT", data)),
};
