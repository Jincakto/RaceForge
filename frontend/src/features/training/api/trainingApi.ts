import type { ProtocolDraft, ProtocolRow } from '../trainingProtocols';
import { request, idPath } from '../../../shared/api/api';
import type { completionPayload, TrainingAssessmentContext, TrainingAssessmentTemplateResponse, TrainingVetNotificationResponse } from '../trainingAssessment';
import type { RoadmapStage } from '../trainingSchedule';
import type { ApiRecord } from '../../../shared/api/apiTypes';

export const listHorseTrainingPlans = (id: string) =>
  request<ApiRecord[]>(`/horses/${idPath(id)}/training-plans`);

export const createTrainingPlan = (id: string, body: { planName: string; goal: string; startDate: string; endDate: string; assignmentId: string; stages: RoadmapStage[] }) =>
  request<ApiRecord>(`/horses/${idPath(id)}/training-plans`, 'POST', body);

export const listTrainingPlanStages = (id: string) =>
  request<ApiRecord[]>(`/training-plans/${idPath(id)}/stages`);

export const saveTrainingPlanStages = (id: string, body: { stages: RoadmapStage[] }) =>
  request<ApiRecord>(`/training-plans/${idPath(id)}/stages`, 'PUT', body);

export const listHorseTrainingSessions = (id: string) =>
  request<ApiRecord[]>(`/training-sessions/horse/${idPath(id)}`);

export const createTrainingSession = (body: { planId: string; horseId: string; scheduledTime: string; scheduledEnd: string }) =>
  request<ApiRecord>('/training-sessions', 'POST', body);

export const adjustTrainingSession = (id: string, body: { scheduledStart: string; scheduledEnd: string; intensity?: string; reason?: string }) =>
  request<ApiRecord>(`/training-sessions/${idPath(id)}/adjust`, 'PATCH', body);

export const generateTrainingSessions = (id: string) =>
  request<ApiRecord>(`/training-plans/${idPath(id)}/generate-sessions`, 'POST', { confirmed: true });

export const startTrainingSession = (id: string) =>
  request<ApiRecord>(`/training-sessions/${idPath(id)}/start`, 'PATCH');

export const stopTrainingSession = (id: string) =>
  request<ApiRecord>(`/training-sessions/${idPath(id)}/stop`, 'PATCH', {});

export const saveSessionAttendance = (id: string, body: { status: string; absenceReason: string; absenceNote: string }) =>
  request<ApiRecord>(`/training-sessions/${idPath(id)}/attendance`, 'PUT', body);

export const completeTrainingSession = (id: string, body: ReturnType<typeof completionPayload>) =>
  request<ApiRecord>(`/training-sessions/${idPath(id)}/complete`, 'PATCH', body);

export const requestSessionVetCheck = (id: string, body: { reason: string }) =>
  request<TrainingVetNotificationResponse>(`/training-sessions/${idPath(id)}/vet-notification`, 'POST', body);

export const getAssessmentNotificationTarget = (id: string) =>
  request<TrainingAssessmentContext>(`/training-assessments/notifications/${idPath(id)}/target`);

export const getAssessmentTemplate = () =>
  request<TrainingAssessmentTemplateResponse>('/training-assessments/template');

export const getSessionAssessment = (id: string) =>
  request<unknown>(`/training-sessions/${idPath(id)}/assessment`);

export const listProtocols = () => request<ProtocolRow[]>('/training-protocols');
export const postTrainingProtocol = (draft: ProtocolDraft) => request<ProtocolRow>('/training-protocols', 'POST', draft);
export const changeProtocolStatus = (id: string, action: 'approve' | 'retire') => request<ProtocolRow>(`/training-protocols/${idPath(id)}/${action}`,'POST');
