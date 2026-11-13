import { request, idPath } from '../../../shared/api/api';
import type { ApiRecord } from '../../../shared/api/apiTypes';

export interface HorseEvaluationInput {
  examType: string;
  vitalSign: {
    bodyTemperature: number | null;
    restingHeartRate: number | null;
    restingRespiratoryRate: number | null;
    weight: number | null;
  };
  clinicalExams: { examinationArea: string; conditionStatus: string; notes: string }[];
}

interface MedicalRecordInput extends HorseEvaluationInput {
  profileId: string;
  postTrainingSessionId?: string;
  examinedAt: string;
  finalConclusion?: string;
  overrideReason: string | null;
  monitoringNote: string | null;
  trainingLockReason: string | null;
  diagnosis: string;
  treatment: string;
  medication: string;
  careRecommendation: string;
  notes: string;
}

interface MedicalRecordResponse extends ApiRecord {
  medicalRecordId: string;
  profileId: string;
  status: string;
}

export const listMyVetAssignments = () =>
  request<ApiRecord[]>('/medical/assignments/mine');

export const listHorseVetAssignments = (id: string) =>
  request<ApiRecord[]>(`/medical/assignments/horses/${idPath(id)}`);

export const assignVeterinarian = (id: string, body: { veterinarianId: string }) =>
  request<ApiRecord>(`/medical/assignments/horses/${idPath(id)}`, 'POST', body);

export const respondToVetAssignment = (id: string, accepted: boolean, body?: { reason: string }) =>
  request<ApiRecord>(`/medical/assignments/${idPath(id)}/${accepted ? "accept" : "decline"}`, 'POST', body);

export const listHorseMedicalRecords = (id: string) =>
  request<MedicalRecordResponse[]>(`/medical/horses/${idPath(id)}/records`);

export const getHorseHealthProfile = (id: string) =>
  request<string>(`/horses/${idPath(id)}/health-profile`);

export const saveMedicalDraft = (id: string | undefined, body: MedicalRecordInput) =>
  request<MedicalRecordResponse>(id ? `/medical/records/${idPath(id)}/draft` : '/medical/records', id ? 'PUT' : 'POST', body);

export const uploadClinicalEvidence = (id: string, area: string, body: FormData) =>
  request<MedicalRecordResponse>(`/medical/records/${idPath(id)}/clinical-exams/${idPath(area)}/evidence`, 'PUT', body);

export const confirmMedicalRecord = (id: string, body: MedicalRecordInput) =>
  request<MedicalRecordResponse>(`/medical/records/${idPath(id)}/confirm`, 'POST', body);

export const getMedicalRecord = (id: string) =>
  request<MedicalRecordResponse>(`/medical/records/${idPath(id)}`);

export const releaseTrainingLock = (id: string, body: { reason: string }) =>
  request<ApiRecord>(`/medical/horses/${idPath(id)}/training-lock/unlock`, 'POST', body);

export const evaluateHorse = (id: string, body: HorseEvaluationInput) =>
  request<{ suggestedConclusion: string; level: string; systemNote: string }>(`/medical/horses/${idPath(id)}/evaluation`, 'POST', body);
