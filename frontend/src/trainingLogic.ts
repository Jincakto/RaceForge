import { validateRoadmap } from './packageRoadmap';
import {
  nextSeq, getLifecycle, isHeavySession,
  type AppUser, type Horse, type Enrollment, type TrainingPlan, type TrainingSession,
  type AppNotification, type TrainingPackage, type TrainingSuggestion, type AssignEntry, type Res, type HealthRecord,
} from './data';

export const TODAY = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
export const EXPIRY_WARN_DAYS = 14;

// ── Date helpers (dd/mm/yyyy) ────────────────────────────────────────────────

export function parseD(d: string): Date {
  const [dd, mm, yy] = d.split('/').map(Number);
  return new Date(yy, (mm || 1) - 1, dd || 1);
}
export function fmtD(dt: Date): string {
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
}
export function addDays(d: string, n: number): string {
  const dt = parseD(d); dt.setDate(dt.getDate() + n); return fmtD(dt);
}
export function diffDays(a: string, b: string): number {
  return Math.round((parseD(b).getTime() - parseD(a).getTime()) / 86400000);
}
export function isoToD(iso: string): string {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}
export function dToIso(d: string): string {
  const [dd, mm, yy] = d.split('/');
  return yy && mm && dd ? `${yy}-${mm}-${dd}` : '';
}
export const validDate = (d: string) => /^\d{2}\/\d{2}\/\d{4}$/.test(d) && fmtD(parseD(d)) === d;
export const validTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const weekdayOf = (d: string) => parseD(d).getDay();
export const weekdayLabel = (d: string) => WEEKDAYS[weekdayOf(d)];
export const money = (n: number) => `${Math.round(n).toLocaleString('en-US')} VND`;

// ── Enrollment helpers ───────────────────────────────────────────────────────

export const daysLeft = (e: Pick<Enrollment, 'expiresAt'>) => diffDays(TODAY, e.expiresAt);
export const isCurrent = (e: Enrollment) => e.status !== 'completed';
export const currentEnrollment = (list: Enrollment[], horseId: string) => list.find(e => e.horseId === horseId && isCurrent(e));

export function enrollmentTerm(e: Enrollment): { text: string; left: number; warn: boolean; expired: boolean } {
  const left = daysLeft(e);
  return { text: `${e.startedAt} – ${e.expiresAt}`, left, warn: isCurrent(e) && left <= EXPIRY_WARN_DAYS && left >= 0, expired: left < 0 };
}

export const TRAINER_STATUS_LABEL: Record<Enrollment['trainerStatus'], string> = {
  unassigned: "Awaiting assignment", pending: "Awaiting trainer confirmation", confirmed: "Confirmed",
};

/** Lý do ngựa không thể đăng ký gói mới (null = chọn được). */
function latestHealthRecord(records: HealthRecord[], horseId: string): HealthRecord | undefined {
  return records.filter(r => r.horseId === horseId).sort((a, b) =>
    (b.createdAt ?? 0) - (a.createdAt ?? 0) || parseD(b.date).getTime() - parseD(a.date).getTime(),
  )[0];
}

/** Điều kiện đăng ký dựa trên hồ sơ khám đã xác nhận gần nhất. */
export function purchaseBlockReason(h: Horse, enrollments: Enrollment[], records: HealthRecord[] = [], allowActive = false, packageType?: string): string | null {
  if (h.approvalStatus !== 'approved' || !h.clubId) return "Club admission has not been approved";
  if (h.trainingStatus !== 'Active') return "This horse is not active. Ask a club manager to activate it from the horse profile";
  const latest = latestHealthRecord(records, h.id);
  if (!latest) return "No examination record";
  if (latest.status === 'draft') return "Examination record is still a draft";
  if (packageType === 'RECOVERY') return h.lock && latest.decision === 'not-eligible' ? null : "Recovery packages require a NOT_FIT conclusion and a training lock";
  if (latest.decision === 'not-eligible' || latest.trainingEligibility === 'not-eligible' || h.lock) return "Not fit for training; training is locked";
  if (packageType === 'RACING' && (h.healthStatus === 'Monitor' || latest.decision === 'conditional' || latest.trainingEligibility === 'conditional')) return "This horse needs monitoring; a veterinarian must confirm it as FIT before Racing registration.";
  if (!['Eligible', 'Monitor'].includes(h.healthStatus)) return "Health status is not ready for training";
  const allowed = latest.decision === 'eligible' || latest.decision === 'conditional'
    || latest.trainingEligibility === 'eligible' || latest.trainingEligibility === 'conditional';
  if (!allowed) return "Examination record has no confirmed conclusion";
  if (!allowActive) {
    const cur = currentEnrollment(enrollments, h.id);
    if (cur && cur.paymentStatus !== 'PENDING' && daysLeft(cur) >= 0) return "An active package already exists";
  }
  return null;
}

