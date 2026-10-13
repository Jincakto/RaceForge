import { request, json } from './api.ts';
import { numericId, type AttendanceDto, type AttendanceResultDto, type ScheduleRecurringDto, type ScheduleSessionDto, type SessionResultDto, type TrainingSessionDto } from '../types/api.ts';
export const sessionService = {
  byHorse: (horseId: number) => request<TrainingSessionDto[]>(`/api/training-sessions/horse/${numericId(horseId)}`),
  schedule: (body: ScheduleSessionDto) => request<TrainingSessionDto>('/api/training-sessions', json('POST', body)),
  scheduleRecurring: (body: ScheduleRecurringDto) => request<TrainingSessionDto[]>('/api/training-sessions/recurring', json('POST', body)),
  start: (sessionId: number) => request<TrainingSessionDto>(`/api/training-sessions/${numericId(sessionId)}/start`, json('PATCH')),
  complete: (sessionId: number, body: SessionResultDto) => request<TrainingSessionDto>(`/api/training-sessions/${numericId(sessionId)}/complete`, json('PATCH', body)),
  attendance: (sessionId: number, body: AttendanceDto) => request<AttendanceResultDto>(`/api/training-sessions/${numericId(sessionId)}/attendance`, json('PUT', body)),
};
