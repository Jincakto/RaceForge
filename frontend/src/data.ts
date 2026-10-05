export type Role = 'manager' | 'head_trainer' | 'veterinarian' | 'groom' | 'owner';

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

export interface Horse {
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
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'In Progress';
  distance: string;
  targetTime: string;
  notes: string;
  conflictChecked: boolean;
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
    } else if (hr <= 44) {
      score += 8; rationale.push(`Nhịp tim nghỉ ${hr} bpm — bình thường`);
    } else {
      score -= 5; warnings.push(`Nhịp tim nghỉ ${hr} bpm cao — cần đánh giá lại tim mạch trước khi tăng tải`);
    }
    if (temp > 38.5) { score -= 10; warnings.push(`Nhiệt độ ${temp}°C — dấu hiệu viêm nhiễm, tạm ngưng tập luyện`); }
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
    return buildPlan('Competition Prep', finalScore, {
      weeklyKm: 42, sessions: 5, rest: 2, hi: 30, lo: 70,
      schedule: [
        { day: 'Thứ 2', type: 'Sprint Interval', distance: '4 × 200m', intensity: 'Rất cao', zone: 'Z4–Z5' },
        { day: 'Thứ 3', type: 'Recovery Trot', distance: '3000m', intensity: 'Thấp', zone: 'Z1' },
        { day: 'Thứ 4', type: 'Race-Pace Gallop', distance: '1200m', intensity: 'Cao', zone: 'Z4' },
        { day: 'Thứ 5', type: 'Nghỉ / Đi bộ nhẹ', distance: '600m', intensity: 'Nghỉ', zone: 'Z0' },
        { day: 'Thứ 6', type: 'Tempo Gallop', distance: '1600m', intensity: 'TB-Cao', zone: 'Z3' },
        { day: 'Thứ 7', type: 'Endurance Base', distance: '2400m', intensity: 'Trung bình', zone: 'Z2' },
        { day: 'CN', type: 'Nghỉ hoàn toàn', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
      ],
      rationale, warnings,
      twelveWeek: buildTwelveWeek(38, 'Competition Prep'),
    });
  }
  if (finalScore >= 65) {
    return buildPlan('Base Building', finalScore, {
      weeklyKm: 30, sessions: 4, rest: 3, hi: 20, lo: 80,
      schedule: [
        { day: 'Thứ 2', type: 'Aerobic Trot', distance: '2000m', intensity: 'Thấp-TB', zone: 'Z2' },
        { day: 'Thứ 3', type: 'Nghỉ / Đi bộ', distance: '500m', intensity: 'Nghỉ', zone: 'Z0' },
        { day: 'Thứ 4', type: 'Fartlek', distance: '1600m', intensity: 'TB-Cao', zone: 'Z3' },
        { day: 'Thứ 5', type: 'Nghỉ hoàn toàn', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
        { day: 'Thứ 6', type: 'Easy Gallop', distance: '1200m', intensity: 'Trung bình', zone: 'Z2' },
        { day: 'Thứ 7', type: 'Long Easy Run', distance: '2800m', intensity: 'Thấp', zone: 'Z1–Z2' },
        { day: 'CN', type: 'Nghỉ hoàn toàn', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
      ],
      rationale, warnings,
      twelveWeek: buildTwelveWeek(24, 'Base Building'),
    });
  }
  if (finalScore >= 42) {
    return buildPlan('Foundation', finalScore, {
      weeklyKm: 18, sessions: 3, rest: 4, hi: 10, lo: 90,
      schedule: [
        { day: 'Thứ 2', type: 'Walk + Trot', distance: '1500m', intensity: 'Rất thấp', zone: 'Z1' },
        { day: 'Thứ 3', type: 'Nghỉ', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
        { day: 'Thứ 4', type: 'Easy Trot', distance: '1200m', intensity: 'Thấp', zone: 'Z1' },
        { day: 'Thứ 5', type: 'Nghỉ', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
        { day: 'Thứ 6', type: 'Light Canter', distance: '1000m', intensity: 'Thấp', zone: 'Z2' },
        { day: 'Thứ 7', type: 'Nghỉ', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
        { day: 'CN', type: 'Nghỉ', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
      ],
      rationale, warnings,
      twelveWeek: buildTwelveWeek(14, 'Foundation'),
    });
  }
  return buildPlan('Recovery', finalScore, {
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
    twelveWeek: buildTwelveWeek(5, 'Recovery'),
  });
}

function buildTwelveWeek(baseKm: number, phase: string) {
  const phases: Record<string, string[]> = {
    'Competition Prep': ['Nền tảng', 'Nền tảng', 'Xây dựng', 'Xây dựng', 'Xây dựng', 'Tăng cường độ', 'Tăng cường độ', 'Tăng cường độ', 'Đỉnh cao', 'Đỉnh cao', 'Taper', 'Thi đấu'],
    'Base Building': ['Khởi động', 'Xây dựng', 'Xây dựng', 'Duy trì', 'Tăng cường', 'Tăng cường', 'Nghỉ giữa kỳ', 'Tăng dần', 'Tăng dần', 'Đỉnh Base', 'Ổn định', 'Chuyển tiếp'],
    'Foundation': ['Thích nghi', 'Thích nghi', 'Xây dựng nhẹ', 'Xây dựng nhẹ', 'Duy trì', 'Duy trì', 'Phát triển', 'Phát triển', 'Ổn định', 'Ổn định', 'Đánh giá', 'Chuyển tiếp'],
    'Recovery': ['Nghỉ tích cực', 'Nghỉ tích cực', 'Phục hồi nhẹ', 'Phục hồi nhẹ', 'Đánh giá', 'Tái khởi động', 'Tái khởi động', 'Foundation nhẹ', 'Foundation nhẹ', 'Ổn định', 'Ổn định', 'Chuyển tiếp'],
  };
  const multipliers = [0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.85, 1.0, 1.05, 1.1, 0.8, 0.7];
  const focusArr = phases[phase] || phases['Foundation'];
  return Array.from({ length: 12 }, (_, i) => ({
    week: i + 1,
    focus: focusArr[i],
    volumeKm: Math.round(baseKm * multipliers[i]),
    intensityNote: i % 3 === 2 ? 'Tuần giảm tải 15%' : i >= 9 && phase === 'Competition Prep' ? 'Taper + mô phỏng đua' : 'Tăng dần 10%/tuần',
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
  // Manager
  {
    id: 'u1', name: 'Nguyen Van Binh', email: 'manager@raceforce.vn', password: '123456',
    role: 'manager', clubId: 'c1', status: 'active', avatar: 'NB', verified: true,
    phone: '0901 234 567',
    bio: 'Quản lý trung tâm huấn luyện với 10 năm kinh nghiệm trong ngành đua ngựa chuyên nghiệp.',
  },
  // Head Trainer
  {
    id: 'u2', name: 'Nguyen Minh Tuan', email: 'trainer@raceforce.vn', password: '123456',
    role: 'head_trainer', clubId: 'c1', status: 'active', avatar: 'NT', verified: true,
    phone: '0912 345 678',
    bio: 'Head Trainer với 12 năm kinh nghiệm huấn luyện ngựa đua Thoroughbred và Arabian.',
    experience: '12 năm huấn luyện ngựa đua · Trước đây làm tại Happy Valley (HK)',
    certifications: 'FEI Level 3 Trainer · BHS Stage 4 · Certified Equine Fitness Trainer',
    achievements: 'Đã đào tạo 3 nhà vô địch quốc gia · Tỷ lệ thắng trung bình của ngựa được huấn luyện: 62%',
  },
  // Head Trainer 2 (chưa vào trung tâm — chờ manager duyệt)
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
    bio: 'Chủ ngựa đua với đam mê thể thao kỵ mã. Sở hữu 2 ngựa đua tại Saigon Racing Center.',
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
    id: 'c1', name: 'Saigon Racing Center', location: 'TP. Hồ Chí Minh',
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

export const SEED_HORSE_CLUB_REQUESTS: HorseClubRequest[] = [];

// ── Demo Horses ───────────────────────────────────────────────────────────────
// Horse 1: Thunder King — ALL GREEN (sức khỏe hoàn hảo, thành tích xuất sắc)
// Horse 2: Storm Wreck  — ALL RED  (chấn thương, sức khỏe kém, nhiều vấn đề)

export const HORSES: Horse[] = [
  {
    id: 'RH-001', name: 'Thunder King', breed: 'Thoroughbred', age: 5, color: 'Bay',
    gender: 'Stallion', weight: 512, height: 163, stable: 'Stable A', stall: 'A-12',
    clubId: 'c1', ownerId: 'u6', ownerName: 'Nguyen Van An',
    headTrainerId: 'u2', headTrainerName: 'Nguyen Minh Tuan',
    vetId: 'u4', vetName: 'Dr. Le Thi An', groomId: 'u5', groomName: 'Le Van Nam',
    healthStatus: 'Eligible', trainingStatus: 'Active',
    approvalStatus: 'approved', registrationDate: '15/03/2021', approvedAt: '20/03/2021',
    totalRaces: 12, wins: 7, vetClearance: true,
    biography: 'Thoroughbred giống thuần chủng nhập từ Úc năm 2021. Tiếng là nước rút xuất sắc ở chặng cuối, nhịp tim hồi phục nhanh sau cường độ cao. Tốc độ đỉnh 59.9 km/h.',
    imageUrl: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=700&h=500&fit=crop&auto=format',
    achievements: [
      { id: 'a1', date: '10/09/2026', title: 'Saigon Sprint Cup', description: 'Vô địch cự ly 1200m, dẫn đầu từ góc cua cuối', prize: '50,000,000 VND', position: 1 },
      { id: 'a2', date: '20/07/2026', title: 'Summer Classic 1600m', description: 'Vô địch cự ly 1600m với khoảng cách 2 thân so với ngựa thứ 2', prize: '80,000,000 VND', position: 1 },
      { id: 'a3', date: '15/08/2026', title: 'Golden Gate Stakes', description: 'Hạng nhì cự ly 1400m, sát nút với ngựa vô địch', prize: '20,000,000 VND', position: 2 },
    ],
    raceHistory: [
      { id: 'rh1', date: '10/09/2026', raceName: 'Saigon Sprint Cup', distance: '1200m', position: 1, totalHorses: 10, time: '1:11.24', venue: 'Phú Thọ Racecourse', jockey: 'Nguyen Duc', prize: '50,000,000 VND' },
      { id: 'rh2', date: '15/08/2026', raceName: 'Golden Gate Stakes', distance: '1400m', position: 2, totalHorses: 12, time: '1:25.10', venue: 'Phú Thọ Racecourse', jockey: 'Nguyen Duc', prize: '20,000,000 VND' },
      { id: 'rh3', date: '20/07/2026', raceName: 'Summer Classic', distance: '1600m', position: 1, totalHorses: 9, time: '1:38.55', venue: 'Phú Thọ Racecourse', jockey: 'Nguyen Duc', prize: '80,000,000 VND' },
      { id: 'rh4', date: '05/06/2026', raceName: 'Monsoon Mile', distance: '1600m', position: 3, totalHorses: 11, time: '1:39.80', venue: 'Phú Thọ Racecourse', jockey: 'Nguyen Duc', prize: '10,000,000 VND' },
    ],
  },
  {
    id: 'RH-002', name: 'Storm Wreck', breed: 'Quarter Horse', age: 9, color: 'Dark Bay',
    gender: 'Gelding', weight: 598, height: 158, stable: 'Stable C', stall: 'C-08',
    clubId: 'c1', ownerId: 'u6', ownerName: 'Nguyen Van An',
    headTrainerId: 'u2', headTrainerName: 'Nguyen Minh Tuan',
    vetId: 'u4', vetName: 'Dr. Le Thi An', groomId: 'u5', groomName: 'Le Van Nam',
    healthStatus: 'Injured', trainingStatus: 'Inactive',
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
];

export const MEDICAL_RECORDS: HealthRecord[] = [
  {
    id: 'm1', horseId: 'RH-001', date: '22/09/2026', type: 'Kiểm tra định kỳ', vet: 'Dr. Le Thi An',
    notes: 'Tất cả chỉ số xuất sắc. Ngựa trong phong độ đỉnh cao, sẵn sàng thi đấu.',
    result: 'Eligible', medications: 'Vitamin E 500IU/ngày', isPostTraining: false, vetClearanceGranted: true,
    vitals: { heartRate: '32', temperature: '37.7', weight: '512', respRate: '11', bloodPressure: '108/68' },
    diagnosis: 'Sức khỏe tổng thể xuất sắc. Tim mạch và cơ xương khớp không có bất thường.',
    recommendations: 'Tiếp tục chế độ tập luyện Competition Prep. Bổ sung vitamin E và điện giải hàng ngày.',
  },
  {
    id: 'm2', horseId: 'RH-001', date: '20/08/2026', type: 'Tiêm phòng', vet: 'Dr. Le Thi An',
    notes: 'Tiêm vaccine cúm ngựa (EIV) và uốn ván định kỳ. Phản ứng bình thường.',
    result: 'Completed', medications: 'EIV Vaccine + Tetanus Toxoid', isPostTraining: false, vetClearanceGranted: false,
    vitals: { heartRate: '38', temperature: '38.0', weight: '510', respRate: '13', bloodPressure: '112/72' },
    diagnosis: 'Hoàn thành tiêm chủng định kỳ đúng lịch.',
    recommendations: 'Nghỉ nhẹ 24 giờ sau tiêm. Theo dõi phản ứng.',
  },
  {
    id: 'm3', horseId: 'RH-002', date: '21/09/2026', type: 'Khám chấn thương', vet: 'Dr. Le Thi An',
    notes: 'Phát hiện tổn thương dây chằng bên ngoài chân phải trước. Sưng rõ, phản ứng đau dương tính.',
    result: 'Injured', medications: 'NSAID (Phenylbutazone 4.4mg/kg) · Bao đá lạnh 20 phút × 3/ngày · Băng cố định',
    isPostTraining: false, vetClearanceGranted: false,
    vitals: { heartRate: '52', temperature: '38.9', weight: '598', respRate: '18', bloodPressure: '128/85' },
    diagnosis: 'Chấn thương dây chằng chân phải trước độ II. Siêu âm xác nhận tổn thương sợi collagen.',
    recommendations: 'Cấm vận động hoàn toàn 4 tuần. Hydrotherapy ngày 2 lần. Tái khám sau 2 tuần. Cân nặng cần giảm 20-30kg.',
  },
];

export const TRAINING_PLANS: TrainingPlan[] = [
  {
    id: 'tp1', horseId: 'RH-001', phase: 'Competition Prep',
    startDate: '01/09/2026', endDate: '31/10/2026',
    distance: '1200m', workload: 'High', surface: 'Turf',
    goals: 'Cải thiện tốc độ sprint, chuẩn bị cho Saigon Grand Prix 15/10',
    status: 'Active', locked: false, createdBy: 'Nguyen Minh Tuan', progress: 65,
    weeklyKm: 42, sessionsPerWeek: 5, restDaysPerWeek: 2, intensityScore: 88,
    algorithmRationale: 'Sức khỏe xuất sắc (Eligible) · Tuổi đỉnh cao 5 tuổi · Nhịp tim nghỉ 32 bpm (tim mạch tốt)',
  },
];

export const TRAINING_SESSIONS: TrainingSession[] = [
  {
    id: 'ts1', horseId: 'RH-001', planId: 'tp1', date: '25/09/2026', time: '09:00',
    type: 'Sprint Interval', trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Scheduled', distance: '4 × 200m', targetTime: '23s/rep',
    notes: 'Tập trung vào xuất phát cổng + nước rút chặng cuối', conflictChecked: true,
  },
  {
    id: 'ts2', horseId: 'RH-001', planId: 'tp1', date: '23/09/2026', time: '08:00',
    type: 'Race-Pace Gallop', trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Completed', distance: '1200m', targetTime: '74s',
    notes: 'Duy trì nhịp tốt, tập trung vào góc cua', conflictChecked: true,
    result: { time: '73.8s', speed: '58.6', heartRate: 188, notes: 'Phong độ xuất sắc — kỷ lục cá nhân mới!', performanceScore: 94 },
  },
  {
    id: 'ts3', horseId: 'RH-001', planId: 'tp1', date: '21/09/2026', time: '07:00',
    type: 'Recovery Trot', trainerName: 'Nguyen Minh Tuan', trainerId: 'u2',
    assignedStaffIds: ['u5'], assignedStaffNames: ['Le Van Nam'],
    status: 'Completed', distance: '3000m', targetTime: '—',
    notes: 'Phục hồi tích cực sau Sprint Interval', conflictChecked: true,
    result: { time: '—', speed: '20.4', heartRate: 138, notes: 'Thư giãn tốt, không có dấu hiệu mỏi', performanceScore: 82 },
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
  { id: 'gt1', horseId: 'RH-001', date: '25/09/2026', type: 'Cho ăn sáng', time: '06:00', description: '5kg hỗn hợp ngũ cốc + 3kg cỏ khô + Vitamin E', status: 'Pending', completedAt: null },
  { id: 'gt2', horseId: 'RH-001', date: '25/09/2026', type: 'Chải chuốt', time: '07:00', description: 'Chải lông toàn thân, vệ sinh móng, chải bờm đuôi', status: 'Pending', completedAt: null },
  { id: 'gt3', horseId: 'RH-001', date: '25/09/2026', type: 'Dọn chuồng', time: '08:00', description: 'Dọn rác thải, thay lớp rơm mới, khử trùng nền', status: 'Pending', completedAt: null },
  { id: 'gt4', horseId: 'RH-001', date: '25/09/2026', type: 'Cho ăn trưa', time: '12:00', description: '3kg ngũ cốc + kiểm tra nước uống (tối thiểu 15L)', status: 'Pending', completedAt: null },
  { id: 'gt5', horseId: 'RH-001', date: '25/09/2026', type: 'Đi bộ thư giãn', time: '14:00', description: '20 phút đi bộ nhẹ tại bãi cỏ', status: 'Pending', completedAt: null },
  { id: 'gt6', horseId: 'RH-001', date: '25/09/2026', type: 'Cho ăn tối', time: '18:00', description: '5kg ngũ cốc + điện giải ORS + 4kg cỏ khô', status: 'Pending', completedAt: null },
  { id: 'gt7', horseId: 'RH-002', date: '25/09/2026', type: 'Hydrotherapy', time: '09:00', description: 'Ngâm chân phải trước trong nước lạnh 20 phút', status: 'Pending', completedAt: null },
  { id: 'gt8', horseId: 'RH-002', date: '25/09/2026', type: 'Thay băng', time: '10:00', description: 'Thay băng cố định chân phải trước, kiểm tra tình trạng sưng', status: 'Pending', completedAt: null },
];

export const NOTIFICATIONS = [
  { id: 'n1', type: 'health', message: 'Thunder King (RH-001) — Kiểm tra sức khỏe định kỳ tới hạn trong 7 ngày', time: '2 giờ trước', read: false },
  { id: 'n2', type: 'training', message: 'Kết quả buổi tập Race-Pace 1200m: 73.8s — Kỷ lục cá nhân mới!', time: '4 giờ trước', read: false },
  { id: 'n3', type: 'health', message: 'Storm Wreck (RH-002) — Cần tái khám sau 2 tuần điều trị chấn thương', time: '1 ngày trước', read: false },
  { id: 'n4', type: 'race', message: 'Saigon Grand Prix 15/10 — Hạn đăng ký còn 5 ngày', time: '1 ngày trước', read: true },
  { id: 'n5', type: 'system', message: 'Yêu cầu tham gia từ Tran Duc Khai (Head Trainer) — Đang chờ duyệt', time: '2 ngày trước', read: true },
];
