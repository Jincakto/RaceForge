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
export const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
export const weekdayOf = (d: string) => parseD(d).getDay();
export const weekdayLabel = (d: string) => WEEKDAYS[weekdayOf(d)];
export const money = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} VND`;

// ── Enrollment helpers ───────────────────────────────────────────────────────

export const daysLeft = (e: Pick<Enrollment, 'expiresAt'>) => diffDays(TODAY, e.expiresAt);
export const isCurrent = (e: Enrollment) => e.status !== 'completed';
export const currentEnrollment = (list: Enrollment[], horseId: string) => list.find(e => e.horseId === horseId && isCurrent(e));

export function enrollmentTerm(e: Enrollment): { text: string; left: number; warn: boolean; expired: boolean } {
  const left = daysLeft(e);
  return { text: `${e.startedAt} – ${e.expiresAt}`, left, warn: isCurrent(e) && left <= EXPIRY_WARN_DAYS && left >= 0, expired: left < 0 };
}

export const TRAINER_STATUS_LABEL: Record<Enrollment['trainerStatus'], string> = {
  unassigned: 'Chờ phân công', pending: 'Chờ HLV xác nhận', confirmed: 'Đã xác nhận',
};

/** Lý do ngựa không thể đăng ký gói mới (null = chọn được). */
function latestHealthRecord(records: HealthRecord[], horseId: string): HealthRecord | undefined {
  return records.filter(r => r.horseId === horseId).sort((a, b) =>
    (b.createdAt ?? 0) - (a.createdAt ?? 0) || parseD(b.date).getTime() - parseD(a.date).getTime(),
  )[0];
}

/** Điều kiện đăng ký dựa trên hồ sơ khám đã xác nhận gần nhất. */
export function purchaseBlockReason(h: Horse, enrollments: Enrollment[], records: HealthRecord[] = [], allowActive = false, packageType?: string): string | null {
  if (h.approvalStatus !== 'approved' || !h.clubId) return 'Chưa được duyệt vào CLB';
  if (h.trainingStatus !== 'Active') return 'Ngựa chưa được kích hoạt. Vui lòng nhờ Club Manager kích hoạt trong hồ sơ ngựa';
  const latest = latestHealthRecord(records, h.id);
  if (!latest) return 'Chưa có hồ sơ khám';
  if (latest.status === 'draft') return 'Hồ sơ khám còn nháp';
  if (packageType === 'RECOVERY') return h.lock && latest.decision === 'not-eligible' ? null : 'Gói phục hồi yêu cầu kết luận NOT_FIT và khóa huấn luyện';
  if (latest.decision === 'not-eligible' || latest.trainingEligibility === 'not-eligible' || h.lock) return 'Kết luận không đủ điều kiện, đang khóa tập luyện';
  if (!['Eligible', 'Monitor'].includes(h.healthStatus)) return 'Trạng thái sức khỏe chưa sẵn sàng huấn luyện';
  const allowed = latest.decision === 'eligible' || latest.decision === 'conditional'
    || latest.trainingEligibility === 'eligible' || latest.trainingEligibility === 'conditional';
  if (!allowed) return 'Hồ sơ khám chưa có kết luận xác nhận';
  if (!allowActive) {
    const cur = currentEnrollment(enrollments, h.id);
    if (cur && cur.paymentStatus !== 'PENDING' && daysLeft(cur) >= 0) return 'Đã có gói đang hoạt động';
  }
  return null;
}

/** Ngựa mà HLV được phép lập lộ trình: đang được phân công, gói đã xác nhận, không khóa. */
export function trainerPlanBlockReason(h: Horse, enrollments: Enrollment[], trainerId: string): string | null {
  const activeEntry = (h.trainerHistory || []).some(t => t.trainerId === trainerId && t.to === null);
  const en = currentEnrollment(enrollments, h.id);
  if (!activeEntry || !en || en.trainerId !== trainerId) return 'Chưa được phân công cho bạn';
  if (en.trainerStatus !== 'confirmed') return 'Bạn chưa xác nhận phân công';
  if (h.lock) return 'Đang bị khóa huấn luyện';
  if (daysLeft(en) < 0) return 'Gói huấn luyện đã hết hạn';
  if (getLifecycle(h) !== 'training') return 'Chưa ở trạng thái đang huấn luyện';
  return null;
}

// ── Session validation (preview + final) ─────────────────────────────────────

export interface SessionDraft { date: string; time: string; type: string; distance: string; targetTime: string; notes: string }

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
    if (!validDate(d.date)) return 'Ngày không hợp lệ';
    if (diffDays(TODAY, d.date) < 0) return 'Ngày không được ở quá khứ';
    if (!validTime(d.time)) return 'Giờ không hợp lệ';
    if (en && diffDays(d.date, en.expiresAt) < 0) return `Sau ngày hết hạn gói (${en.expiresAt})`;
    const clash = live.find(s => s.date === d.date && s.time === d.time && (s.horseId === ctx.horseId || s.trainerId === ctx.trainerId));
    if (clash) return clash.horseId === ctx.horseId ? 'Trùng giờ với buổi tập khác của ngựa' : 'Huấn luyện viên đã có buổi tập khác cùng giờ';
    if (drafts.some((x, j) => j < i && x.date === d.date && x.time === d.time)) return 'Trùng giờ với dòng phía trên';
    if (d.notes.length > 300) return 'Ghi chú tối đa 300 ký tự';
    return '';
  });
  let global = '';
  if (!en) global = 'Ngựa chưa có gói huấn luyện đang hiệu lực.';
  else {
    const remain = en.sessionsTotal - en.sessionsDone - live.filter(s => s.horseId === ctx.horseId).length;
    if (en.sessionsTotal > 0 && drafts.length > remain) global = `Vượt số buổi còn lại của gói: còn ${Math.max(0, remain)} buổi chưa xếp lịch, đang tạo ${drafts.length} buổi.`;
  }
  return { rows, global };
}

// ── Training level ordering ──────────────────────────────────────────────────

export const INTENSITY_LEVELS = ['Nhẹ', 'Vừa', 'Cao'] as const;
export const WORKLOAD_OF: Record<string, string> = { Nhẹ: 'Low', Vừa: 'Medium', Cao: 'High' };
export const WORKLOAD_LABEL: Record<string, string> = { Low: 'Nhẹ', Medium: 'Vừa', Moderate: 'Vừa', High: 'Cao', 'Very High': 'Rất cao' };
export function suggestedLevel(s: TrainingSuggestion): number {
  if (s.approvedIntensity) return { LOW: 0, MODERATE: 1, HIGH: 2 }[s.approvedIntensity];
  if (s.phase === 'Chuẩn bị thi đấu') return 2;
  if (s.phase === 'Xây nền tảng') return 1;
  return 0;
}
export const PHASES = ['Làm quen', 'Xây nền tảng', 'Chuẩn bị thi đấu', 'Phục hồi'];
export const SESSION_TYPES = ['Chạy nước rút ngắt quãng', 'Chạy tốc độ thi đấu', 'Chạy tempo', 'Chạy sức bền nền', 'Chạy nhẹ phục hồi', 'Chạy biến tốc', 'Phi nước kiệu nhẹ', 'Đi bộ + chạy nhẹ'];

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

export interface PackageDraft { packageType?: string; id?: string; name: string; description: string; sessions: number; durationDays: number; price: number }
export interface PlanDraft { recommendationId?: string; weekdays?: number[]; time?: string; horseId: string; phase: string; startDate: string; endDate: string; distance: string; workload: string; surface: string; goals: string; suggestion?: TrainingSuggestion }
export interface AttemptInfo { horseId: string; packageId: string; renewOfId?: string }

export function validatePackage(d: PackageDraft, others: TrainingPackage[]): Record<string, string> {
  const e: Record<string, string> = {};
  const name = d.name.trim();
  if (name.length < 3 || name.length > 60) e.name = 'Tên gói phải từ 3 đến 60 ký tự.';
  else if (others.some(p => p.id !== d.id && p.name.trim().toLowerCase() === name.toLowerCase())) e.name = 'Tên gói đã tồn tại.';
  if (!Number.isInteger(d.price) || d.price <= 0) e.price = 'Giá phải là số nguyên VND lớn hơn 0.';
  if (!['BASIC', 'RACING', 'PERFORMANCE', 'RECOVERY'].includes(d.packageType || '')) e.packageType = 'Chọn loại gói hợp lệ.';
  if (!Number.isInteger(d.durationDays) || d.durationDays < 7 || d.durationDays > 365) e.durationDays = 'Thời hạn từ 7 đến 365 ngày.';
  if (d.description.length > 300) e.description = 'Mô tả tối đa 300 ký tự.';
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
    if (!user || !horse || !pkg) return fail('Không tìm thấy ngựa hoặc gói huấn luyện.');
    if (user.role !== 'owner' || horse.ownerId !== user.id) return fail('Chỉ chủ ngựa mới đăng ký gói cho ngựa của mình.');
    if (!pkg.active) return fail('Gói này đang ngừng áp dụng.');
    const old = renewOfId ? s.enrollments.find(e => e.id === renewOfId && e.horseId === horseId) : undefined;
    if (renewOfId && !old) return fail('Không tìm thấy gói cần gia hạn.');
    const block = purchaseBlockReason(horse, s.enrollments, s.healthRecords, !!old);
    if (block) return fail(`Không thể đăng ký: ${block}.`);
    const id = nextSeq('ENR', s.enrollments.map(e => e.id));
    const inherit = old && old.trainerId && old.trainerStatus === 'confirmed';
    const enr: Enrollment = {
      id, horseId, packageId: pkg.id, packageName: pkg.name,
      sessionsTotal: pkg.sessions, sessionsDone: 0, status: 'active',
      trainerId: inherit ? old!.trainerId : '', trainerName: inherit ? old!.trainerName : '',
      trainerStatus: inherit ? 'confirmed' : 'unassigned',
      assignHistory: inherit ? [{ time: TODAY, kind: 'confirm', from: null, to: old!.trainerName, by: 'Hệ thống', reason: `Giữ nguyên huấn luyện viên khi gia hạn ${old!.id}` }] : [],
      startedAt: TODAY, expiresAt: addDays(TODAY, pkg.durationDays), amount: pkg.price, paidAt: `${TODAY} ${new Date().toTimeString().slice(0, 5)}`,
      paymentMethod: 'Thanh toán mô phỏng', ownerName: user.name, scheduleConfirmed: !!inherit,
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
          ? notif({ type: 'training', message: `Chủ ngựa ${user.name} đã gia hạn gói ${pkg.name} cho "${horse.name}" (${id})`, toUserIds: [old!.trainerId], clubId: horse.clubId || undefined, action: 'training-hub', horseId })
          : notif({ type: 'training', message: `Ngựa "${horse.name}" vừa đăng ký gói ${pkg.name} (${id}) — cần phân công huấn luyện viên`, toRoles: ['manager'], clubId: horse.clubId || undefined, action: 'trainer-assign', horseId }),
        ...st.notifications,
      ],
    }));
    audit(old ? 'Gia hạn gói huấn luyện' : 'Đăng ký gói huấn luyện', `${horse.name} — ${pkg.name} (${id}), ${money(pkg.price)}`);
    toast(old ? `Gia hạn thành công — biên lai ${id}` : `Đăng ký thành công — biên lai ${id}`);
    return { ok: true, data: enr };
  };

  const savePackage = (d: PackageDraft): Res<TrainingPackage> => {
    const s = getState();
    if (s.user?.role !== 'manager') return fail('Chỉ Quản lý CLB mới quản lý danh mục gói.');
    const errs = validatePackage(d, s.packages);
    const first = Object.values(errs)[0];
    if (first) return { ok: false, message: first };
    const base = { name: d.name.trim(), description: d.description.trim(), sessions: d.sessions, durationDays: d.durationDays, price: d.price };
    if (d.id) {
      const cur = s.packages.find(p => p.id === d.id);
      if (!cur) return fail('Không tìm thấy gói.');
      const pkg = { ...cur, ...base };
      setState(st => ({ ...st, packages: st.packages.map(p => p.id === pkg.id ? pkg : p) }));
      audit('Cập nhật gói huấn luyện', `${pkg.name} (${pkg.id})`);
      toast('Đã cập nhật gói huấn luyện');
      return { ok: true, data: pkg };
    }
    const pkg: TrainingPackage = { id: nextSeq('PKG', s.packages.map(p => p.id)), active: true, ...base };
    setState(st => ({ ...st, packages: [...st.packages, pkg] }));
    audit('Tạo gói huấn luyện', `${pkg.name} (${pkg.id})`);
    toast('Đã tạo gói huấn luyện');
    return { ok: true, data: pkg };
  };

  const togglePackage = (id: string, active: boolean): Res<TrainingPackage> => {
    const s = getState();
    if (s.user?.role !== 'manager') return fail('Chỉ Quản lý CLB mới quản lý danh mục gói.');
    const cur = s.packages.find(p => p.id === id);
    if (!cur) return fail('Không tìm thấy gói.');
    const pkg = { ...cur, active };
    setState(st => ({ ...st, packages: st.packages.map(p => p.id === id ? pkg : p) }));
    audit(active ? 'Bật áp dụng gói huấn luyện' : 'Tắt áp dụng gói huấn luyện', `${pkg.name} (${pkg.id})`);
    toast(active ? 'Gói đã được bật — chủ ngựa có thể đăng ký' : 'Gói đã tắt — ẩn khỏi chủ ngựa');
    return { ok: true, data: pkg };
  };

  const assignTrainer = (enrId: string, trainerId: string, reason = ''): Res<Enrollment> => {
    const s = getState();
    const mgr = s.user;
    const en = s.enrollments.find(e => e.id === enrId);
    const trainer = s.users.find(u => u.id === trainerId);
    const horse = en && s.horses.find(h => h.id === en.horseId);
    if (mgr?.role !== 'manager') return fail('Chỉ Quản lý CLB mới phân công huấn luyện viên.');
    if (!en || !horse || !trainer || trainer.role !== 'head_trainer') return fail('Vui lòng chọn huấn luyện viên.');
    if (!isCurrent(en)) return fail('Gói này đã kết thúc, không thể phân công.');
    if (trainer.clubId !== horse.clubId) return fail('Huấn luyện viên không thuộc trung tâm của ngựa.');
    const replacing = en.trainerStatus !== 'unassigned' && !!en.trainerId;
    if (replacing && en.trainerId === trainerId) return fail('Huấn luyện viên này đang phụ trách gói — hãy chọn người khác để thay thế.');
    if (replacing && reason.trim().length < 10) return fail('Thay thế huấn luyện viên cần nêu lý do (ít nhất 10 ký tự).');
    const entry: AssignEntry = { time: TODAY, kind: replacing ? 'replace' : 'assign', from: replacing ? en.trainerName : null, to: trainer.name, by: mgr.name, reason: reason.trim() || 'Phân công lần đầu' };
    const oldTrainerId = replacing ? en.trainerId : '';
    setState(st => ({
      ...st,
      enrollments: st.enrollments.map(e => e.id === enrId ? { ...e, trainerId, trainerName: trainer.name, trainerStatus: 'pending' as const, scheduleConfirmed: false, assignHistory: [entry, ...e.assignHistory] } : e),
      horses: st.horses.map(h => h.id !== horse.id ? h : {
        ...h, headTrainerId: trainerId, headTrainerName: trainer.name,
        trainerHistory: [
          ...(h.trainerHistory || []).map(t => t.to === null ? { ...t, to: TODAY } : t),
          { id: `th${Date.now()}`, trainerId, name: trainer.name, from: TODAY, to: null, note: replacing ? `Thay thế ${en.trainerName}: ${reason.trim()}` : `Phân công theo gói ${en.packageName}` },
        ],
      }),
      trainingSessions: st.trainingSessions.map(x => x.horseId === horse.id && x.status === 'Scheduled' ? { ...x, trainerId, trainerName: trainer.name } : x),
      notifications: [
        notif({ type: 'training', message: `Bạn được phân công huấn luyện "${horse.name}" (gói ${en.packageName}) — vui lòng xác nhận hoặc từ chối`, toUserIds: [trainerId], clubId: horse.clubId || undefined, action: 'training-hub', horseId: horse.id }),
        ...(oldTrainerId ? [notif({ type: 'training', message: `Bạn không còn phụ trách "${horse.name}" — ${reason.trim()}`, toUserIds: [oldTrainerId], clubId: horse.clubId || undefined, action: 'training-hub' })] : []),
        notif({ type: 'training', message: `Ngựa "${horse.name}" được phân công huấn luyện viên ${trainer.name} — chờ xác nhận`, toUserIds: [horse.ownerId], clubId: horse.clubId || undefined, action: 'training-register' }),
        ...st.notifications,
      ],
    }));
    audit(replacing ? 'Thay thế huấn luyện viên' : 'Phân công huấn luyện viên', `${horse.name} (${horse.id}): ${replacing ? en.trainerName + ' → ' : ''}${trainer.name}`, reason.trim() || undefined);
    toast(replacing ? 'Đã thay thế huấn luyện viên — chờ xác nhận' : 'Đã phân công — chờ huấn luyện viên xác nhận');
    return { ok: true, data: { ...en, trainerId, trainerName: trainer.name, trainerStatus: 'pending' } };
  };

  const respondAssign = (enrId: string, accept: boolean, reason = ''): Res<null> => {
    const s = getState();
    const me = s.user;
    const en = s.enrollments.find(e => e.id === enrId);
    const horse = en && s.horses.find(h => h.id === en.horseId);
    if (!me || !en || !horse) return fail('Không tìm thấy phân công.');
    if (en.trainerId !== me.id || en.trainerStatus !== 'pending') return fail('Phân công này không còn chờ bạn xác nhận.');
    if (!accept && reason.trim().length < 10) return fail('Từ chối cần nêu lý do (ít nhất 10 ký tự).');
    const entry: AssignEntry = { time: TODAY, kind: accept ? 'confirm' : 'decline', from: null, to: me.name, by: me.name, reason: accept ? 'Xác nhận nhận huấn luyện' : reason.trim() };
    setState(st => ({
      ...st,
      enrollments: st.enrollments.map(e => e.id !== enrId ? e : accept
        ? { ...e, trainerStatus: 'confirmed' as const, scheduleConfirmed: e.status === 'active' && !horse.lock, assignHistory: [entry, ...e.assignHistory] }
        : { ...e, trainerStatus: 'unassigned' as const, trainerId: '', trainerName: '', scheduleConfirmed: false, assignHistory: [entry, ...e.assignHistory] }),
      horses: accept ? st.horses : st.horses.map(h => h.id !== horse.id ? h : {
        ...h, headTrainerId: '', headTrainerName: '',
        trainerHistory: (h.trainerHistory || []).map(t => t.trainerId === me.id && t.to === null ? { ...t, to: TODAY, note: 'Từ chối nhận huấn luyện' } : t),
      }),
      notifications: [
        notif({ type: 'training', message: accept ? `${me.name} đã xác nhận huấn luyện "${horse.name}"` : `${me.name} từ chối huấn luyện "${horse.name}": ${reason.trim()} — cần phân công lại`, toRoles: ['manager'], clubId: horse.clubId || undefined, action: 'trainer-assign', horseId: horse.id }),
        notif({ type: 'training', message: accept ? `Huấn luyện viên ${me.name} đã xác nhận nhận huấn luyện "${horse.name}"` : `Huấn luyện viên từ chối "${horse.name}" — Quản lý đang phân công người khác`, toUserIds: [horse.ownerId], clubId: horse.clubId || undefined, action: 'training-register' }),
        ...st.notifications,
      ],
    }));
    audit(accept ? 'Huấn luyện viên xác nhận phân công' : 'Huấn luyện viên từ chối phân công', `${horse.name} (${horse.id})`, accept ? undefined : reason.trim());
    toast(accept ? 'Đã xác nhận nhận huấn luyện' : 'Đã từ chối phân công');
    return { ok: true, data: null };
  };

  const createPlan = (d: PlanDraft): Res<TrainingPlan> => {
    const s = getState();
    const me = s.user;
    const horse = s.horses.find(h => h.id === d.horseId);
    if (!me || me.role !== 'head_trainer' || !horse) return fail('Chỉ huấn luyện viên phụ trách mới lập lộ trình.');
    const block = trainerPlanBlockReason(horse, s.enrollments, me.id);
    if (block) return fail(`Không thể lập lộ trình cho "${horse.name}": ${block}.`);
    if (!validDate(d.startDate) || !validDate(d.endDate) || diffDays(d.startDate, d.endDate) < 0) return fail('Ngày bắt đầu và kết thúc lộ trình không hợp lệ.');
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
      notifications: [notif({ type: 'training', message: `Huấn luyện viên ${me.name} lập lộ trình "${d.phase}" cho "${horse.name}" (${d.startDate} → ${d.endDate})`, toUserIds: [horse.ownerId], clubId: horse.clubId || undefined, action: 'horse-detail', horseId: horse.id }), ...st.notifications],
    }));
    audit('Lập lộ trình huấn luyện', `${horse.name} — ${d.phase} (${plan.id})`);
    toast('Đã tạo lộ trình huấn luyện');
    return { ok: true, data: plan };
  };

  const generateSessions = (horseId: string, planId: string, drafts: SessionDraft[]): Res<TrainingSession[]> => {
    const s = getState();
    const me = s.user;
    const horse = s.horses.find(h => h.id === horseId);
    if (!me || me.role !== 'head_trainer' || !horse) return fail('Chỉ huấn luyện viên phụ trách mới lập lịch buổi tập.');
    if (horse.lock) return fail(`Ngựa "${horse.name}" đang bị KHÓA HUẤN LUYỆN (${horse.lock.reason}). Không thể tạo buổi tập mới.`);
    const block = trainerPlanBlockReason(horse, s.enrollments, me.id);
    if (block) return fail(`Không thể lập lịch cho "${horse.name}": ${block}.`);
    if (drafts.length === 0) return fail('Chưa có buổi tập nào để tạo.');
    const chk = checkSessionDrafts({ sessions: s.trainingSessions, enrollments: s.enrollments, horseId, trainerId: me.id }, drafts);
    if (chk.global) return fail(chk.global);
    const bad = chk.rows.findIndex(r => r);
    if (bad >= 0) return fail(`Dòng ${bad + 1}: ${chk.rows[bad]}.`);
    const ids = s.trainingSessions.map(x => x.id);
    const first = Number(nextSeq('SES', ids).slice(4));
    const created: TrainingSession[] = [...drafts].map((d, i) => ({ d, i })).map(({ d, i }) => ({
      id: `SES-${String(first + i).padStart(6, '0')}`, horseId, planId, date: d.date, time: d.time, type: d.type,
      trainerName: me.name, trainerId: me.id, assignedStaffIds: horse.groomId ? [horse.groomId] : [], assignedStaffNames: horse.groomName ? [horse.groomName] : [],
      status: 'Scheduled' as const, distance: d.distance, targetTime: d.targetTime, notes: d.notes.trim(), conflictChecked: true,
    }));
    setState(st => ({ ...st, trainingSessions: [...created, ...st.trainingSessions] }));
    audit('Tạo buổi tập', `${horse.name}: ${created.length} buổi (${created[0].id}${created.length > 1 ? ' – ' + created[created.length - 1].id : ''})`);
    toast(`Đã tạo ${created.length} buổi tập`);
    return { ok: true, data: created };
  };

  const checkIn = (sessionId: string, present: boolean, note = ''): Res<null> => {
    const s = getState();
    const me = s.user;
    const ses = s.trainingSessions.find(x => x.id === sessionId);
    const horse = ses && s.horses.find(h => h.id === ses.horseId);
    if (!me || me.role !== 'head_trainer' || !ses || !horse) return fail('Không tìm thấy buổi tập.');
    if (ses.trainerId !== me.id) return fail('Bạn không phụ trách buổi tập này.');
    if (ses.status !== 'Scheduled') return fail('Chỉ buổi tập đã lên lịch mới điểm danh được.');
    if (ses.date !== TODAY) return fail(`Chỉ điểm danh vào đúng ngày tập (${ses.date}).`);
    if (horse.lock) return fail(`Ngựa "${horse.name}" đang bị KHÓA HUẤN LUYỆN. Không thể điểm danh.`);
    if (!present && note.trim().length < 10) return fail('Vắng mặt cần nêu lý do (ít nhất 10 ký tự).');
    const att = { status: present ? 'present' as const : 'absent' as const, at: `${TODAY} ${new Date().toTimeString().slice(0, 5)}`, note: note.trim() || undefined };
    setState(st => ({ ...st, trainingSessions: st.trainingSessions.map(x => x.id === sessionId ? { ...x, attendance: att, status: present ? x.status : 'Not Performed' as const, notes: present ? x.notes : `${x.notes} · Vắng: ${note.trim()}` } : x) }));
    toast(present ? 'Đã điểm danh: có mặt' : 'Đã ghi nhận vắng mặt — buổi tập không thực hiện');
    return { ok: true, data: null };
  };

  return { purchasePackage, savePackage, togglePackage, assignTrainer, respondAssign, createPlan, generateSessions, checkIn };
}

export type TrainingHandlers = ReturnType<typeof makeTrainingHandlers>;
export { isHeavySession };
