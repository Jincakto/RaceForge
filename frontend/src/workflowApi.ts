import { api } from './api';
import { backendId } from './backendBridge';
import type { HealthRecord } from './data';
export type ServerRow = Record<string, any>;
export type Stage = { startDay: number; endDay: number; activityName: string; intensity: string; daysOfWeek: string[]; sessionTime: string; sessionEndTime: string };
export const DAYS = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];
export const emptyStage = (): Stage => ({ startDay: 1, endDay: 7, activityName: '', intensity: 'LOW', daysOfWeek: ['MONDAY','WEDNESDAY','FRIDAY'], sessionTime: '07:00', sessionEndTime: '07:30' });
export async function saveExamination(record: HealthRecord, vetId: string, draftId?: string, onPreview?: (preview: ServerRow) => void): Promise<string> {
  const horseId = backendId(record.horseId);
  const profileId = await api<string>(`/api/horses/${horseId}/health-profile`);
  const areaMap: Record<string,string> = { eyes:'EYES', nose:'RESPIRATORY', general:'GENERAL_CONDITION', movement:'MOVEMENT', legs:'LEGS', skin:'SKIN' };
  const examType = record.type === 'Khám tiếp nhận' ? 'INITIAL' : 'FOLLOW_UP';
  const numeric = (value?: string) => value?.trim() ? Number(value.replace(',', '.')) : null;
  const vitalSign = { bodyTemperature: numeric(record.vitals?.temperature), restingHeartRate: numeric(record.vitals?.heartRate), restingRespiratoryRate: numeric(record.vitals?.respRate), weight: numeric(record.vitals?.weight) };
  const clinicalExams = Object.entries(record.regions || {}).map(([area, exam]) => ({ examinationArea: areaMap[area], conditionStatus: exam.ok ? 'NORMAL' : 'ABNORMAL', notes: exam.note || '' }));
  // The backend preview applies the authoritative clinical rules before a draft is persisted.
  const preview = await api<ServerRow>(`/api/medical/horses/${horseId}/evaluation`, 'POST', { examType, vitalSign, clinicalExams });
  onPreview?.(preview);
  const selectedConclusion = record.decision === 'eligible' ? 'FIT' : record.decision === 'conditional' ? 'FIT_WITH_MONITORING' : 'NOT_FIT';
  if (preview.suggestedConclusion && preview.suggestedConclusion !== selectedConclusion && !record.overrideReason?.trim()) {
    throw new Error(`Backend recommendation: ${preview.suggestedConclusion}. Review the clinical warning and enter an override reason before saving a different conclusion.`);
  }
  const body = {
    profileId, veterinarianId: backendId(vetId), examType,
    examinedAt: new Date().toLocaleString('sv-SE').replace(' ', 'T'),
    finalConclusion: selectedConclusion,
    overrideReason: record.overrideReason || null, monitoringNote: record.followUpNote || null,
    trainingLockReason: record.decisionReason || null, diagnosis: record.diagnosis, careRecommendation: record.recommendations,
    notes: record.notes, medication: record.medications,
    vitalSign, clinicalExams,
  };
  const saved = await api<ServerRow>(draftId ? `/api/medical/records/${draftId}/draft` : '/api/medical/records', draftId ? 'PUT' : 'POST', body);
  return String(saved.medicalRecordId);
}
export const confirmExamination = (id: string) => api(`/api/medical/records/${id}/confirm`, 'POST');
export function validateStages(stages: Stage[]) {
  if (!stages.length) throw new Error('Add at least one stage.');
  for (const s of stages) {
    if (!s.activityName.trim() || !Number.isInteger(s.startDay) || !Number.isInteger(s.endDay) || s.startDay < 1 || s.endDay < s.startDay || !s.daysOfWeek.length || s.daysOfWeek.length > 6 || s.sessionEndTime <= s.sessionTime) throw new Error('Each stage needs valid days, activity, 1–6 weekdays and an end time after its start time.');
  }
}
