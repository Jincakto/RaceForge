import { request, idPath } from '../../../shared/api/api';
export interface HorseResponse {
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

export interface RaceHistoryInput {
  raceName: string;
  raceDate: string;
  distance: number;
  finishPosition: number;
  completionTime: string;
  racecourse: string;
  jockeyName: string;
  prize: number;
}

interface RaceHistoryResponse extends RaceHistoryInput {
  raceHistoryId: string;
}

export const listHorses = () =>
  request<HorseResponse[]>('/horses');

export const createHorse = (body: FormData) =>
  request<HorseResponse>('/horses', 'POST', body);

export const updateHorse = (id: string, body: HorseUpdateInput) =>
  request<HorseResponse>(`/horses/${idPath(id)}`, 'PUT', body);

export const listHorseRaceHistory = (id: string) =>
  request<RaceHistoryResponse[]>(`/horses/${idPath(id)}/race-history`);

export const createRaceHistory = (id: string, body: RaceHistoryInput) =>
  request<RaceHistoryResponse>(`/horses/${idPath(id)}/race-history`, 'POST', body);

export const updateRaceHistory = (id: string, body: RaceHistoryInput) =>
  request<RaceHistoryResponse>(`/horses/race-history/${idPath(id)}`, 'PUT', body);

export const deleteRaceHistory = (id: string) =>
  request<unknown>(`/horses/race-history/${idPath(id)}`, 'DELETE');

export const activateHorse = (id: string) =>
  request<unknown>(`/horses/${idPath(id)}/activate`, 'PATCH');

export const submitAdmission = (id: string) =>
  request<unknown>(`/horses/${idPath(id)}/admission`, 'POST');

export const approveAdmission = (id: string, body: { note: string }) =>
  request<unknown>(`/horses/${idPath(id)}/admission/approve`, 'POST', body);

export const rejectAdmission = (id: string, body: { note: string }) =>
  request<unknown>(`/horses/${idPath(id)}/admission/reject`, 'POST', body);
