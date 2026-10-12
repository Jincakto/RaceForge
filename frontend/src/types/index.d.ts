// Shared domain types (editor IntelliSense for the JS code base).
// Enable with `// @ts-check` or `"checkJs": true` in jsconfig.json.

export type Role = 'manager' | 'head_trainer' | 'veterinarian' | 'groom' | 'owner';

export interface AppUser {
  id: number;
  name: string;
  email: string;
  password: string;
  avatar: string;
  role: Role | null;
  clubId: number | null;
  status: 'active' | 'pending';
  phone?: string;
  bio?: string;
  experience?: string; // for head_trainer
  certifications?: string; // for head_trainer / vet
  achievements?: string; // for head_trainer
  verified: boolean;
}

export interface Club {
  id: number;
  name: string;
  location: string;
  description: string;
  managerId: number;
  managerName: string;
  memberCount: number;
  founded: string;
  logoLetter: string;
}

export interface MemberRequest {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  userAvatar: string;
  userRole: Role | null;
  clubId: number;
  requestedAt: string;
  expiresAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  assignedRole: Role | null;
}

export type HealthStatus = 'Eligible' | 'Monitor' | 'Injured' | 'Retired' | 'Pending Vet';

export type TrainingStatus = 'Active' | 'Resting' | 'Inactive' | 'Pending Approval';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface Achievement {
  id: number;
  date: string;
  title: string;
  description: string;
  prize?: string;
  position?: number;
}

