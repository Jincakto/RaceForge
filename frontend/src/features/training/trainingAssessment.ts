import { getAssessmentNotificationTarget, getAssessmentTemplate, getSessionAssessment } from "./api/trainingApi";
import { ApiError, idPath } from '../../shared/api/api';
import type { AppUser, Enrollment, TrainingSession } from '../../shared/data/data';

export interface TrainingAssessmentContext { sessionId: string; horseId: string; }
export const isAssessmentNotification = (type: string) => ['TRAINING_ASSESSMENT_ALERT', 'TRAINING_ASSESSMENT_REQUEST'].includes(type);

export async function fetchAssessmentNotification(notificationId: string) {
  const target = await getAssessmentNotificationTarget(notificationId);
  if (!target || typeof target.sessionId !== 'string' || typeof target.horseId !== 'string') throw new Error('The notification target could not be verified.');
  const assessment = await fetchSessionAssessment(target.sessionId);
  if (assessment.horseId !== target.horseId) throw new Error('The notification does not match this horse.');
  return { target, assessment };
}

export const ASSESSMENT_VERSION = 'POST_TRAINING_V1';
// Fallback metadata mirrors the backend performance template; the API owns displayed labels/help.
export const ASSESSMENT_CRITERIA = [
  { code: 'TASK_COMPLETION', label: 'Task Completion', helpText: 'Complete the exercise assigned for this session.' },
  { code: 'SPEED_CONTROL', label: 'Speed Control', helpText: 'Maintain the speed requested by the trainer.' },
  { code: 'MOVEMENT_STABILITY', label: 'Movement Stability', helpText: 'Move steadily with minimal interruptions.' },
  { code: 'BALANCE', label: 'Balance', helpText: 'Maintain balance while moving.' },
  { code: 'COMMAND_RESPONSE', label: 'Command Response', helpText: "Respond to the trainer's commands." },
  { code: 'FOCUS', label: 'Focus', helpText: 'Stay focused throughout the exercise.' },
  { code: 'STAMINA', label: 'Stamina', helpText: 'Maintain effort until the end of the exercise.' },
  { code: 'SPEED_TRANSITION', label: 'Speed Transition', helpText: 'Increase or decrease speed as requested.' },
  { code: 'COOPERATION', label: 'Cooperation', helpText: 'Cooperate with the trainer during the exercise.' },
  { code: 'PERFORMANCE_CONSISTENCY', label: 'Performance Consistency', helpText: 'Maintain consistent performance throughout the session.' },
] as const;
export type AssessmentCriterionCode = typeof ASSESSMENT_CRITERIA[number]['code'];
export type AssessmentAnswers = Partial<Record<AssessmentCriterionCode, boolean>>;
export type AssessmentAlertLevel = 'NO_ALERT_DETECTED' | 'VET_REVIEW_REQUIRED' | 'URGENT_VET_REVIEW';
export type AssessmentReviewStatus = 'NOT_REQUIRED' | 'PENDING' | 'RESOLVED';
export type AssessmentNotificationStatus = 'NOT_REQUESTED' | 'SENT' | 'WAITING_FOR_VET_ASSIGNMENT';
export interface TrainingAssessmentRequest {
  checklistVersion: string;
  checks: Record<AssessmentCriterionCode, boolean>;
  failNotes?: Record<string, string>;
}
export interface TrainingAssessmentTemplateResponse {
  version: string;
  criteria: { code: AssessmentCriterionCode; label: string; helpText: string }[];
  labels: Record<AssessmentAlertLevel, string>;
}
export interface TrainingAssessmentResponse {
  sessionId: string;
  horseId: string;
  assessorUserId: string;
  assessorName: string;
  assessedAt: string;
  checklistVersion: string;
  items: { code: AssessmentCriterionCode; label: string; passed: boolean; failNote: string | null }[];
  passedCount: number;
  failedCount: number;
  alertLevel: AssessmentAlertLevel;
  triggerCodes: string[];
  failedCriteria: AssessmentCriterionCode[];
  reviewStatus: AssessmentReviewStatus;
  notificationStatus: AssessmentNotificationStatus;
  linkedMedicalRecordId: string | null;
  reviewedMedicalRecordId: string | null;
  pendingPostTrainingReview: boolean;
}
export interface TrainingVetNotificationResponse {
  sessionId: string;
  requestStatus: 'SENT' | 'ALREADY_SENT' | 'WAITING_FOR_VET_ASSIGNMENT' | 'NOT_REQUESTED';
  startBlocked: boolean;
  message: string;
}
export interface CompleteSessionInput {
  distance: number;
  avgSpeed: number;
  performanceNotes?: string;
  maxSpeed?: number;
  assessment: TrainingAssessmentRequest;
}
export interface AssessmentPreview {
  passedCount: number;
  failedCount: number;
  alertLevel: AssessmentAlertLevel;
  triggerCodes: string[];
}

