import { api, type User } from './api';
import type { AppState } from './App';
import type { AppUser, Horse, HealthRecord, Enrollment, TrainingPackage, TrainingSession, Role, Res } from './data';
import { dToIso, isoToD, type PackageDraft, type PlanDraft, type SessionDraft } from './trainingLogic';

type Row = Record<string, any>;
export const BACKEND_PENDING = 'Chờ API: backend hiện chưa hỗ trợ lưu dữ liệu hoặc thực hiện bước này. Không có dữ liệu nào được lưu cục bộ.';
const roleMap: Record<string, Role> = { CLUB_MANAGER: 'manager', HEAD_TRAINER: 'head_trainer', VETERINARIAN: 'veterinarian', GROOM: 'groom', HORSE_OWNER: 'owner' };
const code = (prefix: string, id: unknown) => `${prefix}-${String(id).padStart(6, '0')}`;
export function backendId(id: string): number {
  const value = Number(id.replace(/^[A-Z]+-/, ''));
  if (!Number.isInteger(value) || value <= 0) throw new Error('Mã dữ liệu không hợp lệ. Hãy tải lại dữ liệu từ server.');
  return value;
}
export function toAppUser(user: User): AppUser {
  return { id: code('USR', user.userId), name: user.fullName, email: user.email, password: '', phone: user.phone || '', avatar: user.fullName.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase(), role: roleMap[user.role.roleName] || null, clubId: 'c1', status: user.status === 'ACTIVE' ? 'active' : 'pending', locked: user.status === 'INACTIVE', verified: user.emailVerified };
}
export function toHorse(row: Row, users: AppUser[] = []): Horse {
  const trainerId = row.headTrainerId ? code('USR', row.headTrainerId) : '';
  const ownerId = code('USR', row.ownerId);
  const approved = row.admissionStatus === 'APPROVED';
  const health = row.healthStatus === 'READY' ? 'Eligible' : row.healthStatus === 'INJURED' || row.healthStatus === 'QUARANTINED' ? 'Injured' : 'Pending Vet';
  const name = (id: string) => users.find(u => u.id === id)?.name || id;
  return {
    id: code('HRS', row.horseId), ownerId, name: row.horseName, breed: row.breed || '', age: row.dateOfBirth ? Math.max(0, Math.floor((Date.now() - new Date(row.dateOfBirth).getTime()) / 31557600000)) : 0,
    birthDate: row.dateOfBirth ? isoToD(row.dateOfBirth) : '', color: row.coatColor || '', gender: row.gender || '', weight: row.weight ?? 0, height: row.height ?? 0, stable: '', stall: '',
    ownerName: name(ownerId), headTrainerId: trainerId, headTrainerName: trainerId ? name(trainerId) : '', vetId: '', vetName: '', groomId: '', groomName: '',
    clubId: approved || row.admissionStatus === 'PENDING' ? 'c1' : null, healthStatus: health, trainingStatus: 'Inactive', approvalStatus: row.admissionStatus === 'REJECTED' ? 'rejected' : approved ? 'approved' : 'pending',
    registrationDate: '', approvedAt: null, totalRaces: 0, wins: 0, imageUrl: row.imageUrl || '', vetClearance: approved && health === 'Eligible' && !row.trainingLocked,
    biography: row.background || '', medicalHistory: row.declaredMedicalHistory || '', achievements: [], raceHistory: [], sire: row.sire || '', dam: row.dam || '',
    lifecycle: !approved ? 'pending' : row.trainingLocked ? 'locked' : health === 'Eligible' ? 'ready' : 'awaiting_vet',
    // Only one trainer is exposed by the current API. Do not fabricate co-trainers,
    // assignment acceptance, examination dates, identity verification or certificates.
    trainerHistory: trainerId ? [{ id: `api-${trainerId}`, trainerId, name: name(trainerId), from: '', to: null }] : [],
    lock: row.trainingLocked ? { reason: 'Backend đã khóa huấn luyện', notes: '', lockedAt: '', lockedById: '', lockedByName: '' } : null,
    backendAdmissionStatus: row.admissionStatus,
  };
}
export function toHealth(row: Row, horseId: string, users: AppUser[]): HealthRecord {
  const vetId = code('USR', row.veterinarianId);
  const confirmed = row.status === 'CONFIRMED';
  const decision = !confirmed ? undefined : row.healthStatus === 'READY' ? row.trainingNote?.includes('CAUTION') ? 'conditional' : 'eligible' : 'not-eligible';
  const exams = row.clinicalExams || [];
  const regions: NonNullable<HealthRecord['regions']> = {};
  const areaMap: Record<string, string> = { EYES: 'eyes', RESPIRATORY: 'nose', GENERAL_CONDITION: 'general', MOVEMENT: 'movement', LEGS: 'legs', SKIN: 'skin' };
  for (const exam of exams) if (areaMap[exam.examinationArea]) regions[areaMap[exam.examinationArea]] = { ok: exam.conditionStatus === 'NORMAL', note: exam.notes || exam.abnormalityType || '' };
  return { id: code('MED', row.medicalRecordId), horseId, date: isoToD((row.examinedAt || row.createdAt || '').slice(0, 10)), type: row.examType === 'INITIAL' ? 'Khám tiếp nhận' : row.examType === 'FOLLOW_UP' ? 'Tái khám' : 'Kiểm tra định kỳ', vet: users.find(u => u.id === vetId)?.name || `Bác sĩ #${row.veterinarianId}`, vetId, notes: row.notes || '', result: decision === 'eligible' ? 'Eligible' : decision === 'conditional' ? 'Monitor' : confirmed ? 'Injured' : '', medications: row.medication || '', isPostTraining: false, vetClearanceGranted: decision === 'eligible', status: confirmed ? 'confirmed' : 'draft', decision, trainingEligibility: decision, diagnosis: row.diagnosis || '', recommendations: row.careRecommendation || '', conclusion: row.diagnosis || row.systemNote || '', trainingNote: row.trainingNote || '', autoNote: row.systemNote || '', vitals: { temperature: String(row.vitalSign?.bodyTemperature ?? ''), heartRate: String(row.vitalSign?.restingHeartRate ?? ''), respRate: String(row.vitalSign?.restingRespiratoryRate ?? ''), weight: '', bloodPressure: '' }, regions, createdAt: Date.parse(row.createdAt || row.examinedAt) || 0 };
}
export function toPackage(row: Row): TrainingPackage {
  return { id: code('PKG', row.packageId), name: row.packageName, description: row.description || '', sessions: 0, durationDays: row.durationDays, price: Number(row.price), active: row.status === 'ACTIVE', packageType: row.packageType };
}
export function toEnrollment(row: Row, horse?: Horse): Enrollment {
  return { id: code('ENR', row.horsePackageId), horseId: code('HRS', row.horseId), packageId: code('PKG', row.packageId), packageName: row.packageName, sessionsTotal: 0, sessionsDone: 0, status: row.status === 'PAUSED' ? 'paused' : row.status === 'ACTIVE' ? 'active' : row.status === 'PENDING' ? 'pending' : row.status === 'CANCELLED' ? 'cancelled' : 'completed', trainerId: horse?.headTrainerId || '', trainerName: horse?.headTrainerName || '', trainerStatus: 'unassigned', assignHistory: [], startedAt: row.startDate ? isoToD(row.startDate) : '', expiresAt: row.endDate ? isoToD(row.endDate) : '', amount: Number(row.totalPrice), paidAt: row.paidAt || '', paymentMethod: 'Thanh toán mô phỏng', ownerName: horse?.ownerName || '', scheduleConfirmed: false, paymentStatus: row.paymentStatus, backendStatus: row.status };
}
export function toSession(row: Row): TrainingSession {
  return { id: code('SES', row.sessionId), horseId: code('HRS', row.horseId), planId: code('PLN', row.planId), date: isoToD((row.scheduledStart || '').slice(0, 10)), time: (row.scheduledStart || '').slice(11, 16), type: row.notes || 'Buổi huấn luyện', trainerName: '', trainerId: '', assignedStaffIds: [], assignedStaffNames: [], status: row.status === 'COMPLETED' ? 'Completed' : row.status === 'MISSED' ? 'Not Performed' : row.actualStart ? 'In Progress' : 'Scheduled', distance: row.distance ? `${row.distance}m` : '', targetTime: '', notes: row.notes || '', conflictChecked: true, ...(row.status === 'COMPLETED' ? { result: { time: '', speed: String(row.avgSpeed ?? ''), heartRate: row.heartRate ?? 0, notes: row.evaluation || '', performanceScore: 0 } } : {}) };
}
async function allPages(path: string): Promise<Row[]> {
  const first = await api<Row>(`${path}?page=0&size=100`);
  const rest = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) => api<Row>(`${path}?page=${i + 1}&size=100`)));
  return [first, ...rest].flatMap(page => page.content);
}
export async function loadBackendState(user: User): Promise<Partial<AppState>> {
  const current = toAppUser(user);
  if (current.status !== 'active' || !current.role) return { user: current, users: [current] };
  const [horseRows, packageRows, directory, notifications] = await Promise.all([
    api<Row[]>('/api/horses'), api<Row[]>(user.role.roleName === 'CLUB_MANAGER' ? '/api/training-packages/all' : '/api/training-packages'),
    user.role.roleName === 'CLUB_MANAGER' ? allPages('/api/users') : allPages('/api/trainers'), api<Row[]>('/api/notifications'),
  ]);
  const users: AppUser[] = user.role.roleName === 'CLUB_MANAGER' ? directory.map(row => toAppUser(row as User)) : [current, ...directory.filter(row => row.userId !== user.userId).map(row => ({ id: code('USR', row.userId), name: row.fullName, email: '', password: '', avatar: row.fullName.slice(0, 2), role: 'head_trainer' as const, clubId: 'c1', status: 'active' as const, verified: true }))];
  const horses = horseRows.map(row => toHorse(row, users));
  // Keep failed sections visible as errors instead of silently supplying seed data.
  const healthRecords = (await Promise.all(horses.map(h => api<Row[]>(`/api/medical/horses/${backendId(h.id)}/records`).then(rows => rows.map(row => toHealth(row, h.id, users)))))).flat();
  horses.forEach(h => { h.intakeExamId = healthRecords.find(r => r.horseId === h.id && r.type === 'Khám tiếp nhận' && r.status === 'confirmed')?.id; });
  const trainingSessions = (await Promise.all(horses.map(h => api<Row[]>(`/api/training-sessions/horse/${backendId(h.id)}`).then(rows => rows.map(toSession))))).flat();
  const enrollments = current.role === 'owner' ? (await Promise.all(horses.map(h => api<Row[]>(`/api/horse-packages/horse/${backendId(h.id)}`).then(rows => rows.map(row => toEnrollment(row, h)))))).flat() : [];
  const races = await Promise.all(horses.map(h => api<Row[]>(`/api/horses/${backendId(h.id)}/race-history`)));
  horses.forEach((h, i) => {
    h.raceHistory = races[i].map(r => ({ id: code('RCE', r.raceHistoryId), date: r.raceDate ? isoToD(r.raceDate) : '', raceName: r.raceName, distance: r.distance ? `${r.distance}m` : '', position: r.finishPosition, totalHorses: 0, time: r.completionTime || '', venue: r.racecourse || '', jockey: r.jockeyName || '', prize: String(r.prize ?? '') }));
    h.totalRaces = h.raceHistory.length; h.wins = h.raceHistory.filter(r => r.position === 1).length;
  });
  return { user: current, users, horses, healthRecords, trainingSessions, enrollments, packages: packageRows.map(toPackage), notifications: notifications.map(row => ({ id: String(row.notificationId), type: row.notificationType || '', message: [row.title, row.message].filter(Boolean).join(' — '), time: row.createdAt ? new Date(row.createdAt).toLocaleString() : '', read: row.read })), horseClubRequests: horses.filter(h => h.backendAdmissionStatus !== 'NOT_SUBMITTED').map(h => ({ id: h.id, horseId: h.id, horseName: h.name, horseBreed: h.breed, horseImageUrl: h.imageUrl, ownerId: h.ownerId, ownerName: h.ownerName, clubId: 'c1', submittedAt: '', expiresAt: '', status: h.approvalStatus, reviewNote: horseRows.find(r => r.horseId === backendId(h.id))?.admissionNote || '' })) };
}

