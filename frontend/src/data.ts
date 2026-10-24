export type Role = 'admin' | 'manager' | 'head_trainer' | 'veterinarian' | 'groom' | 'owner';

export interface AppUser {
  apiRoleId?: number;
  trainerProfileId?: string;
  id: string;
  name: string;
  email: string;
  password: string;
  avatarUrl?: string;
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
  pending: "Pending",
  awaiting_vet: "Awaiting health examination",
  ready: "Ready for training",
  training: "In training",
  locked: "Training locked (Paused)",
  rehab: "In rehabilitation",
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
  { id: 'PKG-000001', name: "Foundation", description: "Build fitness and basic technique for horses new to the program.", sessions: 12, durationDays: 42, price: 18000000, active: true, focus: ["Starting gate familiarization", "Develop aerobic endurance", "Periodic condition assessment"] },
  { id: 'PKG-000002', name: "Performance", description: "Improve speed and recovery using an 80/20 training model.", sessions: 24, durationDays: 70, price: 36000000, active: true, popular: true, focus: ["Interval and race-pace training using the 80/20 model", "Post-exercise heart rate monitoring", "Weekly progress reports"] },
  { id: 'PKG-000003', name: "Competition", description: "Prepare for peak season performance with race-distance simulations.", sessions: 36, durationDays: 98, price: 58000000, active: true, focus: ["Race-distance simulation", "Distance-specific race tactics", "Pre-race taper"] },
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
  { id: 'rb-light', name: "Light rehabilitation", description: "For muscle strain, excessive fatigue or unstable vital signs.", weeks: 2, items: ["Active rest", "Relaxed walking for 20 minutes/day", "Electrolyte supplementation"] },
  { id: 'rb-hydro', name: "Hydrotherapy and physiotherapy", description: "For arthritis, swollen limbs or musculoskeletal pain.", weeks: 4, items: ["Hydrotherapy twice daily", "Cold therapy and support bandaging", "Weekly follow-up examination"] },
  { id: 'rb-tendon', name: "Tendon and ligament recovery", description: "For tendon and ligament injuries requiring extended recovery.", weeks: 8, items: ["Follow-up ultrasound every two weeks", "Gradually increased controlled walking", "Collagen nutrition regimen"] },
];

export type TrainerAssignStatus = 'unassigned' | 'pending' | 'confirmed';
export interface AssignEntry { time: string; kind: 'assign' | 'replace' | 'confirm' | 'decline'; from: string | null; to: string; by: string; reason: string }

export interface Enrollment {
  directAssignmentId?: string;
  assignmentId?: string;
  paymentStatus?: string;
  apiStatus?: string;
  id: string;
  horseId: string;
  packageId: string;
  packageName: string;
  sessionsTotal: number;
  sessionsDone: number;
  status: 'active' | 'paused' | 'completed';
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
  return !/recovery|hydro|walk|trot|rehab|easy work|relaxed|light familiarization|phục hồi|thủy trị|đi bộ|chạy nhẹ|thư giãn/i.test(type);
}

export function getLifecycle(h: Horse): Lifecycle {
  if (h.lifecycle) return h.lifecycle;
  if (h.approvalStatus !== 'approved' || !h.clubId) return 'pending';
  if (h.lock) return h.rehab ? 'rehab' : 'locked';
  if (h.healthStatus === 'Pending Vet') return 'awaiting_vet';
  return h.trainingStatus === 'Active' ? 'training' : 'awaiting_vet';
}

export interface Horse {
  trainerIds?: string[];
  vetAssignmentId?: string;
  documentType?: string;
  admissionStatus?: string;
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
  horsePackageId?: string;
  assignmentId?: string;
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
  horsePackageId?: string;
  endTime?: string;
  intensity?: string;
  actualEnd?: string;
  canStart?: boolean;
  canStop?: boolean;
  canComplete?: boolean;
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
    recoveryMeasuredAt?: string;
    time: string;
    speed: string;
    heartRate: number;
    notes: string;
    performanceScore: number;
  };
}

export interface HealthRecord {
  profileId?: string;
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
// Based on: Seiler's 80/20 Polarized Training model + FEI equine science guidelines
// Factors: health status, age, weight, resting heart rate, race history

export interface TrainingSuggestion {
  stages?: import('./trainingSchedule').RoadmapStage[];
  approvedIntensity?: 'LOW' | 'MODERATE' | 'HIGH';
  sessionCount?: number;
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
  if (horse.healthStatus === 'Monitor') warnings.push("Horse under monitoring — maximum intensity 60%");
  if (horse.healthStatus === 'Injured') warnings.push("Horse injured — passive recovery only");
  if (horse.healthStatus === 'Eligible') rationale.push("Stable health; fit for full training");

  // 2. Age factor (0-20 pts) — peak performance: 4–7 years
  if (horse.age >= 4 && horse.age <= 7) {
    score += 20; rationale.push(`Age ${horse.age} — peak performance age (4–7 years)`);
  } else if (horse.age === 3) {
    score += 10; warnings.push("Three-year-old horse — bones still developing; limit high-intensity sprints");
  } else if (horse.age <= 10) {
    score += 12; rationale.push(`Age ${horse.age} — still competitive; allow more recovery time`);
  } else {
    score += 2; warnings.push(`Horses ${horse.age} years old — prioritize maintenance and rest`);
  }

  // 3. Weight factor (0-15 pts) — optimal TB: 450–550 kg
  if (horse.weight >= 450 && horse.weight <= 550) {
    score += 15; rationale.push(`Weight ${horse.weight} kg — within the ideal range (450–550 kg)`);
  } else if (horse.weight < 430) {
    score += 0; warnings.push(`Weight ${horse.weight} kg is low — improve nutrition before strenuous training`);
  } else if (horse.weight > 570) {
    score += 5; warnings.push(`Weight ${horse.weight} kg is high — reduce workload and monitor joints`);
  } else {
    score += 10;
  }

