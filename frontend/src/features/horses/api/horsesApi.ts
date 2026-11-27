import { request, idPath } from '../../../shared/api/api';
export interface HorseResponse {
  screeningStatus?: 'PENDING' | 'PASSED' | 'NEEDS_CORRECTION' | 'REJECTED';
  screeningReason?: string;
  admissionNote?: string;
  horseId: string;
  horseName: string;
  ownerId: string;
  gender: string;
  breed?: string;
  dateOfBirth?: string;
  coatColor?: string;
  trainerIds?: string[];
  healthStatus: string;
  admissionStatus: string;
  status?: string;
  trainingLocked?: boolean;
  height?: number;
  imageUrl?: string;
  documentUrl?: string;
  documentType?: string;
  registrationNumber?: string;
  declaredMedicalHistory?: string;
  sire?: string;
  dam?: string;
}

export interface HorseUpdateInput {
  horseName: string;
  dateOfBirth: string;
  gender: string;
  breed: string;
  coatColor: string;
  sire: string | null;
  dam: string | null;
  height: number | null;
  declaredMedicalHistory?: string;
  imageUrl: string;
  registrationNumber?: string;
  documentType: string;
  documentUrl: string;
}

export const listHorses = () =>
  request<HorseResponse[]>('/horses');

export interface UelnCheckResponse {
  validFormat: boolean;
  prefixRecognized: boolean;
  exists: boolean;
  message: string;
}

export const checkUeln = (ueln: string) =>
  request<UelnCheckResponse>(`/horses/check-ueln?ueln=${encodeURIComponent(ueln)}`);

export const createHorse = (body: FormData) =>
  request<HorseResponse>('/horses', 'POST', body);

export const updateHorse = (id: string, body: HorseUpdateInput) =>
  request<HorseResponse>(`/horses/${idPath(id)}`, 'PUT', body);

export const activateHorse = (id: string) =>
  request<unknown>(`/horses/${idPath(id)}/activate`, 'PATCH');

export const submitAdmission = (id: string) =>
  request<unknown>(`/horses/${idPath(id)}/admission`, 'POST');

export type ScreeningDecision = 'PASSED' | 'NEEDS_CORRECTION' | 'REJECTED';
export interface HorseDocumentReport {
  horseId: string;
  status: 'MATCHED' | 'MISMATCH' | 'INCOMPLETE' | 'MANUAL_REVIEW' | 'SOURCE_UNAVAILABLE' | 'UNREADABLE' | 'LIMIT_EXCEEDED';
  documentAuthenticity: 'UNVERIFIED';
  ownershipStatus: 'UNVERIFIED';
  source: string;
  checkedAt: string;
  documentSha256: string | null;
  message: string;
  fields: { field: string; profileValue: string | null; documentValue: string | null;
    status: 'MATCHED' | 'MISMATCH' | 'MISSING' | 'AMBIGUOUS' | 'UNSUPPORTED_VALUE' }[];
}
export const reviewHorseDocument = (id: string) =>
  request<HorseDocumentReport>(`/horses/${idPath(id)}/admission/document-review`);
export const screenAdmission = (id: string, decision: ScreeningDecision, reason = '') =>
  request<HorseResponse>(`/horses/${idPath(id)}/admission/screening`, 'POST', { decision, reason });

export const uploadHorseEvidence = (id: string, kind: 'image' | 'document', file: File) => {
  const body = new FormData();
  body.append('file', file);
  return request<void>(`/horses/${idPath(id)}/${kind}`, 'PUT', body);
};

export const approveAdmission = (id: string, body: { note: string }) =>
  request<unknown>(`/horses/${idPath(id)}/admission/approve`, 'POST', body);

export const rejectAdmission = (id: string, body: { note: string }) =>
  request<unknown>(`/horses/${idPath(id)}/admission/reject`, 'POST', body);
