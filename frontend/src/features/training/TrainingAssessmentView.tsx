import { useEffect, useId, useRef, useState } from 'react';
import { ApiError } from '../../shared/api/api';
import type { Res } from '../../shared/data/data';
import {
  ASSESSMENT_CRITERIA, assessmentErrorMessage, assessmentLabel, assessmentLabels,
  assessmentPreview, fetchSessionAssessment, notificationStatusLabel, reviewStatusLabel,
  type AssessmentAlertLevel, type AssessmentAnswers, type AssessmentPreview,
  type TrainingAssessmentResponse, type TrainingAssessmentTemplateResponse,
  type TrainingVetNotificationResponse,
} from './trainingAssessment';

type RequestVetCheck = (sessionId: string, reason: string) => Promise<Res<TrainingVetNotificationResponse>>;
const actionClass = 'inline-flex min-h-11 items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9b7026] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none';
const toneClass: Record<AssessmentAlertLevel, string> = {
  NO_ALERT_DETECTED: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  VET_REVIEW_REQUIRED: 'border-amber-300 bg-amber-50 text-amber-950',
  URGENT_VET_REVIEW: 'border-red-300 bg-red-50 text-red-950',
};

export function TrainingAssessmentBadge({ assessment }: { assessment: Pick<TrainingAssessmentResponse, 'alertLevel' | 'passedCount'> }) {
  return <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${toneClass[assessment.alertLevel] || 'border-slate-200 bg-slate-50 text-slate-700'}`}>
    {assessmentLabel(assessment.alertLevel)}<span className="font-normal">{assessment.passedCount}/10 passed</span>
  </span>;
}

export function TrainingPendingReviewBanner() {
  return <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
    <p className="font-semibold">Training is paused for this horse</p>
    <p>A veterinary review is pending. Other requirements will still apply after the review.</p>
  </div>;
}

function TrainingAssessmentBanner({ result, preview = false }: { result: AssessmentPreview; preview?: boolean }) {
  const definition = assessmentLabels[result.alertLevel];
  const priorityNames = result.triggerCodes.flatMap(code => {
    const criterion = ASSESSMENT_CRITERIA.find(item => item.code === code);
    return criterion ? [criterion.label] : [];
  });
  return <div role="status" aria-live={preview ? 'polite' : undefined}
    className={`rounded-xl border px-4 py-4 sm:px-5 ${toneClass[result.alertLevel]}`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base font-semibold">{definition.label}</span>
        {preview && <span className="rounded border border-current/20 px-2 py-0.5 text-[11px] font-medium">Preview</span>}
      </div>
      <span className="text-sm font-semibold tabular-nums">{result.passedCount} of 10 passed</span>
    </div>
    <p className="mt-2 text-sm leading-6">
      {preview
        ? result.alertLevel === 'NO_ALERT_DETECTED'
          ? 'No automatic vet notification is expected. The final result is confirmed when you save.'
          : 'Saving this check will notify the care team and pause new training starts for this horse.'
        : result.alertLevel === 'NO_ALERT_DETECTED'
          ? 'No alert was detected in the recorded observations. This is not a veterinary clearance.'
          : 'This recorded check identified observations that require veterinary attention.'}
    </p>
    {priorityNames.length > 0 && <p className="mt-2 text-sm leading-6"><span className="font-semibold">Priority observations:</span> {priorityNames.join('; ')}.</p>}
    {result.alertLevel === 'URGENT_VET_REVIEW' && <p className="mt-2 text-sm font-semibold leading-6">Contact the assigned vet promptly. Do not rely only on the notification.</p>}
  </div>;
}

export function TrainingAssessmentPreview({ answers }: { answers: AssessmentAnswers }) {
  const preview = assessmentPreview(answers);
  if (!preview) return <div role="status" className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
    Assessment incomplete. Answer all 10 checks to see the preview.
  </div>;
  return <TrainingAssessmentBanner result={preview} preview />;
}

/** Controlled checklist. A missing answer never means Pass or Concern observed. */
export function TrainingAssessmentForm({ answers, onChange, template, loading = false, error = '',
  onRetry, disabled = false }: {
  answers: AssessmentAnswers;
  onChange: (answers: AssessmentAnswers) => void;
  template: TrainingAssessmentTemplateResponse | null;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  disabled?: boolean;
}) {
  const id = useId();
  const criteria = template?.criteria || ASSESSMENT_CRITERIA;
  const completed = ASSESSMENT_CRITERIA.filter(item => typeof answers[item.code] === 'boolean').length;
  const locked = disabled || loading || !template;
  return <section aria-labelledby={id + '-heading'} className="rf-training-assessment space-y-4 font-sans text-slate-800">
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 id={id + '-heading'} className="text-base font-semibold text-[#1a2844]">Post-training health check</h4>
        <p aria-live="polite" aria-atomic="true" className="text-sm font-medium tabular-nums text-slate-600">{completed} of 10 checks completed</p>
      </div>
      <p className="mt-1 text-sm leading-6 text-slate-600">Review each observation after exercise. Choose Pass or Concern observed for every check.</p>
      <div role="progressbar" aria-label="Health checks completed" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={10}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-[#a4782c] transition-[width] motion-reduce:transition-none" style={{ width: `${completed * 10}%` }} />
      </div>
    </div>
    {loading && <p role="status" className="text-sm text-slate-600">Loading the health check template...</p>}
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      <p>{error}</p>
      {onRetry && <button type="button" onClick={onRetry} disabled={disabled} className={actionClass + ' mt-3 border-red-200 bg-white text-red-900 hover:bg-red-100'}>Retry health check</button>}
    </div>}
    <div className="divide-y divide-slate-200 border-y border-slate-200">
      {criteria.map((criterion, index) => <fieldset key={criterion.code} disabled={locked}
        aria-describedby={id + '-' + criterion.code + '-help'} className="min-w-0 py-4 first:pt-3">
        <legend className="float-left w-full text-sm font-semibold leading-6 text-[#1a2844]">
          <span aria-hidden="true" className="mr-2 inline-block w-5 text-xs font-medium tabular-nums text-slate-400">{String(index + 1).padStart(2, '0')}</span>
          {criterion.label}
        </legend>
        <div className="clear-both flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <p id={id + '-' + criterion.code + '-help'} className="max-w-xl text-sm leading-6 text-slate-600">{criterion.helpText}</p>
          <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-80">
            {([{ value: true, label: 'Pass' }, { value: false, label: 'Concern observed' }] as const).map(option => {
              const selected = answers[criterion.code] === option.value;
              return <label key={String(option.value)} htmlFor={id + '-' + criterion.code + '-' + option.value}
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#9b7026] motion-reduce:transition-none ${selected
                  ? option.value ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-amber-600 bg-amber-50 text-amber-950'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500'} ${locked ? 'cursor-not-allowed opacity-60' : ''}`}>
                <input id={id + '-' + criterion.code + '-' + option.value} name={id + '-' + criterion.code}
                  type="radio" value={String(option.value)} required checked={selected} disabled={locked}
                  onChange={() => onChange({ ...answers, [criterion.code]: option.value })}
                  className="h-4 w-4 shrink-0 accent-[#1a2844]" />
                {option.label}
              </label>;
            })}
          </div>
        </div>
      </fieldset>)}
    </div>
    <TrainingAssessmentPreview answers={answers} />
  </section>;
}

