import { request, idPath } from '../../../shared/api/api';
import type { TrainerProfile } from '../trainerProfile';
import type { ApiRecord } from '../../../shared/api/apiTypes';

export const listTrainerProfiles = () =>
  request<ApiRecord[]>('/trainer-profiles');

export const getOwnTrainerProfile = () =>
  request<TrainerProfile | null>('/trainer-profiles/me');

export const createTrainerProfile = (body: ApiRecord) =>
  request<TrainerProfile>('/trainer-profiles', 'POST', body);

export const updateTrainerProfile = (id: string, body: ApiRecord) =>
  request<TrainerProfile>(`/trainer-profiles/${idPath(id)}`, 'PUT', body);

export const listMyTrainerAssignments = () =>
  request<ApiRecord[]>('/trainer-assignments/me');

export const listPackageTrainerAssignments = (id: string) =>
  request<ApiRecord[]>(`/horse-packages/${idPath(id)}/trainer-assignments`);

export const listTrainerSessions = (id: string) =>
  request<ApiRecord[]>(`/trainer-profiles/${idPath(id)}/sessions`);

export const assignTrainer = (id: string | undefined, body: ApiRecord) =>
  request<ApiRecord>(id ? `/trainer-assignments/${idPath(id)}/replace` : '/trainer-assignments', 'POST', body);

export const respondToTrainerAssignment = (id: string, body: { accepted: boolean; reason?: string }) =>
  request<ApiRecord>(`/trainer-assignments/${idPath(id)}/respond`, 'POST', body);