/** Ngựa mà HLV được phép lập lộ trình: đang được phân công, gói đã xác nhận, không khóa. */
export function trainerPlanBlockReason(h: Horse, enrollments: Enrollment[], trainerId: string): string | null {
  const activeEntry = (h.trainerHistory || []).some(t => t.trainerId === trainerId && t.to === null);
  const en = currentEnrollment(enrollments, h.id);
  if (!activeEntry || !en || en.trainerId !== trainerId) return "Not assigned to you";
  if (en.trainerStatus !== 'confirmed') return "You have not accepted the assignment";
  if (h.lock) return "Training is locked";
  if (daysLeft(en) < 0) return "Training package has expired";
  if (getLifecycle(h) !== 'training') return "Not currently in training";
  return null;
}

// ── Session validation (preview + final) ─────────────────────────────────────

export interface SessionWriteOptions { mode: 'single' | 'adjust'; sessionId?: string; intensity?: string; reason?: string }
export interface SessionDraft { endTime?: string; date: string; time: string; type: string; distance: string; targetTime: string; notes: string }

export interface SessionCheckCtx {
  sessions: TrainingSession[];
  enrollments: Enrollment[];
  horseId: string;
  trainerId: string;
}

/** Trả về lỗi theo từng dòng và lỗi chung. */
export function checkSessionDrafts(ctx: SessionCheckCtx, drafts: SessionDraft[]): { rows: string[]; global: string } {
  const en = currentEnrollment(ctx.enrollments, ctx.horseId);
  const live = ctx.sessions.filter(s => s.status === 'Scheduled' || s.status === 'In Progress');
  const rows = drafts.map((d, i) => {
    if (!validDate(d.date)) return "Invalid date";
    if (diffDays(TODAY, d.date) < 0) return "Date cannot be in the past";
    if (!validTime(d.time)) return "Invalid time";
    if (en && diffDays(d.date, en.expiresAt) < 0) return `After the package expiry date (${en.expiresAt})`;
    const clash = live.find(s => s.date === d.date && s.time === d.time && (s.horseId === ctx.horseId || s.trainerId === ctx.trainerId));
    if (clash) return clash.horseId === ctx.horseId ? "Time conflicts with another session for this horse" : "The trainer already has another session at this time";
    if (drafts.some((x, j) => j < i && x.date === d.date && x.time === d.time)) return "Time conflicts with a previous row";
    if (d.notes.length > 300) return "Notes cannot exceed 300 characters";
    return '';
  });
  let global = '';
  if (!en) global = "This horse has no current training package.";
  return { rows, global };
}

// ── Training level ordering ──────────────────────────────────────────────────

export const INTENSITY_LEVELS = ["Low", "Medium", 'High'] as const;
export const WORKLOAD_OF: Record<string, string> = { Low: 'Low', Medium: 'Medium', High: 'High' };
export const WORKLOAD_LABEL: Record<string, string> = { Low: "Low", Medium: "Medium", Moderate: "Medium", High: 'High', 'Very High': "Very high" };
export function suggestedLevel(s: TrainingSuggestion): number {
  if (s.approvedIntensity) return { LOW: 0, MODERATE: 1, HIGH: 2 }[s.approvedIntensity];
  if (s.phase === "Race preparation") return 2;
  if (s.phase === "Foundation") return 1;
  return 0;
}
export const PHASES = ["Orientation", "Foundation", "Race preparation", "Recovery"];
export const SESSION_TYPES = ["Interval sprints", "Race-pace run", "Tempo run", "Aerobic endurance run", "Recovery jog", "Fartlek run", "Easy canter", "Walk + easy jog"];

