import { trainingTimestamp } from './trainingTimestamp';
import { ApiError, idPath as enc, request } from './api';
import { staffRoleId, ROLE_NAMES, isoDate, enrollmentFromApi, horsePayload, medicalPayload, packageFromApi, planFromApi, recordFromApi, sessionFromApi } from './remote';
import type { RemoteSlice } from './remote';
import type { AppUser, Horse, HealthRecord, Res, Enrollment, TrainingPackage, TrainingPlan, TrainingSession, Role } from './data';
import type { PackageDraft, PlanDraft, SessionDraft } from './trainingLogic';
import { changePermission, permissionForPage } from './permissionApi';
import { recommendationFor } from './recommendations';

interface State extends RemoteSlice { user: AppUser | null; }
interface Env { getState: () => State; reload: () => Promise<void>; success: (message: string) => void; error: (message: string) => void; navigate: (page: string) => void; }
const locks = new Set<string>();
const createdRegistrations = new Map<string, { id: string; raceKeys: Set<string> }>();
export function makeRemoteActions(env: Env) {
  const { getState, reload, success, error, navigate } = env;
  const unavailable = (label: string): never => { throw new Error(`The API is not yet available for ${label}. Changes have not been saved.`); };
  async function run<T>(key: string, action: () => Promise<T>, message = "Saved on the server."): Promise<T> {
    if (locks.has(key)) throw new Error("A request is already being processed.");
    locks.add(key);
    try { const result = await action(); await reload(); if (message) success(message); return result; }
    finally { locks.delete(key); }
  }
  const fire = (key: string, action: () => Promise<unknown>, message?: string) => run(key, action, message).catch(e => { error((e as Error).message); throw e; });
  const result = async <T>(key: string, action: () => Promise<T>): Promise<Res<T>> => {
    try { return { ok: true, data: await run(key, action) }; } catch (e) { const message = (e as Error).message; error(message); return { ok: false, message }; }
  };
  async function saveRecord(rec: HealthRecord): Promise<HealthRecord> {
    const state = getState();
    const profile = rec.profileId || await request<string>(`/horses/${enc(rec.horseId)}/health-profile`);
    const body = medicalPayload(rec, profile);
    // Keep the server-created draft ID on the form if confirmation fails; retry updates it.
    const existing = rec.profileId && rec.id ? rec.id : undefined;
    const draft = await request(existing ? `/medical/records/${enc(existing)}/draft` : '/medical/records', existing ? 'PUT' : 'POST', body);
    rec.id = draft.medicalRecordId; rec.profileId = profile;
    const confirmed = rec.status === 'draft' ? draft : await request(`/medical/records/${enc(draft.medicalRecordId)}/confirm`, 'POST', body);
    return recordFromApi(confirmed, rec.horseId, state.users);
  }
  return {
    togglePermission: (role: Role, page: string, enabled: boolean, _reason: string) => fire(`permission-${role}-${page}`, async () => {
      const code = permissionForPage(role, page);
      if (!code) unavailable("granting access to this feature: the server controls it directly by role");
      await changePermission(ROLE_NAMES[role], code!, enabled);
    }),
    unavailable: (label: string) => { error(`The API is not available for ${label}; the operation has not been saved.`); },
    async createHorse(horse: Horse) {
      return fire('create-horse', async () => {
        const key = `${getState().user?.id}:${horse.microchip?.trim().toUpperCase()}`;
        let progress = createdRegistrations.get(key);
        if (!progress) {
          const created = await request('/horses', 'POST', horsePayload(horse));
          progress = { id: created.horseId, raceKeys: new Set() }; createdRegistrations.set(key, progress);
        }
        horse.id = progress.id;
        try {
          for (const r of horse.raceHistory) {
            const payload = racePayload(r); const raceKey = JSON.stringify(payload);
            if (!progress.raceKeys.has(raceKey)) { await request(`/horses/${enc(horse.id)}/race-history`, 'POST', payload); progress.raceKeys.add(raceKey); }
          }
          await request(`/horses/${enc(horse.id)}/admission`, 'POST');
          createdRegistrations.delete(key);
        } catch (e) { await reload(); throw e; }
        navigate('my-horses');
      }, "Horse created and admission application submitted.");
    },
    async updateHorse(next: Horse) {
      return fire(`horse-${next.id}`, async () => {
        const prev = getState().horses.find(h => h.id === next.id); if (!prev) throw new Error("Horse not found.");
        if (next.stable !== prev.stable || next.stall !== prev.stall || next.identityEvidence?.note !== prev.identityEvidence?.note) unavailable("saving stables, stalls or evidence notes");
        if (JSON.stringify(next.photos) !== JSON.stringify(prev.photos)) unavailable("saving image galleries");
        if (JSON.stringify(next.editRequests) !== JSON.stringify(prev.editRequests)) unavailable("requesting changes to an approved profile");
        if (JSON.stringify(next.achievements) !== JSON.stringify(prev.achievements)) unavailable("standalone achievements; enter race results in the race history tab to save prizes");
        if (JSON.stringify(next.trainerHistory) !== JSON.stringify(prev.trainerHistory)) {
          throw new Error("Assign trainers through a paid horse package on the Trainer assignments page.");
        }
        if (JSON.stringify(horsePayload(next)) !== JSON.stringify(horsePayload(prev))) await request(`/horses/${enc(next.id)}`, 'PUT', horsePayload(next));
        for (const old of prev.raceHistory) if (!next.raceHistory.some(r => r.id === old.id)) await request(`/horses/race-history/${enc(old.id)}`, 'DELETE');
        for (const r of next.raceHistory) {
          const old = prev.raceHistory.find(x => x.id === r.id);
          if (!old) await request(`/horses/${enc(next.id)}/race-history`, 'POST', racePayload(r));
          else if (JSON.stringify(old) !== JSON.stringify(r)) await request(`/horses/race-history/${enc(r.id)}`, 'PUT', racePayload(r));
        }
      });
    },
    activateHorse: (id: string) => fire(`activate-${id}`, async () => {
      if (getState().user?.role !== 'manager') throw new Error("Only a club manager may activate a horse.");
      const horse = getState().horses.find(h => h.id === id);
      if (!horse || horse.approvalStatus !== 'approved') throw new Error("Horse admission must be approved before activation.");
      await request(`/horses/${enc(id)}/activate`, 'PATCH');
    }, "Horse activated. Health and training lock requirements still apply when registering for a package."),
    submitHorse: (id: string) => fire(`submit-${id}`, () => request(`/horses/${enc(id)}/admission`, 'POST')),
    approveHorse: (id: string) => fire(`review-${id}`, () => request(`/horses/${enc(id)}/admission/approve`, 'POST', { note: "Examination records and supporting evidence reviewed." })),
    rejectHorse: (id: string, note: string) => fire(`review-${id}`, () => request(`/horses/${enc(id)}/admission/reject`, 'POST', { note })),
    assignVet: (horseId: string, veterinarianId: string, _reason: string) => fire(`vet-${horseId}`, () => request(`/medical/assignments/horses/${enc(horseId)}`, 'POST', { veterinarianId })),
    respondVet: (horseId: string, accepted: boolean, reason: string) => fire(`vet-response-${horseId}`, () => {
      const id = getState().horses.find(h => h.id === horseId)?.vetAssignmentId;
      if (!id) throw new Error("Veterinary assignment ID not found.");
      return request(`/medical/assignments/${enc(id)}/${accepted ? 'accept' : 'decline'}`, 'POST', accepted ? undefined : { reason });
    }),
    saveHealth: (rec: HealthRecord) => run(`medical-${rec.horseId}`, () => saveRecord(rec), ''),
    async postExam(_sessionId: string, rec: HealthRecord): Promise<string | null> {
      try { await run(`medical-${rec.horseId}`, () => saveRecord(rec)); return null; } catch (e) { error((e as Error).message); return (e as Error).message; }
    },
    unlock: (id: string, reason: string) => result<null>(`unlock-${id}`, async () => { await request(`/medical/horses/${enc(id)}/training-lock/unlock`, 'POST', { reason }); return null; }),
    createAccount: (u: AppUser) => fire('create-account', async () => {
      if (!u.role || ['owner', 'admin'].includes(u.role)) throw new Error("Administrators create staff accounts here. Horse owners register themselves.");
      await request('/admin/users', 'POST', { fullName: u.name, email: u.email, phone: u.phone || '', roleId: staffRoleId(u.role, getState().user) });
    }, "Staff account created. A password setup invitation email will be sent."),
    createTrainerProfile: (userId: string) => fire(`trainer-profile-${userId}`, async () => {
      const state = getState();
      if (state.user?.role !== 'admin') throw new Error("Only administrators may create trainer profiles.");
      const target = state.users.find(u => u.id === userId);
      if (!target || target.role !== 'head_trainer' || target.status !== 'active' || target.locked) throw new Error("The trainer must activate their account using the invitation email before a profile can be created.");
      if (target.trainerProfileId) throw new Error("This account already has a trainer profile.");
      await request('/trainer-profiles', 'POST', { userId, bio: target.bio || '', qualifications: target.certifications || '' });
    }, "Trainer profile created. The club manager should refresh the list before assigning."),
    toggleLock: (id: string, _reason: string) => fire(`account-${id}`, () => request(`/users/${enc(id)}/status`, 'PATCH', { status: getState().users.find(u => u.id === id)?.locked ? 'ACTIVE' : 'INACTIVE' })),
    invite: (id: string, _reason: string) => fire(`invite-${id}`, () => request(`/admin/users/${enc(id)}/invitation`, 'POST'), "Password setup invitation email resent."),
    async purchasePackage(horseId: string, packageId: string, _renewOfId?: string, successful = true): Promise<Res<Enrollment>> {
      return result(`purchase-${horseId}`, async () => {
        const state = getState();
        const pending = state.enrollments.find(e => e.horseId === horseId && e.packageId === packageId && e.paymentStatus === 'PENDING');
        const registered = pending ? { horsePackageId: pending.id } : await request('/horse-packages/register', 'POST', { horseId, packageId });
        // Preserve an unpaid registration if payment fails; a later attempt resumes it.
        const isRecovery = state.packages.find(p => p.id === packageId)?.packageType === 'RECOVERY';
        const paid = await request(`/horse-packages/${enc(registered.horsePackageId)}/${isRecovery ? 'simulate-recovery-payment' : 'simulate-payment'}`, 'POST', { successful });
        return enrollmentFromApi(paid, state.packages, state.horses.find(h => h.id === horseId));
      });
    },
    savePackage: (draft: PackageDraft) => result<TrainingPackage>('package', async () => {
      if (draft.id) unavailable("editing training packages");
      return packageFromApi(await request('/training-packages', 'POST', { packageName: draft.name.trim(), packageType: draft.packageType, description: draft.description, durationDays: draft.durationDays, price: draft.price }));
    }),
    togglePackage: (_id: string, _active: boolean) => result<TrainingPackage>('package-status', async () => unavailable("enabling or disabling training packages")),
    assignTrainer: (enrollmentId: string, userId: string, reason = '') => result<Enrollment>(`assign-${enrollmentId}`, async () => {
      const state = getState(); const e = state.enrollments.find(e => e.id === enrollmentId); if (!e) throw new Error("Package not found.");
      if (e.directAssignmentId || e.apiStatus !== 'ACTIVE' || e.paymentStatus !== 'PAID') throw new Error("Select an active, paid horse package before assigning a trainer.");
      const trainerId = state.users.find(u => u.id === userId)?.trainerProfileId;
      if (!trainerId) throw new Error("The trainer has no professional profile. Ask an administrator to open Account management and select Create trainer profile, then refresh the list.");
      await request(e.assignmentId ? `/trainer-assignments/${enc(e.assignmentId)}/replace` : '/trainer-assignments', 'POST', e.assignmentId ? { trainerId, reason } : { trainerId, horsePackageId: enrollmentId });
      return { ...e, trainerId: userId, trainerStatus: 'pending' };
    }),
    respondAssign: (enrollmentId: string, accepted: boolean, reason = '') => result<null>(`respond-${enrollmentId}`, async () => {
      const entry = getState().enrollments.find(e => e.id === enrollmentId);
      if (entry?.directAssignmentId || !entry) throw new Error("A package-linked trainer assignment is required.");
      const id = entry?.assignmentId; if (!id) throw new Error("Assignment ID not found.");
      await request(`/trainer-assignments/${enc(id)}/respond`, 'POST', { accepted, reason }); return null;
    }),
    createPlan: (draft: PlanDraft) => result<TrainingPlan>(`plan-${draft.horseId}`, async () => {
      const state = getState();
      const e = state.enrollments.find(e => e.horseId === draft.horseId && e.trainerId === state.user?.id && e.trainerStatus === 'confirmed' && e.status === 'active');
      if (!e?.assignmentId) throw new Error("A paid package and an accepted trainer assignment are required.");
      const recommendation = await recommendationFor(e.id, e.assignmentId);
      const dayNames = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
      if (draft.weekdays && (draft.weekdays.length < 1 || draft.weekdays.length > 6 || new Set(draft.weekdays).size !== draft.weekdays.length || draft.weekdays.some(day => !Number.isInteger(day) || day < 0 || day > 6))) throw new Error("Select 1–6 distinct weekdays.");
      const seconds = (value: string): number => {
        const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
        if (!match || Number(match[1]) > 23 || Number(match[2]) > 59 || Number(match[3] || 0) > 59) throw new Error("Enter a valid session time.");
        return Number(match[1])*3600 + Number(match[2])*60 + Number(match[3] || 0);
      };
      const clock = (value: number) => [Math.floor(value/3600), Math.floor(value%3600/60), value%60].map(n => String(n).padStart(2,'0')).join(':');
      if (!Array.isArray(recommendation.stages) || !recommendation.stages.length) throw new Error("No roadmap stages are available. Reload the suggestion.");
      const selectedIntensity = draft.workload ? ({Low:'LOW',Medium:'MODERATE',High:'HIGH'} as Record<string,string>)[draft.workload] : undefined;
      if (draft.workload && !selectedIntensity) throw new Error("Select a valid training intensity.");
      const stages = recommendation.stages.map((stage: any) => {
        const duration = seconds(stage.sessionEndTime) - seconds(stage.sessionTime);
        if (duration <= 0) throw new Error("Session end time must be after its start time.");
        const start = draft.time !== undefined ? seconds(draft.time) : seconds(stage.sessionTime);
        const end = start + duration;
        if (end >= 24*3600) throw new Error("The selected start time and stage duration must end within the same day. Choose an earlier start time.");
        const days = draft.weekdays ? draft.weekdays.map(day => dayNames[day]) : stage.daysOfWeek;
        if (!Array.isArray(days) || days.length < 1 || days.length > 6 || new Set(days).size !== days.length || days.some((day: string) => !dayNames.includes(day))) throw new Error("Select 1–6 distinct weekdays.");
        return { ...stage, intensity: selectedIntensity || stage.intensity, daysOfWeek: days, sessionTime: clock(start), sessionEndTime: clock(end) };
      });
      if (isoDate(draft.startDate) !== isoDate(e.startedAt) || isoDate(draft.endDate) !== isoDate(e.expiresAt)) throw new Error("Roadmap dates must match the paid package term.");
      const plan = await request(`/horses/${enc(draft.horseId)}/training-plans`, 'POST', { planName: draft.phase, goal: draft.goals, startDate: isoDate(e.startedAt), endDate: isoDate(e.expiresAt), assignmentId: e.assignmentId, recommendationId: recommendation.recommendationId, recommendationConfirmed: true, stages, notes: `${recommendation.rationale || ''}\n${recommendation.limitations || ''}` });
      return planFromApi(plan, e);
    }),
    generateSessions: (horseId: string, planId: string, drafts: SessionDraft[]) => result<TrainingSession[]>(`generate-${planId}`, async () => {
      if (drafts.length === 1) {
        const d = drafts[0];
        const start = `${isoDate(d.date)}T${d.time}:00`;
        const end = new Date(`${isoDate(d.date)}T${d.time}:00`); end.setHours(end.getHours() + 1);
        const pad = (n: number) => String(n).padStart(2, '0');
        return [sessionFromApi(await request('/training-sessions', 'POST', { planId, horseId, scheduledTime: start, scheduledEnd: `${end.getFullYear()}-${pad(end.getMonth()+1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}:00` }), getState().user || undefined)];
      }
      // Only the stored, trainer-confirmed roadmap may be bulk-generated.
      const stored = await request<any[]>(`/training-plans/${enc(planId)}/stages`);
      const plan = getState().trainingPlans.find(p => p.id === planId);
      const enrollment = getState().enrollments.find(e => e.id === plan?.horsePackageId);
      if (!enrollment?.startedAt) throw new Error("Package term not found.");
      const dayNames = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
      const expected: { date: string; time: string; type: string }[] = [];
      for (const stage of stored) {
        const days = typeof stage.weekdays_json === 'string' ? JSON.parse(stage.weekdays_json) : stage.daysOfWeek;
        for (let day = Number(stage.start_day || stage.startDay); day <= Number(stage.end_day || stage.endDay); day++) {
          const dt = new Date(`${isoDate(enrollment.startedAt)}T12:00:00`); dt.setDate(dt.getDate()+day-1);
          if (days.includes(dayNames[dt.getDay()])) expected.push({ date: `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`, time: String(stage.session_time || stage.sessionTime).slice(0,5), type: stage.activity_name || stage.activityName });
        }
      }
      if (drafts.length !== expected.length || drafts.some((d, i) => d.date !== expected[i].date || d.time !== expected[i].time || d.type !== expected[i].type)) throw new Error("The preview differs from the saved training plan. Reload the preview before generating sessions.");
      const generated = await request(`/training-plans/${enc(planId)}/generate-sessions`, 'POST', { confirmed: true });
      return (Array.isArray(generated) ? generated : generated.sessions || []).map((w: any) => sessionFromApi(w, getState().user || undefined));
    }),
    checkIn: (id: string, present: boolean, note = '') => result<null>(`attendance-${id}`, async () => {
      if (present) { await request(`/training-sessions/${enc(id)}/start`, 'PATCH'); return null; }
      const data = await request(`/training-sessions/${enc(id)}/attendance`, 'PUT', { status: 'MISSED', absenceReason: 'OTHER', absenceNote: note });
      if (data.warningTriggered) error(data.warningMessage); return null;
    }),
    async startSession(id: string): Promise<string | null> {
      try { await run(`start-${id}`, () => request(`/training-sessions/${enc(id)}/start`, 'PATCH')); return null; } catch (e) { error((e as Error).message); return (e as Error).message; }
    },
    stopSession: (id: string) => result<null>(`stop-${id}`, async () => { await request(`/training-sessions/${enc(id)}/stop`, 'PATCH', {}); return null; }),
    async activateRecovery(horseId: string, recoveryPackageId: string): Promise<string | null> {
      try { await run(`recovery-${horseId}`, () => request(`/horse-packages/horse/${enc(horseId)}/approve-recovery`, 'POST', { recoveryPackageId, reason: "Manager approved recovery based on the veterinary conclusion." })); return null; }
      catch (e) { error((e as Error).message); return (e as Error).message; }
    },
    async completeSession(id: string, result: NonNullable<TrainingSession['result']>): Promise<string | null> {
      try {
        await run(`complete-${id}`, async () => {
          const distance = Number(result.time.replace(',', '.'));
          if (!Number.isFinite(distance) || distance < 0) throw new Error("Actual distance must be a non-negative number of kilometers.");
          const speed = Number(result.speed);
          if (!Number.isFinite(speed) || speed < 0 || speed > 100) throw new Error('Speed must be between 0 and 100 km/h.');
          if ([result.heartRate, result.performanceScore].some(v => !Number.isInteger(v) || v < 20 || v > 250)) throw new Error('Heart rate must be an integer between 20 and 250 bpm.');
          if (!result.recoveryMeasuredAt) throw new Error('Record the two-minute recovery reading before completing the session.');
          const recoveryMeasuredAt = result.recoveryMeasuredAt;
          await request(`/training-sessions/${enc(id)}/complete`, 'PATCH', { distance, avgSpeed: Number(result.speed), endExerciseHeartRate: result.heartRate, recoveryHeartRate2Min: result.performanceScore, recoveryMeasuredAt, performanceNotes: result.notes });
        }); return null;
      } catch (e) {
        const message = e instanceof ApiError && e.status === 409
          ? `Could not complete session ${id}: ${e.message} The server rejected the save; check the backend log for the specific conflict.`
          : e instanceof Error ? e.message : 'Unable to complete the session.';
        return message;
      }
    },
  };
}
function racePayload(r: Horse['raceHistory'][number]) {
  const distance = Number(r.distance.replace(/[^\d.]/g, ''));
  if (!Number.isFinite(distance) || distance <= 0) throw new Error("Race distance must be greater than 0.");
  const prize = r.prize.trim() ? Number(r.prize.replace(/[^\d.]/g, '')) : 0;
  if (!Number.isFinite(prize)) throw new Error("Prize money must be a valid amount.");
  const [d, m, y] = r.date.split('/');
  return { raceName: r.raceName, raceDate: `${y}-${m}-${d}`, distance, finishPosition: r.position, completionTime: r.time, racecourse: r.venue, jockeyName: r.jockey, prize };
}