export const assessmentLabels = {
  NO_ALERT_DETECTED: { label: 'Normal', tone: 'normal', description: 'No concerns were observed in this post-training check. This is not a veterinary clearance.' },
  VET_REVIEW_REQUIRED: { label: 'Vet Check Recommended', tone: 'warning', description: 'Some post-training observations need veterinary review. New training starts are paused until reviewed.' },
  URGENT_VET_REVIEW: { label: 'Urgent Vet Check', tone: 'urgent', description: 'Priority veterinary attention is needed. Contact the assigned vet promptly. New training starts are paused.' },
} as const;
export const PENDING_REVIEW_MESSAGE = 'Training paused — a vet check is pending for this horse.';
const criterionCodes = new Set<string>(ASSESSMENT_CRITERIA.map(item => item.code));
const reviewStatuses = new Set(['NOT_REQUIRED', 'PENDING', 'RESOLVED']);
const notificationStatuses = new Set(['NOT_REQUESTED', 'SENT', 'WAITING_FOR_VET_ASSIGNMENT']);

export function assessmentLabel(level: unknown): string {
  return typeof level === 'string' && Object.prototype.hasOwnProperty.call(assessmentLabels, level)
    ? assessmentLabels[level as AssessmentAlertLevel].label : 'Health check unavailable';
}
export function reviewStatusLabel(status: unknown): string {
  const labels: Record<string, string> = { NOT_REQUIRED: 'No vet review required', PENDING: 'Awaiting vet review', RESOLVED: 'Vet review completed' };
  return typeof status === 'string' && Object.prototype.hasOwnProperty.call(labels, status) ? labels[status] : 'Review status unavailable';
}
export function notificationStatusLabel(status: unknown): string {
  const labels: Record<string, string> = { NOT_REQUESTED: 'No vet check requested', SENT: 'Vet notified', WAITING_FOR_VET_ASSIGNMENT: 'Waiting for vet assignment' };
  return typeof status === 'string' && Object.prototype.hasOwnProperty.call(labels, status) ? labels[status] : 'Notification status unavailable';
}

export function assessmentPreview(answers: AssessmentAnswers): AssessmentPreview | null {
  if (!answers || typeof answers !== 'object' || Object.keys(answers).length !== ASSESSMENT_CRITERIA.length
      || Object.keys(answers).some(code => !criterionCodes.has(code))
      || ASSESSMENT_CRITERIA.some(item => !Object.prototype.hasOwnProperty.call(answers, item.code) || typeof answers[item.code] !== 'boolean')) return null;
  const passedCount = ASSESSMENT_CRITERIA.filter(item => answers[item.code] === true).length;
  let alertLevel: AssessmentAlertLevel = passedCount <= 3 ? 'URGENT_VET_REVIEW' : passedCount <= 6 ? 'VET_REVIEW_REQUIRED' : 'NO_ALERT_DETECTED';
  const triggerCodes: string[] = passedCount <= 3 ? ['SCORE_URGENT'] : passedCount <= 6 ? ['SCORE_REVIEW'] : [];
  for (const item of ASSESSMENT_CRITERIA) {
    if (answers[item.code] !== false) continue;
    if (item.code === 'SPEED_CONTROL' || item.code === 'MOVEMENT_STABILITY') {
      alertLevel = 'URGENT_VET_REVIEW'; triggerCodes.push(item.code);
    } else if (item.code === 'BALANCE' || item.code === 'COMMAND_RESPONSE' || item.code === 'PERFORMANCE_CONSISTENCY') {
      if (alertLevel === 'NO_ALERT_DETECTED') alertLevel = 'VET_REVIEW_REQUIRED';
      triggerCodes.push(item.code);
    }
  }
  return { passedCount, failedCount: 10 - passedCount, alertLevel, triggerCodes };
}

