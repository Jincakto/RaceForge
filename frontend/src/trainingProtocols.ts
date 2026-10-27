import { request, idPath } from './api';
export const WEEK_DAYS = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];
export interface ProtocolStage { startDay: number; endDay: number; activityName: string; intensity: string; daysOfWeek: string[]; sessionTime: string; sessionEndTime: string; }
export interface ProtocolDraft { name: string; packageType: string; minWeight: number; maxWeight: number; stages: ProtocolStage[]; rationale: string; }
export interface ProtocolRow { protocol_id: string; protocol_name: string; package_type: string; min_weight: number; max_weight: number; status: string; stages_json: string; rationale: string; }
export function validateProtocol(d: ProtocolDraft) {
  if (!d.name.trim() || d.name.length > 150) throw new Error("Protocol name is required and cannot exceed 150 characters.");
  if (!['BASIC','RACING','PERFORMANCE','RECOVERY'].includes(d.packageType)) throw new Error("Select a valid package type.");
  if (!Number.isFinite(d.minWeight) || !Number.isFinite(d.maxWeight) || d.minWeight < 0.01 || d.maxWeight <= d.minWeight) throw new Error("Weight limits must be positive, with the upper limit greater than the lower limit.");
  if (!d.rationale.trim() || d.rationale.length > 1000) throw new Error("Enter the rationale, up to 1000 characters.");
  if (!d.stages.length || d.stages.length > 100) throw new Error("Provide 1–100 stages.");
  let last = 0;
  for (const s of [...d.stages].sort((a,b)=>a.startDay-b.startDay)) {
    if (!Number.isInteger(s.startDay) || !Number.isInteger(s.endDay) || s.startDay <= last || s.endDay < s.startDay || s.endDay > 3660 || !s.activityName.trim() || s.activityName.length > 500 || !['LOW','MODERATE','HIGH'].includes(s.intensity) || s.daysOfWeek.length < 1 || s.daysOfWeek.length > 6 || new Set(s.daysOfWeek).size !== s.daysOfWeek.length || s.daysOfWeek.some(d=>!WEEK_DAYS.includes(d)) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.sessionTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.sessionEndTime) || s.sessionEndTime <= s.sessionTime) throw new Error("Stages must use non-overlapping days within 1–3660, an activity, 1–6 weekdays and an end time after the start time.");
    last = s.endDay;
  }
}
export const listProtocols = () => request<ProtocolRow[]>('/training-protocols');
export function createProtocol(draft: ProtocolDraft) { validateProtocol(draft); return request<ProtocolRow>('/training-protocols','POST',draft); }
export const changeProtocolStatus = (id: string, action: 'approve' | 'retire') => request<ProtocolRow>(`/training-protocols/${idPath(id)}/${action}`,'POST');
export function protocolOverlap(d: Pick<ProtocolRow,'package_type'|'min_weight'|'max_weight'|'protocol_id'>, list: ProtocolRow[]) {
  return list.some(p=>p.protocol_id!==d.protocol_id && p.status==='APPROVED' && p.package_type===d.package_type && Number(p.min_weight)<Number(d.max_weight) && Number(p.max_weight)>Number(d.min_weight));
}
