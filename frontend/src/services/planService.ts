import { request, json } from './api.ts';
import { numericId, type TrainingPlanCreateDto, type TrainingPlanDto } from '../types/api.ts';
// BE only exposes plan creation (Head Trainer + MANAGE_TRAINING). No GET/PUT for plans yet.
export const planService = {
  create: (horseId: number, body: TrainingPlanCreateDto) =>
    request<TrainingPlanDto>(`/api/horses/${numericId(horseId)}/training-plans`, json('POST', body)),
};
