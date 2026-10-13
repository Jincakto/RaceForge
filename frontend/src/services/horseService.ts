import { request, json } from './api.ts';
import { numericId, type HorseDto, type HorseWriteDto } from '../types/api.ts';
import { query } from "./query.ts";

export const horseService = {
  submit: (id:number) => request<HorseDto>('/api/horses/'+numericId(id)+'/admission',json('POST')),
  review: (id:number,approved:boolean,note:string) => request<HorseDto>('/api/horses/'+numericId(id)+'/admission/'+(approved?'approve':'reject'),json('POST',{note})),
  profile: (id:number) => request<number>('/api/horses/'+numericId(id)+'/health-profile'),
  assign: (id:number,trainerId:number) => request<HorseDto>('/api/horses/'+numericId(id)+'/trainer',json('PUT',{trainerId:numericId(trainerId)})),
  list: () => request<HorseDto[]>('/api/horses'),
  get: (horseId: number) => request<HorseDto>(`/api/horses/${numericId(horseId)}`),
  create: (ownerId: number, body: HorseWriteDto) => request<HorseDto>(`/api/horses?ownerId=${numericId(ownerId)}`, json('POST', body)),
  update: (horseId: number, body: HorseWriteDto) => request<HorseDto>(`/api/horses/${numericId(horseId)}`, json('PUT', body)),

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