class AssessmentInputError extends Error { }
export function toAssessmentRequest(answers: AssessmentAnswers, version = ASSESSMENT_VERSION): TrainingAssessmentRequest {
  if (version !== ASSESSMENT_VERSION) throw new AssessmentInputError('Refresh the health check template before saving.');
  if (!assessmentPreview(answers)) throw new AssessmentInputError('Complete all 10 checks before saving.');
  const checks = Object.fromEntries(ASSESSMENT_CRITERIA.map(item => [item.code, answers[item.code]])) as Record<AssessmentCriterionCode, boolean>;
  return { checklistVersion: version, checks };
}

/** Explicit write DTO: keep actual distance and speed separate from legacy result display fields. */
export function completionPayload(input: CompleteSessionInput): CompleteSessionInput {
  if (!input || !input.assessment) throw new AssessmentInputError('Complete all 10 checks before saving.');
  const assessment = toAssessmentRequest(input.assessment.checks, input.assessment.checklistVersion);
  if (typeof input.distance !== 'number' || !Number.isFinite(input.distance) || input.distance < 0 || input.distance > 999999.99
      || Math.abs(input.distance * 100 - Math.round(input.distance * 100)) > 0.000001) {
    throw new AssessmentInputError('Enter the actual distance in km, with up to 2 decimal places.');
  }
  if (typeof input.avgSpeed !== 'number' || !Number.isFinite(input.avgSpeed) || input.avgSpeed < 0 || input.avgSpeed > 100) {
    throw new AssessmentInputError('Average speed must be between 0 and 100 km/h.');
  }
  if (input.performanceNotes !== undefined && typeof input.performanceNotes !== 'string') {
    throw new AssessmentInputError('Enter overall notes as text.');
  }
  const notes = input.performanceNotes?.trim() || '';
  if (notes.length > 1000) throw new AssessmentInputError('Keep overall notes within 1,000 characters.');
  const payload: CompleteSessionInput = { distance: input.distance, avgSpeed: input.avgSpeed,
    assessment, ...(notes ? { performanceNotes: notes } : {}) };
  if (input.maxSpeed !== undefined) {
    if (typeof input.maxSpeed !== 'number' || !Number.isFinite(input.maxSpeed) || input.maxSpeed < input.avgSpeed) {
      throw new AssessmentInputError('Maximum speed must be at least the average speed.');
    }
    payload.maxSpeed = input.maxSpeed;
  }
  return payload;
}

export function vetRequestReason(reason: string): string {
  if (typeof reason !== 'string' || !reason.trim()) throw new AssessmentInputError('Add a reason for requesting a vet check.');
  const trimmed = reason.trim();
  if (trimmed.length > 1000) throw new AssessmentInputError('Keep the vet check reason within 1,000 characters.');
  return trimmed;
}

export function canRequestVetCheck(session: Pick<TrainingSession, 'status' | 'horsePackageId'>,
    enrollments: readonly Pick<Enrollment, 'id' | 'trainerId' | 'trainerStatus'>[],
    user: Pick<AppUser, 'id' | 'role'> | null | undefined): boolean {
  return user?.role === 'head_trainer' && session.status === 'Completed' && !!session.horsePackageId
    && enrollments.some(entry => entry.id === session.horsePackageId && entry.trainerId === user.id && entry.trainerStatus === 'confirmed');
}

