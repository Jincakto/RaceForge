export type Role = 'admin' | 'manager' | 'head_trainer' | 'veterinarian' | 'groom' | 'owner';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  password: string;
  avatar: string;
  role: Role | null;
  clubId: string | null;
  status: 'active' | 'pending';
  phone?: string;
  bio?: string;
  experience?: string; // for head_trainer
  certifications?: string; // for head_trainer / vet
  achievements?: string; // for head_trainer
  verified: boolean;
  locked?: boolean;
  mustChangePassword?: boolean;
}

export interface Club {
  id: string;
  name: string;
  location: string;
  description: string;
  managerId: string;
  managerName: string;
  memberCount: number;
  founded: string;
  logoLetter: string;
}

export interface MemberRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string;
  userRole: Role | null;
  clubId: string;
  requestedAt: string;
  expiresAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  assignedRole: Role | null;
}

export type HealthStatus = 'Eligible' | 'Monitor' | 'Injured' | 'Retired' | 'Pending Vet';
export type TrainingStatus = 'Active' | 'Resting' | 'Inactive' | 'Pending Approval';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface Achievement {
  id: string;
  date: string;
  title: string;
  description: string;
  prize?: string;
  position?: number;
  doc?: string;
}

export interface RaceHistoryEntry {
  id: string;
  date: string;
  raceName: string;
  distance: string;
  position: number;
  totalHorses: number;
  time: string;
  venue: string;
  jockey: string;
  prize: string;
}

export type Lifecycle = 'pending' | 'awaiting_vet' | 'ready' | 'training' | 'locked' | 'rehab';

export const LIFECYCLE_ORDER: Lifecycle[] = ['pending', 'awaiting_vet', 'ready', 'training', 'locked', 'rehab'];
export const LIFECYCLE_LABEL: Record<Lifecycle, string> = {
  pending: 'Chờ duyệt',
  awaiting_vet: 'Chờ khám sức khỏe',
  ready: 'Sẵn sàng huấn luyện',
  training: 'Đang huấn luyện',
  locked: 'Khóa huấn luyện (Tạm dừng)',
  rehab: 'Đang phục hồi',
};

export interface HorseLock {
  reason: string;
  notes: string;
  lockedAt: string;
  lockedById: string;
  lockedByName: string;
}

export type InjurySeverity = 'mild' | 'moderate' | 'severe';

export interface InjuryDetail {
  issue: string;
  severity: InjurySeverity;
}

export interface HorseRehab {
  packageId: string;
  name: string;
  durationWeeks: number;
  activatedAt: string;
  activatedBy: string;
}

export interface TrainingPackage {
  packageType?: string;
  id: string;
  name: string;
  description: string;
  sessions: number;
  durationDays: number;
  price: number;
  active: boolean;
  focus?: string[];
  popular?: boolean;
}

export const TRAINING_PACKAGES: TrainingPackage[] = [
  { id: 'PKG-000001', name: 'Nền tảng', description: 'Xây thể lực và kỹ thuật cơ bản cho ngựa mới vào chương trình.', sessions: 12, durationDays: 42, price: 18000000, active: true, focus: ['Làm quen cổng xuất phát', 'Phát triển sức bền nền', 'Đánh giá thể trạng định kỳ'] },
  { id: 'PKG-000002', name: 'Hiệu suất', description: 'Tăng tốc độ và khả năng hồi phục theo mô hình tập luyện 80/20.', sessions: 24, durationDays: 70, price: 36000000, active: true, popular: true, focus: ['Chạy ngắt quãng và chạy tốc độ thi đấu theo mô hình 80/20', 'Theo dõi nhịp tim sau tập', 'Báo cáo tiến độ hằng tuần'] },
  { id: 'PKG-000003', name: 'Thi đấu', description: 'Chuẩn bị đỉnh cao cho mùa giải với mô phỏng cự ly thi đấu.', sessions: 36, durationDays: 98, price: 58000000, active: true, focus: ['Mô phỏng cự ly thi đấu', 'Chiến thuật chạy theo cự ly', 'Giảm tải trước giải'] },
];

export type Res<T> = { ok: true; data: T } | { ok: false; message: string };

/** Next sequential display id, e.g. nextSeq('SES', ids) -> 'SES-000018'. Ignores legacy ids. */
export function nextSeq(prefix: string, ids: string[]): string {
  const re = new RegExp(`^${prefix}-(\\d{6})$`);
  const max = ids.reduce((m, id) => { const x = re.exec(id); return x ? Math.max(m, Number(x[1])) : m; }, 0);
  return `${prefix}-${String(max + 1).padStart(6, '0')}`;
}

export const fmtVND = (n: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n / 25000);

export interface RehabPackage {
  id: string;
  name: string;
  description: string;
  weeks: number;
  items: string[];
}

export const REHAB_PACKAGES: RehabPackage[] = [
  { id: 'rb-light', name: 'Phục hồi nhẹ', description: 'Cho căng cơ, mệt mỏi quá mức, chỉ số sinh tồn chưa ổn định.', weeks: 2, items: ['Nghỉ ngơi chủ động', 'Đi bộ thư giãn 20 phút/ngày', 'Bổ sung điện giải'] },
  { id: 'rb-hydro', name: 'Thủy trị liệu & Vật lý trị liệu', description: 'Cho viêm khớp, sưng chân, đau cơ xương.', weeks: 4, items: ['Hydrotherapy 2 lần/ngày', 'Chườm lạnh & băng cố định', 'Tái khám mỗi tuần'] },
  { id: 'rb-tendon', name: 'Phục hồi gân – dây chằng', description: 'Cho tổn thương gân, dây chằng cần giai đoạn hồi phục dài.', weeks: 8, items: ['Siêu âm theo dõi 2 tuần/lần', 'Đi bộ có kiểm soát tăng dần', 'Chế độ dinh dưỡng collagen'] },
];

export type TrainerAssignStatus = 'unassigned' | 'pending' | 'confirmed';
export interface AssignEntry { time: string; kind: 'assign' | 'replace' | 'confirm' | 'decline'; from: string | null; to: string; by: string; reason: string }

export interface Enrollment {
  paymentStatus?: string;
  backendStatus?: string;
  id: string;
  horseId: string;
  packageId: string;
  packageName: string;
  sessionsTotal: number;
  sessionsDone: number;
  status: 'active' | 'paused' | 'completed' | 'pending' | 'cancelled';
  trainerId: string;
  trainerName: string;
  trainerStatus: TrainerAssignStatus;
  assignHistory: AssignEntry[];
  startedAt: string;
  expiresAt: string;
  amount: number;
  paidAt: string;
  paymentMethod: string;
  ownerName: string;
  renewedFrom?: string;
  pausedAt?: string;
  pauseReason?: string;
  scheduleConfirmed: boolean;
}

export interface AppNotification {
  id: string;
  type: string;
  message: string;
  time: string;
  read: boolean;
  toRoles?: Role[];
  toUserIds?: string[];
  clubId?: string;
  action?: string;
  horseId?: string;
}

export function isHeavySession(type: string): boolean {
  return !/recovery|hydro|walk|trot|rehab|phục hồi|thủy trị|đi bộ|chạy nhẹ|thư giãn/i.test(type);
}

export function getLifecycle(h: Horse): Lifecycle {
  if (h.lifecycle) return h.lifecycle;
  if (h.approvalStatus !== 'approved' || !h.clubId) return 'pending';
  if (h.lock) return h.rehab ? 'rehab' : 'locked';
  if (h.healthStatus === 'Pending Vet') return 'awaiting_vet';
  return h.trainingStatus === 'Active' ? 'training' : 'awaiting_vet';
}