// ── Handlers ─────────────────────────────────────────────────────────────────

export interface TrainingSlice {
  user: AppUser | null;
  users: AppUser[];
  horses: Horse[];
  enrollments: Enrollment[];
  trainingPlans: TrainingPlan[];
  trainingSessions: TrainingSession[];
  notifications: AppNotification[];
  packages: TrainingPackage[];
  healthRecords: HealthRecord[];
}

export interface TrainingEnv<S extends TrainingSlice> {
  getState: () => S;
  setState: (f: (s: S) => S) => void;
  toast: (m: string) => void;
  reject: (m: string) => string;
  audit: (action: string, target: string, reason?: string) => void;
  notif: (n: Omit<AppNotification, 'id' | 'time' | 'read'>) => AppNotification;
}

export interface PackageDraft { roadmapTemplate?: import('./packageRoadmap').PackageRoadmap; packageType?: string; id?: string; name: string; description: string; sessions: number; durationDays: number; price: number }
export interface PlanDraft { recommendationId?: string; weekdays?: number[]; time?: string; horseId: string; phase: string; startDate: string; endDate: string; distance: string; workload: string; surface: string; goals: string; suggestion?: TrainingSuggestion }
export interface AttemptInfo { horseId: string; packageId: string; renewOfId?: string }

export function validatePackage(d: PackageDraft, others: TrainingPackage[]): Record<string, string> {
  const e: Record<string, string> = {};
  const name = d.name.trim();
  if (name.length < 3 || name.length > 60) e.name = "Package name must contain 3–60 characters.";
  else if (others.some(p => p.id !== d.id && p.name.trim().toLowerCase() === name.toLowerCase())) e.name = "Package name already exists.";
  if (!Number.isInteger(d.price) || d.price <= 0) e.price = "Price must be a positive integer in VND.";
  if (!['BASIC', 'RACING', 'PERFORMANCE', 'RECOVERY'].includes(d.packageType || '')) e.packageType = "Select a valid package type.";
  if (!Number.isInteger(d.durationDays) || d.durationDays < 7 || d.durationDays > 365) e.durationDays = "Duration must be between 7 and 365 days.";
  if (d.description.length > 300) e.description = "Description cannot exceed 300 characters.";
  if (!d.id) { const roadmapError = validateRoadmap(d.roadmapTemplate, d.durationDays); if (roadmapError) e.roadmapTemplate = roadmapError; }
  return e;
}

