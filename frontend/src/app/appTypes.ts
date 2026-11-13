import { type AppUser, type Club, type MemberRequest, type Horse, type HorseClubRequest, type HealthRecord, type TrainingPlan, type TrainingSession, type InvItem, type InvLog, type CareRecord, type Incident, type AppNotification, type Enrollment, type TrainingPackage } from "../shared/data/data";
import { type TrainingAssessmentContext } from "../features/training/trainingAssessment";
import { type AuditEntry } from "../features/admin/admin";

export type Page =
  | "home"
  | "login"
  | "register"
  | "onboarding"
  | "join-center"
  | "pending"
  | "dashboard"
  | "horse-list"
  | "horse-detail"
  | "horse-create"
  | "horse-edit"
  | "my-horses"
  | "center-requests"
  | "package-catalog"
  | "trainer-assign"
  | "trainer-profile"
  | "health-records"
  | "vet-health-form"
  | "training-hub"
  | "care-hub"
  | "performance"
  | "reports"
  | "staff"
  | "member-requests"
  | "notifications"
  | "profile"
  | "accounts"
  | "permissions"
  | "audit-log"
  | "training-register"
  | "certificates"
  | "vet-assign"
  | "post-exam"
  | "inventory"
  | "inventory-log";

export interface AppState {
  unlockExamHorseId?: string;
  vetAssignmentsError?: string;
  user: AppUser | null;
  page: Page;
  users: AppUser[];
  clubs: Club[];
  memberRequests: MemberRequest[];
  horses: Horse[];
  horseClubRequests: HorseClubRequest[];
  examHorseId: string | null;
  trainingAssessmentNotificationId?: string;
  postTrainingContext?: TrainingAssessmentContext;
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
  selectedHorseId: string;
  packages: TrainingPackage[];
  viewTrainerId: string | null;
  showSuccess: string | null;
  userPermissions: Record<string, Page[]>;
  rolePerms: Record<string, string[]>;
  auditLog: AuditEntry[];
}