  // 4. Vitals from latest health record (0-15 pts)
  if (health?.vitals) {
    const hr = Number(health.vitals.heartRate);
    const temp = Number(health.vitals.temperature);
    if (hr >= 28 && hr <= 36) {
      score += 15; rationale.push(`Resting heart rate ${hr} bpm — excellent cardiovascular fitness (a good foundation for performance training)`);
    } else if (hr <= 44) {
      score += 8; rationale.push(`Resting heart rate ${hr} bpm — normal`);
    } else {
      score -= 5; warnings.push(`Resting heart rate ${hr} bpm is high — reassess cardiovascular fitness before increasing workload`);
    }
    if (temp > 38.5) { score -= 10; warnings.push(`Temperature ${temp}°C — signs of inflammation or infection; suspend training`); }
  } else {
    warnings.push("No recent vital signs — examination recommended before starting the program");
  }

  // 5. Race performance bonus (0-10 pts)
  if (horse.totalRaces >= 5) {
    const winRate = horse.wins / horse.totalRaces;
    if (winRate >= 0.6) { score += 10; rationale.push(`Win rate ${Math.round(winRate * 100)}% — competition level`); }
    else if (winRate >= 0.4) { score += 5; }
  }

  const finalScore = Math.max(0, Math.min(100, score));