export interface RaceHistoryEntry {
  id: number;
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

export interface HorseLock {
  reason: string;
  notes: string;
  lockedAt: string;
  lockedById: number;
  lockedByName: string;
}

export type InjurySeverity = 'mild' | 'moderate' | 'severe';

export interface InjuryDetail {
  issue: string;
  severity: InjurySeverity;
}

export interface HorseRehab {
  packageId: number;
  name: string;
  durationWeeks: number;
  activatedAt: string;
  activatedBy: string;
}

export interface TrainingPackage {
  id: number;
  name: string;
  tagline: string;
  sessions: number;
  weeks: number;
  price: string;
  focus: string[];
  popular?: boolean;
}

export interface RehabPackage {
  id: number;
  name: string;
  description: string;
  weeks: number;
  items: string[];
}

export interface Enrollment {
  id: number;
  horseId: number;
  packageId: number;
  packageName: string;
  sessionsTotal: number;
  sessionsDone: number;
  status: 'pending' | 'active' | 'paused' | 'completed' | 'cancelled';
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED';
  packageType?: string;
  remainingDays?: number | null;
  replacedHorsePackageId?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  trainerId: number;
  trainerName: string;
  startedAt: string;
  pausedAt?: string;
  pauseReason?: string;
  scheduleConfirmed: boolean;
}

export interface AppNotification {
  id: number;
  type: string;
  message: string;
  time: string;
  read: boolean;
  toRoles?: Role[];
  toUserIds?: number[];
  clubId?: number;
  action?: string;
  horseId?: number;
}

export interface Horse {
  backendHealthStatus?: 'READY' | 'INJURED' | 'QUARANTINED' | null;
  trainingLocked?: boolean;
  id: number;
  name: string;
  breed: string;
  age: number;
  color: string;
  gender: string;
  weight: number;
  height: number;
  stable: string;
  stall: string;
  clubId: number | null;
  ownerId: number;
  ownerName: string;
  headTrainerId: number;
  headTrainerName: string;
  vetId: number;
  vetName: string;
  groomId: number;
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
  damSire?: string;
  medicalHistory?: string;
  lock?: HorseLock | null;
  rehab?: HorseRehab | null;
  recoveryBadge?: { date: string; note: string } | null;
}

export interface HorseClubRequest {
  id: number;
  horseId: number;
  horseName: string;
  horseBreed: string;
  horseImageUrl: string;
  ownerId: number;
  ownerName: string;
  clubId: number;
  submittedAt: string;
  expiresAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  reviewNote: string;
}

export interface TrainingPlan {
  id: number;
  horseId: number;
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
  id: number;
  horseId: number;
  planId: number;
  date: string;
  time: string;
  type: string;
  trainerName: string;
  trainerId: number;
  assignedStaffIds: number[];
  assignedStaffNames: string[];
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'In Progress' | 'Not Performed';
  distance: string;
  targetTime: string;
  notes: string;
  conflictChecked: boolean;
  voidedByLock?: boolean;
  postExamDone?: boolean;
  result?: {
    time: string;
    speed: string;
    heartRate: number;
    notes: string;
    performanceScore: number;
  };
}

export interface HealthRecord {
  status?: 'DRAFT' | 'CONFIRMED';
  veterinarianId?: number;
  examType?: 'INITIAL' | 'PERIODIC' | 'FOLLOW_UP';
  healthStatus?: 'READY' | 'INJURED' | 'QUARANTINED' | null;
  systemNote?: string;
  confirmedAt?: string | null;
  id: number;
  horseId: number;
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
  autoEvaluation?: 'pass' | 'watch' | 'fail' | 'incomplete';
  autoNote?: string;
  diagnosis?: string;
  recommendations?: string;
  // Linked IDs snapshotted at exam time for audit history
  ownerId?: number;
  headTrainerId?: number;
  managerId?: number;
  // Auto-derived training eligibility (Section 6)
  trainingEligibility?: 'eligible' | 'conditional' | 'not-eligible';
  trainingReasons?: string[];
  trainingAdjustments?: string[];
  trainingNote?: string;
  nutritionSuggestions?: { category: string; items: string[]; note: string }[];
  // Unix ms timestamp set at INSERT time — used as secondary sort key (same exam date → newer record first)
  createdAt?: number;
}

// Based on: Seiler's 80/20 Polarized Training model + FEI equine science guidelines
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

export type InvCategory = 'food' | 'medical' | 'tool';

export type FoodKind = 'grain' | 'hay' | 'vitamin' | 'other';

export type InvUnit = 'kg' | 'lít' | 'gói' | 'cái';

export interface InvItem {
  id: number; clubId: number; name: string; category: InvCategory; foodKind?: FoodKind;
  unit: InvUnit; qty: number; threshold: number;
}

export interface InvLog {
  id: number; clubId: number; itemId: number; itemName: string; unit: string;
  kind: 'in' | 'out' | 'refund' | 'adjust' | 'edit';
  delta: number; balance: number;
  horseId?: number; horseName?: string; task?: string; reason?: string;
  byId: number; byName: string; date: string; at: string; ts: number;
}

export interface CareRecord {
  id: number; clubId: number; horseId: number; date: string; taskKey: string; taskLabel: string;
  doneAt: string; byName: string;
  deductions: { itemId: number; itemName: string; unit: string; qty: number }[];
}

export interface Incident {
  id: number; clubId: number; horseId: number; horseName: string;
  type: string; description: string; imageUrl: string;
  reportedById: number; reportedByName: string; at: string; date: string;
}

export interface RationMeal { meal: 'Sáng' | 'Trưa' | 'Tối'; time: string; grain: number; hay: number; vitamin: number; vitaminName: string; water: number }

export interface Ration { approvedBy: string; approvedAt: string; meals: RationMeal[] }

export type Page =
  | 'home' | 'login' | 'register' | 'onboarding' | 'join-center' | 'pending'
  | 'dashboard' | 'horse-list' | 'horse-detail' | 'horse-create' | 'horse-edit'
  | 'my-horses' | 'center-requests' | 'trainer-select'
  | 'trainer-profile'
  | 'health-records' | 'vet-health-form'
  | 'training-hub' | 'care-hub'
  | 'performance' | 'race-results' | 'reports'
  | 'staff' | 'member-requests' | 'notifications' | 'profile'
  | 'api-workflow' | 'training-register' | 'post-exam' | 'rehab-center' | 'inventory' | 'inventory-log';

export interface AppState {
  user: AppUser | null;
  users: AppUser[];
  clubs: Club[];
  memberRequests: MemberRequest[];
  horses: Horse[];
  horseClubRequests: HorseClubRequest[];
  healthRecords: HealthRecord[];
  trainingPlans: TrainingPlan[];
  trainingSessions: TrainingSession[];
  inventory: InvItem[];
  invLogs: InvLog[];
  careRecords: CareRecord[];
  incidents: Incident[];
  notifications: AppNotification[];
  enrollments: Enrollment[];
  errorMsg: string | null;
  selectedHorseId: number;
  trainerSelectHorseId: number | null;
  viewTrainerId: number | null;
  showSuccess: string | null;
  userPermissions: Record<number, Page[]>;
}

export type CareResult = { ok: true } | { ok: false; message: string; shortages: { itemId: number; name: string; have: number; need: number; unit: string }[] };

export type SupplyLine = { itemId: number; qty: number };

export type TEStatus = 'incomplete' | 'eligible' | 'conditional' | 'not-eligible';

export interface NutritionSuggestion { category: string; items: string[]; note: string; }

export interface TrainingEligResult {
  status: TEStatus;
  reasons: string[];
  adjustments: string[];
  trainingNote: string;
  nutritionSuggestions: NutritionSuggestion[];
}
