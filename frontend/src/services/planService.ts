import { request, json } from './api.ts';
import { numericId, type TrainingPlanCreateDto, type TrainingPlanDto } from '../types/api.ts';
export const plansService = {
  createPlan: (horseId: number, body: TrainingPlanCreateDto) => request<TrainingPlanDto>('/api/horses/' + numericId(horseId) + '/training-plans', json('POST', body)),
};