export function makeTrainingHandlers<S extends TrainingSlice>(env: TrainingEnv<S>) {
  const { getState, setState, toast, reject, audit, notif } = env;
  const fail = <T,>(m: string): Res<T> => ({ ok: false, message: reject(m) });

  const purchasePackage = (horseId: string, packageId: string, renewOfId?: string): Res<Enrollment> => {
    const s = getState();
    const user = s.user;
    const horse = s.horses.find(h => h.id === horseId);
    const pkg = s.packages.find(p => p.id === packageId);
    if (!user || !horse || !pkg) return fail("Horse or training package not found.");
    if (user.role !== 'owner' || horse.ownerId !== user.id) return fail("Only the horse owner may register a package for their horse.");
    if (!pkg.active) return fail("This package is currently unavailable.");
    const old = renewOfId ? s.enrollments.find(e => e.id === renewOfId && e.horseId === horseId) : undefined;
    if (renewOfId && !old) return fail("Package to renew not found.");
    const block = purchaseBlockReason(horse, s.enrollments, s.healthRecords, !!old);
    if (block) return fail(`Cannot register: ${block}.`);
    const id = nextSeq('ENR', s.enrollments.map(e => e.id));
    const inherit = old && old.trainerId && old.trainerStatus === 'confirmed';
    const enr: Enrollment = {
      id, horseId, packageId: pkg.id, packageName: pkg.name,
      sessionsTotal: pkg.sessions, sessionsDone: 0, status: 'active',
      trainerId: inherit ? old!.trainerId : '', trainerName: inherit ? old!.trainerName : '',
      trainerStatus: inherit ? 'confirmed' : 'unassigned',
      assignHistory: inherit ? [{ time: TODAY, kind: 'confirm', from: null, to: old!.trainerName, by: "System", reason: `Retain the trainer on renewal ${old!.id}` }] : [],
      startedAt: TODAY, expiresAt: addDays(TODAY, pkg.durationDays), amount: pkg.price, paidAt: `${TODAY} ${new Date().toTimeString().slice(0, 5)}`,
      paymentMethod: "Simulated payment", ownerName: user.name, scheduleConfirmed: !!inherit,
      renewedFrom: old?.id,
    };
    setState(st => ({
      ...st,
      enrollments: [
        ...st.enrollments.map(e => e.horseId === horseId && isCurrent(e) ? { ...e, status: 'completed' as const } : e),
        enr,
      ],
      horses: st.horses.map(h => h.id === horseId ? { ...h, lifecycle: 'training' as const, trainingStatus: 'Active' as const } : h),
      notifications: [
        inherit
          ? notif({ type: 'training', message: `Horse Owner ${user.name} renewed package ${pkg.name} for "${horse.name}" (${id})`, toUserIds: [old!.trainerId], clubId: horse.clubId || undefined, action: 'training-hub', horseId })
          : notif({ type: 'training', message: `Horse "${horse.name}" registered for package ${pkg.name} (${id}) — trainer assignment required`, toRoles: ['manager'], clubId: horse.clubId || undefined, action: 'trainer-assign', horseId }),
        ...st.notifications,
      ],
    }));
    audit(old ? "Renew training package" : "Training package registration", `${horse.name} — ${pkg.name} (${id}), ${money(pkg.price)}`);
    toast(old ? `Renewed successfully — receipt ${id}` : `Registered successfully — receipt ${id}`);
    return { ok: true, data: enr };
  };

  const savePackage = (d: PackageDraft): Res<TrainingPackage> => {
    const s = getState();
    if (s.user?.role !== 'manager') return fail("Only club managers may manage the package catalog.");
    const errs = validatePackage(d, s.packages);
    const first = Object.values(errs)[0];
    if (first) return { ok: false, message: first };
    const base = { name: d.name.trim(), description: d.description.trim(), sessions: d.sessions, durationDays: d.durationDays, price: d.price };
    if (d.id) {
      const cur = s.packages.find(p => p.id === d.id);
      if (!cur) return fail("Package not found.");
      const pkg = { ...cur, ...base };
      setState(st => ({ ...st, packages: st.packages.map(p => p.id === pkg.id ? pkg : p) }));
      audit("Update training package", `${pkg.name} (${pkg.id})`);
      toast("Training package updated");
      return { ok: true, data: pkg };
    }
    const pkg: TrainingPackage = { id: nextSeq('PKG', s.packages.map(p => p.id)), active: true, ...base };
    setState(st => ({ ...st, packages: [...st.packages, pkg] }));
    audit("Create training package", `${pkg.name} (${pkg.id})`);
    toast("Training package created");
    return { ok: true, data: pkg };
  };

  const togglePackage = (id: string, active: boolean): Res<TrainingPackage> => {
    const s = getState();
    if (s.user?.role !== 'manager') return fail("Only club managers may manage the package catalog.");
    const cur = s.packages.find(p => p.id === id);
    if (!cur) return fail("Package not found.");
    const pkg = { ...cur, active };
    setState(st => ({ ...st, packages: st.packages.map(p => p.id === id ? pkg : p) }));
    audit(active ? "Enable training package" : "Disable training package", `${pkg.name} (${pkg.id})`);
    toast(active ? "Package enabled — horse owners may register" : "Package disabled — hidden from horse owners");
    return { ok: true, data: pkg };
  };

  const assignTrainer = (enrId: string, trainerId: string, reason = ''): Res<Enrollment> => {
    const s = getState();
    const mgr = s.user;
    const en = s.enrollments.find(e => e.id === enrId);
    const trainer = s.users.find(u => u.id === trainerId);
    const horse = en && s.horses.find(h => h.id === en.horseId);
    if (mgr?.role !== 'manager') return fail("Only club managers may assign trainers.");
    if (!en || !horse || !trainer || trainer.role !== 'head_trainer') return fail("Select a trainer.");
    if (!isCurrent(en)) return fail("This package has ended and cannot be assigned.");
    if (trainer.clubId !== horse.clubId) return fail("The trainer does not belong to the horse's center.");
    const replacing = en.trainerStatus !== 'unassigned' && !!en.trainerId;
    if (replacing && en.trainerId === trainerId) return fail("This trainer is already assigned to the package — select a different replacement.");
    if (replacing && reason.trim().length < 10) return fail("Replacing a trainer requires a reason of at least 10 characters.");
    const entry: AssignEntry = { time: TODAY, kind: replacing ? 'replace' : 'assign', from: replacing ? en.trainerName : null, to: trainer.name, by: mgr.name, reason: reason.trim() || "First assignment" };
    const oldTrainerId = replacing ? en.trainerId : '';
    setState(st => ({
      ...st,
      enrollments: st.enrollments.map(e => e.id === enrId ? { ...e, trainerId, trainerName: trainer.name, trainerStatus: 'pending' as const, scheduleConfirmed: false, assignHistory: [entry, ...e.assignHistory] } : e),
      horses: st.horses.map(h => h.id !== horse.id ? h : {
        ...h, headTrainerId: trainerId, headTrainerName: trainer.name,
        trainerHistory: [
          ...(h.trainerHistory || []).map(t => t.to === null ? { ...t, to: TODAY } : t),
          { id: `th${Date.now()}`, trainerId, name: trainer.name, from: TODAY, to: null, note: replacing ? `Replace ${en.trainerName}: ${reason.trim()}` : `Package assignment ${en.packageName}` },
        ],
      }),
      trainingSessions: st.trainingSessions.map(x => x.horseId === horse.id && x.status === 'Scheduled' ? { ...x, trainerId, trainerName: trainer.name } : x),
      notifications: [
        notif({ type: 'training', message: `You are assigned to train "${horse.name}" (packages ${en.packageName}) — please accept or decline`, toUserIds: [trainerId], clubId: horse.clubId || undefined, action: 'training-hub', horseId: horse.id }),
        ...(oldTrainerId ? [notif({ type: 'training', message: `You are no longer assigned to "${horse.name}" — ${reason.trim()}`, toUserIds: [oldTrainerId], clubId: horse.clubId || undefined, action: 'training-hub' })] : []),
        notif({ type: 'training', message: `Horse "${horse.name}" has been assigned trainer ${trainer.name} — awaiting confirmation`, toUserIds: [horse.ownerId], clubId: horse.clubId || undefined, action: 'training-register' }),
        ...st.notifications,
      ],
    }));
    audit(replacing ? "Replace trainer" : "Assign trainers", `${horse.name} (${horse.id}): ${replacing ? en.trainerName + ' → ' : ''}${trainer.name}`, reason.trim() || undefined);
    toast(replacing ? "Trainer replaced — awaiting confirmation" : "Assigned — awaiting trainer confirmation");
    return { ok: true, data: { ...en, trainerId, trainerName: trainer.name, trainerStatus: 'pending' } };
  };

  const respondAssign = (enrId: string, accept: boolean, reason = ''): Res<null> => {
    const s = getState();
    const me = s.user;
    const en = s.enrollments.find(e => e.id === enrId);
    const horse = en && s.horses.find(h => h.id === en.horseId);
    if (!me || !en || !horse) return fail("Assignment not found.");
    if (en.trainerId !== me.id || en.trainerStatus !== 'pending') return fail("This assignment is no longer awaiting your response.");
    if (!accept && reason.trim().length < 10) return fail("Declining requires a reason of at least 10 characters.");
    const entry: AssignEntry = { time: TODAY, kind: accept ? 'confirm' : 'decline', from: null, to: me.name, by: me.name, reason: accept ? "Accept training assignment" : reason.trim() };
    setState(st => ({
      ...st,
      enrollments: st.enrollments.map(e => e.id !== enrId ? e : accept
        ? { ...e, trainerStatus: 'confirmed' as const, scheduleConfirmed: e.status === 'active' && !horse.lock, assignHistory: [entry, ...e.assignHistory] }
        : { ...e, trainerStatus: 'unassigned' as const, trainerId: '', trainerName: '', scheduleConfirmed: false, assignHistory: [entry, ...e.assignHistory] }),
      horses: accept ? st.horses : st.horses.map(h => h.id !== horse.id ? h : {
        ...h, headTrainerId: '', headTrainerName: '',
        trainerHistory: (h.trainerHistory || []).map(t => t.trainerId === me.id && t.to === null ? { ...t, to: TODAY, note: "Decline training assignment" } : t),
      }),
      notifications: [
        notif({ type: 'training', message: accept ? `${me.name} accepted the training assignment for "${horse.name}"` : `${me.name} declined training for "${horse.name}": ${reason.trim()} — reassignment required`, toRoles: ['manager'], clubId: horse.clubId || undefined, action: 'trainer-assign', horseId: horse.id }),
        notif({ type: 'training', message: accept ? `Trainer ${me.name} accepted the training assignment for "${horse.name}"` : `Trainer declined "${horse.name}" — the manager is arranging a replacement`, toUserIds: [horse.ownerId], clubId: horse.clubId || undefined, action: 'training-register' }),
        ...st.notifications,
      ],
    }));
    audit(accept ? "Trainer accepted assignment" : "Trainer declined assignment", `${horse.name} (${horse.id})`, accept ? undefined : reason.trim());
    toast(accept ? "Training assignment accepted" : "Assignment declined");
    return { ok: true, data: null };
  };

  const createPlan = (d: PlanDraft): Res<TrainingPlan> => {
    const s = getState();
    const me = s.user;
    const horse = s.horses.find(h => h.id === d.horseId);
    if (!me || me.role !== 'head_trainer' || !horse) return fail("Only the assigned trainer may create a roadmap.");
    const block = trainerPlanBlockReason(horse, s.enrollments, me.id);
    if (block) return fail(`Cannot create a roadmap for "${horse.name}": ${block}.`);
    if (!validDate(d.startDate) || !validDate(d.endDate) || diffDays(d.startDate, d.endDate) < 0) return fail("Invalid roadmap start or end date.");
    const sug = d.suggestion;
    const plan: TrainingPlan = {
      id: nextSeq('PLN', s.trainingPlans.map(p => p.id)), horseId: d.horseId, phase: d.phase,
      startDate: d.startDate, endDate: d.endDate, distance: d.distance, workload: d.workload, surface: d.surface,
      goals: d.goals.trim(), status: 'Active', locked: false, createdBy: me.name, progress: 0,
      ...(sug ? { weeklyKm: sug.weeklyKm, sessionsPerWeek: sug.sessionsPerWeek, restDaysPerWeek: sug.restDaysPerWeek, intensityScore: sug.intensityScore, algorithmRationale: sug.rationale.join(' · '), weeklySchedule: sug.weeklySchedule.map(w => ({ day: w.day, type: w.type, distance: w.distance, intensity: w.intensity })) } : {}),
    };
    setState(st => ({
      ...st,
      trainingPlans: [plan, ...st.trainingPlans.map(p => p.horseId === d.horseId && p.status === 'Active' ? { ...p, status: 'Completed' as const } : p)],
      notifications: [notif({ type: 'training', message: `Trainer ${me.name} created roadmap "${d.phase}" for "${horse.name}" (${d.startDate} → ${d.endDate})`, toUserIds: [horse.ownerId], clubId: horse.clubId || undefined, action: 'horse-detail', horseId: horse.id }), ...st.notifications],
    }));
    audit("Create training roadmap", `${horse.name} — ${d.phase} (${plan.id})`);
    toast("Training roadmap created");
    return { ok: true, data: plan };
  };

  const generateSessions = (horseId: string, planId: string, drafts: SessionDraft[]): Res<TrainingSession[]> => {
    const s = getState();
    const me = s.user;
    const horse = s.horses.find(h => h.id === horseId);
    if (!me || me.role !== 'head_trainer' || !horse) return fail("Only the assigned trainer may schedule sessions.");
    if (horse.lock) return fail(`Horse "${horse.name}" is under a TRAINING LOCK (${horse.lock.reason}). Cannot create new sessions.`);
    const block = trainerPlanBlockReason(horse, s.enrollments, me.id);
    if (block) return fail(`Cannot schedule sessions for "${horse.name}": ${block}.`);
    if (drafts.length === 0) return fail("No sessions to create.");
    const chk = checkSessionDrafts({ sessions: s.trainingSessions, enrollments: s.enrollments, horseId, trainerId: me.id }, drafts);
    if (chk.global) return fail(chk.global);
    const bad = chk.rows.findIndex(r => r);
    if (bad >= 0) return fail(`Row ${bad + 1}: ${chk.rows[bad]}.`);
    const ids = s.trainingSessions.map(x => x.id);
    const first = Number(nextSeq('SES', ids).slice(4));
    const created: TrainingSession[] = [...drafts].map((d, i) => ({ d, i })).map(({ d, i }) => ({
      id: `SES-${String(first + i).padStart(6, '0')}`, horseId, planId, date: d.date, time: d.time, type: d.type,
      trainerName: me.name, trainerId: me.id, assignedStaffIds: horse.groomId ? [horse.groomId] : [], assignedStaffNames: horse.groomName ? [horse.groomName] : [],
      status: 'Scheduled' as const, distance: d.distance, targetTime: d.targetTime, notes: d.notes.trim(), conflictChecked: true,
    }));
    setState(st => ({ ...st, trainingSessions: [...created, ...st.trainingSessions] }));
    audit("Create sessions", `${horse.name}: ${created.length} sessions (${created[0].id}${created.length > 1 ? ' – ' + created[created.length - 1].id : ''})`);
    toast(`Created ${created.length} sessions`);
    return { ok: true, data: created };
  };

  const checkIn = (sessionId: string, present: boolean, note = ''): Res<null> => {
    const s = getState();
    const me = s.user;
    const ses = s.trainingSessions.find(x => x.id === sessionId);
    const horse = ses && s.horses.find(h => h.id === ses.horseId);
    if (!me || me.role !== 'head_trainer' || !ses || !horse) return fail("Session not found.");
    if (ses.trainerId !== me.id) return fail("You are not assigned to this session.");
    if (ses.status !== 'Scheduled') return fail("Attendance can only be recorded for scheduled sessions.");
    if (ses.date !== TODAY) return fail(`Attendance can only be recorded on the session date (${ses.date}).`);
    if (horse.lock) return fail(`Horse "${horse.name}" is under a TRAINING LOCK. Attendance cannot be recorded.`);
    if (!present && note.trim().length < 10) return fail("Absence requires a reason of at least 10 characters.");
    const att = { status: present ? 'present' as const : 'absent' as const, at: `${TODAY} ${new Date().toTimeString().slice(0, 5)}`, note: note.trim() || undefined };
    setState(st => ({ ...st, trainingSessions: st.trainingSessions.map(x => x.id === sessionId ? { ...x, attendance: att, status: present ? x.status : 'Not Performed' as const, notes: present ? x.notes : `${x.notes} · Absent: ${note.trim()}` } : x) }));
    toast(present ? "Attendance recorded: present" : "Absence recorded — session not performed");
    return { ok: true, data: null };
  };

  return { purchasePackage, savePackage, togglePackage, assignTrainer, respondAssign, createPlan, generateSessions, checkIn };
}

export type TrainingHandlers = ReturnType<typeof makeTrainingHandlers>;
export { isHeavySession };
