import { request } from '../../../shared/api/api';

export interface OverviewMetrics {
  horses: number; awaitingAdmission: number; lockedHorses: number;
  activePackages: number; completedPackages: number;
  pendingPayments: number; paidNotApplied: number;
}
export interface OversightHorse {
  horseId: string; horseName: string; ownerId: string; ownerName: string;
  registrationNumber: string | null; breed: string | null; gender: string | null;
  dateOfBirth: string | null; healthStatus: string | null; trainingLocked: boolean;
  horseStatus: string; admissionStatus: string; imageUrl: string | null;
}
export interface OversightPackage {
  packageId: string; packageName: string; packageType: string;
  description: string | null; durationDays: number; price: number; status: string;
}
export interface OversightPayment {
  orderCode: number; horsePackageId: string; amount: number; paymentState: string;
  applied: boolean; confirmedAtUtc: string | null; registrationStatus: string;
  horseName: string; ownerName: string; packageName: string; packageType: string;
}
export interface OversightRegistration {
  horsePackageId: string; horseId: string; horseName: string;
  ownerId: string; ownerName: string; packageId: string; packageName: string;
  packageType: string; status: string; paymentStatus: string; totalPrice: number;
  registeredAt: string; startDate: string | null; endDate: string | null;
  remainingDays: number | null; trainerUserId: string | null;
  trainerName: string | null; trainerAssignmentStatus: string | null;
  trainerEndedAt: string | null;
}
export const getBackendHealth = () => request<{ status: string; service: string }>('/health');
export const getOversightOverview = () => request<OverviewMetrics>('/oversight/overview');
export const listOversightHorses = () => request<OversightHorse[]>('/oversight/horses');
export const listOversightPackages = () => request<OversightPackage[]>('/oversight/packages');
export const listOversightPayments = () => request<OversightPayment[]>('/oversight/payments');
export const listOversightRegistrations = () => request<OversightRegistration[]>('/oversight/registrations');
