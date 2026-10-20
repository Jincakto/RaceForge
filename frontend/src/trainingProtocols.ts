import { request, idPath } from './api';
export const SOURCE_HOSTS = ['www.merckvetmanual.com','www.msdvetmanual.com','extension.umn.edu','horses.extension.org','extension.purdue.edu','www.extension.purdue.edu','horsereport.vetmed.ucdavis.edu','cehhorsereport.vetmed.ucdavis.edu','ceh.vetmed.ucdavis.edu'];
export const WEEK_DAYS = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];
export interface ProtocolStage { startDay: number; endDay: number; activityName: string; intensity: string; daysOfWeek: string[]; sessionTime: string; sessionEndTime: string; }
export interface ProtocolDraft { name: string; packageType: string; minWeight: number; maxWeight: number; stages: ProtocolStage[]; sources: string[]; rationale: string; }
export interface ProtocolRow { protocol_id: string; protocol_name: string; package_type: string; min_weight: number; max_weight: number; status: string; stages_json: string; sources_json: string; rationale: string; }
export function validateProtocol(d: ProtocolDraft) {
  if (!d.name.trim() || d.name.length > 150) throw new Error('Tên phác đồ bắt buộc, tối đa 150 ký tự.');
  if (!['BASIC','RACING','PERFORMANCE','RECOVERY'].includes(d.packageType)) throw new Error('Chọn loại gói hợp lệ.');
  if (!Number.isFinite(d.minWeight) || !Number.isFinite(d.maxWeight) || d.minWeight < 0.01 || d.maxWeight <= d.minWeight) throw new Error('Khoảng cân nặng phải dương và cận trên lớn hơn cận dưới.');
  if (!d.rationale.trim() || d.rationale.length > 1000) throw new Error('Nhập cơ sở áp dụng, tối đa 1000 ký tự.');
  if (!d.sources.length) throw new Error('Cần ít nhất một nguồn tham khảo.');
  for (const source of d.sources) {
    let url: URL; try { url = new URL(source); } catch { throw new Error('URL nguồn tham khảo không hợp lệ.'); }
    if (url.protocol !== 'https:' || !SOURCE_HOSTS.includes(url.hostname)) throw new Error('Nguồn phải là URL HTTPS từ danh sách cơ sở thú y/đại học được BE hỗ trợ.');
  }
  if (!d.stages.length || d.stages.length > 100) throw new Error('Cần từ 1 đến 100 giai đoạn.');
  let last = 0;
  for (const s of [...d.stages].sort((a,b)=>a.startDay-b.startDay)) {
    if (!Number.isInteger(s.startDay) || !Number.isInteger(s.endDay) || s.startDay <= last || s.endDay < s.startDay || s.endDay > 3660 || !s.activityName.trim() || s.activityName.length > 500 || !['LOW','MODERATE','HIGH'].includes(s.intensity) || s.daysOfWeek.length < 1 || s.daysOfWeek.length > 6 || new Set(s.daysOfWeek).size !== s.daysOfWeek.length || s.daysOfWeek.some(d=>!WEEK_DAYS.includes(d)) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.sessionTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.sessionEndTime) || s.sessionEndTime <= s.sessionTime) throw new Error('Giai đoạn phải có ngày 1–3660 không chồng lấn, nội dung, 1–6 ngày/tuần và giờ kết thúc sau giờ bắt đầu.');
    last = s.endDay;
  }
}
export const listProtocols = () => request<ProtocolRow[]>('/training-protocols');
export function createProtocol(draft: ProtocolDraft) { validateProtocol(draft); return request<ProtocolRow>('/training-protocols','POST',draft); }
export const changeProtocolStatus = (id: string, action: 'approve' | 'retire') => request<ProtocolRow>(`/training-protocols/${idPath(id)}/${action}`,'POST');
export function protocolOverlap(d: Pick<ProtocolRow,'package_type'|'min_weight'|'max_weight'|'protocol_id'>, list: ProtocolRow[]) {
  return list.some(p=>p.protocol_id!==d.protocol_id && p.status==='APPROVED' && p.package_type===d.package_type && Number(p.min_weight)<Number(d.max_weight) && Number(p.max_weight)>Number(d.min_weight));
}
