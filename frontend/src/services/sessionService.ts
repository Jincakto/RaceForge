import { request, json } from './api.ts';
import { numericId, type ScheduleSessionDto, type ScheduleRecurringDto, type SessionResultDto, type AttendanceDto, type TrainingSessionDto, type AttendanceResultDto } from '../types/api.ts';
export const sessionService = {
  byHorse: (horseId: number) => request<TrainingSessionDto[]>('/api/training-sessions/horse/' + numericId(horseId)),
  schedule: (body: ScheduleSessionDto) => request<TrainingSessionDto>('/api/training-sessions', json('POST', body)),
  recurring: (body: ScheduleRecurringDto) => request<TrainingSessionDto[]>('/api/training-sessions/recurring', json('POST', body)),
  startSession: (id: number) => request<TrainingSessionDto>('/api/training-sessions/' + numericId(id) + '/start', json('PATCH')),
  completeSession: (id: number, body: SessionResultDto) => request<TrainingSessionDto>('/api/training-sessions/' + numericId(id) + '/complete', json('PATCH', body)),
  attendance: (id: number, body: AttendanceDto) => request<AttendanceResultDto>('/api/training-sessions/' + numericId(id) + '/attendance', json('PUT', body)),
};