export function makeBackendHandlers(getState: () => AppState, setState: (fn: (state: AppState) => AppState) => void, refresh: () => Promise<void>) {
  const result = async <T,>(work: () => Promise<T>): Promise<Res<T>> => { try { return { ok: true, data: await work() }; } catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'API error' }; } };
  const pending = <T,>(): Res<T> => ({ ok: false, message: BACKEND_PENDING });
  return {
    purchasePackage: (horseId: string, packageId: string, _renew?: string, successful = true) => result(async () => {
      const pending = getState().enrollments.find(e => e.horseId === horseId && e.packageId === packageId && e.backendStatus === 'PENDING' && e.paymentStatus === 'PENDING');
      const registration = pending ? { horsePackageId: backendId(pending.id) } : await api<Row>('/api/horse-packages/register', 'POST', { horseId: backendId(horseId), packageId: backendId(packageId) });
      await refresh();
      const paid = await api<Row>(`/api/horse-packages/${registration.horsePackageId}/simulate-payment`, 'POST', { successful });
      await refresh();
      if (!successful || paid.paymentStatus !== 'PAID') throw new Error('Thanh toán mô phỏng không thành công. Đăng ký chưa được kích hoạt.');
      return toEnrollment(paid, getState().horses.find(h => h.id === horseId));
    }),
    savePackage: (draft: PackageDraft) => result(async () => {
      const body = { packageName: draft.name, description: draft.description, durationDays: draft.durationDays, price: draft.price, packageType: draft.packageType || 'BASIC' };
      const row = await api<Row>(draft.id ? `/api/training-packages/${backendId(draft.id)}` : '/api/training-packages', draft.id ? 'PUT' : 'POST', body); await refresh(); return toPackage(row);
    }),
    togglePackage: (id: string, active: boolean) => result(async () => { const row = await api<Row>(`/api/training-packages/${backendId(id)}/status`, 'PATCH', { status: active ? 'ACTIVE' : 'INACTIVE' }); await refresh(); return toPackage(row); }),
    assignTrainer: () => pending<Enrollment>(), respondAssign: () => pending<null>(),
    createPlan: (draft: PlanDraft) => result(async () => {
      const notes = [`Cự ly: ${draft.distance}`, `Khối lượng: ${draft.workload}`, `Mặt sân: ${draft.surface}`, ...(draft.suggestion?.rationale || [])].join('; ').slice(0, 1000);
      const row = await api<Row>(`/api/horses/${backendId(draft.horseId)}/training-plans`, 'POST', { planName: draft.phase, goal: draft.goals, startDate: dToIso(draft.startDate), endDate: dToIso(draft.endDate), notes });
      const plan = { id: code('PLN', row.planId), horseId: draft.horseId, phase: row.planName, startDate: draft.startDate, endDate: draft.endDate, distance: draft.distance, workload: draft.workload, surface: draft.surface, goals: row.goal || '', status: 'Active' as const, locked: false, createdBy: getState().user?.name || '', progress: 0, weeklySchedule: draft.suggestion?.weeklySchedule };
      setState(s => ({ ...s, trainingPlans: [plan, ...s.trainingPlans] })); return plan;
    }),
    generateSessions: (horseId: string, planId: string, drafts: SessionDraft[]) => result(async () => {
      const sessions: TrainingSession[] = [];
      try {
        for (const draft of drafts) {
          const activityName = [draft.type, draft.distance ? `Cự ly: ${draft.distance}` : '', draft.targetTime ? `Mục tiêu: ${draft.targetTime}` : '', draft.notes].filter(Boolean).join(' — ').slice(0, 1000);
          const rows = await api<Row[]>('/api/training-sessions/recurring', 'POST', { horseId: backendId(horseId), planId: backendId(planId), activityName, startDate: dToIso(draft.date), sessionTime: draft.time, durationWeeks: 1, daysOfWeek: [] });
          sessions.push(...rows.map(toSession));
        }
      } catch (error) { await refresh(); throw new Error(`Đã lưu ${sessions.length}/${drafts.length} buổi. ${error instanceof Error ? error.message : 'API error'}. Hãy tải lại lịch trước khi thử lại.`); }
      await refresh(); return sessions;
    }),
    checkIn: (id: string, present: boolean, note = '') => result(async () => { if (present) { await api(`/api/training-sessions/${backendId(id)}/start`, 'PATCH'); } else { await api(`/api/training-sessions/${backendId(id)}/attendance`, 'PUT', { status: 'MISSED', absenceReason: 'OTHER', absenceNote: note }); } await refresh(); return null; }),
  };
}