export interface Horse {
  backendAdmissionStatus?: string;
  id: string;
  name: string;
  breed: string;
  age: number;
  color: string;
  gender: string;
  weight: number;
  height: number;
  stable: string;
  stall: string;
  clubId: string | null;
  ownerId: string;
  ownerName: string;
  headTrainerId: string;
  headTrainerName: string;
  vetId: string;
  vetName: string;
  groomId: string;
  groomName: string;
  healthStatus: HealthStatus;
  trainingStatus: TrainingStatus;
  approvalStatus: ApprovalStatus;
  registrationDate: string;
  approvedAt: string | null;
  totalRaces: number;
  wins: number;
  imageUrl: string;
  vetClearance: boolean;
  biography: string;
  achievements: Achievement[];
  raceHistory: RaceHistoryEntry[];
  lifecycle?: Lifecycle;
  sire?: string;
  dam?: string;
  identityVerified?: boolean;
  identityEvidence?: { url: string; fileUrl?: string; note: string };
  intakeExamId?: string;
  medicalHistory?: string;
  birthDate?: string;
  photos?: string[];
  vetAssign?: { status: 'pending' | 'accepted' | 'declined'; history: { time: string; from: string | null; to: string; by: string; reason: string }[] };
  trainerHistory?: { id: string; trainerId: string; name: string; from: string; to: string | null; note?: string }[];
  editRequests?: { id: string; field: string; oldValue: string; newValue: string; reason: string; status: 'pending' | 'approved' | 'rejected'; at: string; by: string; decisionReason?: string }[];
  changeLog?: { time: string; by: string; text: string }[];
  registrationNumber?: string;
  microchip?: string;
  lock?: HorseLock | null;
  rehab?: HorseRehab | null;
  recoveryBadge?: { date: string; note: string } | null;
}

export interface HorseClubRequest {
  id: string;
  horseId: string;
  horseName: string;
  horseBreed: string;
  horseImageUrl: string;
  ownerId: string;
  ownerName: string;
  clubId: string;
  submittedAt: string;
  expiresAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  reviewNote: string;
}

export interface TrainingPlan {
  id: string;
  horseId: string;
  phase: string;
  startDate: string;
  endDate: string;
  distance: string;
  workload: string;
  surface: string;
  goals: string;
  status: 'Active' | 'Completed' | 'Paused' | 'Locked';
  locked: boolean;
  createdBy: string;
  progress: number;
  // Algorithm output
  weeklyKm?: number;
  sessionsPerWeek?: number;
  restDaysPerWeek?: number;
  intensityScore?: number;
  algorithmRationale?: string;
  weeklySchedule?: { day: string; type: string; distance: string; intensity: string }[];
}

export interface TrainingSession {
  id: string;
  horseId: string;
  planId: string;
  date: string;
  time: string;
  type: string;
  trainerName: string;
  trainerId: string;
  assignedStaffIds: string[];
  assignedStaffNames: string[];
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'In Progress' | 'Not Performed';
  distance: string;
  targetTime: string;
  notes: string;
  conflictChecked: boolean;
  voidedByLock?: boolean;
  postExamDone?: boolean;
  attendance?: { status: 'present' | 'absent'; at: string; note?: string };
  result?: {
    time: string;
    speed: string;
    heartRate: number;
    notes: string;
    performanceScore: number;
  };
}

export interface HealthRecord {
  id: string;
  horseId: string;
  date: string;
  type: string;
  vet: string;
  notes: string;
  result: string;
  medications: string;
  isPostTraining: boolean;
  vetClearanceGranted: boolean;
  vitals?: {
    heartRate: string;
    temperature: string;
    weight: string;
    respRate: string;
    bloodPressure: string;
  };
  clinical?: {
    eyes: string;
    nose: string;
    mouth: string;
    movement: string;
    eating: string;
    waste: string;
    skin: string;
    behavior: string;
  };
  injuryDetails?: Record<string, InjuryDetail>;
  intake?: boolean;
  vetId?: string;
  decision?: 'eligible' | 'conditional' | 'not-eligible';
  conclusion?: string;
  status?: 'draft' | 'confirmed';
  followUpNote?: string;
  reExamDate?: string;
  decisionReason?: string;
  overrideReason?: string;
  regions?: Record<string, { ok: boolean; note: string }>;
  autoEvaluation?: 'pass' | 'watch' | 'fail' | 'incomplete';
  autoNote?: string;
  diagnosis?: string;
  recommendations?: string;
  // Linked IDs snapshotted at exam time for audit history
  ownerId?: string;
  headTrainerId?: string;
  managerId?: string;
  // Auto-derived training eligibility (Section 6)
  trainingEligibility?: 'eligible' | 'conditional' | 'not-eligible';
  trainingReasons?: string[];
  trainingAdjustments?: string[];
  trainingNote?: string;
  nutritionSuggestions?: { category: string; items: string[]; note: string }[];
  // Unix ms timestamp set at INSERT time — used as secondary sort key (same exam date → newer record first)
  createdAt?: number;
}

// ── Training Plan Algorithm ────────────────────────────────────────────────────
// Frontend heuristic for trainer review; this is not a validated veterinary prescription.
// Factors: health status, age, weight, resting heart rate, race history

export interface TrainingSuggestion {
  phase: string;
  intensityScore: number;
  weeklyKm: number;
  sessionsPerWeek: number;
  restDaysPerWeek: number;
  highIntensityPercent: number;
  lowIntensityPercent: number;
  weeklySchedule: { day: string; type: string; distance: string; intensity: string; zone: string }[];
  rationale: string[];
  warnings: string[];
  twelveWeekPlan: { week: number; focus: string; volumeKm: number; intensityNote: string }[];
}

