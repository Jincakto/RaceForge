import { packageSessions } from './trainingSchedule';
import { ApiError, allPages, idPath as enc, request, rows } from './api';
import type { AppUser, Horse, HealthRecord, Enrollment, TrainingPackage, TrainingPlan, TrainingSession, HorseClubRequest, AppNotification, Role } from './data';

type Wire = Record<string, any>;
export const ROLE_NAMES: Record<Role, string> = { admin: 'ADMIN', manager: 'CLUB_MANAGER', head_trainer: 'HEAD_TRAINER', veterinarian: 'VETERINARIAN', groom: 'GROOM', owner: 'HORSE_OWNER' };
// IDs from the existing database Role catalogue, not the inconsistent BE constants.
export const ROLE_IDS: Record<Role, number> = { admin: 1, manager: 2, head_trainer: 3, veterinarian: 4, groom: 5, owner: 6 };
const ALIGNED_ROLE_IDS: Record<Role, number> = { admin: 7, manager: 1, head_trainer: 2, veterinarian: 3, groom: 4, owner: 5 };
/** Support either known catalogue while the DB-only role migration is applied. */
export function staffRoleId(role: Role, actor: AppUser | null): number {
  if (actor?.role !== 'admin' || !['manager', 'head_trainer', 'veterinarian', 'groom'].includes(role)) throw new Error("Only administrators may assign staff roles.");
  if (actor.apiRoleId === 7) return ALIGNED_ROLE_IDS[role];
  if (actor.apiRoleId === 1) return ROLE_IDS[role];
  throw new Error("Cannot determine the role catalog. Sign in to the administrator account again.");
}
// The existing UI has club-scoped filters; this BE is a single-centre API.
export const CENTER = 'api-center';
export const dateText = (v?: string | null) => v ? v.slice(0, 10).split('-').reverse().join('/') : '';
export const isoDate = (v: string) => /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : v.split('/').reverse().join('-');
export function userFromApi(w: Wire): AppUser {
  const role = (Object.keys(ROLE_NAMES) as Role[]).find(r => ROLE_NAMES[r] === w.role?.roleName);
  if (!role) throw new Error(`Unsupported role: ${w.role?.roleName || "(empty)"}`);
  return { id: w.userId, name: w.fullName, email: w.email, phone: w.phone || '', avatarUrl: w.avatarUrl, password: '', avatar: (w.fullName || '').split(' ').slice(-2).map((x: string) => x[0]).join(''), role, apiRoleId: w.role?.roleId, clubId: role === 'admin' ? null : CENTER, status: w.status === 'ACTIVE' ? 'active' : 'pending', verified: w.emailVerified, locked: w.status === 'INACTIVE' };
}
export function packageFromApi(w: Wire): TrainingPackage {
  return { id: w.packageId, name: w.packageName, description: w.description || '', sessions: 0, durationDays: w.durationDays, price: Number(w.price), active: w.status === 'ACTIVE', packageType: w.packageType };
}
const HEALTH: Record<string, Horse['healthStatus']> = { READY: 'Eligible', FIT: 'Eligible', FIT_WITH_MONITORING: 'Monitor', NOT_FIT: 'Injured', INJURED: 'Injured', MONITOR: 'Monitor', RETIRED: 'Retired' };
export function horseFromApi(w: Wire, users: AppUser[]): Horse {
  const approved = w.admissionStatus === 'APPROVED';
  const trainers: string[] = w.trainerIds || [];
  const name = (id: string) => users.find(u => u.id === id)?.name || id || '';
  return {
    id: w.horseId, name: w.horseName, breed: w.breed || '', birthDate: dateText(w.dateOfBirth),
    age: w.dateOfBirth ? Math.max(0, Math.floor((Date.now() - new Date(w.dateOfBirth).getTime()) / 31557600000)) : 0,
    color: w.coatColor || '', gender: ({ STALLION: 'Stallion', MARE: 'Mare', GELDING: 'Gelding' } as Record<string, string>)[String(w.gender).toUpperCase()] || w.gender,
    weight: 0, height: Number(w.height || 0), stable: '', stall: '', clubId: CENTER,
    ownerId: w.ownerId, ownerName: name(w.ownerId), trainerIds: trainers,
    headTrainerId: trainers[0] || '', headTrainerName: trainers.map(name).join(', '),
    trainerHistory: trainers.map(id => ({ id, trainerId: id, name: name(id), from: '', to: null })),
    vetId: '', vetName: '', groomId: '', groomName: '',
    healthStatus: HEALTH[w.healthStatus] || 'Pending Vet', trainingStatus: w.status === 'ACTIVE' ? 'Active' : 'Inactive',
    approvalStatus: approved ? 'approved' : w.admissionStatus === 'REJECTED' ? 'rejected' : 'pending',
    registrationDate: '', approvedAt: null, totalRaces: 0, wins: 0, imageUrl: w.imageUrl || '', vetClearance: approved && ['READY', 'FIT', 'FIT_WITH_MONITORING'].includes(w.healthStatus),
    biography: '', achievements: [], raceHistory: [], sire: w.sire || '', dam: w.dam || '', medicalHistory: w.declaredMedicalHistory || '',
    microchip: w.registrationNumber || '', documentType: w.documentType || 'UELN',
    identityEvidence: { url: w.imageUrl || '', fileUrl: w.documentUrl || '', note: '' }, identityVerified: approved,
    lifecycle: w.trainingLocked ? 'locked' : !approved ? 'pending' : trainers.length ? 'training' : 'ready',
    lock: w.trainingLocked ? { reason: "Training locked according to the medical record", notes: '', lockedAt: '', lockedById: '', lockedByName: '' } : null,
    admissionStatus: w.admissionStatus,
  };
}
export function horsePayload(h: Horse) {
  const gender = ({ Stallion: 'STALLION', Mare: 'MARE', Gelding: 'GELDING', 'Đực': 'STALLION', 'Cái': 'MARE', 'Đực thiến': 'GELDING' } as Record<string, string>)[h.gender] || h.gender;
  return { horseName: h.name, dateOfBirth: isoDate(h.birthDate || ''), gender, breed: h.breed, coatColor: h.color,
    sire: h.sire || null, dam: h.dam || null, height: h.height || null, declaredMedicalHistory: h.medicalHistory || '',
    imageUrl: h.identityEvidence?.url || h.imageUrl, registrationNumber: h.microchip?.trim(), documentType: h.documentType || 'UELN', documentUrl: h.identityEvidence?.fileUrl || h.identityEvidence?.url || '' };
}
export function recordFromApi(w: Wire, horseId: string, users: AppUser[]): HealthRecord {
  const conclusion = ({ FIT: 'eligible', FIT_WITH_MONITORING: 'conditional', NOT_FIT: 'not-eligible' } as const)[w.finalConclusion as 'FIT'];
  const v = w.vitalSign || {};
  const regions = Object.fromEntries((w.clinicalExams || []).map((r: Wire) => [({ EYES: 'eyes', NOSE: 'nose', MOUTH: 'mouth', MOVEMENT_LEGS: 'movement' } as Record<string, string>)[r.examinationArea] || r.examinationArea, { ok: r.conditionStatus === 'NORMAL', note: r.notes || '' }]));
  return { id: w.medicalRecordId, horseId, date: dateText(w.examinedAt), createdAt: new Date(w.createdAt || w.examinedAt).getTime(), type: ({ INITIAL: "Intake examination", PERIODIC: "Routine examination", FOLLOW_UP: "Follow-up" } as Record<string, string>)[w.examType] || w.examType,
    vet: users.find(u => u.id === w.veterinarianId)?.name || w.veterinarianId, vetId: w.veterinarianId,
    notes: w.notes || '', result: conclusion === 'eligible' ? 'Eligible' : conclusion === 'conditional' ? 'Monitor' : conclusion === 'not-eligible' ? 'Injured' : 'Pending Vet',
    medications: w.medication || '', isPostTraining: w.examType === 'FOLLOW_UP', intake: w.examType === 'INITIAL', vetClearanceGranted: w.trainingEligible === true,
    status: w.status === 'CONFIRMED' ? 'confirmed' : 'draft', decision: conclusion, trainingEligibility: conclusion, conclusion: w.diagnosis || w.eligibilityReason || '', diagnosis: w.diagnosis || '', recommendations: w.careRecommendation || '', followUpNote: w.monitoringNote || '', overrideReason: w.overrideReason || '', decisionReason: w.trainingLockReason || '', trainingNote: w.trainingNote || '', regions,
    vitals: { temperature: String(v.bodyTemperature ?? ''), heartRate: String(v.restingHeartRate ?? ''), respRate: String(v.restingRespiratoryRate ?? ''), weight: String(v.weight ?? ''), bloodPressure: '' }, profileId: w.profileId,
  };
}
export function medicalPayload(rec: HealthRecord, profileId: string) {
  const num = (s?: string) => s?.trim() ? Number(s.replace(',', '.')) : null;
  return { profileId, examType: rec.intake ? 'INITIAL' : rec.isPostTraining || /Tái khám|Follow-up examination/i.test(rec.type) ? 'FOLLOW_UP' : 'PERIODIC', examinedAt: `${isoDate(rec.date)}T${new Date().toTimeString().slice(0, 8)}`,
    finalConclusion: ({ eligible: 'FIT', conditional: 'FIT_WITH_MONITORING', 'not-eligible': 'NOT_FIT' } as Record<string, string>)[rec.decision || ''],
    overrideReason: rec.overrideReason || null, monitoringNote: rec.followUpNote || null, trainingLockReason: rec.decisionReason || null,
    diagnosis: rec.diagnosis || rec.conclusion || '', treatment: '', medication: rec.medications || '', careRecommendation: rec.recommendations || '', notes: rec.notes || '',
    vitalSign: { bodyTemperature: num(rec.vitals?.temperature), restingHeartRate: num(rec.vitals?.heartRate), restingRespiratoryRate: num(rec.vitals?.respRate), weight: num(rec.vitals?.weight) },
    clinicalExams: Object.entries(rec.regions || {}).map(([key, r]) => ({ examinationArea: ({ eyes: 'EYES', nose: 'NOSE', mouth: 'MOUTH', movement: 'MOVEMENT_LEGS' } as Record<string, string>)[key], conditionStatus: r.ok ? 'NORMAL' : 'ABNORMAL', notes: r.note })),
  };
}
export function enrollmentFromApi(w: Wire, packages: TrainingPackage[], horse?: Horse): Enrollment {
  return { id: w.horsePackageId, horseId: w.horseId, packageId: w.packageId, packageName: w.packageName, sessionsTotal: 0, sessionsDone: 0,
    status: ['COMPLETED', 'EXPIRED', 'CANCELLED', 'FAILED'].includes(w.status) || w.paymentStatus === 'FAILED' ? 'completed' : w.status === 'PAUSED' ? 'paused' : 'active',
    trainerId: '', trainerName: '', trainerStatus: 'unassigned', assignHistory: [], startedAt: dateText(w.startDate), expiresAt: dateText(w.endDate), amount: Number(w.totalPrice), paidAt: w.paymentStatus === 'PAID' ? dateText(w.registeredAt) : '', paymentMethod: "Simulation", ownerName: horse?.ownerName || '', scheduleConfirmed: false, paymentStatus: w.paymentStatus, apiStatus: w.status,
  };
}
export function planFromApi(w: Wire, en?: Enrollment): TrainingPlan {
  return { id: w.planId, horseId: w.horseId, phase: w.planName, startDate: dateText(w.startDate) || en?.startedAt || '', endDate: dateText(w.endDate) || en?.expiresAt || '', distance: '', workload: '', surface: '', goals: w.goal || '', status: w.status === 'COMPLETED' ? 'Completed' : 'Active', locked: w.status === 'LOCKED', createdBy: w.createdBy || '', progress: 0, algorithmRationale: w.notes || '', horsePackageId: w.horsePackageId, assignmentId: w.trainerAssignmentId };
}
export function sessionFromApi(w: Wire, user?: AppUser): TrainingSession {
  const statuses: Record<string, TrainingSession['status']> = { SCHEDULED: 'Scheduled', COMPLETED: 'Completed', CANCELLED: 'Cancelled', IN_PROGRESS: 'In Progress', STOPPED: 'In Progress', NOT_PERFORMED: 'Not Performed', MISSED: 'Not Performed' };
  return { id: w.sessionId, horsePackageId: w.horsePackageId, endTime: w.scheduledEnd?.slice(11,16), intensity: w.intensity, horseId: w.horseId, planId: w.planId, date: dateText(w.scheduledStart), time: w.scheduledStart?.slice(11, 16) || '', type: w.activityName || w.stageTitle || w.intensity || '', trainerId: w.recordedBy || user?.id || '', trainerName: user?.name || '', assignedStaffIds: [], assignedStaffNames: [], status: w.status === 'SCHEDULED' && w.actualStart ? 'In Progress' : statuses[w.status] || 'Scheduled', distance: String(w.distance ?? ''), targetTime: '', notes: w.notes || '', conflictChecked: true, actualEnd: w.actualEnd, canStart: w.canStart, canStop: w.canStop, canComplete: w.canComplete,
    ...(w.status === 'COMPLETED' ? { result: { time: String(w.actualDurationSeconds || ''), speed: String(w.avgSpeed || ''), heartRate: w.endExerciseHeartRate ?? w.heartRate ?? 0, notes: w.evaluation || w.notes || '', performanceScore: w.recoveryHeartRate2Min ?? 0 } } : {}),
  };
}