function record(value: unknown): value is Record<string, any> { return !!value && typeof value === 'object' && !Array.isArray(value); }
export function assessmentFromApi(value: unknown): TrainingAssessmentResponse | undefined {
  if (!record(value) || typeof value.sessionId !== 'string' || !value.sessionId || typeof value.horseId !== 'string'
      || typeof value.assessorUserId !== 'string' || typeof value.assessorName !== 'string' || typeof value.assessedAt !== 'string'
      || value.checklistVersion !== ASSESSMENT_VERSION || !Array.isArray(value.items) || value.items.length !== 10
      || !Object.prototype.hasOwnProperty.call(assessmentLabels, value.alertLevel)
      || !reviewStatuses.has(value.reviewStatus) || !notificationStatuses.has(value.notificationStatus)
      || typeof value.pendingPostTrainingReview !== 'boolean' || !Array.isArray(value.triggerCodes)
      || value.triggerCodes.some((code: unknown) => typeof code !== 'string') || !Array.isArray(value.failedCriteria)
      || value.failedCriteria.some((code: string) => !criterionCodes.has(code))) return undefined;
  const seen = new Set<string>();
  for (const item of value.items) {
    if (!record(item) || !criterionCodes.has(item.code) || seen.has(item.code) || typeof item.label !== 'string'
        || typeof item.passed !== 'boolean' || (item.failNote != null && typeof item.failNote !== 'string')) return undefined;
    seen.add(item.code);
  }
  const passed = value.items.filter((item: { passed: boolean }) => item.passed).length;
  if (value.passedCount !== passed || value.failedCount !== 10 - passed) return undefined;
  if ((value.linkedMedicalRecordId != null && typeof value.linkedMedicalRecordId !== 'string')
      || (value.reviewedMedicalRecordId != null && typeof value.reviewedMedicalRecordId !== 'string')) return undefined;
  return { ...value, linkedMedicalRecordId: value.linkedMedicalRecordId ?? null,
    reviewedMedicalRecordId: value.reviewedMedicalRecordId ?? null } as TrainingAssessmentResponse;
}

export async function fetchAssessmentTemplate(): Promise<TrainingAssessmentTemplateResponse> {
  const value = await getAssessmentTemplate();
  if (!record(value) || value.version !== ASSESSMENT_VERSION || !Array.isArray(value.criteria) || value.criteria.length !== 10
      || new Set(value.criteria.map(item => item.code)).size !== 10
      || value.criteria.some(item => !criterionCodes.has(item.code) || typeof item.label !== 'string' || typeof item.helpText !== 'string')
      || !record(value.labels) || Object.keys(assessmentLabels).some(level => typeof value.labels[level as AssessmentAlertLevel] !== 'string')) {
    throw new AssessmentInputError('The health check template is unavailable. Please retry.');
  }
  return value;
}
export async function fetchSessionAssessment(sessionId: string): Promise<TrainingAssessmentResponse> {
  const value = assessmentFromApi(await getSessionAssessment(sessionId));
  if (!value || value.sessionId !== sessionId) throw new AssessmentInputError('The saved health check could not be verified. Refresh the session and try again.');
  return value;
}
export function isDuplicateCompletionError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409 && record(error.details)
    && ['SESSION_ALREADY_COMPLETED', 'ASSESSMENT_ALREADY_EXISTS'].includes(error.details.code);
}

export function assessmentErrorMessage(error: unknown, fallback = 'Unable to save the health check. Please try again.'): string {
  if (error instanceof AssessmentInputError) return error.message;
  if (!(error instanceof ApiError)) return fallback;
  const messages: Record<string, string> = {
    ASSESSMENT_REQUIRED: 'Complete all 10 checks before saving.',
    ASSESSMENT_INCOMPLETE: 'Complete all 10 checks before saving.',
    INVALID_CRITERION_CODE: 'Refresh the health check template before saving.',
    PENDING_POST_TRAINING_REVIEW: PENDING_REVIEW_MESSAGE,
    SESSION_ALREADY_COMPLETED: 'This session was already completed. Refresh to view the saved health check.',
    ASSESSMENT_ALREADY_EXISTS: 'This session already has a saved health check. Refresh to view it.',
    INVALID_SESSION_STATE: 'The session is not ready to complete. Refresh its status and stop the exercise first.',
    VET_REQUEST_REASON_REQUIRED: 'Add a reason for requesting a vet check.',
    VET_REQUEST_REASON_TOO_LONG: 'Keep the vet check reason within 1,000 characters.',
    FAIL_NOTE_TOO_LONG: 'Keep overall notes within 1,000 characters.',
  };
  const code = record(error.details) ? error.details.code : undefined;
  if (typeof code === 'string' && Object.prototype.hasOwnProperty.call(messages, code)) return messages[code];
  if (error.status === 0) return 'Cannot connect to the server. Your entries have been kept. Please try again.';
  if (error.status === 401) return 'Your session has expired. Please sign in again.';
  if (error.status === 403) return 'You do not have permission to perform this action for this horse.';
  if (error.status === 404) return 'The requested health check is unavailable. Refresh the session and try again.';
  if (error.status === 409) return 'This session has changed. Refresh its status and try again.';
  return fallback;
}