  // ── Map score → training phase ───────────────────────────────────────────
  if (finalScore >= 82) {
    return buildPlan("Race preparation", finalScore, {
      weeklyKm: 42, sessions: 5, rest: 2, hi: 30, lo: 70,
      schedule: [
        { day: "Monday", type: "Interval sprints", distance: '4 × 200m', intensity: "Very high", zone: 'Z4–Z5' },
        { day: "Tuesday", type: "Recovery jog", distance: '3000m', intensity: "Low", zone: 'Z1' },
        { day: "Wednesday", type: "Race-pace run", distance: '1200m', intensity: 'High', zone: 'Z4' },
        { day: "Thursday", type: "Rest / Light walking", distance: '600m', intensity: "Rest", zone: 'Z0' },
        { day: "Friday", type: "Tempo run", distance: '1600m', intensity: 'Moderate–high', zone: 'Z3' },
        { day: "Saturday", type: "Aerobic endurance run", distance: '2400m', intensity: "Moderate", zone: 'Z2' },
        { day: 'Sun', type: "Complete rest", distance: '—', intensity: "Rest", zone: 'Z0' },
      ],
      rationale, warnings,
      twelveWeek: buildTwelveWeek(38, "Race preparation"),
    });
  }
  if (finalScore >= 65) {
    return buildPlan("Foundation", finalScore, {
      weeklyKm: 30, sessions: 4, rest: 3, hi: 20, lo: 80,
      schedule: [
        { day: "Monday", type: "Easy aerobic work", distance: '2000m', intensity: "Low–moderate", zone: 'Z2' },
        { day: "Tuesday", type: "Rest / Walking", distance: '500m', intensity: "Rest", zone: 'Z0' },
        { day: "Wednesday", type: "Fartlek run", distance: '1600m', intensity: 'Moderate–high', zone: 'Z3' },
        { day: "Thursday", type: "Complete rest", distance: '—', intensity: "Rest", zone: 'Z0' },
        { day: "Friday", type: "Easy canter", distance: '1200m', intensity: "Moderate", zone: 'Z2' },
        { day: "Saturday", type: "Easy distance work", distance: '2800m', intensity: "Low", zone: 'Z1–Z2' },
        { day: 'Sun', type: "Complete rest", distance: '—', intensity: "Rest", zone: 'Z0' },
      ],
      rationale, warnings,
      twelveWeek: buildTwelveWeek(24, "Foundation"),
    });
  }
  if (finalScore >= 42) {
    return buildPlan("Orientation", finalScore, {
      weeklyKm: 18, sessions: 3, rest: 4, hi: 10, lo: 90,
      schedule: [
        { day: "Monday", type: "Walk + easy jog", distance: '1500m', intensity: "Very low", zone: 'Z1' },
        { day: "Tuesday", type: "Rest", distance: '—', intensity: "Rest", zone: 'Z0' },
        { day: "Wednesday", type: "Easy work", distance: '1200m', intensity: "Low", zone: 'Z1' },
        { day: "Thursday", type: "Rest", distance: '—', intensity: "Rest", zone: 'Z0' },
        { day: "Friday", type: "Easy canter", distance: '1000m', intensity: "Low", zone: 'Z2' },
        { day: "Saturday", type: "Rest", distance: '—', intensity: "Rest", zone: 'Z0' },
        { day: 'Sun', type: "Rest", distance: '—', intensity: "Rest", zone: 'Z0' },
      ],
      rationale, warnings,
      twelveWeek: buildTwelveWeek(14, "Orientation"),
    });
  }
  return buildPlan("Recovery", finalScore, {
    weeklyKm: 6, sessions: 2, rest: 5, hi: 0, lo: 100,
    schedule: [
      { day: "Monday", type: "Light walking", distance: '400m', intensity: "Very light", zone: 'Z0' },
      { day: "Tuesday", type: "Rest", distance: '—', intensity: "Rest", zone: 'Z0' },
      { day: "Wednesday", type: "Rest", distance: '—', intensity: "Rest", zone: 'Z0' },
      { day: "Thursday", type: "Light walking", distance: '400m', intensity: "Very light", zone: 'Z0' },
      { day: "Friday", type: "Rest", distance: '—', intensity: "Rest", zone: 'Z0' },
      { day: "Saturday", type: "Rest", distance: '—', intensity: "Rest", zone: 'Z0' },
      { day: 'Sun', type: "Rest", distance: '—', intensity: "Rest", zone: 'Z0' },
    ],
    rationale, warnings,
    twelveWeek: buildTwelveWeek(5, "Recovery"),
  });
}

function buildTwelveWeek(baseKm: number, phase: string) {
  const phases: Record<string, string[]> = {
    "Race preparation": ["Foundation", "Foundation", "Build", "Build", "Build", "Increase intensity", "Increase intensity", "Increase intensity", "Peak", "Peak", 'Taper', "Competition"],
    "Foundation": ["Warm-up", "Build", "Build", "Maintain", "Intensive", "Intensive", "Mid-program rest", "Gradual increase", "Gradual increase", "Base peak", "Stable", "Transition"],
    "Orientation": ["Adaptation", "Adaptation", "Light build", "Light build", "Maintain", "Maintain", "Development", "Development", "Stable", "Stable", "Assessment", "Transition"],
    "Recovery": ["Active rest", "Active rest", "Light rehabilitation", "Light rehabilitation", "Assessment", "Restart", "Restart", "Light familiarization", "Light familiarization", "Stable", "Stable", "Transition"],
  };
  const multipliers = [0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.85, 1.0, 1.05, 1.1, 0.8, 0.7];
  const focusArr = phases[phase] || phases["Orientation"];
  return Array.from({ length: 12 }, (_, i) => ({
    week: i + 1,
    focus: focusArr[i],
    volumeKm: Math.round(baseKm * multipliers[i]),
    intensityNote: i % 3 === 2 ? "15% deload week" : i >= 9 && phase === "Race preparation" ? "Taper and race simulation" : "Increase gradually by 10%/week",
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
    id: 'u0', name: "System administration", email: 'admin@raceforce.vn', password: '123456',
    role: 'admin', clubId: null, status: 'active', avatar: 'QT', verified: true, phone: '0900 000 001',
    bio: "RaceForce account administration, permissions and audit logs.",
  },
  // Manager
  {
    id: 'u1', name: 'Nguyen Van Binh', email: 'manager@raceforce.vn', password: '123456',
    role: 'manager', clubId: 'c1', status: 'active', avatar: 'NB', verified: true,
    phone: '0901 234 567',
    bio: "Training center manager with 10 years of experience in professional horse racing.",
  },
  // Huấn luyện viên
  {
    id: 'u2', name: 'Nguyen Minh Tuan', email: 'trainer@raceforce.vn', password: '123456',
    role: 'head_trainer', clubId: 'c1', status: 'active', avatar: 'NT', verified: true,
    phone: '0912 345 678',
    bio: "Head trainer with 12 years of experience training Thoroughbred and Arabian racehorses.",
    experience: "12 years of racehorse training · Previously at Happy Valley (HK)",
    certifications: 'FEI Level 3 Trainer · BHS Stage 4 · Certified Equine Fitness Trainer',
    achievements: "Trained 3 national champions · Average win rate of trained horses: 62%",
  },
  // Huấn luyện viên 2 (chưa vào trung tâm — chờ manager duyệt)
  {
    id: 'u3', name: 'Tran Duc Khai', email: 'trainer2@raceforce.vn', password: '123456',
    role: 'head_trainer', clubId: null, status: 'active', avatar: 'TK', verified: true,
    phone: '0933 456 789',
    bio: "Former jockey turned trainer, specializing in conditioning and sprint training.",
    experience: "8 years as a jockey and 5 as a trainer · National top-three jockey in 2018–2020",
    certifications: 'FEI Level 2 Trainer · Former Professional Jockey License',
    achievements: "15 championships as a jockey · Trained 2 regional champions",
  },
  // Veterinarian
  {
    id: 'u4', name: 'Dr. Le Thi An', email: 'vet@raceforce.vn', password: '123456',
    role: 'veterinarian', clubId: 'c1', status: 'active', avatar: 'LA', verified: true,
    phone: '0945 678 901',
    bio: "Veterinarian specializing in racehorses with over 8 years of experience.",
    certifications: "DVM · Racehorse specialist · Musculoskeletal ultrasound certification",
  },
  // Groom
  {
    id: 'u5', name: 'Le Van Nam', email: 'groom@raceforce.vn', password: '123456',
    role: 'groom', clubId: 'c1', status: 'active', avatar: 'LN', verified: true,
    phone: '0956 789 012',
    bio: "Professional groom with 7 years of racehorse care experience.",
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
    bio: "New horse owner looking for suitable breeding stock.",
  },
];

export const SEED_CLUBS: Club[] = [
  {
    id: 'c1', name: 'RaceForce Training Club', location: 'Ho Chi Minh City',
    description: "A leading professional racehorse training center in Vietnam, established in 2015.",
    managerId: 'u1', managerName: 'Nguyen Van Binh', memberCount: 6, founded: '2015', logoLetter: 'S',
  },
  {
    id: 'c2', name: 'Hanoi Equestrian Center', location: "Hanoi",
    description: "A traditional racehorse training center in Hanoi specializing in national and international races.",
    managerId: 'u99', managerName: 'Tran Duc Manh', memberCount: 12, founded: '2010', logoLetter: 'H',
  },
  {
    id: 'c3', name: 'Da Nang Racing Center', location: "Da Nang",
    description: "A central Vietnam racehorse training center with an international-standard track.",
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
      { id: 'th1', trainerId: 'u3', name: 'Tran Duc Khai', from: '20/03/2021', to: '31/12/2025', note: "Foundation and short-distance training" },
      { id: 'th2', trainerId: 'u2', name: 'Nguyen Minh Tuan', from: '01/01/2026', to: null, note: "2026 season preparation" },
    ],
    id: 'HRS-000001', name: 'Thunder King', breed: 'Thoroughbred', age: 5, color: 'Bay',
    gender: "Stallion", birthDate: '12/04/2021', microchip: '704100000123456', identityVerified: true, identityEvidence: { url: '', note: "Microchip card checked against the owner's certificate." }, weight: 512, height: 163, stable: 'Stable A', stall: 'A-12',
    clubId: 'c1', ownerId: 'u6', ownerName: 'Nguyen Van An',
    headTrainerId: 'u2', headTrainerName: 'Nguyen Minh Tuan',
    vetId: 'u4', vetName: 'Dr. Le Thi An', groomId: 'u5', groomName: 'Le Van Nam',
    healthStatus: 'Eligible', trainingStatus: 'Active', lifecycle: 'training',
    sire: 'Redoute’s Choice', dam: 'Silver Mist', medicalHistory: "No significant medical history. Vaccinations up to date.",
    approvalStatus: 'approved', registrationDate: '15/03/2021', approvedAt: '20/03/2021',
    totalRaces: 12, wins: 7, vetClearance: true,
    biography: "Purebred Thoroughbred imported from Australia in 2021. Known for a strong finishing sprint and rapid heart rate recovery after high-intensity work. Top speed 59.9 km/h.",
    imageUrl: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=700&h=500&fit=crop&auto=format',
    achievements: [
      { id: 'a1', date: '10/09/2026', title: 'RaceForce Sprint Cup', description: 'Winner over 1200m, leading from the final turn', prize: '$2,000', position: 1 },
      { id: 'a2', date: '20/07/2026', title: 'Summer Classic 1600m', description: "Won over 1600 m by two lengths", prize: '80,000,000 VND', position: 1 },
      { id: 'a3', date: '15/08/2026', title: 'Golden Gate Stakes', description: "Close second over 1400 m", prize: '20,000,000 VND', position: 2 },
    ],
    raceHistory: [
      { id: 'rh1', date: '10/09/2026', raceName: 'RaceForce Sprint Cup', distance: '1200m', position: 1, totalHorses: 10, time: '1:11.24', venue: 'Phu Tho Racecourse', jockey: 'Nguyen Duc', prize: '$2,000' },
      { id: 'rh2', date: '15/08/2026', raceName: 'Golden Gate Stakes', distance: '1400m', position: 2, totalHorses: 12, time: '1:25.10', venue: "Phu Tho Racecourse", jockey: 'Nguyen Duc', prize: '20,000,000 VND' },
      { id: 'rh3', date: '20/07/2026', raceName: 'Summer Classic', distance: '1600m', position: 1, totalHorses: 9, time: '1:38.55', venue: "Phu Tho Racecourse", jockey: 'Nguyen Duc', prize: '80,000,000 VND' },
      { id: 'rh4', date: '05/06/2026', raceName: 'Monsoon Mile', distance: '1600m', position: 3, totalHorses: 11, time: '1:39.80', venue: "Phu Tho Racecourse", jockey: 'Nguyen Duc', prize: '10,000,000 VND' },
    ],
  },
  {
    trainerHistory: [{ id: 'th3', trainerId: 'u2', name: 'Nguyen Minh Tuan', from: '15/02/2023', to: null }],
    id: 'HRS-000002', name: 'Storm Wreck', breed: 'Quarter Horse', age: 9, color: 'Dark Bay',
    gender: "Stallion", birthDate: '03/05/2017', weight: 598, height: 158, stable: 'Stable C', stall: 'C-08',
    clubId: 'c1', ownerId: 'u6', ownerName: 'Nguyen Van An',
    headTrainerId: 'u2', headTrainerName: 'Nguyen Minh Tuan',
    vetId: 'u4', vetName: 'Dr. Le Thi An', groomId: 'u5', groomName: 'Le Van Nam',
    healthStatus: 'Injured', trainingStatus: 'Inactive', lifecycle: 'awaiting_vet',
    sire: 'Dash for Cash', dam: 'Dark Lady', medicalHistory: "Right forelimb ligament injury (09/2026).",
    approvalStatus: 'approved', registrationDate: '10/02/2023', approvedAt: '15/02/2023',
    totalRaces: 6, wins: 1, vetClearance: false,
    biography: "Former racehorse from Hanoi recovering from a serious right forelimb ligament injury. Abnormal resting heart rate and excess weight; estimated recovery 4–6 weeks.",
    imageUrl: 'https://images.unsplash.com/photo-1566288623394-377af472d81b?w=700&h=500&fit=crop&auto=format',
    achievements: [],
    raceHistory: [
      { id: 'rh5', date: '12/05/2026', raceName: 'Northern Sprint Open', distance: '1000m', position: 4, totalHorses: 10, time: '1:02.80', venue: "Gia Lam Racecourse", jockey: 'Tran Van Hung', prize: '0 VND' },
      { id: 'rh6', date: '01/04/2026', raceName: 'Spring Classic', distance: '1200m', position: 1, totalHorses: 8, time: '1:16.40', venue: "Gia Lam Racecourse", jockey: 'Tran Van Hung', prize: '25,000,000 VND' },
    ],
  },
  {
    id: 'HRS-000003', name: 'Silver Arrow', breed: 'Thoroughbred', age: 4, color: 'Grey',
    gender: "Mare", birthDate: '08/03/2022', microchip: '', weight: 486, height: 160, stable: '', stall: '',
    clubId: null, ownerId: 'u7', ownerName: 'Pham Thi Lan',
    headTrainerId: '', headTrainerName: '', vetId: '', vetName: '', groomId: '', groomName: '', 
    healthStatus: 'Pending Vet', trainingStatus: 'Pending Approval', approvalStatus: 'pending', lifecycle: 'pending',
    registrationDate: '20/09/2026', approvedAt: null, totalRaces: 0, wins: 0, vetClearance: false,
    sire: 'Redoute’s Choice', dam: 'Silver Mist', medicalHistory: "No medical history reported.",
    biography: "Young horse registered at the center by its owner.", imageUrl: 'https://images.unsplash.com/photo-1534307671554-9a6d81f4d629?w=700&h=500&fit=crop&auto=format',
    identityVerified: false, identityEvidence: { url: '', note: '' },
    achievements: [], raceHistory: [],
  },
  {
    id: 'HRS-000004', name: 'Midnight Dancer', breed: 'Arabian', age: 5, color: 'Black',
    gender: "Mare", birthDate: '14/06/2021', microchip: '704100000654321', weight: 455, height: 154, stable: '', stall: '',
    clubId: null, ownerId: 'u7', ownerName: 'Pham Thi Lan',
    headTrainerId: '', headTrainerName: '', groomId: '', groomName: '', vetId: 'u4', vetName: 'Dr. Le Thi An', vetAssign: { status: 'pending', history: [{ time: '24/09/2026', from: null, to: 'Dr. Le Thi An', by: 'Nguyen Van Binh', reason: "Assign initial examination" }] },
    healthStatus: 'Pending Vet', trainingStatus: 'Pending Approval', approvalStatus: 'pending', lifecycle: 'pending',
    registrationDate: '24/09/2026', approvedAt: null, totalRaces: 0, wins: 0, vetClearance: false,
    sire: 'Muscat', dam: 'Night Pearl', medicalHistory: "Mild bronchitis in 2024, resolved.",
    biography: "Young horse registered at the center by its owner.", imageUrl: 'https://images.unsplash.com/photo-1598974357801-cbca100e65d3?w=700&h=500&fit=crop&auto=format',
    identityVerified: true, identityEvidence: { url: '', note: "Microchip card checked at the stable." },
    achievements: [], raceHistory: [],
  },
  {
    id: 'HRS-000005', name: 'Golden Dawn', breed: 'Quarter Horse', age: 6, color: 'Palomino',
    gender: "Stallion", birthDate: '02/02/2020', microchip: '704100000777888', weight: 540, height: 158, stable: '', stall: '',
    clubId: null, ownerId: 'u7', ownerName: 'Pham Thi Lan',
    headTrainerId: '', headTrainerName: '', groomId: '', groomName: '', vetId: 'u4', vetName: 'Dr. Le Thi An', vetAssign: { status: 'accepted', history: [{ time: '23/09/2026', from: null, to: 'Dr. Le Thi An', by: 'Nguyen Van Binh', reason: "Assign initial examination" }, { time: '23/09/2026', from: 'Dr. Le Thi An', to: 'Dr. Le Thi An', by: 'Dr. Le Thi An', reason: "Accepted: examination slot available" }] },
    healthStatus: 'Pending Vet', trainingStatus: 'Pending Approval', approvalStatus: 'pending', lifecycle: 'pending',
    registrationDate: '25/09/2026', approvedAt: null, totalRaces: 0, wins: 0, vetClearance: false,
    sire: 'Dash for Cash', dam: 'Honey Bee', medicalHistory: "None.",
    biography: "Young horse registered at the center by its owner.", imageUrl: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=700&h=500&fit=crop&auto=format',
    identityVerified: true, identityEvidence: { url: '', note: "Microchip card checked at the stable." },
    achievements: [], raceHistory: [],
  },
  {
    id: 'HRS-000006', name: 'Red Comet', breed: 'Thoroughbred', age: 5, color: 'Chestnut',
    gender: "Stallion", birthDate: '19/09/2021', microchip: '704100000999111', weight: 505, height: 162, stable: '', stall: '',
    clubId: null, ownerId: 'u7', ownerName: 'Pham Thi Lan',
    headTrainerId: '', headTrainerName: '', groomId: '', groomName: '', vetId: 'u4', vetName: 'Dr. Le Thi An', vetAssign: { status: 'accepted', history: [{ time: '23/09/2026', from: null, to: 'Dr. Le Thi An', by: 'Nguyen Van Binh', reason: "Assign initial examination" }, { time: '23/09/2026', from: 'Dr. Le Thi An', to: 'Dr. Le Thi An', by: 'Dr. Le Thi An', reason: "Accepted: examination slot available" }] },
    healthStatus: 'Pending Vet', trainingStatus: 'Pending Approval', approvalStatus: 'pending', lifecycle: 'pending',
    registrationDate: '26/09/2026', approvedAt: null, totalRaces: 0, wins: 0, vetClearance: false,
    intakeExamId: 'MED-000004', sire: 'Fastnet Rock', dam: 'Red Ember', medicalHistory: "No significant medical history.",
    biography: "Young horse registered at the center by its owner.", imageUrl: 'https://images.unsplash.com/photo-1566288623394-377af472d81b?w=700&h=500&fit=crop&auto=format',
    identityVerified: true, identityEvidence: { url: '', note: "Microchip card checked at the stable." },
    achievements: [], raceHistory: [],
  },
];

export const MEDICAL_RECORDS: HealthRecord[] = [
  {
    id: 'MED-000001', horseId: 'HRS-000001', date: '22/09/2026', type: "Routine examination", vet: 'Dr. Le Thi An',
    notes: "All measurements excellent. Horse in peak condition and ready to race.",
    result: 'Eligible', medications: "Vitamin E 500 IU/day", isPostTraining: false, vetClearanceGranted: true,
    decision: 'eligible', status: 'confirmed', trainingEligibility: 'eligible',
    vitals: { heartRate: '32', temperature: '37.7', weight: '512', respRate: '11', bloodPressure: '108/68' },
    diagnosis: "Excellent overall health. No cardiovascular or musculoskeletal abnormalities.",
    recommendations: "Continue the race preparation program. Daily vitamin E and electrolyte supplementation.",
  },
  {
    id: 'MED-000002', horseId: 'HRS-000001', date: '20/08/2026', type: "Vaccination", vet: 'Dr. Le Thi An',
    notes: "Routine equine influenza and tetanus vaccination. Normal response.",
    result: 'Completed', medications: 'EIV Vaccine + Tetanus Toxoid', isPostTraining: false, vetClearanceGranted: false,
    vitals: { heartRate: '38', temperature: '38.0', weight: '510', respRate: '13', bloodPressure: '112/72' },
    diagnosis: "Routine vaccinations completed on schedule.",
    recommendations: "Light rest for 24 hours after vaccination. Monitor for reactions.", status: 'confirmed',
  },
  {
    id: 'MED-000003', horseId: 'HRS-000002', date: '21/09/2026', type: "Injury examination", vet: 'Dr. Le Thi An',
    notes: "Right forelimb collateral ligament injury detected. Clear swelling and pain response.",
    result: 'Injured', medications: "NSAID (Phenylbutazone 4.4 mg/kg) · Ice pack 20 minutes three times daily · Support bandage",
    isPostTraining: false, vetClearanceGranted: false,
    vitals: { heartRate: '52', temperature: '38.9', weight: '598', respRate: '18', bloodPressure: '128/85' },
    diagnosis: "Grade II right forelimb ligament injury. Ultrasound confirms collagen fiber damage.",
    recommendations: "No exercise for 4 weeks. Hydrotherapy twice daily. Re-examine after 2 weeks. Weight reduction of 20–30 kg needed.",
    decision: 'not-eligible', status: 'confirmed', trainingEligibility: 'not-eligible', decisionReason: "Grade II ligament injury; stop training and rehabilitate before re-examination.",
  },
];

export const INTAKE_RECORDS: HealthRecord[] = [
  {
    id: 'MED-000004', horseId: 'HRS-000006', date: '24/09/2026', type: "Intake examination", vet: 'Dr. Le Thi An', vetId: 'u4', intake: true,
    notes: "All examination regions are normal.", result: 'Eligible', medications: '', isPostTraining: false, vetClearanceGranted: true,
    vitals: { heartRate: '34', temperature: '37.9', weight: '505', respRate: '12', bloodPressure: '' },
    decision: 'eligible', status: 'confirmed', conclusion: "Red Comet is healthy, with vital signs within reference ranges and fit for training.",
    diagnosis: "No abnormalities detected.", recommendations: "Monitor weight weekly.", autoEvaluation: 'pass',
  },
];

export const TRAINING_PLANS: TrainingPlan[] = [
  {
    id: 'PLN-000001', horseId: 'HRS-000001', phase: "Race preparation",
    startDate: '01/09/2026', endDate: '31/10/2026',
    distance: '1200m', workload: 'High', surface: "Grass",
    goals: 'Improve sprint speed and prepare for the Autumn Grand Prix on Oct 15',
    status: 'Active', locked: false, createdBy: 'Nguyen Minh Tuan', progress: 65,
    weeklyKm: 42, sessionsPerWeek: 5, restDaysPerWeek: 2, intensityScore: 88,
    algorithmRationale: "Excellent health (Eligible) · Peak age 5 years · Resting heart rate 32 bpm (good cardiovascular fitness)",
  },
];

export const TRAINING_SESSIONS: TrainingSession[] = [
  {
    id: 'SES-000001', horseId: 'HRS-000001', planId: 'PLN-000001', date: '25/09/2026', time: '09:00',
    type: "Interval sprints", trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Scheduled', distance: '4 × 200m', targetTime: '23s/rep',
    notes: "Focus on gate starts and finishing sprints", conflictChecked: true,
  },
  {
    id: 'SES-000002', horseId: 'HRS-000001', planId: 'PLN-000001', date: '23/09/2026', time: '08:00',
    type: "Race-pace run", trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Completed', distance: '1200m', targetTime: '74s',
    notes: "Maintain a good rhythm and focus on turns", conflictChecked: true, postExamDone: true,
    attendance: { status: 'present', at: '23/09/2026 08:00' },
    result: { time: '73.8s', speed: '58.6', heartRate: 188, notes: "Excellent performance — a new personal best!", performanceScore: 94 },
  },
  {
    id: 'SES-000003', horseId: 'HRS-000001', planId: 'PLN-000001', date: '21/09/2026', time: '07:00',
    type: "Recovery jog", trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Completed', distance: '3000m', targetTime: '—',
    notes: "Active recovery after sprint intervals", conflictChecked: true, postExamDone: true,
    attendance: { status: 'present', at: '21/09/2026 07:00' },
    result: { time: '—', speed: '20.4', heartRate: 138, notes: "Relaxed, with no signs of fatigue", performanceScore: 82 },
  },
  {
    id: 'SES-000004', horseId: 'HRS-000001', planId: 'PLN-000001', date: '18/09/2026', time: '07:30',
    type: "Tempo run", trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Completed', distance: '1600m', targetTime: '1:55',
    notes: "Maintain a steady rhythm in zone Z3", conflictChecked: true, postExamDone: false,
    attendance: { status: 'present', at: '18/09/2026 07:30' },
    result: { time: '1:54.6', speed: '50.1', heartRate: 176, notes: "Steady breathing and good pace", performanceScore: 88 },
  },
  {
    id: 'SES-000005', horseId: 'HRS-000001', planId: 'PLN-000001', date: '16/09/2026', time: '07:00',
    type: "Aerobic endurance run", trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Completed', distance: '2400m', targetTime: '—',
    notes: "Build aerobic endurance while keeping heart rate low", conflictChecked: true, postExamDone: true,
    attendance: { status: 'present', at: '16/09/2026 07:00' },
    result: { time: '—', speed: '33.5', heartRate: 152, notes: "Completed the full distance with rapid recovery", performanceScore: 85 },
  },
  {
    id: 'SES-000006', horseId: 'HRS-000001', planId: 'PLN-000001', date: '14/09/2026', time: '08:00',
    type: "Interval sprints", trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Completed', distance: '4 × 200m', targetTime: '23s/rep',
    notes: "Practice starts and finishing acceleration", conflictChecked: true, postExamDone: true,
    attendance: { status: 'present', at: '14/09/2026 08:00' },
    result: { time: '22.9s/rep', speed: '62.9', heartRate: 192, notes: "Good acceleration; starts need improvement", performanceScore: 90 },
  },
  {
    id: 'SES-000007', horseId: 'HRS-000001', planId: 'PLN-000001', date: '12/09/2026', time: '07:00',
    type: "Recovery jog", trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Not Performed', distance: '3000m', targetTime: '—',
    notes: "Not performed because the horse was absent", conflictChecked: true,
    attendance: { status: 'absent', at: '12/09/2026 07:00', note: "Owner reports the horse needs additional rest and condition monitoring." },
  },
  {
    id: 'SES-000008', horseId: 'HRS-000001', planId: 'PLN-000001', date: '26/09/2026', time: '07:30',
    type: "Aerobic endurance run", trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Scheduled', distance: '2400m', targetTime: '—',
    notes: "According to the weekly plan", conflictChecked: true,
  },
  {
    id: 'SES-000009', horseId: 'HRS-000001', planId: 'PLN-000001', date: '28/09/2026', time: '08:00',
    type: "Interval sprints", trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Scheduled', distance: '4 × 200m', targetTime: '23s/rep',
    notes: "According to the weekly plan", conflictChecked: true,
  },
  {
    id: 'SES-000010', horseId: 'HRS-000001', planId: 'PLN-000001', date: '29/09/2026', time: '07:00',
    type: "Recovery jog", trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Scheduled', distance: '3000m', targetTime: '—',
    notes: "According to the weekly plan", conflictChecked: true,
  },
  {
    id: 'SES-000011', horseId: 'HRS-000001', planId: 'PLN-000001', date: '30/09/2026', time: '08:00',
    type: "Race-pace run", trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Scheduled', distance: '1200m', targetTime: '74s',
    notes: "According to the weekly plan", conflictChecked: true,
  },
  {
    id: 'SES-000012', horseId: 'HRS-000001', planId: 'PLN-000001', date: '02/10/2026', time: '07:30',
    type: "Tempo run", trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Scheduled', distance: '1600m', targetTime: '1:55',
    notes: "According to the weekly plan", conflictChecked: true,
  },
  {
    id: 'SES-000013', horseId: 'HRS-000001', planId: 'PLN-000001', date: '03/10/2026', time: '07:00',
    type: "Aerobic endurance run", trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Scheduled', distance: '2400m', targetTime: '—',
    notes: "According to the weekly plan", conflictChecked: true,
  },
  {
    id: 'SES-000014', horseId: 'HRS-000001', planId: 'PLN-000001', date: '05/10/2026', time: '08:00',
    type: "Interval sprints", trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Scheduled', distance: '4 × 200m', targetTime: '23s/rep',
    notes: "According to the weekly plan", conflictChecked: true,
  },
  {
    id: 'SES-000015', horseId: 'HRS-000001', planId: 'PLN-000001', date: '06/10/2026', time: '07:00',
    type: "Recovery jog", trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Scheduled', distance: '3000m', targetTime: '—',
    notes: "According to the weekly plan", conflictChecked: true,
  },
  {
    id: 'SES-000016', horseId: 'HRS-000001', planId: 'PLN-000001', date: '07/10/2026', time: '08:00',
    type: "Race-pace run", trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Scheduled', distance: '1200m', targetTime: '74s',
    notes: "According to the weekly plan", conflictChecked: true,
  },
];

export const PERFORMANCE_DATA = [
  { month: 'Apr', speed: 54.2, fitness: 72, heartRate: 178 },
  { month: 'May', speed: 55.8, fitness: 76, heartRate: 182 },
  { month: 'Jun', speed: 56.4, fitness: 79, heartRate: 180 },
  { month: 'Jul', speed: 57.9, fitness: 83, heartRate: 176 },
  { month: 'Aug', speed: 57.2, fitness: 81, heartRate: 179 },
  { month: 'Sep', speed: 58.6, fitness: 87, heartRate: 185 },
];

export const GROOM_TASKS = [
  { id: 'gt1', horseId: 'HRS-000001', date: '25/09/2026', type: "Morning feeding", time: '06:00', description: "5 kg grain mix + 3 kg hay + Vitamin E", status: 'Pending', completedAt: null },
  { id: 'gt2', horseId: 'HRS-000001', date: '25/09/2026', type: "Grooming", time: '07:00', description: "Full coat brushing, hoof cleaning, mane and tail grooming", status: 'Pending', completedAt: null },
  { id: 'gt3', horseId: 'HRS-000001', date: '25/09/2026', type: "Stable cleaning", time: '08:00', description: "Remove waste, replace bedding and disinfect the floor", status: 'Pending', completedAt: null },
  { id: 'gt4', horseId: 'HRS-000001', date: '25/09/2026', type: "Midday feeding", time: '12:00', description: "3 kg grain + check drinking water (at least 15 L)", status: 'Pending', completedAt: null },
  { id: 'gt5', horseId: 'HRS-000001', date: '25/09/2026', type: "Relaxed walking", time: '14:00', description: "20 minutes of light walking on grass", status: 'Pending', completedAt: null },
  { id: 'gt6', horseId: 'HRS-000001', date: '25/09/2026', type: "Evening feeding", time: '18:00', description: "5 kg grain + ORS electrolytes + 4 kg hay", status: 'Pending', completedAt: null },
  { id: 'gt7', horseId: 'HRS-000002', date: '25/09/2026', type: 'Hydrotherapy', time: '09:00', description: "Immerse the right forelimb in cold water for 20 minutes", status: 'Pending', completedAt: null },
  { id: 'gt8', horseId: 'HRS-000002', date: '25/09/2026', type: "Bandage change", time: '10:00', description: "Replace the right forelimb support bandage and check swelling", status: 'Pending', completedAt: null },
];

export const NOTIFICATIONS: AppNotification[] = [
  { id: 'n1', type: 'health', message: "Thunder King (HRS-000001) — Routine health check due within 7 days", time: "2 hours ago", read: false },
  { id: 'n2', type: 'training', message: "Race-Pace 1200 m session result: 73.8 s — A new personal best!", time: "4 hours ago", read: false },
  { id: 'n3', type: 'health', message: "Storm Wreck (HRS-000002) — Re-examination needed after 2 weeks of injury treatment", time: "1 day ago", read: false },
  { id: 'n4', type: 'race', message: 'Autumn Grand Prix on Oct 15 — registration closes in 5 days', time: '1 day ago', read: true },
  { id: 'n5', type: 'system', message: "A new staff account was created by an administrator with a temporary password", time: "2 days ago", read: true },
];

export const SEED_ENROLLMENTS: Enrollment[] = [
  {
    id: 'ENR-000001', horseId: 'HRS-000001', packageId: 'PKG-000002', packageName: "Performance",
    sessionsTotal: 24, sessionsDone: 6, status: 'active', trainerId: 'u2', trainerName: 'Nguyen Minh Tuan',
    trainerStatus: 'confirmed',
    assignHistory: [
      { time: '30/07/2026', kind: 'assign', from: null, to: 'Nguyen Minh Tuan', by: 'Nguyen Van Binh', reason: "Initial assignment" },
      { time: '31/07/2026', kind: 'confirm', from: null, to: 'Nguyen Minh Tuan', by: 'Nguyen Minh Tuan', reason: "Accept training assignment" },
    ],
    startedAt: '30/07/2026', expiresAt: '08/10/2026', amount: 36000000, paidAt: '30/07/2026 09:15',
    paymentMethod: "Simulated payment", ownerName: 'Nguyen Van An', scheduleConfirmed: true,
  },
];

// ── Groom: kho vật tư, khẩu phần, chăm sóc, sự cố ────────────────────────────

export type InvCategory = 'food' | 'medical' | 'tool';
export type FoodKind = 'grain' | 'hay' | 'vitamin' | 'other';
export type InvUnit = 'kg' | "liters" | "packages" | "items";

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

export interface RationMeal { meal: "Morning" | "Noon" | "Evening"; time: string; grain: number; hay: number; vitamin: number; vitaminName: string; water: number }
export interface Ration { approvedBy: string; approvedAt: string; meals: RationMeal[] }

export const RATIONS: Record<string, Ration> = {
  'HRS-000001': { approvedBy: 'Dr. Le Thi An', approvedAt: '15/09/2026', meals: [
    { meal: "Morning", time: '06:00', grain: 5, hay: 3, vitamin: 1, vitaminName: 'Vitamin E', water: 20 },
    { meal: "Noon", time: '12:00', grain: 3, hay: 2, vitamin: 0, vitaminName: '', water: 15 },
    { meal: "Evening", time: '18:00', grain: 5, hay: 4, vitamin: 1, vitaminName: 'Omega 3', water: 20 },
  ] },
  'HRS-000002': { approvedBy: 'Dr. Le Thi An', approvedAt: '21/09/2026', meals: [
    { meal: "Morning", time: '06:30', grain: 4, hay: 2, vitamin: 1, vitaminName: "Collagen for tendon support", water: 15 },
    { meal: "Noon", time: '12:30', grain: 2, hay: 2, vitamin: 0, vitaminName: '', water: 15 },
    { meal: "Evening", time: '18:30', grain: 4, hay: 3, vitamin: 1, vitaminName: "Collagen for tendon support", water: 15 },
  ] },
};

export const SEED_INVENTORY: InvItem[] = [
  { id: 'inv1', clubId: 'c1', name: "Grain mix", category: 'food', foodKind: 'grain', unit: 'kg', qty: 40, threshold: 15 },
  { id: 'inv2', clubId: 'c1', name: "Timothy hay", category: 'food', foodKind: 'hay', unit: 'kg', qty: 60, threshold: 20 },
  { id: 'inv3', clubId: 'c1', name: "Multivitamins", category: 'food', foodKind: 'vitamin', unit: "packages", qty: 12, threshold: 5 },
  { id: 'inv4', clubId: 'c1', name: "Support bandage roll", category: 'medical', unit: "items", qty: 10, threshold: 4 },
  { id: 'inv5', clubId: 'c1', name: "Antiseptic solution", category: 'medical', unit: "liters", qty: 3, threshold: 1 },
  { id: 'inv6', clubId: 'c1', name: 'Phenylbutazone (NSAID)', category: 'medical', unit: "packages", qty: 8, threshold: 3 },
  { id: 'inv7', clubId: 'c1', name: "Ice", category: 'medical', unit: 'kg', qty: 30, threshold: 10 },
  { id: 'inv8', clubId: 'c1', name: "Hoof pick", category: 'tool', unit: "items", qty: 6, threshold: 2 },
  { id: 'inv9', clubId: 'c1', name: "Stable shovel", category: 'tool', unit: "items", qty: 4, threshold: 2 },
];

export const SEED_INV_LOGS: InvLog[] = SEED_INVENTORY.map((i, n) => ({
  id: `il-seed${n}`, clubId: i.clubId, itemId: i.id, itemName: i.name, unit: i.unit, kind: 'in' as const,
  delta: i.qty, balance: i.qty, reason: "Opening balance", byId: 'u5', byName: 'Le Van Nam',
  date: '20/09/2026', at: '20/09/2026 08:00', ts: 1_000 + n,
}));
