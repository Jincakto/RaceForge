import { request, json } from './api.ts';
import { numericId, type TrainingPlanOptionDto, type TrainingPlanCreateDto, type TrainingPlanDto } from '../types/api.ts';
export const plansService = {
  byHorse: (horseId: number) => request<TrainingPlanOptionDto[]>(`/api/horses/${numericId(horseId)}/training-plans`),
  createPlan: (horseId: number, body: TrainingPlanCreateDto) => request<TrainingPlanDto>(`/api/horses/${numericId(horseId)}/training-plans`, json('POST', body)),
};

// Previous implementation retained; these legacy endpoints do not exist.
// // Legacy import: import api from "./api";
// import { api } from "./apiClient.js";
// 
// export const plansService = {
//   getPlans: (params?: any) => api.get("/training-plans", { params }),
//   getPlanById: (id: string | number) => api.get(`/training-plans/${id}`),
//   createPlan: (data: any) => api.post("/training-plans", data),
//   updatePlan: (id: string | number, data: any) =>
//     api.put(`/training-plans/${id}`, data),
// };
// 