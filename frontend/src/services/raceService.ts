import { request, json } from './api.ts';
import { numericId, type RaceHistoryDto, type RaceWriteDto } from '../types/api.ts';
import { query } from "./query.ts";

export const raceService = {
  byHorse: (horseId: number) => request<RaceHistoryDto[]>(`/api/horses/${numericId(horseId)}/race-history`),
  get: (id: number) => request<RaceHistoryDto>(`/api/horses/race-history/${numericId(id)}`),
  create: (horseId: number, body: RaceWriteDto) => request<RaceHistoryDto>(`/api/horses/${numericId(horseId)}/race-history`, json('POST', body)),
  update: (id: number, body: RaceWriteDto) => request<RaceHistoryDto>(`/api/horses/race-history/${numericId(id)}`, json('PUT', body)),
  remove: (id: number) => request<void>(`/api/horses/race-history/${numericId(id)}`, json('DELETE')),

  getResults: (params?: any) => request("/api/race-results" + (params ? `?${query(params)}` : "")),
  createResult: (data: any) => request("/api/race-results", json("POST", data)),
  updateResult: (id: string | number, data: any) =>
    request(`/api/race-results/${id}`, json("PUT", data)),
  deleteResult: (id: string | number) => request(`/api/race-results/${id}`, json("DELETE")),
};
