import type { AppUser, Enrollment, TrainingSession } from '../../shared/data/data';
import type { RemoteIssue } from '../../shared/api/remote';
import { trainingTimestamp } from './trainingTimestamp';
export type PackageLifecycleAction = 'complete' | 'cancel';
export interface PackageLifecycleWire {
  registration: { horsePackageId: string; horseId: string; status: string; [key: string]: unknown };
  deletedSessionCount: number;
  certificate: { certificateNumber: string; issueDate: string } | null;
}
export interface PackageLifecycleOutcome {
  registration: Enrollment;
  deletedSessionCount?: number;
  certificate: PackageLifecycleWire['certificate'];
  refreshWarning?: string;
  reconciled?: boolean;
}
export type PackageLifecycleResult = { ok: true; data: PackageLifecycleOutcome } | { ok: false; message: string; uncertain?: boolean };
export function registrationStatus(e: Enrollment): string {
  const labels: Record<string,string> = { ACTIVE:'Active', PAUSED:'Paused', COMPLETED:'Completed', CANCELLED:'Cancelled', EXPIRED:'Expired', FAILED:'Failed', PENDING:'Awaiting payment' };
  return labels[e.apiStatus || ''] || (e.status === 'paused' ? 'Paused' : e.status === 'completed' ? 'Completed' : 'Active');
}
export function canCancelRegistration(e: Enrollment, user: AppUser | null, ownerId?: string): boolean {
  return user?.role === 'owner' && user.status === 'active' && !user.locked && user.id === ownerId
    && e.paymentStatus === 'PAID' && ['ACTIVE','PAUSED'].includes(e.apiStatus || '');
}
export function unfinishedPackageSession(e: Enrollment, rows: TrainingSession[]): boolean {
  return rows.some(s=>s.horsePackageId === e.id && !!s.actualStart && !['Completed','Not Performed','Cancelled'].includes(s.status));
}
function isoDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const m=value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}
export function completionBlockReason(e: Enrollment, user: AppUser | null, rows: TrainingSession[],
    loaded: string[] = [], issues: RemoteIssue[] = [], now = new Date()): string | null {
  if(user?.role !== 'head_trainer' || user.status !== 'active' || user.locked || e.trainerId !== user.id || e.trainerStatus !== 'confirmed')
    return 'Only the current accepted trainer may complete this package.';
  if(e.apiStatus !== 'ACTIVE' || e.paymentStatus !== 'PAID') return 'The package must be active and paid.';
  const today=trainingTimestamp(now).slice(0,10), start=isoDate(e.startedAt),end=isoDate(e.expiresAt);
  if(!start || !end || today<start || today>end) return 'The package must be within its valid period.';
  // A successful context read is protected by MANAGE_TRAINING. Never infer this permission from role alone.
  const sources=['Training schedule '+e.horseId,'Assigned packages '+e.id];
  if(sources.some(key=>!loaded.includes(key) || issues.some(issue=>issue.key===key)))
    return 'Refresh the package context and training schedule before completing this package.';
  const sessions=rows.filter(s=>s.horsePackageId === e.id && s.status !== 'Cancelled');
  if(!sessions.length) return 'At least one completed or missed session is required.';
  if(sessions.some(s=>!['Completed','Not Performed'].includes(s.status)))
    return 'Finish every session first. Stopped exercise still needs its results completed.';
  return null;
}