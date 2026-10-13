import {request} from './api.ts';
import {numericId} from '../types/api.ts';
import type {PageDto} from './membershipService.ts';
export interface TrainerDto{userId:number;fullName:string;avatarUrl:string|null}
export const trainerService={list:(page=0)=>request<PageDto<TrainerDto>>('/api/trainers?page='+page),get:(id:number)=>request<TrainerDto>('/api/trainers/'+numericId(id))};
