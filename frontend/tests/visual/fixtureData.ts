/** Isolated visual-test data. This module is never imported by the production App. */
import {
  ASSESSMENT_CRITERIA, ASSESSMENT_VERSION, assessmentPreview,
  type AssessmentAnswers, type AssessmentCriterionCode, type CompleteSessionInput,
  type TrainingAssessmentResponse, type TrainingAssessmentTemplateResponse,
  type TrainingVetNotificationResponse,
} from '../../src/features/training/trainingAssessment';

export const FIXTURE_SESSION_ID = 'SES-DEMO-001';
export const FIXTURE_HORSE_NAME = 'Northern Promise';
export const SCENARIOS = ['blank', 'normal', 'recommended', 'urgent', 'waiting', 'history', 'errors', 'template-error', 'submit-error'] as const;
export type Scenario = typeof SCENARIOS[number];

export const fixtureTemplate: TrainingAssessmentTemplateResponse = {
  version: ASSESSMENT_VERSION,
  criteria: ASSESSMENT_CRITERIA.map(item => ({ ...item })),
  labels: {
    NO_ALERT_DETECTED: 'Normal',
    VET_REVIEW_REQUIRED: 'Vet Check Recommended',
    URGENT_VET_REVIEW: 'Urgent Vet Check',
  },
};

export function fixtureAssessment(failed: readonly AssessmentCriterionCode[] = []): TrainingAssessmentResponse {
  const answers: AssessmentAnswers = Object.fromEntries(ASSESSMENT_CRITERIA.map(item => [item.code, !failed.includes(item.code)]));
  const evaluation = assessmentPreview(answers)!;
  const pending = evaluation.alertLevel !== 'NO_ALERT_DETECTED';
  return {
    sessionId: FIXTURE_SESSION_ID, horseId: 'HOR-DEMO-001', assessorUserId: 'HTR-DEMO-001',
    assessorName: 'Alex Morgan', assessedAt: '2026-11-10T09:32:00', checklistVersion: ASSESSMENT_VERSION,
    items: ASSESSMENT_CRITERIA.map(item => ({ code: item.code, label: item.label,
      passed: answers[item.code] === true, failNote: null })),
    ...evaluation, failedCriteria: [...failed], reviewStatus: pending ? 'PENDING' : 'NOT_REQUIRED',
    notificationStatus: pending ? 'SENT' : 'NOT_REQUESTED', linkedMedicalRecordId: null,
    reviewedMedicalRecordId: null, pendingPostTrainingReview: pending,
  };
}

export function scenarioAssessment(scenario: Scenario): TrainingAssessmentResponse {
  if (scenario === 'urgent') return fixtureAssessment([
    'TASK_COMPLETION', 'FOCUS', 'STAMINA', 'SPEED_TRANSITION', 'COOPERATION', 'BALANCE', 'COMMAND_RESPONSE',
  ]);
  if (scenario === 'recommended' || scenario === 'errors' || scenario === 'waiting') {
    const assessment = fixtureAssessment(['TASK_COMPLETION', 'FOCUS', 'STAMINA', 'SPEED_TRANSITION', 'COOPERATION']);
    if (scenario === 'waiting') assessment.notificationStatus = 'WAITING_FOR_VET_ASSIGNMENT';
    return assessment;
  }
  return fixtureAssessment();
}

export interface FixtureDiagnostics {
  requests: { method: string; path: string; body?: unknown }[];
  rejectedRequests: string[];
  lastCompletion?: CompleteSessionInput;
}

declare global {
  interface Window { __RACEFORGE_ASSESSMENT_HARNESS__: FixtureDiagnostics }
}

/** Every fetch is intercepted. Unknown requests are rejected and never reach a server. */
export function installFixtureFetch(scenario: Scenario) {
  const diagnostics: FixtureDiagnostics = { requests: [], rejectedRequests: [] };
  window.__RACEFORGE_ASSESSMENT_HARNESS__ = diagnostics;
  let assessment = scenarioAssessment(scenario);
  let templateReads = 0;
  let detailReads = 0;
  let completionWrites = 0;
  const response = (data: unknown, status = 200, code?: string) => new Response(JSON.stringify({
    success: status < 400, message: status < 400 ? 'Visual fixture response.' : 'The service is temporarily unavailable. Please retry.',
    data: code ? { code } : data, timestamp: '2026-11-10T09:32:00',
  }), { status, headers: { 'Content-Type': 'application/json' } });

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const address = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(address, window.location.href);
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const path = url.pathname;
    let body: unknown;
    if (typeof init?.body === 'string') {
      try { body = JSON.parse(init.body); } catch { throw new Error('The fixture received malformed JSON.'); }
    }
    diagnostics.requests.push({ method, path, ...(body === undefined ? {} : { body }) });
    if (method === 'GET' && path.endsWith('/training-assessments/template')) {
      templateReads++;
      if (scenario === 'template-error' && templateReads === 1) return response(null, 503, 'SIMULATED_UNAVAILABLE');
      return response(fixtureTemplate);
    }
    if (method === 'GET' && path.endsWith('/training-sessions/' + FIXTURE_SESSION_ID + '/assessment')) {
      detailReads++;
      if (scenario === 'history') return response(null, 404, 'ASSESSMENT_NOT_FOUND');
      if (scenario === 'errors' && detailReads === 1) return response(null, 503, 'SIMULATED_UNAVAILABLE');
      return response(assessment);
    }
    if (method === 'PATCH' && path.endsWith('/training-sessions/' + FIXTURE_SESSION_ID + '/complete')) {
      completionWrites++;
      diagnostics.lastCompletion = body as CompleteSessionInput;
      if (scenario === 'submit-error' && completionWrites === 1) return response(null, 503, 'SIMULATED_UNAVAILABLE');
      const complete = body as CompleteSessionInput;
      assessment = fixtureAssessment(ASSESSMENT_CRITERIA.filter(item => complete.assessment.checks[item.code] === false).map(item => item.code));
      return response({ sessionId: FIXTURE_SESSION_ID, status: 'COMPLETED', assessment,
        pendingPostTrainingReview: assessment.pendingPostTrainingReview });
    }
    if (method === 'POST' && path.endsWith('/training-sessions/' + FIXTURE_SESSION_ID + '/vet-notification')) {
      const reason = body && typeof body === 'object' && 'reason' in body ? String(body.reason).trim() : '';
      if (!reason) return response(null, 400, 'VET_REQUEST_REASON_REQUIRED');
      const alreadySent = assessment.notificationStatus === 'SENT';
      if (assessment.notificationStatus !== 'WAITING_FOR_VET_ASSIGNMENT') assessment = { ...assessment, notificationStatus: 'SENT' };
      const data: TrainingVetNotificationResponse = {
        sessionId: FIXTURE_SESSION_ID,
        requestStatus: assessment.notificationStatus === 'WAITING_FOR_VET_ASSIGNMENT'
          ? 'WAITING_FOR_VET_ASSIGNMENT' : alreadySent ? 'ALREADY_SENT' : 'SENT',
        startBlocked: assessment.pendingPostTrainingReview,
        message: assessment.notificationStatus === 'WAITING_FOR_VET_ASSIGNMENT' ? 'Waiting for vet assignment.' : 'Vet notification sent.',
      };
      return response(data);
    }
    const rejected = method + ' ' + path;
    diagnostics.rejectedRequests.push(rejected);
    throw new Error('Blocked unexpected visual fixture request: ' + rejected);
  };
  return { readAssessment: () => assessment, diagnostics };
}