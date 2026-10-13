import { request, json } from './api.ts';
import { numericId, type TrainingSessionDto, type SessionResultDto, type AttendanceDto, type AttendanceResultDto } from '../types/api.ts';
export const sessionService = {
  byHorse: (horseId: number) => request<TrainingSessionDto[]>(`/api/training-sessions/horse/${numericId(horseId)}`),
  startSession: (sessionId: number) => request<TrainingSessionDto>(`/api/training-sessions/${numericId(sessionId)}/start`, json('PATCH')),
  completeSession: (sessionId: number, body: SessionResultDto) => request<TrainingSessionDto>(`/api/training-sessions/${numericId(sessionId)}/complete`, json('PATCH', body)),
  checkIn: (sessionId: number, body: AttendanceDto) => request<AttendanceResultDto>(`/api/training-sessions/${numericId(sessionId)}/attendance`, json('PUT', body)),
};

// Previous implementation retained; these legacy endpoints do not exist.
// // Legacy import: import api from "./api";
// import { api } from "./apiClient.js";
// 
// export const sessionService = {
//   getSessionById: (id: string | number) => api.get(`/training-sessions/${id}`),
// 
//   // 1. Điểm danh
//   checkIn: (sessionId: string | number, payload?: any) =>
//     api.post(`/training-sessions/${sessionId}/check-in`, payload),
// 
//   // 2. Bắt đầu
//   startSession: (sessionId: string | number) =>
//     api.post(`/training-sessions/${sessionId}/start`),
// 
//   // 3. Hoàn thành
//   completeSession: (
//     sessionId: string | number,
//     payload?: { summary?: string; notes?: string },
//   ) => api.post(`/training-sessions/${sessionId}/complete`, payload),
// 
//   // 4. Ghi chỉ số
//   recordMetrics: (
//     sessionId: string | number,
//     metrics: {
//       heartRate?: number;
//       speedMax?: number;
//       distanceMeters?: number;
//       recoveryTimeMinutes?: number;
//       notes?: string;
//     },
//   ) => api.post(`/training-sessions/${sessionId}/metrics`, metrics),
// };
// 