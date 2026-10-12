/** Numeric IDs mirror Java Integer DTOs. Dates remain ISO strings at the API boundary. */
export interface ApiResponse<T> { success: boolean; message: string; data: T; timestamp: string }
export interface UserDto { userId: number; fullName: string; email: string; phone: string; status: string; emailVerified: boolean; avatarUrl: string | null; role: {roleId: number; roleName: string} | null }
export interface AuthDto { accessToken: string; tokenType: string; expiresInSeconds: number; user: UserDto }
export type HealthStatusDto = 'READY' | 'INJURED' | 'QUARANTINED';
export interface HorseWriteDto { horseName: string; dateOfBirth: string; gender: string; breed: string; coatColor: string; sire?: string; dam?: string; damSire?: string; weight: number; height: number; background?: string; declaredMedicalHistory?: string; imageUrl?: string }
export interface HorseDto extends HorseWriteDto { horseId: number; ownerId: number; headTrainerId: number | null; healthStatus: HealthStatusDto | null; trainingLocked: boolean; status: string }
export interface VitalSignDto { bodyTemperature: number | null; restingHeartRate: number | null; restingRespiratoryRate: number | null }
export interface ClinicalExamDto { examinationArea: string; conditionStatus: string; abnormalityType?: string; severity?: string; notes?: string }
export interface MedicalUpdateDto { examinedAt: string; healthStatus: HealthStatusDto | null; diagnosis: string; treatment: string; medication: string; careRecommendation: string; notes: string; vitalSign: VitalSignDto; clinicalExams: ClinicalExamDto[] }
export interface MedicalCreateDto extends MedicalUpdateDto { profileId: number; correctionOfId?: number; examType: 'INITIAL' | 'PERIODIC' | 'FOLLOW_UP' }
export interface MedicalDto extends Omit<MedicalCreateDto, 'vitalSign' | 'correctionOfId'> { vitalSign: VitalSignDto | null; correctionOfId: number | null; medicalRecordId: number; veterinarianId: number; systemNote: string | null; trainingNote: string | null; status: 'DRAFT' | 'CONFIRMED'; confirmedAt: string | null; createdAt: string; updatedAt: string }
export interface TrainingLockDto { lockId: number; horseId: number; medicalRecordId: number | null; lockedById: number; unlockedById: number | null; lockedAt: string; lockReason: string; unlockedAt: string | null; unlockReason: string | null }
export interface TrainingPackageDto { packageId: number; packageName: string; packageType: string; description: string; durationDays: number; price: number; status: string; createdAt: string; updatedAt: string }
export interface HorsePackageDto { horsePackageId: number; horseId: number; packageId: number; packageName: string; packageType: string; status: string; paymentStatus: string; totalPrice: number; registeredAt: string; paidAt: string | null; startDate: string | null; endDate: string | null; remainingDays: number | null; replacedHorsePackageId: number | null }
export function numericId(id: number): number { if (!Number.isSafeInteger(id) || id <= 0) throw new Error('ID phải là số nguyên dương.'); return id; }