export function computeTrainingSuggestion(horse: Horse, health?: HealthRecord): TrainingSuggestion {
  // ── Multi-factor scoring (max 100) ──────────────────────────────────────────
  let score = 40;
  const rationale: string[] = [];
  const warnings: string[] = [];

  // 1. Health status (0-40 pts)
  const healthPts: Record<HealthStatus, number> = {
    Eligible: 40, Monitor: 15, Injured: -20, 'Pending Vet': 5, Retired: -40,
  };
  score += healthPts[horse.healthStatus] ?? 0;
  if (horse.healthStatus === 'Monitor') warnings.push('Ngựa đang trong diện theo dõi — giới hạn cường độ tối đa 60%');
  if (horse.healthStatus === 'Injured') warnings.push('Ngựa đang chấn thương — chỉ áp dụng liệu trình phục hồi thụ động');
  if (horse.healthStatus === 'Eligible') rationale.push('Sức khỏe ổn định, đủ điều kiện tập luyện đầy đủ');

  // 2. Age factor (0-20 pts) — peak performance: 4–7 years
  if (horse.age >= 4 && horse.age <= 7) {
    score += 20; rationale.push(`Tuổi ${horse.age} — giai đoạn đỉnh cao phong độ (4–7 tuổi)`);
  } else if (horse.age === 3) {
    score += 10; warnings.push('Ngựa 3 tuổi — xương còn phát triển, giới hạn sprint cường độ cao');
  } else if (horse.age <= 10) {
    score += 12; rationale.push(`Tuổi ${horse.age} — còn thi đấu được, tăng thời gian hồi phục`);
  } else {
    score += 2; warnings.push(`Ngựa ${horse.age} tuổi — chương trình bảo trì và nghỉ ngơi ưu tiên`);
  }

  // 3. Weight factor (0-15 pts) — optimal TB: 450–550 kg
  if (horse.weight >= 450 && horse.weight <= 550) {
    score += 15; rationale.push(`Cân nặng ${horse.weight} kg — trong khoảng lý tưởng (450–550 kg)`);
  } else if (horse.weight < 430) {
    score += 0; warnings.push(`Cân nặng ${horse.weight} kg thấp — bổ sung dinh dưỡng trước khi tập nặng`);
  } else if (horse.weight > 570) {
    score += 5; warnings.push(`Cân nặng ${horse.weight} kg cao — cần giảm tải, theo dõi khớp`);
  } else {
    score += 10;
  }

  // 4. Vitals from latest health record (0-15 pts)
  if (health?.vitals) {
    const hr = Number(health.vitals.heartRate);
    const temp = Number(health.vitals.temperature);
    if (hr >= 28 && hr <= 36) {
      score += 15; rationale.push(`Nhịp tim nghỉ ${hr} bpm — tim mạch xuất sắc (nền tảng tốt cho tập hiệu suất cao)`);
    } else if (hr >= 28 && hr <= 48) {
      score += 8; rationale.push(`Nhịp tim nghỉ ${hr} bpm — bình thường`);
    } else {
      score -= 5; warnings.push(`Nhịp tim nghỉ ${hr} bpm cao — cần đánh giá lại tim mạch trước khi tăng tải`);
    }
    if (temp > 38.3 || temp < 37.2) { score -= 10; warnings.push(`Nhiệt độ ${temp}°C ngoài khoảng tham chiếu lúc nghỉ — cần bác sĩ đánh giá trước khi tập.`); }
  } else {
    warnings.push('Chưa có dữ liệu sinh hiệu gần nhất — đề xuất khám trước khi bắt đầu chương trình');
  }

  // 5. Race performance bonus (0-10 pts)
  if (horse.totalRaces >= 5) {
    const winRate = horse.wins / horse.totalRaces;
    if (winRate >= 0.6) { score += 10; rationale.push(`Tỷ lệ thắng ${Math.round(winRate * 100)}% — đẳng cấp competition`); }
    else if (winRate >= 0.4) { score += 5; }
  }

  const finalScore = Math.max(0, Math.min(100, score));

  // ── Map score → training phase ───────────────────────────────────────────
  if (finalScore >= 82) {
    return buildPlan('Chuẩn bị thi đấu', finalScore, {
      weeklyKm: 42, sessions: 5, rest: 2, hi: 30, lo: 70,
      schedule: [
        { day: 'Thứ 2', type: 'Chạy nước rút ngắt quãng', distance: '4 × 200m', intensity: 'Rất cao', zone: 'Z4–Z5' },
        { day: 'Thứ 3', type: 'Chạy nhẹ phục hồi', distance: '3000m', intensity: 'Thấp', zone: 'Z1' },
        { day: 'Thứ 4', type: 'Chạy tốc độ thi đấu', distance: '1200m', intensity: 'Cao', zone: 'Z4' },
        { day: 'Thứ 5', type: 'Nghỉ / Đi bộ nhẹ', distance: '600m', intensity: 'Nghỉ', zone: 'Z0' },
        { day: 'Thứ 6', type: 'Chạy tempo', distance: '1600m', intensity: 'TB-Cao', zone: 'Z3' },
        { day: 'Thứ 7', type: 'Chạy sức bền nền', distance: '2400m', intensity: 'Trung bình', zone: 'Z2' },
        { day: 'CN', type: 'Nghỉ hoàn toàn', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
      ],
      rationale, warnings,
      twelveWeek: buildTwelveWeek(38, 'Chuẩn bị thi đấu'),
    });
  }
  if (finalScore >= 65) {
    return buildPlan('Xây nền tảng', finalScore, {
      weeklyKm: 30, sessions: 4, rest: 3, hi: 20, lo: 80,
      schedule: [
        { day: 'Thứ 2', type: 'Chạy nhẹ hiếu khí', distance: '2000m', intensity: 'Thấp-TB', zone: 'Z2' },
        { day: 'Thứ 3', type: 'Nghỉ / Đi bộ', distance: '500m', intensity: 'Nghỉ', zone: 'Z0' },
        { day: 'Thứ 4', type: 'Chạy biến tốc', distance: '1600m', intensity: 'TB-Cao', zone: 'Z3' },
        { day: 'Thứ 5', type: 'Nghỉ hoàn toàn', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
        { day: 'Thứ 6', type: 'Phi nước kiệu nhẹ', distance: '1200m', intensity: 'Trung bình', zone: 'Z2' },
        { day: 'Thứ 7', type: 'Chạy dài nhẹ nhàng', distance: '2800m', intensity: 'Thấp', zone: 'Z1–Z2' },
        { day: 'CN', type: 'Nghỉ hoàn toàn', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
      ],
      rationale, warnings,
      twelveWeek: buildTwelveWeek(24, 'Xây nền tảng'),
    });
  }
  if (finalScore >= 42) {
    return buildPlan('Làm quen', finalScore, {
      weeklyKm: 18, sessions: 3, rest: 4, hi: 10, lo: 90,
      schedule: [
        { day: 'Thứ 2', type: 'Đi bộ + chạy nhẹ', distance: '1500m', intensity: 'Rất thấp', zone: 'Z1' },
        { day: 'Thứ 3', type: 'Nghỉ', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
        { day: 'Thứ 4', type: 'Chạy nhẹ', distance: '1200m', intensity: 'Thấp', zone: 'Z1' },
        { day: 'Thứ 5', type: 'Nghỉ', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
        { day: 'Thứ 6', type: 'Phi nhẹ', distance: '1000m', intensity: 'Thấp', zone: 'Z2' },
        { day: 'Thứ 7', type: 'Nghỉ', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
        { day: 'CN', type: 'Nghỉ', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
      ],
      rationale, warnings,
      twelveWeek: buildTwelveWeek(14, 'Làm quen'),
    });
  }
  return buildPlan('Phục hồi', finalScore, {
    weeklyKm: 6, sessions: 2, rest: 5, hi: 0, lo: 100,
    schedule: [
      { day: 'Thứ 2', type: 'Đi bộ nhẹ', distance: '400m', intensity: 'Rất nhẹ', zone: 'Z0' },
      { day: 'Thứ 3', type: 'Nghỉ', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
      { day: 'Thứ 4', type: 'Nghỉ', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
      { day: 'Thứ 5', type: 'Đi bộ nhẹ', distance: '400m', intensity: 'Rất nhẹ', zone: 'Z0' },
      { day: 'Thứ 6', type: 'Nghỉ', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
      { day: 'Thứ 7', type: 'Nghỉ', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
      { day: 'CN', type: 'Nghỉ', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
    ],
    rationale, warnings,
    twelveWeek: buildTwelveWeek(5, 'Phục hồi'),
  });
}

function buildTwelveWeek(baseKm: number, phase: string) {
  const phases: Record<string, string[]> = {
    'Chuẩn bị thi đấu': ['Nền tảng', 'Nền tảng', 'Xây dựng', 'Xây dựng', 'Xây dựng', 'Tăng cường độ', 'Tăng cường độ', 'Tăng cường độ', 'Đỉnh cao', 'Đỉnh cao', 'Taper', 'Thi đấu'],
    'Xây nền tảng': ['Khởi động', 'Xây dựng', 'Xây dựng', 'Duy trì', 'Tăng cường', 'Tăng cường', 'Nghỉ giữa kỳ', 'Tăng dần', 'Tăng dần', 'Đỉnh Base', 'Ổn định', 'Chuyển tiếp'],
    'Làm quen': ['Thích nghi', 'Thích nghi', 'Xây dựng nhẹ', 'Xây dựng nhẹ', 'Duy trì', 'Duy trì', 'Phát triển', 'Phát triển', 'Ổn định', 'Ổn định', 'Đánh giá', 'Chuyển tiếp'],
    'Phục hồi': ['Nghỉ tích cực', 'Nghỉ tích cực', 'Phục hồi nhẹ', 'Phục hồi nhẹ', 'Đánh giá', 'Tái khởi động', 'Tái khởi động', 'Làm quen nhẹ', 'Làm quen nhẹ', 'Ổn định', 'Ổn định', 'Chuyển tiếp'],
  };
  const multipliers = [0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.85, 1.0, 1.05, 1.1, 0.8, 0.7];
  const focusArr = phases[phase] || phases['Làm quen'];
  return Array.from({ length: 12 }, (_, i) => ({
    week: i + 1,
    focus: focusArr[i],
    volumeKm: Math.round(baseKm * multipliers[i]),
    intensityNote: i % 3 === 2 ? 'Tuần giảm tải 15%' : i >= 9 && phase === 'Chuẩn bị thi đấu' ? 'Taper + mô phỏng đua' : 'Tăng dần 10%/tuần',
  }));
}

function buildPlan(phase: string, score: number, opts: {
  weeklyKm: number; sessions: number; rest: number; hi: number; lo: number;
  schedule: { day: string; type: string; distance: string; intensity: string; zone: string }[];
  rationale: string[]; warnings: string[];
  twelveWeek: { week: number; focus: string; volumeKm: number; intensityNote: string }[];
}): TrainingSuggestion {
  return {
    phase, intensityScore: score,
    weeklyKm: opts.weeklyKm, sessionsPerWeek: opts.sessions, restDaysPerWeek: opts.rest,
    highIntensityPercent: opts.hi, lowIntensityPercent: opts.lo,
    weeklySchedule: opts.schedule, rationale: opts.rationale, warnings: opts.warnings,
    twelveWeekPlan: opts.twelveWeek,
  };
}

// ── Seed Data ─────────────────────────────────────────────────────────────────

export const SEED_USERS: AppUser[] = [
  {
    id: 'u0', name: 'Quản trị hệ thống', email: 'admin@raceforce.vn', password: '123456',
    role: 'admin', clubId: null, status: 'active', avatar: 'QT', verified: true, phone: '0900 000 001',
    bio: 'Quản trị tài khoản, phân quyền và nhật ký hệ thống RaceForce.',
  },
  // Manager
  {
    id: 'u1', name: 'Nguyen Van Binh', email: 'manager@raceforce.vn', password: '123456',
    role: 'manager', clubId: 'c1', status: 'active', avatar: 'NB', verified: true,
    phone: '0901 234 567',
    bio: 'Quản lý trung tâm huấn luyện với 10 năm kinh nghiệm trong ngành đua ngựa chuyên nghiệp.',
  },
  // Huấn luyện viên
  {
    id: 'u2', name: 'Nguyen Minh Tuan', email: 'trainer@raceforce.vn', password: '123456',
    role: 'head_trainer', clubId: 'c1', status: 'active', avatar: 'NT', verified: true,
    phone: '0912 345 678',
    bio: 'Huấn luyện viên trưởng với 12 năm kinh nghiệm huấn luyện ngựa đua Thoroughbred và Arabian.',
    experience: '12 năm huấn luyện ngựa đua · Trước đây làm tại Happy Valley (HK)',
    certifications: 'FEI Level 3 Trainer · BHS Stage 4 · Certified Equine Fitness Trainer',
    achievements: 'Đã đào tạo 3 nhà vô địch quốc gia · Tỷ lệ thắng trung bình của ngựa được huấn luyện: 62%',
  },
  // Huấn luyện viên 2 (chưa vào trung tâm — chờ manager duyệt)
  {
    id: 'u3', name: 'Tran Duc Khai', email: 'trainer2@raceforce.vn', password: '123456',
    role: 'head_trainer', clubId: null, status: 'active', avatar: 'TK', verified: true,
    phone: '0933 456 789',
    bio: 'Cựu jockey chuyển sang huấn luyện. Chuyên về conditioning và sprint training.',
    experience: '8 năm jockey + 5 năm huấn luyện · Top 3 jockey quốc gia 2018-2020',
    certifications: 'FEI Level 2 Trainer · Former Professional Jockey License',
    achievements: '15 giải vô địch với tư cách jockey · Huấn luyện 2 ngựa vô địch khu vực',
  },
  // Veterinarian
  {
    id: 'u4', name: 'Dr. Le Thi An', email: 'vet@raceforce.vn', password: '123456',
    role: 'veterinarian', clubId: 'c1', status: 'active', avatar: 'LA', verified: true,
    phone: '0945 678 901',
    bio: 'Bác sĩ thú y chuyên về ngựa đua với hơn 8 năm kinh nghiệm.',
    certifications: 'DVM · Chuyên khoa ngựa đua · Chứng chỉ siêu âm cơ xương khớp',
  },
  // Groom
  {
    id: 'u5', name: 'Le Van Nam', email: 'groom@raceforce.vn', password: '123456',
    role: 'groom', clubId: 'c1', status: 'active', avatar: 'LN', verified: true,
    phone: '0956 789 012',
    bio: 'Groom chuyên nghiệp với 7 năm kinh nghiệm chăm sóc ngựa đua.',
  },
  // Owner 1 (đã có 2 ngựa — 1 ok, 1 có vấn đề)
  {
    id: 'u6', name: 'Nguyen Van An', email: 'owner@raceforce.vn', password: '123456',
    role: 'owner', clubId: 'c1', status: 'active', avatar: 'NA', verified: true,
    phone: '0967 890 123',
    bio: 'Racehorse owner with a passion for equestrian sport. Owns two racehorses at RaceForce Training Club.',
  },
  // Owner 2 (mới, chưa có ngựa)
  {
    id: 'u7', name: 'Pham Thi Lan', email: 'owner2@raceforce.vn', password: '123456',
    role: 'owner', clubId: 'c1', status: 'active', avatar: 'PL', verified: true,
    phone: '0978 901 234',
    bio: 'Chủ ngựa mới gia nhập. Đang tìm kiếm ngựa giống phù hợp.',
  },
];

export const SEED_CLUBS: Club[] = [
  {
    id: 'c1', name: 'RaceForce Training Club', location: 'Ho Chi Minh City',
    description: 'Trung tâm huấn luyện ngựa đua hàng đầu tại Việt Nam, thành lập năm 2015 với đội ngũ chuyên nghiệp.',
    managerId: 'u1', managerName: 'Nguyen Van Binh', memberCount: 6, founded: '2015', logoLetter: 'S',
  },
  {
    id: 'c2', name: 'Hanoi Equestrian Center', location: 'Hà Nội',
    description: 'Trung tâm huấn luyện ngựa đua truyền thống tại Hà Nội, chuyên về các giải đua quốc gia và quốc tế.',
    managerId: 'u99', managerName: 'Tran Duc Manh', memberCount: 12, founded: '2010', logoLetter: 'H',
  },
  {
    id: 'c3', name: 'Da Nang Racing Center', location: 'Đà Nẵng',
    description: 'Trung tâm huấn luyện ngựa đua miền Trung với sân đua tiêu chuẩn quốc tế.',
    managerId: 'u98', managerName: 'Le Hoang Nam', memberCount: 8, founded: '2018', logoLetter: 'D',
  },
];

export const SEED_REQUESTS: MemberRequest[] = [
  {
    id: 'req001', userId: 'u3', userName: 'Tran Duc Khai', userEmail: 'trainer2@raceforce.vn',
    userAvatar: 'TK', userRole: 'head_trainer', clubId: 'c1',
    requestedAt: '20/09/2026', expiresAt: '27/09/2026', status: 'pending', assignedRole: 'head_trainer',
  },
];

export const SEED_HORSE_CLUB_REQUESTS: HorseClubRequest[] = [3, 4, 5, 6].map(n => ({
  id: `hcr-seed-${n}`, horseId: `HRS-00000${n}`, horseName: ['Silver Arrow', 'Midnight Dancer', 'Golden Dawn', 'Red Comet'][n - 3], horseBreed: ['Thoroughbred', 'Arabian', 'Quarter Horse', 'Thoroughbred'][n - 3],
  horseImageUrl: '', ownerId: 'u7', ownerName: 'Pham Thi Lan', clubId: 'c1', submittedAt: `2${n - 3}/09/2026`, expiresAt: '', status: 'pending' as const, reviewNote: '',
}));

// ── Demo Horses ───────────────────────────────────────────────────────────────
// Horse 1: Thunder King — ALL GREEN (sức khỏe hoàn hảo, thành tích xuất sắc)
// Horse 2: Storm Wreck  — ALL RED  (chấn thương, sức khỏe kém, nhiều vấn đề)

export const HORSES: Horse[] = [
  {
    trainerHistory: [
      { id: 'th1', trainerId: 'u3', name: 'Tran Duc Khai', from: '20/03/2021', to: '31/12/2025', note: 'Huấn luyện nền tảng và cự ly ngắn' },
      { id: 'th2', trainerId: 'u2', name: 'Nguyen Minh Tuan', from: '01/01/2026', to: null, note: 'Chuẩn bị mùa giải 2026' },
    ],
    id: 'HRS-000001', name: 'Thunder King', breed: 'Thoroughbred', age: 5, color: 'Bay',
    gender: 'Đực', birthDate: '12/04/2021', microchip: '704100000123456', identityVerified: true, identityEvidence: { url: '', note: 'Đã đối chiếu thẻ microchip với giấy chứng nhận của chủ ngựa.' }, weight: 512, height: 163, stable: 'Stable A', stall: 'A-12',
    clubId: 'c1', ownerId: 'u6', ownerName: 'Nguyen Van An',
    headTrainerId: 'u2', headTrainerName: 'Nguyen Minh Tuan',
    vetId: 'u4', vetName: 'Dr. Le Thi An', groomId: 'u5', groomName: 'Le Van Nam',
    healthStatus: 'Eligible', trainingStatus: 'Active', lifecycle: 'training',
    sire: 'Redoute’s Choice', dam: 'Silver Mist', medicalHistory: 'Không có tiền sử bệnh nghiêm trọng. Tiêm phòng đầy đủ.',
    approvalStatus: 'approved', registrationDate: '15/03/2021', approvedAt: '20/03/2021',
    totalRaces: 12, wins: 7, vetClearance: true,
    biography: 'Thoroughbred giống thuần chủng nhập từ Úc năm 2021. Tiếng là nước rút xuất sắc ở chặng cuối, nhịp tim hồi phục nhanh sau cường độ cao. Tốc độ đỉnh 59.9 km/h.',
    imageUrl: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=700&h=500&fit=crop&auto=format',
    achievements: [
      { id: 'a1', date: '10/09/2026', title: 'RaceForce Sprint Cup', description: 'Winner over 1200m, leading from the final turn', prize: '$2,000', position: 1 },
      { id: 'a2', date: '20/07/2026', title: 'Summer Classic 1600m', description: 'Vô địch cự ly 1600m với khoảng cách 2 thân so với ngựa thứ 2', prize: '80,000,000 VND', position: 1 },
      { id: 'a3', date: '15/08/2026', title: 'Golden Gate Stakes', description: 'Hạng nhì cự ly 1400m, sát nút với ngựa vô địch', prize: '20,000,000 VND', position: 2 },
    ],
    raceHistory: [
      { id: 'rh1', date: '10/09/2026', raceName: 'RaceForce Sprint Cup', distance: '1200m', position: 1, totalHorses: 10, time: '1:11.24', venue: 'Phu Tho Racecourse', jockey: 'Nguyen Duc', prize: '$2,000' },
      { id: 'rh2', date: '15/08/2026', raceName: 'Golden Gate Stakes', distance: '1400m', position: 2, totalHorses: 12, time: '1:25.10', venue: 'Phú Thọ Racecourse', jockey: 'Nguyen Duc', prize: '20,000,000 VND' },
      { id: 'rh3', date: '20/07/2026', raceName: 'Summer Classic', distance: '1600m', position: 1, totalHorses: 9, time: '1:38.55', venue: 'Phú Thọ Racecourse', jockey: 'Nguyen Duc', prize: '80,000,000 VND' },
      { id: 'rh4', date: '05/06/2026', raceName: 'Monsoon Mile', distance: '1600m', position: 3, totalHorses: 11, time: '1:39.80', venue: 'Phú Thọ Racecourse', jockey: 'Nguyen Duc', prize: '10,000,000 VND' },
    ],
  },
  {
    trainerHistory: [{ id: 'th3', trainerId: 'u2', name: 'Nguyen Minh Tuan', from: '15/02/2023', to: null }],
    id: 'HRS-000002', name: 'Storm Wreck', breed: 'Quarter Horse', age: 9, color: 'Dark Bay',
    gender: 'Đực', birthDate: '03/05/2017', weight: 598, height: 158, stable: 'Stable C', stall: 'C-08',
    clubId: 'c1', ownerId: 'u6', ownerName: 'Nguyen Van An',
    headTrainerId: 'u2', headTrainerName: 'Nguyen Minh Tuan',
    vetId: 'u4', vetName: 'Dr. Le Thi An', groomId: 'u5', groomName: 'Le Van Nam',
    healthStatus: 'Injured', trainingStatus: 'Inactive', lifecycle: 'awaiting_vet',
    sire: 'Dash for Cash', dam: 'Dark Lady', medicalHistory: 'Chấn thương dây chằng chân phải trước (09/2026).',
    approvalStatus: 'approved', registrationDate: '10/02/2023', approvedAt: '15/02/2023',
    totalRaces: 6, wins: 1, vetClearance: false,
    biography: 'Cựu ngựa đua từ Hà Nội. Hiện đang phục hồi sau chấn thương dây chằng chân phải trước nghiêm trọng. Nhịp tim nghỉ bất thường, cân nặng vượt mức, tiên lượng cần 4-6 tuần phục hồi.',
    imageUrl: 'https://images.unsplash.com/photo-1566288623394-377af472d81b?w=700&h=500&fit=crop&auto=format',
    achievements: [],
    raceHistory: [
      { id: 'rh5', date: '12/05/2026', raceName: 'Northern Sprint Open', distance: '1000m', position: 4, totalHorses: 10, time: '1:02.80', venue: 'Gia Lâm Racecourse', jockey: 'Tran Van Hung', prize: '0 VND' },
      { id: 'rh6', date: '01/04/2026', raceName: 'Spring Classic', distance: '1200m', position: 1, totalHorses: 8, time: '1:16.40', venue: 'Gia Lâm Racecourse', jockey: 'Tran Van Hung', prize: '25,000,000 VND' },
    ],
  },
  {
    id: 'HRS-000003', name: 'Silver Arrow', breed: 'Thoroughbred', age: 4, color: 'Grey',
    gender: 'Cái', birthDate: '08/03/2022', microchip: '', weight: 486, height: 160, stable: '', stall: '',
    clubId: null, ownerId: 'u7', ownerName: 'Pham Thi Lan',
    headTrainerId: '', headTrainerName: '', vetId: '', vetName: '', groomId: '', groomName: '', 
    healthStatus: 'Pending Vet', trainingStatus: 'Pending Approval', approvalStatus: 'pending', lifecycle: 'pending',
    registrationDate: '20/09/2026', approvedAt: null, totalRaces: 0, wins: 0, vetClearance: false,
    sire: 'Redoute’s Choice', dam: 'Silver Mist', medicalHistory: 'Chưa có tiền sử bệnh.',
    biography: 'Ngựa tơ do chủ ngựa đăng ký vào trung tâm.', imageUrl: 'https://images.unsplash.com/photo-1534307671554-9a6d81f4d629?w=700&h=500&fit=crop&auto=format',
    identityVerified: false, identityEvidence: { url: '', note: '' },
    achievements: [], raceHistory: [],
  },
  {
    id: 'HRS-000004', name: 'Midnight Dancer', breed: 'Arabian', age: 5, color: 'Black',
    gender: 'Cái', birthDate: '14/06/2021', microchip: '704100000654321', weight: 455, height: 154, stable: '', stall: '',
    clubId: null, ownerId: 'u7', ownerName: 'Pham Thi Lan',
    headTrainerId: '', headTrainerName: '', groomId: '', groomName: '', vetId: 'u4', vetName: 'Dr. Le Thi An', vetAssign: { status: 'pending', history: [{ time: '24/09/2026', from: null, to: 'Dr. Le Thi An', by: 'Nguyen Van Binh', reason: 'Phân công khám tiếp nhận' }] },
    healthStatus: 'Pending Vet', trainingStatus: 'Pending Approval', approvalStatus: 'pending', lifecycle: 'pending',
    registrationDate: '24/09/2026', approvedAt: null, totalRaces: 0, wins: 0, vetClearance: false,
    sire: 'Muscat', dam: 'Night Pearl', medicalHistory: 'Từng viêm phế quản nhẹ năm 2024, đã khỏi.',
    biography: 'Ngựa tơ do chủ ngựa đăng ký vào trung tâm.', imageUrl: 'https://images.unsplash.com/photo-1598974357801-cbca100e65d3?w=700&h=500&fit=crop&auto=format',
    identityVerified: true, identityEvidence: { url: '', note: 'Đối chiếu thẻ microchip tại chuồng.' },
    achievements: [], raceHistory: [],
  },
  {
    id: 'HRS-000005', name: 'Golden Dawn', breed: 'Quarter Horse', age: 6, color: 'Palomino',
    gender: 'Đực', birthDate: '02/02/2020', microchip: '704100000777888', weight: 540, height: 158, stable: '', stall: '',
    clubId: null, ownerId: 'u7', ownerName: 'Pham Thi Lan',
    headTrainerId: '', headTrainerName: '', groomId: '', groomName: '', vetId: 'u4', vetName: 'Dr. Le Thi An', vetAssign: { status: 'accepted', history: [{ time: '23/09/2026', from: null, to: 'Dr. Le Thi An', by: 'Nguyen Van Binh', reason: 'Phân công khám tiếp nhận' }, { time: '23/09/2026', from: 'Dr. Le Thi An', to: 'Dr. Le Thi An', by: 'Dr. Le Thi An', reason: 'Nhận: Lịch khám còn trống' }] },
    healthStatus: 'Pending Vet', trainingStatus: 'Pending Approval', approvalStatus: 'pending', lifecycle: 'pending',
    registrationDate: '25/09/2026', approvedAt: null, totalRaces: 0, wins: 0, vetClearance: false,
    sire: 'Dash for Cash', dam: 'Honey Bee', medicalHistory: 'Không có.',
    biography: 'Ngựa tơ do chủ ngựa đăng ký vào trung tâm.', imageUrl: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=700&h=500&fit=crop&auto=format',
    identityVerified: true, identityEvidence: { url: '', note: 'Đối chiếu thẻ microchip tại chuồng.' },
    achievements: [], raceHistory: [],
  },
  {
    id: 'HRS-000006', name: 'Red Comet', breed: 'Thoroughbred', age: 5, color: 'Chestnut',
    gender: 'Đực', birthDate: '19/09/2021', microchip: '704100000999111', weight: 505, height: 162, stable: '', stall: '',
    clubId: null, ownerId: 'u7', ownerName: 'Pham Thi Lan',
    headTrainerId: '', headTrainerName: '', groomId: '', groomName: '', vetId: 'u4', vetName: 'Dr. Le Thi An', vetAssign: { status: 'accepted', history: [{ time: '23/09/2026', from: null, to: 'Dr. Le Thi An', by: 'Nguyen Van Binh', reason: 'Phân công khám tiếp nhận' }, { time: '23/09/2026', from: 'Dr. Le Thi An', to: 'Dr. Le Thi An', by: 'Dr. Le Thi An', reason: 'Nhận: Lịch khám còn trống' }] },
    healthStatus: 'Pending Vet', trainingStatus: 'Pending Approval', approvalStatus: 'pending', lifecycle: 'pending',
    registrationDate: '26/09/2026', approvedAt: null, totalRaces: 0, wins: 0, vetClearance: false,
    intakeExamId: 'MED-000004', sire: 'Fastnet Rock', dam: 'Red Ember', medicalHistory: 'Không có tiền sử bệnh nghiêm trọng.',
    biography: 'Ngựa tơ do chủ ngựa đăng ký vào trung tâm.', imageUrl: 'https://images.unsplash.com/photo-1566288623394-377af472d81b?w=700&h=500&fit=crop&auto=format',
    identityVerified: true, identityEvidence: { url: '', note: 'Đối chiếu thẻ microchip tại chuồng.' },
    achievements: [], raceHistory: [],
  },
];

export const MEDICAL_RECORDS: HealthRecord[] = [
  {
    id: 'MED-000001', horseId: 'HRS-000001', date: '22/09/2026', type: 'Kiểm tra định kỳ', vet: 'Dr. Le Thi An',
    notes: 'Tất cả chỉ số xuất sắc. Ngựa trong phong độ đỉnh cao, sẵn sàng thi đấu.',
    result: 'Eligible', medications: 'Vitamin E 500IU/ngày', isPostTraining: false, vetClearanceGranted: true,
    decision: 'eligible', status: 'confirmed', trainingEligibility: 'eligible',
    vitals: { heartRate: '32', temperature: '37.7', weight: '512', respRate: '11', bloodPressure: '108/68' },
    diagnosis: 'Sức khỏe tổng thể xuất sắc. Tim mạch và cơ xương khớp không có bất thường.',
    recommendations: 'Tiếp tục chế độ tập luyện Chuẩn bị thi đấu. Bổ sung vitamin E và điện giải hàng ngày.',
  },
  {
    id: 'MED-000002', horseId: 'HRS-000001', date: '20/08/2026', type: 'Tiêm phòng', vet: 'Dr. Le Thi An',
    notes: 'Tiêm vaccine cúm ngựa (EIV) và uốn ván định kỳ. Phản ứng bình thường.',
    result: 'Completed', medications: 'EIV Vaccine + Tetanus Toxoid', isPostTraining: false, vetClearanceGranted: false,
    vitals: { heartRate: '38', temperature: '38.0', weight: '510', respRate: '13', bloodPressure: '112/72' },
    diagnosis: 'Hoàn thành tiêm chủng định kỳ đúng lịch.',
    recommendations: 'Nghỉ nhẹ 24 giờ sau tiêm. Theo dõi phản ứng.', status: 'confirmed',
  },
  {
    id: 'MED-000003', horseId: 'HRS-000002', date: '21/09/2026', type: 'Khám chấn thương', vet: 'Dr. Le Thi An',
    notes: 'Phát hiện tổn thương dây chằng bên ngoài chân phải trước. Sưng rõ, phản ứng đau dương tính.',
    result: 'Injured', medications: 'NSAID (Phenylbutazone 4.4mg/kg) · Bao đá lạnh 20 phút × 3/ngày · Băng cố định',
    isPostTraining: false, vetClearanceGranted: false,
    vitals: { heartRate: '52', temperature: '38.9', weight: '598', respRate: '18', bloodPressure: '128/85' },
    diagnosis: 'Chấn thương dây chằng chân phải trước độ II. Siêu âm xác nhận tổn thương sợi collagen.',
    recommendations: 'Cấm vận động hoàn toàn 4 tuần. Hydrotherapy ngày 2 lần. Tái khám sau 2 tuần. Cân nặng cần giảm 20-30kg.',
    decision: 'not-eligible', status: 'confirmed', trainingEligibility: 'not-eligible', decisionReason: 'Chấn thương dây chằng độ II, cần ngừng tập và phục hồi trước khi tái khám.',
  },
];

export const INTAKE_RECORDS: HealthRecord[] = [
  {
    id: 'MED-000004', horseId: 'HRS-000006', date: '24/09/2026', type: 'Khám tiếp nhận', vet: 'Dr. Le Thi An', vetId: 'u4', intake: true,
    notes: 'Các vùng khám đều bình thường.', result: 'Eligible', medications: '', isPostTraining: false, vetClearanceGranted: true,
    vitals: { heartRate: '34', temperature: '37.9', weight: '505', respRate: '12', bloodPressure: '' },
    decision: 'eligible', status: 'confirmed', conclusion: 'Ngựa Red Comet khỏe mạnh, các chỉ số sinh tồn trong ngưỡng bình thường, đủ điều kiện huấn luyện.',
    diagnosis: 'Không phát hiện bất thường.', recommendations: 'Theo dõi cân nặng hằng tuần.', autoEvaluation: 'pass',
  },
];

export const TRAINING_PLANS: TrainingPlan[] = [
  {
    id: 'PLN-000001', horseId: 'HRS-000001', phase: 'Chuẩn bị thi đấu',
    startDate: '01/09/2026', endDate: '31/10/2026',
    distance: '1200m', workload: 'High', surface: 'Cỏ',
    goals: 'Improve sprint speed and prepare for the Autumn Grand Prix on Oct 15',
    status: 'Active', locked: false, createdBy: 'Nguyen Minh Tuan', progress: 65,
    weeklyKm: 42, sessionsPerWeek: 5, restDaysPerWeek: 2, intensityScore: 88,
    algorithmRationale: 'Sức khỏe xuất sắc (Eligible) · Tuổi đỉnh cao 5 tuổi · Nhịp tim nghỉ 32 bpm (tim mạch tốt)',
  },
];

export const TRAINING_SESSIONS: TrainingSession[] = [
  {
    id: 'SES-000001', horseId: 'HRS-000001', planId: 'PLN-000001', date: '25/09/2026', time: '09:00',
    type: 'Chạy nước rút ngắt quãng', trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Scheduled', distance: '4 × 200m', targetTime: '23s/rep',
    notes: 'Tập trung vào xuất phát cổng + nước rút chặng cuối', conflictChecked: true,
  },
  {
    id: 'SES-000002', horseId: 'HRS-000001', planId: 'PLN-000001', date: '23/09/2026', time: '08:00',
    type: 'Chạy tốc độ thi đấu', trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Completed', distance: '1200m', targetTime: '74s',
    notes: 'Duy trì nhịp tốt, tập trung vào góc cua', conflictChecked: true, postExamDone: true,
    attendance: { status: 'present', at: '23/09/2026 08:00' },
    result: { time: '73.8s', speed: '58.6', heartRate: 188, notes: 'Phong độ xuất sắc — kỷ lục cá nhân mới!', performanceScore: 94 },
  },
  {
    id: 'SES-000003', horseId: 'HRS-000001', planId: 'PLN-000001', date: '21/09/2026', time: '07:00',
    type: 'Chạy nhẹ phục hồi', trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Completed', distance: '3000m', targetTime: '—',
    notes: 'Phục hồi tích cực sau buổi nước rút ngắt quãng', conflictChecked: true, postExamDone: true,
    attendance: { status: 'present', at: '21/09/2026 07:00' },
    result: { time: '—', speed: '20.4', heartRate: 138, notes: 'Thư giãn tốt, không có dấu hiệu mỏi', performanceScore: 82 },
  },
  {
    id: 'SES-000004', horseId: 'HRS-000001', planId: 'PLN-000001', date: '18/09/2026', time: '07:30',
    type: 'Chạy tempo', trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Completed', distance: '1600m', targetTime: '1:55',
    notes: 'Giữ nhịp đều ở vùng Z3', conflictChecked: true, postExamDone: false,
    attendance: { status: 'present', at: '18/09/2026 07:30' },
    result: { time: '1:54.6', speed: '50.1', heartRate: 176, notes: 'Nhịp thở ổn định, giữ tốc độ tốt', performanceScore: 88 },
  },
  {
    id: 'SES-000005', horseId: 'HRS-000001', planId: 'PLN-000001', date: '16/09/2026', time: '07:00',
    type: 'Chạy sức bền nền', trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Completed', distance: '2400m', targetTime: '—',
    notes: 'Xây sức bền nền, giữ nhịp tim thấp', conflictChecked: true, postExamDone: true,
    attendance: { status: 'present', at: '16/09/2026 07:00' },
    result: { time: '—', speed: '33.5', heartRate: 152, notes: 'Hoàn thành đủ cự ly, hồi phục nhanh', performanceScore: 85 },
  },
  {
    id: 'SES-000006', horseId: 'HRS-000001', planId: 'PLN-000001', date: '14/09/2026', time: '08:00',
    type: 'Chạy nước rút ngắt quãng', trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Completed', distance: '4 × 200m', targetTime: '23s/rep',
    notes: 'Luyện xuất phát và tăng tốc đoạn cuối', conflictChecked: true, postExamDone: true,
    attendance: { status: 'present', at: '14/09/2026 08:00' },
    result: { time: '22.9s/rep', speed: '62.9', heartRate: 192, notes: 'Tăng tốc tốt, cần cải thiện xuất phát', performanceScore: 90 },
  },
  {
    id: 'SES-000007', horseId: 'HRS-000001', planId: 'PLN-000001', date: '12/09/2026', time: '07:00',
    type: 'Chạy nhẹ phục hồi', trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Not Performed', distance: '3000m', targetTime: '—',
    notes: 'Không thực hiện do ngựa vắng mặt', conflictChecked: true,
    attendance: { status: 'absent', at: '12/09/2026 07:00', note: 'Chủ ngựa báo ngựa cần nghỉ thêm để theo dõi thể trạng.' },
  },
  {
    id: 'SES-000008', horseId: 'HRS-000001', planId: 'PLN-000001', date: '26/09/2026', time: '07:30',
    type: 'Chạy sức bền nền', trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Scheduled', distance: '2400m', targetTime: '—',
    notes: 'Theo giáo án tuần', conflictChecked: true,
  },
  {
    id: 'SES-000009', horseId: 'HRS-000001', planId: 'PLN-000001', date: '28/09/2026', time: '08:00',
    type: 'Chạy nước rút ngắt quãng', trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Scheduled', distance: '4 × 200m', targetTime: '23s/rep',
    notes: 'Theo giáo án tuần', conflictChecked: true,
  },
  {
    id: 'SES-000010', horseId: 'HRS-000001', planId: 'PLN-000001', date: '29/09/2026', time: '07:00',
    type: 'Chạy nhẹ phục hồi', trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Scheduled', distance: '3000m', targetTime: '—',
    notes: 'Theo giáo án tuần', conflictChecked: true,
  },
  {
    id: 'SES-000011', horseId: 'HRS-000001', planId: 'PLN-000001', date: '30/09/2026', time: '08:00',
    type: 'Chạy tốc độ thi đấu', trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Scheduled', distance: '1200m', targetTime: '74s',
    notes: 'Theo giáo án tuần', conflictChecked: true,
  },
  {
    id: 'SES-000012', horseId: 'HRS-000001', planId: 'PLN-000001', date: '02/10/2026', time: '07:30',
    type: 'Chạy tempo', trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Scheduled', distance: '1600m', targetTime: '1:55',
    notes: 'Theo giáo án tuần', conflictChecked: true,
  },
  {
    id: 'SES-000013', horseId: 'HRS-000001', planId: 'PLN-000001', date: '03/10/2026', time: '07:00',
    type: 'Chạy sức bền nền', trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Scheduled', distance: '2400m', targetTime: '—',
    notes: 'Theo giáo án tuần', conflictChecked: true,
  },
  {
    id: 'SES-000014', horseId: 'HRS-000001', planId: 'PLN-000001', date: '05/10/2026', time: '08:00',
    type: 'Chạy nước rút ngắt quãng', trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Scheduled', distance: '4 × 200m', targetTime: '23s/rep',
    notes: 'Theo giáo án tuần', conflictChecked: true,
  },
  {
    id: 'SES-000015', horseId: 'HRS-000001', planId: 'PLN-000001', date: '06/10/2026', time: '07:00',
    type: 'Chạy nhẹ phục hồi', trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Scheduled', distance: '3000m', targetTime: '—',
    notes: 'Theo giáo án tuần', conflictChecked: true,
  },
  {
    id: 'SES-000016', horseId: 'HRS-000001', planId: 'PLN-000001', date: '07/10/2026', time: '08:00',
    type: 'Chạy tốc độ thi đấu', trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Scheduled', distance: '1200m', targetTime: '74s',
    notes: 'Theo giáo án tuần', conflictChecked: true,
  },
];

export const PERFORMANCE_DATA = [
  { month: 'T4', speed: 54.2, fitness: 72, heartRate: 178 },
  { month: 'T5', speed: 55.8, fitness: 76, heartRate: 182 },
  { month: 'T6', speed: 56.4, fitness: 79, heartRate: 180 },
  { month: 'T7', speed: 57.9, fitness: 83, heartRate: 176 },
  { month: 'T8', speed: 57.2, fitness: 81, heartRate: 179 },
  { month: 'T9', speed: 58.6, fitness: 87, heartRate: 185 },
];

export const GROOM_TASKS = [
  { id: 'gt1', horseId: 'HRS-000001', date: '25/09/2026', type: 'Cho ăn sáng', time: '06:00', description: '5kg hỗn hợp ngũ cốc + 3kg cỏ khô + Vitamin E', status: 'Pending', completedAt: null },
  { id: 'gt2', horseId: 'HRS-000001', date: '25/09/2026', type: 'Chải chuốt', time: '07:00', description: 'Chải lông toàn thân, vệ sinh móng, chải bờm đuôi', status: 'Pending', completedAt: null },
  { id: 'gt3', horseId: 'HRS-000001', date: '25/09/2026', type: 'Dọn chuồng', time: '08:00', description: 'Dọn rác thải, thay lớp rơm mới, khử trùng nền', status: 'Pending', completedAt: null },
  { id: 'gt4', horseId: 'HRS-000001', date: '25/09/2026', type: 'Cho ăn trưa', time: '12:00', description: '3kg ngũ cốc + kiểm tra nước uống (tối thiểu 15L)', status: 'Pending', completedAt: null },
  { id: 'gt5', horseId: 'HRS-000001', date: '25/09/2026', type: 'Đi bộ thư giãn', time: '14:00', description: '20 phút đi bộ nhẹ tại bãi cỏ', status: 'Pending', completedAt: null },
  { id: 'gt6', horseId: 'HRS-000001', date: '25/09/2026', type: 'Cho ăn tối', time: '18:00', description: '5kg ngũ cốc + điện giải ORS + 4kg cỏ khô', status: 'Pending', completedAt: null },
  { id: 'gt7', horseId: 'HRS-000002', date: '25/09/2026', type: 'Hydrotherapy', time: '09:00', description: 'Ngâm chân phải trước trong nước lạnh 20 phút', status: 'Pending', completedAt: null },
  { id: 'gt8', horseId: 'HRS-000002', date: '25/09/2026', type: 'Thay băng', time: '10:00', description: 'Thay băng cố định chân phải trước, kiểm tra tình trạng sưng', status: 'Pending', completedAt: null },
];

export const NOTIFICATIONS: AppNotification[] = [
  { id: 'n1', type: 'health', message: 'Thunder King (HRS-000001) — Kiểm tra sức khỏe định kỳ tới hạn trong 7 ngày', time: '2 giờ trước', read: false },
  { id: 'n2', type: 'training', message: 'Kết quả buổi tập Race-Pace 1200m: 73.8s — Kỷ lục cá nhân mới!', time: '4 giờ trước', read: false },
  { id: 'n3', type: 'health', message: 'Storm Wreck (HRS-000002) — Cần tái khám sau 2 tuần điều trị chấn thương', time: '1 ngày trước', read: false },
  { id: 'n4', type: 'race', message: 'Autumn Grand Prix on Oct 15 — registration closes in 5 days', time: '1 day ago', read: true },
  { id: 'n5', type: 'system', message: 'Tài khoản nhân sự mới đã được Quản trị viên tạo và cấp mật khẩu tạm thời', time: '2 ngày trước', read: true },
];

export const SEED_ENROLLMENTS: Enrollment[] = [
  {
    id: 'ENR-000001', horseId: 'HRS-000001', packageId: 'PKG-000002', packageName: 'Hiệu suất',
    sessionsTotal: 24, sessionsDone: 6, status: 'active', trainerId: 'u2', trainerName: 'Nguyen Minh Tuan',
    trainerStatus: 'confirmed',
    assignHistory: [
      { time: '30/07/2026', kind: 'assign', from: null, to: 'Nguyen Minh Tuan', by: 'Nguyen Van Binh', reason: 'Phân công ban đầu' },
      { time: '31/07/2026', kind: 'confirm', from: null, to: 'Nguyen Minh Tuan', by: 'Nguyen Minh Tuan', reason: 'Xác nhận nhận huấn luyện' },
    ],
    startedAt: '30/07/2026', expiresAt: '08/10/2026', amount: 36000000, paidAt: '30/07/2026 09:15',
    paymentMethod: 'Thanh toán mô phỏng', ownerName: 'Nguyen Van An', scheduleConfirmed: true,
  },
];

// ── Groom: kho vật tư, khẩu phần, chăm sóc, sự cố ────────────────────────────

export type InvCategory = 'food' | 'medical' | 'tool';
export type FoodKind = 'grain' | 'hay' | 'vitamin' | 'other';
export type InvUnit = 'kg' | 'lít' | 'gói' | 'cái';

export interface InvItem {
  id: string; clubId: string; name: string; category: InvCategory; foodKind?: FoodKind;
  unit: InvUnit; qty: number; threshold: number;
}

export interface InvLog {
  id: string; clubId: string; itemId: string; itemName: string; unit: string;
  kind: 'in' | 'out' | 'refund' | 'adjust' | 'edit';
  delta: number; balance: number;
  horseId?: string; horseName?: string; task?: string; reason?: string;
  byId: string; byName: string; date: string; at: string; ts: number;
}

export interface CareRecord {
  id: string; clubId: string; horseId: string; date: string; taskKey: string; taskLabel: string;
  doneAt: string; byName: string;
  deductions: { itemId: string; itemName: string; unit: string; qty: number }[];
}

export interface Incident {
  id: string; clubId: string; horseId: string; horseName: string;
  type: string; description: string; imageUrl: string;
  reportedById: string; reportedByName: string; at: string; date: string;
}

export interface RationMeal { meal: 'Sáng' | 'Trưa' | 'Tối'; time: string; grain: number; hay: number; vitamin: number; vitaminName: string; water: number }
export interface Ration { approvedBy: string; approvedAt: string; meals: RationMeal[] }

export const RATIONS: Record<string, Ration> = {
  'HRS-000001': { approvedBy: 'Dr. Le Thi An', approvedAt: '15/09/2026', meals: [
    { meal: 'Sáng', time: '06:00', grain: 5, hay: 3, vitamin: 1, vitaminName: 'Vitamin E', water: 20 },
    { meal: 'Trưa', time: '12:00', grain: 3, hay: 2, vitamin: 0, vitaminName: '', water: 15 },
    { meal: 'Tối', time: '18:00', grain: 5, hay: 4, vitamin: 1, vitaminName: 'Omega 3', water: 20 },
  ] },
  'HRS-000002': { approvedBy: 'Dr. Le Thi An', approvedAt: '21/09/2026', meals: [
    { meal: 'Sáng', time: '06:30', grain: 4, hay: 2, vitamin: 1, vitaminName: 'Collagen hỗ trợ gân', water: 15 },
    { meal: 'Trưa', time: '12:30', grain: 2, hay: 2, vitamin: 0, vitaminName: '', water: 15 },
    { meal: 'Tối', time: '18:30', grain: 4, hay: 3, vitamin: 1, vitaminName: 'Collagen hỗ trợ gân', water: 15 },
  ] },
};

export const SEED_INVENTORY: InvItem[] = [
  { id: 'inv1', clubId: 'c1', name: 'Hỗn hợp ngũ cốc', category: 'food', foodKind: 'grain', unit: 'kg', qty: 40, threshold: 15 },
  { id: 'inv2', clubId: 'c1', name: 'Cỏ khô Timothy', category: 'food', foodKind: 'hay', unit: 'kg', qty: 60, threshold: 20 },
  { id: 'inv3', clubId: 'c1', name: 'Vitamin tổng hợp', category: 'food', foodKind: 'vitamin', unit: 'gói', qty: 12, threshold: 5 },
  { id: 'inv4', clubId: 'c1', name: 'Băng cuộn cố định', category: 'medical', unit: 'cái', qty: 10, threshold: 4 },
  { id: 'inv5', clubId: 'c1', name: 'Dung dịch sát trùng', category: 'medical', unit: 'lít', qty: 3, threshold: 1 },
  { id: 'inv6', clubId: 'c1', name: 'Phenylbutazone (NSAID)', category: 'medical', unit: 'gói', qty: 8, threshold: 3 },
  { id: 'inv7', clubId: 'c1', name: 'Đá lạnh', category: 'medical', unit: 'kg', qty: 30, threshold: 10 },
  { id: 'inv8', clubId: 'c1', name: 'Móc vệ sinh móng', category: 'tool', unit: 'cái', qty: 6, threshold: 2 },
  { id: 'inv9', clubId: 'c1', name: 'Xẻng dọn chuồng', category: 'tool', unit: 'cái', qty: 4, threshold: 2 },
];

export const SEED_INV_LOGS: InvLog[] = SEED_INVENTORY.map((i, n) => ({
  id: `il-seed${n}`, clubId: i.clubId, itemId: i.id, itemName: i.name, unit: i.unit, kind: 'in' as const,
  delta: i.qty, balance: i.qty, reason: 'Tồn đầu kỳ', byId: 'u5', byName: 'Le Van Nam',
  date: '20/09/2026', at: '20/09/2026 08:00', ts: 1_000 + n,
}));
