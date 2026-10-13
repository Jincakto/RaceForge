import { request, json } from './api.ts';
import { numericId, type HorseDto, type HorseWriteDto } from '../types/api.ts';
export const horseService = {
  submit: (id:number) => request<HorseDto>('/api/horses/'+numericId(id)+'/admission',json('POST')),
  review: (id:number,approved:boolean,note:string) => request<HorseDto>('/api/horses/'+numericId(id)+'/admission/'+(approved?'approve':'reject'),json('POST',{note})),
  profile: (id:number) => request<number>('/api/horses/'+numericId(id)+'/health-profile'),
  assign: (id:number,trainerId:number) => request<HorseDto>('/api/horses/'+numericId(id)+'/trainer',json('PUT',{trainerId:numericId(trainerId)})),
  list: () => request<HorseDto[]>('/api/horses'),
  get: (horseId: number) => request<HorseDto>(`/api/horses/${numericId(horseId)}`),
  create: (ownerId: number, body: HorseWriteDto) => request<HorseDto>(`/api/horses?ownerId=${numericId(ownerId)}`, json('POST', body)),
  update: (horseId: number, body: HorseWriteDto) => request<HorseDto>(`/api/horses/${numericId(horseId)}`, json('PUT', body)),
};
// Admission is distinct from activation and medical eligibility.
