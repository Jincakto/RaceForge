import type { PackageDraft } from '../../training/trainingLogic';
import { request, idPath, requestPdf } from '../../../shared/api/api';
import type { PackageLifecycleAction, PackageLifecycleWire } from '../../training/packageLifecycle';
import type { TrainerResumption } from '../../training/TrainingResumptions';
import type { SuggestionResponse } from '../hooks/trainingSuggestions';
import type { ApiRecord } from '../../../shared/api/apiTypes';

export const listTrainingPackages = (includeInactive: boolean) =>
  request<ApiRecord[]>(includeInactive ? '/training-packages/all' : '/training-packages');

export const listHorsePackages = (id: string, managed = false) =>
  request<ApiRecord[]>(`/horse-packages/${managed ? "manage/" : ""}horse/${idPath(id)}`);

export const getPackageRegistration = (id: string) =>
  request<Pick<PackageLifecycleWire, 'registration' | 'certificate'>>(`/horse-packages/${idPath(id)}`);

export const getPackageTrainingContext = (id: string) =>
  request<ApiRecord>(`/horse-packages/${idPath(id)}/training-context`);

export const getPackageCertificate = (id: string) =>
  requestPdf(`/horse-packages/${idPath(id)}/certificate`);

export const changePackageLifecycle = (id: string, action: PackageLifecycleAction) =>
  request<PackageLifecycleWire>(`/horse-packages/${idPath(id)}/${action}`, 'PATCH');

export const registerHorsePackage = (body: { horseId: string; packageId: string }) =>
  request<{ horsePackageId: string }>('/horse-packages/register', 'POST', body);

export const createPackagePaymentLink = (id: string) =>
  request<ApiRecord>(`/horse-packages/${idPath(id)}/payment-link`, 'POST');

export const syncPackagePayment = (id: string) =>
  request<ApiRecord>(`/horse-packages/${idPath(id)}/payment-sync`, 'POST');

export const createTrainingPackage = (body: Pick<PackageDraft, 'packageType' | 'description' | 'durationDays' | 'price' | 'roadmapTemplate'> & { packageName: string }) =>
  request<ApiRecord>('/training-packages', 'POST', body);

export const getPackageRoadmap = (id: string) =>
  request<ApiRecord>(`/training-packages/${idPath(id)}/roadmap-template`);

export const getRegistrationRoadmap = (id: string) =>
  request<ApiRecord>(`/horse-packages/${idPath(id)}/roadmap-template`);

export const listPendingResumptions = () =>
  request<TrainerResumption[]>('/horse-packages/resumptions/mine');

export const acceptTrainingResumption = (id: string) =>
  request<ApiRecord>(`/horse-packages/resumptions/${idPath(id)}/accept`, 'POST', {});

export const getTrainingPackageSuggestions = (id: string) =>
  request<SuggestionResponse>(`/horses/${idPath(id)}/training-package-suggestions`);
