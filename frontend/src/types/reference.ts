import { type AppUser, type Club, type MemberRequest, type Horse, type HorseClubRequest, type HealthRecord, type TrainingPlan, type TrainingSession, GROOM_TASKS, NOTIFICATIONS, type Role } from '../data';

export type Page =
  | 'home' | 'login' | 'register' | 'onboarding' | 'create-center' | 'join-center' | 'pending'
  | 'dashboard' | 'horse-list' | 'horse-detail' | 'horse-create' | 'horse-edit'
  | 'my-horses' | 'center-requests' | 'trainer-select'
  | 'trainer-profile'
  | 'health-records' | 'vet-health-form'
  | 'training-hub' | 'care-hub'
  | 'performance' | 'race-results' | 'reports'
  | 'staff' | 'member-requests' | 'notifications' | 'profile';

export interface AppState {
  user: AppUser | null;
  page: Page;
  users: AppUser[];
  clubs: Club[];
  memberRequests: MemberRequest[];
  horses: Horse[];
  horseClubRequests: HorseClubRequest[];
  healthRecords: HealthRecord[];
  trainingPlans: TrainingPlan[];
  trainingSessions: TrainingSession[];
  tasks: typeof GROOM_TASKS;
  notifications: typeof NOTIFICATIONS;
  selectedHorseId: string;
  trainerSelectHorseId: string | null;
  viewTrainerId: string | null;
  showSuccess: string | null;
  userPermissions: Record<string, Page[]>;
}

export const ROLE_LABELS: Record<Role, string> = {
  manager: 'Quản lý trung tâm', head_trainer: 'Head Trainer',
  veterinarian: 'Thú y', groom: 'Groom', owner: 'Chủ ngựa',
};

export const DEMO_ACCOUNTS = [
  { email: 'manager@raceforce.vn', password: '123456', role: 'Quản lý trung tâm', icon: '🏛', color: 'bg-[#1a2844]' },
  { email: 'trainer@raceforce.vn', password: '123456', role: 'Head Trainer', icon: '🏇', color: 'bg-blue-700' },
  { email: 'vet@raceforce.vn', password: '123456', role: 'Thú y', icon: '🩺', color: 'bg-emerald-700' },
  { email: 'groom@raceforce.vn', password: '123456', role: 'Groom', icon: '🧹', color: 'bg-amber-600' },
  { email: 'owner@raceforce.vn', password: '123456', role: 'Chủ ngựa', icon: '👤', color: 'bg-purple-700' },
  { email: 'owner2@raceforce.vn', password: '123456', role: 'Chủ ngựa (mới)', icon: '👤', color: 'bg-purple-500' },
];

export const NAV_ITEMS: Partial<Record<Role, { icon: string; label: string; page: Page; badge?: string }[]>> = {
  manager: [
    { icon: '⊞', label: 'Dashboard', page: 'dashboard' },
    { icon: '🐎', label: 'Ngựa trong trung tâm', page: 'horse-list' },
    { icon: '📋', label: 'Duyệt đăng ký ngựa', page: 'center-requests', badge: 'horseReqs' },
    { icon: '👥', label: 'Nhân sự', page: 'staff' },
    { icon: '📨', label: 'Yêu cầu tham gia', page: 'member-requests', badge: 'memberReqs' },
    { icon: '🏆', label: 'Kết quả đua', page: 'race-results' },
    { icon: '📊', label: 'Báo cáo', page: 'reports' },
    { icon: '🔔', label: 'Thông báo', page: 'notifications' },
  ],
  head_trainer: [
    { icon: '⊞', label: 'Dashboard', page: 'dashboard' },
    { icon: '🐎', label: 'Ngựa', page: 'horse-list' },
    { icon: '📋', label: 'Huấn luyện & Giáo án', page: 'training-hub' },
    { icon: '📈', label: 'Hiệu suất', page: 'performance' },
    { icon: '🔔', label: 'Thông báo', page: 'notifications' },
  ],
  veterinarian: [
    { icon: '⊞', label: 'Dashboard', page: 'dashboard' },
    { icon: '🐎', label: 'Ngựa', page: 'horse-list' },
    { icon: '🏥', label: 'Hồ sơ y tế', page: 'health-records' },
    { icon: '📝', label: 'Nhập liệu sức khỏe', page: 'vet-health-form' },
    { icon: '🔔', label: 'Thông báo', page: 'notifications' },
  ],
  groom: [
    { icon: '⊞', label: 'Dashboard', page: 'dashboard' },
    { icon: '🌿', label: 'Chăm sóc & Cho ăn', page: 'care-hub' },
    { icon: '🔔', label: 'Thông báo', page: 'notifications' },
  ],
  owner: [
    { icon: '⊞', label: 'Dashboard', page: 'dashboard' },
    { icon: '🐎', label: 'Ngựa của tôi', page: 'my-horses' },
    { icon: '➕', label: 'Đăng ký ngựa mới', page: 'horse-create' },
    { icon: '📈', label: 'Hiệu suất', page: 'performance' },
    { icon: '🏆', label: 'Kết quả đua', page: 'race-results' },
    { icon: '🔔', label: 'Thông báo', page: 'notifications' },
  ],
};

export const GRANTABLE_PAGES: { page: Page; label: string; icon: string }[] = [
  { page: 'horse-list', label: 'Danh sách ngựa', icon: '🐎' },
  { page: 'health-records', label: 'Hồ sơ y tế', icon: '🏥' },
  { page: 'vet-health-form', label: 'Nhập liệu sức khỏe', icon: '📝' },
  { page: 'training-hub', label: 'Huấn luyện & Giáo án', icon: '🏇' },
  { page: 'care-hub', label: 'Chăm sóc & Cho ăn', icon: '🌿' },
  { page: 'performance', label: 'Hiệu suất', icon: '📈' },
  { page: 'race-results', label: 'Kết quả đua', icon: '🏆' },
  { page: 'reports', label: 'Báo cáo', icon: '📊' },
  { page: 'center-requests', label: 'Duyệt đăng ký ngựa', icon: '📋' },
  { page: 'member-requests', label: 'Yêu cầu tham gia', icon: '📨' },
  { page: 'staff', label: 'Nhân sự', icon: '👥' },
];

export type TEStatus = 'incomplete' | 'eligible' | 'conditional' | 'not-eligible';

export interface NutritionSuggestion { category: string; items: string[]; note: string; }

export interface TrainingEligResult {
  status: TEStatus;
  reasons: string[];
  adjustments: string[];
  trainingNote: string;
  nutritionSuggestions: NutritionSuggestion[];
}
