import { useEffect, useState } from 'react';
import { request } from '../../shared/api/api';

export type SuggestionStatus = 'RECOMMENDED' | 'AVAILABLE' | 'REVIEW_REQUIRED' | 'NOT_ELIGIBLE';
export interface PackageSuggestion {
  packageId: string; packageName: string; packageType: string; durationDays: number; price: number; goal: string | null;
  recommendationStatus: SuggestionStatus; canRegister: boolean;
  reasonCodes: string[]; blockReasons: { code: string; message: string }[];
  workload: null | {
    entryIntensity: string; peakIntensity: string;
    firstWeekSessionsMin: number; firstWeekSessionsMax: number;
    firstWeekMinutesMin: number; firstWeekMinutesMax: number;
  };
}
export interface SuggestionResponse {
  horseId: string; ruleVersion: string; evaluatedAt: string; historyWindowDays: number;
  readiness: { observedStableIntensity: string; completedSessions: number; lastCompletedAt: string | null; reasonCodes: string[] };
  packages: PackageSuggestion[];
}
export const reasonLabels: Record<string, string> = {
  STARTER_OPTION: 'Introductory option under the starter rules.',
  NO_TRAINING_HISTORY: 'No valid training history is recorded.',
  INCOMPLETE_HISTORY: 'Some completed records have missing or invalid data.',
  INSUFFICIENT_STABLE_HISTORY: 'Not enough evidence of a sustained intensity over 30 days.',
  REASSESSMENT_NEEDED: 'The last completed session was more than 30 days ago. Trainer reassessment is needed.',
  ACTUAL_DURATION_MISSING: 'Actual session duration is missing; planned duration was not substituted.',
  ENTRY_INTENSITY_EXCEEDS_HISTORY: 'The initial intensity exceeds the recorded sustained level.',
  ENTRY_WORKLOAD_EXCEEDS_HISTORY: 'The initial workload exceeds the recent recorded workload.',
  HISTORY_AND_WORKLOAD_MATCH: 'The recorded history and initial workload match the rules.',
  INTENSITY_JUMP: 'The roadmap skips an intensity level.',
  MULTIPLE_LOAD_INCREASES: 'More than one workload factor increases at the same transition.',
  INTENSITY_PERIOD_TOO_SHORT: 'An intensity increases before a 30-day stage period.',
  STAGE_WITHOUT_SESSIONS: 'A stage may have no scheduled training dates.',
  VARIABLE_ENTRY_INTENSITY: 'Initial intensity varies with the package start weekday.',
  NO_PLANNED_SESSIONS: 'The roadmap has no planned training dates.',
  INVALID_STAGE_DURATION: 'A stage has an invalid duration.',
  STAGE_OUTSIDE_PACKAGE: 'A stage extends beyond the package period.',
};
export function suggestionReason(code: string) {
  return reasonLabels[code] || 'This package needs review by the club.';
}
export function sortSuggestions(rows: PackageSuggestion[], goal: string) {
  const preferred: Record<string, string> = { FOUNDATION: 'BASIC', IMPROVE_PERFORMANCE: 'PERFORMANCE', PREPARE_FOR_RACING: 'RACING' };
  const order = ['RECOMMENDED', 'AVAILABLE', 'REVIEW_REQUIRED', 'NOT_ELIGIBLE'];
  return [...rows].sort((a, b) => order.indexOf(a.recommendationStatus) - order.indexOf(b.recommendationStatus)
    || Number(b.packageType === preferred[goal]) - Number(a.packageType === preferred[goal])
    || a.durationDays - b.durationDays || a.packageName.localeCompare(b.packageName) || a.packageId.localeCompare(b.packageId));
}
export function usePackageSuggestions(horseId: string, enabled: boolean) {
  const [data, setData] = useState<SuggestionResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null); setError('');
    if (!enabled || !horseId) { setLoading(false); return; }
    setLoading(true);
    request<SuggestionResponse>(`/horses/${encodeURIComponent(horseId)}/training-package-suggestions`)
      .then(result => { if (active) setData(result); })
      .catch(e => { if (active) setError(e.message || 'Could not load suggestions.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [horseId, enabled, version]);
  return { data, error, loading, retry: () => setVersion(v => v + 1) };
}