export interface RemoteSlice { vetAssignmentsError?: string; users: AppUser[]; horses: Horse[]; healthRecords: HealthRecord[]; horseClubRequests: HorseClubRequest[]; packages: TrainingPackage[]; enrollments: Enrollment[]; trainingPlans: TrainingPlan[]; trainingSessions: TrainingSession[]; notifications: AppNotification[]; serverPermissions?: Record<string, string[]>; permissionAudit?: any[]; }
export async function loadRemote(user: AppUser, report: (message: string) => void): Promise<RemoteSlice> {
  const data: RemoteSlice = { users: [user], horses: [], healthRecords: [], horseClubRequests: [], packages: [], enrollments: [], trainingPlans: [], trainingSessions: [], notifications: [], vetAssignmentsError: undefined };
  if (user.status !== 'active' || user.locked || !user.verified) {
    report("This account is not active and verified. The server has not granted access to operational features.");
    return data;
  }
  const errors = new Set<string>();
  async function read<T>(label: string, action: () => Promise<T>, fallback: T): Promise<T> {
    try { return await action(); } catch (error) {
      // Notifications are available to every active business role. A denial here
      // means the session cannot enter the business API; do not cascade more 403s.
      if (label === "Notifications" && error instanceof ApiError && error.status === 403 && (error.details as any)?.code === 'ACCESS_DENIED') {
        throw new ApiError(`The server denied operational access for account ${user.id} (${ROLE_NAMES[user.role!]}, role ID ${user.apiRoleId ?? "not returned"}). Backend role IDs must match the database Role catalog; the frontend cannot grant access itself.`, 403, error.details);
      }
      errors.add(`${label}: ${(error as Error).message}`); return fallback;
    }
  }
  if (user.role === 'admin' || user.role === 'manager') data.users = await read("Accounts", async () => (await allPages('/users')).map(userFromApi), [user]);
  const notifications = user.role === 'admin' ? [] : await read("Notifications", () => request<any[]>('/notifications'), []);
  data.notifications = notifications.map(w => ({ id: String(w.notificationId), type: w.notificationType || 'info', message: w.message, time: dateText(w.createdAt), read: w.read, toUserIds: [user.id] }));
  const trainerProfiles: Wire[] = ['admin', 'manager'].includes(user.role || '') ? await read("Trainer profiles", () => request('/trainer-profiles'), []) : [];
  for (const p of trainerProfiles) {
    const found = data.users.find(u => u.id === p.user_id);
    if (found) { found.trainerProfileId = p.trainer_id; found.bio = p.bio || ''; found.certifications = p.qualifications || ''; }
  }
  if (user.role === 'admin') {
    const roles = Object.keys(ROLE_NAMES) as Role[];
    const grants = await Promise.all(roles.map(async role => [role, await read(`Permissions ${role}`, () => request<string[]>(`/admin/permissions/${ROLE_NAMES[role]}`), [])] as const));
    data.serverPermissions = Object.fromEntries(grants);
    const logs = await Promise.all(roles.map(role => read(`Permission history ${role}`, () => request<any[]>(`/admin/permissions/${ROLE_NAMES[role]}/audit-log`), [])));
    data.permissionAudit = logs.flat().map(w => ({ id: w.logId, time: dateText(w.performedAt), actor: w.performedBy, actorRole: 'admin', action: `Permissions: ${w.action}`, target: `${w.roleName}: ${w.permissionCode}` }));
    if (errors.size) report([...errors].join('\n')); return data;
  }
  data.horses = (await read("Horses", () => request<Wire[]>('/horses'), [])).map(w => horseFromApi(w, data.users));
  if (['manager', 'owner', 'head_trainer'].includes(user.role || '')) data.packages = (await read("Package catalogue", () => request<Wire[]>(user.role === 'manager' ? '/training-packages/all' : '/training-packages'), [])).map(packageFromApi);


  let vetAssignments: Wire[] = [];
  if (user.role === 'veterinarian') {
    try { vetAssignments = await request<Wire[]>('/medical/assignments/mine'); }
    catch (error) {
      data.vetAssignmentsError = error instanceof ApiError && error.status === 403
        ? 'The server denied access to your veterinary assignments. Assigned horses and medical records cannot be fully displayed. Please sign in again; if this persists, contact the administrator.'
        : `Could not load veterinary assignments: ${(error as Error).message}`;
      errors.add(data.vetAssignmentsError);
    }
  }
  const myAssignments: Wire[] = user.role === 'head_trainer' ? await read("Trainer assignments", () => request('/trainer-assignments/me'), []) : [];
  // Pending assignments intentionally do not grant /horses/{id} access. Show the
  // assignment's own summary, so the trainer can accept before fetching private data.
  for (const a of myAssignments.filter(a => a.status === 'ASSIGNED')) {
    if (!data.horses.some(h => h.id === a.horse_id)) {
      data.horses.push(horseFromApi({ horseId: a.horse_id, horseName: a.horse_name, trainerIds: [], admissionStatus: 'APPROVED' }, data.users));
    }
    data.enrollments.push({ ...enrollmentFromApi({ horsePackageId: a.horse_package_id, horseId: a.horse_id, packageId: '', packageName: a.package_name, status: 'ACTIVE', paymentStatus: 'PAID', totalPrice: 0 }, [], data.horses.find(h => h.id === a.horse_id)), trainerId: user.id, trainerName: a.trainer_name, trainerStatus: 'pending', assignmentId: a.assignment_id || a.id });
  }
  for (const horse of data.horses) {
    if (user.role === 'head_trainer' && !horse.trainerIds?.includes(user.id)) continue;
    const path = `/horses/${enc(horse.id)}`;
    const assignments = user.role === 'manager' ? await read("Assign veterinarian", () => request<Wire[]>(`/medical/assignments/horses/${enc(horse.id)}`), []) : vetAssignments.filter(a => a.horseId === horse.id);
    const current = [...assignments].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0];
    if (current) {
      horse.vetId = current.veterinarianId; horse.vetName = current.veterinarianName; horse.vetAssignmentId = current.assignmentId;
      horse.vetAssign = { status: ['ACCEPTED','COMPLETED'].includes(current.status) ? 'accepted' : current.status === 'ASSIGNED' ? 'pending' : 'declined', history: [...assignments].reverse().map(a => ({ time: dateText(a.createdAt), from: null, to: a.veterinarianName, by: a.assignedBy, reason: a.reason || a.status })) };
    }
    if (['manager', 'owner', 'veterinarian'].includes(user.role || '')) {
      const records = await read(`Examination records ${horse.id}`, () => request<Wire[]>(`/medical/horses/${enc(horse.id)}/records`), []);
      const mapped = records.map(w => recordFromApi(w, horse.id, data.users));
      data.healthRecords.push(...mapped);
      const latest = [...mapped].filter(r => r.status === 'confirmed').sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
      horse.intakeExamId = mapped.find(r => r.intake && r.status === 'confirmed')?.id;
      horse.weight = Number(latest?.vitals?.weight || 0);
      if (latest?.decision === 'conditional') horse.healthStatus = 'Monitor';
    }
    const raceRows = await read(`Achievements ${horse.id}`, () => request<Wire[]>(`${path}/race-history`), []);
    horse.raceHistory = raceRows.map(w => ({ id: w.raceHistoryId, date: dateText(w.raceDate), raceName: w.raceName, distance: String(w.distance), position: w.finishPosition, totalHorses: 0, time: w.completionTime || '', venue: w.racecourse || '', jockey: w.jockeyName || '', prize: String(w.prize ?? '') }));
    horse.totalRaces = horse.raceHistory.length; horse.wins = horse.raceHistory.filter(r => r.position === 1).length;
    horse.achievements = horse.raceHistory.filter(r => r.position <= 3).map(r => ({ id: r.id, date: r.date, title: r.raceName, description: r.venue, prize: r.prize, position: r.position }));
    data.horseClubRequests.push({ id: horse.id, horseId: horse.id, horseName: horse.name, horseBreed: horse.breed, horseImageUrl: horse.imageUrl, ownerId: horse.ownerId, ownerName: horse.ownerName, clubId: CENTER, submittedAt: '', expiresAt: '', status: horse.approvalStatus, reviewNote: '' });
    if (['manager', 'owner'].includes(user.role || '')) {
      const packs = await read(`Package ${horse.id}`, () => request<Wire[]>(`/horse-packages/${user.role === 'manager' ? 'manage/' : ''}horse/${enc(horse.id)}`), []);
      data.enrollments.push(...packs.map(w => enrollmentFromApi(w, data.packages, horse)));
    }
    if (user.role === 'head_trainer' && myAssignments.some(a => a.horse_id === horse.id && a.status === 'ACCEPTED')) {
      const plans = await read(`Plans ${horse.id}`, () => request<Wire[]>(`${path}/training-plans`), []);
      data.trainingPlans.push(...plans.map(w => planFromApi(w)));
    }
    if (['owner', 'manager'].includes(user.role || '') || (user.role === 'head_trainer' && myAssignments.some(a => a.horse_id === horse.id && a.status === 'ACCEPTED'))) data.trainingSessions.push(...(await read(`Training schedule ${horse.id}`, () => request<Wire[]>(`/training-sessions/horse/${enc(horse.id)}`), [])).map(w => sessionFromApi(w, user.role === 'head_trainer' ? user : undefined)));
  }
  if (user.role === 'head_trainer') {
    for (const a of myAssignments) {
      if (data.enrollments.some(e => e.id === a.horse_package_id)) continue;
      if (a.status !== 'ACCEPTED') continue;
      const context = await read(`Assigned packages ${a.horse_package_id}`, () => request(`/horse-packages/${enc(a.horse_package_id)}/training-context`), null);
      if (context) {
        const e = enrollmentFromApi({ horsePackageId: a.horse_package_id, horseId: a.horse_id, packageId: '', packageName: context.packageName, status: context.packageStatus, paymentStatus: context.paymentStatus, totalPrice: 0, startDate: context.startDate, endDate: context.endDate }, [], data.horses.find(h => h.id === a.horse_id));
        data.enrollments.push(e);
        const m = context.latestMedical;
        if (m?.medical_record_id) data.healthRecords.push(recordFromApi({ medicalRecordId: m.medical_record_id, veterinarianId: m.veterinarian_name, finalConclusion: m.fitness_conclusion, examinedAt: m.examined_at, createdAt: m.examined_at, status: 'CONFIRMED', vitalSign: { weight: context.weightKg, restingHeartRate: m.resting_heart_rate, bodyTemperature: m.body_temperature, restingRespiratoryRate: m.resting_respiratory_rate } }, a.horse_id, data.users));
        const horse = data.horses.find(h => h.id === a.horse_id); if (horse) horse.weight = Number(context.weightKg || 0);
      }
    }
  }
  for (const e of data.enrollments) {
    if (e.directAssignmentId) continue;
    const assignments = user.role === 'head_trainer' ? myAssignments.filter(a => a.horse_package_id === e.id) : await read(`Package trainer ${e.id}`, () => request<Wire[]>(`/horse-packages/${enc(e.id)}/trainer-assignments`), []);
    const a = assignments.find(a => a.status === 'ACCEPTED') || assignments.find(a => a.status === 'ASSIGNED');
    if (a) { e.trainerId = a.assignee_id; e.trainerName = a.trainer_name; e.trainerStatus = a.status === 'ACCEPTED' ? 'confirmed' : 'pending'; e.assignmentId = a.assignment_id || a.id; }
    e.assignHistory = [...assignments].reverse().map(a => ({ time: dateText(a.created_at), kind: a.status === 'ACCEPTED' ? 'confirm' : a.status === 'DECLINED' ? 'decline' : 'assign', from: null, to: a.trainer_name, by: a.assigned_by_name, reason: a.reason || a.status }));
    const sessions = packageSessions(data.trainingSessions, data.trainingPlans, e.id); e.sessionsTotal = sessions.length; e.sessionsDone = sessions.filter(s => s.status === 'Completed').length;
    e.scheduleConfirmed = sessions.length > 0;
    const packageType = data.packages.find(p => p.id === e.packageId)?.packageType;
    if (packageType === 'RECOVERY' && e.status === 'active') {
      const horse = data.horses.find(h => h.id === e.horseId);
      if (horse) horse.rehab = { packageId: e.packageId, name: e.packageName, durationWeeks: Math.ceil((data.packages.find(p => p.id === e.packageId)?.durationDays || 0)/7), activatedAt: e.startedAt, activatedBy: '' };
    }
  }
  for (const p of data.trainingPlans) { const e = data.enrollments.find(e => e.id === p.horsePackageId) || data.enrollments.find(e => e.horseId === p.horseId && e.trainerStatus === 'confirmed' && e.status === 'active'); if (e) { p.startDate ||= e.startedAt; p.endDate ||= e.expiresAt; p.horsePackageId ||= e.id; p.assignmentId ||= e.assignmentId; } }
  if (errors.size) report([...errors].join('\n'));
  return data;
}