function assessmentTime(value: string) {
  const instant = new Date(/[zZ]$|[+-]\d{2}:\d{2}$/.test(value) ? value : value + '+07:00');
  return Number.isFinite(instant.getTime())
    ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(instant)
    : 'Time unavailable';
}

export function TrainingAssessmentEmpty({ message = 'No post-training assessment recorded' }: { message?: string }) {
  return <div role="status" className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">{message}</div>;
}

/** The recorded result is rendered without recalculating its level in the browser. */
export function TrainingAssessmentReadOnly({ assessment, overallNotes = '', canRequest = false,
  onRequestVetCheck, onRefresh }: {
  assessment: TrainingAssessmentResponse;
  overallNotes?: string;
  canRequest?: boolean;
  onRequestVetCheck?: RequestVetCheck;
  onRefresh?: () => void;
}) {
  const id = useId();
  const [requestOpen, setRequestOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const normal = assessment.alertLevel === 'NO_ALERT_DETECTED';
  const waiting = assessment.notificationStatus === 'WAITING_FOR_VET_ASSIGNMENT';
  const requested = requestSent || assessment.notificationStatus !== 'NOT_REQUESTED';
  const sendRequest = async () => {
    if (busyRef.current || !onRequestVetCheck) return;
    const trimmed = reason.trim();
    if (!trimmed || trimmed.length > 1000) {
      setReasonError(!trimmed ? 'Add a reason for requesting a vet check.' : 'Keep the reason within 1,000 characters.');
      return;
    }
    busyRef.current = true; setBusy(true); setReasonError(''); setRequestError('');
    try {
      const result = await onRequestVetCheck(assessment.sessionId, trimmed);
      if (!result.ok) {
        setRequestError(result.message || 'The vet check request could not be sent. Your reason has been kept. Please try again.');
        return;
      }
      setRequestSent(true); setRequestOpen(false);
      setRequestMessage(result.data.requestStatus === 'WAITING_FOR_VET_ASSIGNMENT'
        ? 'Waiting for vet assignment. Please contact the club manager.'
        : 'Vet check request sent.');
      onRefresh?.();
    } catch (error) {
      setRequestError(assessmentErrorMessage(error, 'The vet check request could not be sent. Your reason has been kept. Please try again.'));
    } finally { busyRef.current = false; setBusy(false); }
  };
  return <section aria-labelledby={id + '-heading'} className="rf-training-assessment mt-4 space-y-4 border-t border-slate-200 pt-5 font-sans text-slate-800">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 id={id + '-heading'} className="text-base font-semibold text-[#1a2844]">Recorded post-training check</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">Recorded by {assessment.assessorName} · {assessmentTime(assessment.assessedAt)} (Bangkok)</p>
      </div>
      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">Saved assessment</span>
    </div>
    <TrainingAssessmentBanner result={assessment} />
    {assessment.pendingPostTrainingReview && <TrainingPendingReviewBanner />}
    <div className="grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2">
      <div><p className="text-xs text-slate-500">Veterinary review</p><p className="mt-1 font-medium text-[#1a2844]">{reviewStatusLabel(assessment.reviewStatus)}</p></div>
      <div><p className="text-xs text-slate-500">Care team notification</p><p className="mt-1 font-medium text-[#1a2844]">{requestMessage || (normal && requested && !waiting ? 'Vet check request sent' : notificationStatusLabel(assessment.notificationStatus))}</p></div>
    </div>
    <ul aria-label="Recorded health checks" className="divide-y divide-slate-200 border-y border-slate-200">
      {assessment.items.map(item => <li key={item.code} className="flex items-start justify-between gap-3 py-3 text-sm">
        <span className="min-w-0 break-words leading-6 text-slate-700">{item.label || ASSESSMENT_CRITERIA.find(criterion => criterion.code === item.code)?.label || 'Health observation'}</span>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${item.passed ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{item.passed ? 'Pass' : 'Concern observed'}</span>
      </li>)}
    </ul>
    {overallNotes.trim() && <div><h4 className="text-sm font-semibold text-[#1a2844]">Overall notes</h4><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{overallNotes.trim()}</p></div>}
    {normal && !requested && canRequest && onRequestVetCheck && !requestOpen && <div className="flex flex-col gap-2 sm:items-start">
      <button type="button" onClick={() => setRequestOpen(true)} className={actionClass + ' border-slate-300 bg-white text-[#1a2844] hover:bg-slate-50'}>Request a Vet Check</button>
      <p className="text-xs leading-5 text-slate-500">A manual request does not create a training pause.</p>
    </div>}
    {normal && !requested && !canRequest && <p className="text-xs leading-5 text-slate-500">This assessment is read only for your account.</p>}
    {!normal && assessment.notificationStatus === 'NOT_REQUESTED' && <p role="status" className="text-sm text-amber-900">The care team notification has not been confirmed. Refresh this assessment to check its status.</p>}
    {requestOpen && <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <label htmlFor={id + '-request-reason'} className="block text-sm font-semibold text-[#1a2844]">Reason for the vet check</label>
      <textarea id={id + '-request-reason'} value={reason} disabled={busy} rows={3}
        onChange={event => { setReason(event.target.value); setReasonError(''); }}
        aria-required="true" aria-invalid={!!reasonError} aria-describedby={id + '-request-help'}
        className="min-h-24 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-3 text-base outline-none focus-visible:border-[#a4782c] focus-visible:ring-2 focus-visible:ring-[#a4782c]/30" />
      <p id={id + '-request-help'} className={reasonError ? 'text-sm text-red-700' : 'text-xs text-slate-500'}>{reasonError || `${reason.trim().length}/1,000 characters. Explain why you would like the vet to check this horse.`}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" disabled={busy} onClick={sendRequest} className={actionClass + ' border-[#1a2844] bg-[#1a2844] text-white hover:bg-[#243558]'}>{busy ? 'Sending request...' : 'Send vet check request'}</button>
        <button type="button" disabled={busy} onClick={() => setRequestOpen(false)} className={actionClass + ' border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}>Cancel request</button>
      </div>
    </div>}
    {requestError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{requestError}</p>}
    {requestMessage && <p role="status" className={requestMessage.startsWith('Waiting') ? 'text-sm font-medium text-amber-900' : 'text-sm font-medium text-emerald-800'}>{requestMessage}</p>}
  </section>;
}

/** Mount only after the user opens a session; list rows use the server's batch summary. */
export function TrainingAssessmentDetails({ sessionId, overallNotes, canRequest = false, onRequestVetCheck }: {
  sessionId: string;
  overallNotes?: string;
  canRequest?: boolean;
  onRequestVetCheck?: RequestVetCheck;
}) {
  const [assessment, setAssessment] = useState<TrainingAssessmentResponse | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'denied' | 'error'>('loading');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setAssessment(null); setError(''); setState('loading');
    fetchSessionAssessment(sessionId).then(value => {
      if (active) { setAssessment(value); setState('ready'); }
    }).catch(failure => {
      if (!active) return;
      if (failure instanceof ApiError && failure.status === 404) setState('missing');
      else if (failure instanceof ApiError && failure.status === 403) setState('denied');
      else { setState('error'); setError(assessmentErrorMessage(failure, 'The saved health check could not be loaded. Please try again.')); }
    });
    return () => { active = false; };
  }, [sessionId, attempt]);
  if (state === 'loading') return <p role="status" className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Loading the saved post-training check...</p>;
  if (state === 'missing') return <div className="mt-4"><TrainingAssessmentEmpty /></div>;
  if (state === 'denied') return <p role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">You do not have permission to view this health check. Your access may have changed.</p>;
  if (state === 'error') return <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900"><p>{error}</p><button type="button" onClick={() => setAttempt(value => value + 1)} className={actionClass + ' mt-3 border-red-200 bg-white hover:bg-red-100'}>Retry saved check</button></div>;
  return assessment && <TrainingAssessmentReadOnly key={sessionId} assessment={assessment} overallNotes={overallNotes}
    canRequest={canRequest} onRequestVetCheck={onRequestVetCheck} onRefresh={() => setAttempt(value => value + 1)} />;
}
