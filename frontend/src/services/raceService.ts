import { request, json } from './api.ts';
import { numericId, type RaceHistoryDto, type RaceWriteDto } from '../types/api.ts';
const id = (value: string | number) => numericId(Number(value));
const byHorse = (horseId: number) => request<RaceHistoryDto[]>(`/api/horses/${id(horseId)}/race-history`);
export const raceService = {
  byHorse,
  getResults: (params: { horseId: number }) => byHorse(params.horseId),
  get: (raceHistoryId: number) => request<RaceHistoryDto>(`/api/horses/race-history/${id(raceHistoryId)}`),
  createResult: (body: RaceWriteDto & { horseId: number }) => {
    const { horseId, ...data } = body;
    return request<RaceHistoryDto>(`/api/horses/${id(horseId)}/race-history`, json('POST', data));
  },
  updateResult: (raceHistoryId: string | number, body: RaceWriteDto) => request<RaceHistoryDto>(`/api/horses/race-history/${id(raceHistoryId)}`, json('PUT', body)),
  deleteResult: (raceHistoryId: string | number) => request<void>(`/api/horses/race-history/${id(raceHistoryId)}`, json('DELETE')),
};
// Previous implementation retained for reference.
// // Legacy import: import api from "./api";
// import { api } from "./apiClient.js";
// 
// export const raceService = {
//   getResults: (params?: any) => api.get("/race-results", { params }),
//   createResult: (data: any) => api.post("/race-results", data),
//   updateResult: (id: string | number, data: any) =>
//     api.put(`/race-results/${id}`, data),
//   deleteResult: (id: string | number) => api.delete(`/race-results/${id}`),
// };
// 