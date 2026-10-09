import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { useApp } from '../hooks/useApp';
import { PAGE_PATHS, HORSE_DETAIL_PATTERN, pathToPage } from './paths';
import { RequireAuth, RequireRole, RoleGate } from './guards';
import { PAGE_TITLES } from '../data/constants';

import { AppLayout } from '../components/layout/AppLayout';
import { SuccessToast, ErrorToast } from '../components/ui/Toast';

import { HomePage } from '../pages/auth/HomePage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { OnboardingPage } from '../pages/auth/OnboardingPage';
import { JoinCenterPage } from '../pages/auth/JoinCenterPage';
import { PendingPage } from '../pages/auth/PendingPage';

import { ManagerDashboard } from '../pages/dashboard/ManagerDashboard';
import { HeadTrainerDashboard } from '../pages/dashboard/HeadTrainerDashboard';
import { VetDashboard } from '../pages/dashboard/VetDashboard';
import { GroomDashboard } from '../pages/dashboard/GroomDashboard';
import { OwnerDashboard } from '../pages/dashboard/OwnerDashboard';

import { HorseListPage } from '../pages/horses/HorseListPage';
import { HorseDetailPage } from '../pages/horses/HorseDetailPage';
import { HorseCreatePage } from '../pages/horses/HorseCreatePage';
import { MyHorsesPage } from '../pages/horses/MyHorsesPage';
import { TrainerSelectPage } from '../pages/horses/TrainerSelectPage';
import { TrainerProfilePage } from '../pages/horses/TrainerProfilePage';
import { CenterRequestsPage } from '../pages/horses/CenterRequestsPage';

import { MemberRequestsPage } from '../pages/members/MemberRequestsPage';
import { StaffPage } from '../pages/members/StaffPage';

import { TrainingHubPage } from '../pages/training/TrainingHubPage';
import { TrainingRegisterPage } from '../pages/training/TrainingRegisterPage';
import { RehabCenterPage } from '../pages/training/RehabCenterPage';

import { CareHubPage } from '../pages/care/CareHubPage';
import { InventoryPage } from '../pages/care/InventoryPage';
import { InventoryLogPage } from '../pages/care/InventoryLogPage';

import { HealthRecordsPage } from '../pages/health/HealthRecordsPage';
import { VetHealthFormPage } from '../pages/health/VetHealthFormPage';
import { PostExamPage } from '../pages/health/PostExamPage';

import { PerformancePage } from '../pages/analytics/PerformancePage';
import { RaceResultsPage } from '../pages/analytics/RaceResultsPage';
import { ReportsPage } from '../pages/analytics/ReportsPage';

import { NotificationsPage } from '../pages/account/NotificationsPage';
import { ProfilePage } from '../pages/account/ProfilePage';
import { visibleNotifications } from '../utils/notifications';

// ── Route elements: bind each page to the global state/actions ───────────────

function PublicToast() {
  const { state } = useApp();
  return state.showSuccess ? <SuccessToast message={state.showSuccess} /> : null;
}

function HomeRoute() {
  const { navigate } = useApp();
  return <><PublicToast /><HomePage navigate={navigate} /></>;
}
function LoginRoute() {
  const { state, navigate, handleLogin } = useApp();
  return <><PublicToast /><LoginPage navigate={navigate} users={state.users} onLogin={handleLogin} /></>;
}
function RegisterRoute() {
  const { navigate, handleRegister } = useApp();
  return <><PublicToast /><RegisterPage navigate={navigate} onRegister={handleRegister} /></>;
}
function OnboardingRoute() {
  const { state, navigate, handleLogout } = useApp();
  return <><PublicToast /><OnboardingPage user={state.user} navigate={navigate} onLogout={handleLogout} /></>;
}
function JoinCenterRoute() {
  const { state, navigate, handleJoinRequest, handleLogout } = useApp();
  return <JoinCenterPage user={state.user} clubs={state.clubs} navigate={navigate} onJoinRequest={handleJoinRequest} onLogout={handleLogout} />;
}
function PendingRoute() {
  const { state, navigate, handleLogout } = useApp();
  return <PendingPage user={state.user} clubs={state.clubs} navigate={navigate} memberRequests={state.memberRequests} onLogout={handleLogout} />;
}

/** Layout route: sidebar + top bar + toasts around every in-app page. */
function AppShell() {
  const { state, navigate } = useApp();
  const { pathname } = useLocation();
  const page = pathToPage(pathname);
  return (
    <>
      {state.showSuccess && <SuccessToast message={state.showSuccess} />}
      {state.errorMsg && <ErrorToast message={state.errorMsg} />}
      <AppLayout user={state.user} page={page} title={PAGE_TITLES[page] || 'RaceForce'} navigate={navigate} state={state}>
        <Outlet />
      </AppLayout>
    </>
  );
}

function DashboardRoute() {
  const { state, navigate } = useApp();
  const props = { state, navigate };
  switch (state.user.role) {
    case 'manager': return <ManagerDashboard {...props} />;
    case 'head_trainer': return <HeadTrainerDashboard {...props} />;
    case 'veterinarian': return <VetDashboard {...props} />;
    case 'groom': return <GroomDashboard {...props} />;
    case 'owner': return <OwnerDashboard {...props} />;
    default: return null;
  }
}

function HorseListRoute() {
  const { state, navigate, selectHorse } = useApp();
  return <HorseListPage navigate={navigate} horses={state.horses} role={state.user.role} clubId={state.user.clubId} onSelectHorse={selectHorse} />;
}
function HorseDetailRoute() {
  const { horseId } = useParams();
  const { state, navigate, selectHorse, handleUpdateHorse, showSuccess } = useApp();
  // The URL is the source of truth for which horse is open.
  useEffect(() => { if (horseId && horseId !== state.selectedHorseId) selectHorse(horseId); }, [horseId, state.selectedHorseId, selectHorse]);
  return <HorseDetailPage state={{ ...state, selectedHorseId: horseId }} navigate={navigate} onUpdateHorse={handleUpdateHorse} onShowSuccess={showSuccess} />;
}
function HorseCreateRoute() {
  const { state, navigate, handleCreateHorse } = useApp();
  return <HorseCreatePage user={state.user} state={state} navigate={navigate} onCreateHorse={handleCreateHorse} />;
}
function MyHorsesRoute() {
  const { state, navigate, handleSubmitToCenter, selectHorse } = useApp();
  return <MyHorsesPage user={state.user} state={state} navigate={navigate} onSubmitToCenter={handleSubmitToCenter} onSelectHorse={selectHorse} />;
}
function TrainerSelectRoute() {
  const { state, navigate, handleSelectTrainer } = useApp();
  return <TrainerSelectPage user={state.user} state={state} navigate={navigate} onSelectTrainer={handleSelectTrainer} />;
}
function TrainerProfileRoute() {
  const { state, navigate, handleApproveRequest } = useApp();
  return <TrainerProfilePage state={state} navigate={navigate} trainerId={state.viewTrainerId || ''} onApproveRequest={handleApproveRequest} />;
}
function CenterRequestsRoute() {
  const { state, navigate, handleApproveHorse, handleRejectHorse } = useApp();
  return <CenterRequestsPage state={state} navigate={navigate} onApprove={handleApproveHorse} onReject={handleRejectHorse} />;
}
function MemberRequestsRoute() {
  const { state, navigate, handleApproveRequest, handleRejectRequest, handleViewTrainer } = useApp();
  return <MemberRequestsPage state={state} navigate={navigate} onApprove={handleApproveRequest} onReject={handleRejectRequest} onViewTrainer={handleViewTrainer} />;
}
function HealthRecordsRoute() {
  const { state, navigate } = useApp();
  return <HealthRecordsPage state={state} navigate={navigate} />;
}
function VetHealthFormRoute() {
  const { state, navigate, showSuccess, handleSaveHealthRecord } = useApp();
  return (
    <RoleGate roles={['veterinarian']} fallback={<HealthRecordsPage state={state} navigate={navigate} />}>
      <VetHealthFormPage state={state} navigate={navigate} onSave={showSuccess} onSaveRecord={handleSaveHealthRecord} />
    </RoleGate>
  );
}
function TrainingHubRoute() {
  const { state, navigate, showSuccess, handleCreatePlan, handleCreateSession, handleStartSession, handleCompleteSession, handleConfirmSchedule } = useApp();
  return <TrainingHubPage state={state} navigate={navigate} onSave={showSuccess} onCreatePlan={handleCreatePlan} onCreateSession={handleCreateSession} onStartSession={handleStartSession} onCompleteSession={handleCompleteSession} onConfirmSchedule={handleConfirmSchedule} />;
}
function CareHubRoute() {
  const { state, navigate, completeCare, undoCare, invReceive, reportIncident } = useApp();
  return (
    <RoleGate roles={['groom']} fallback={null}>
      <CareHubPage state={state} navigate={navigate} onComplete={completeCare} onUndo={undoCare} onReceive={invReceive} onReport={reportIncident} />
    </RoleGate>
  );
}
function InventoryRoute() {
  const { state, navigate, invAddItem, invReceive, invEdit, invAdjust, invDelete } = useApp();
  return (
    <RoleGate roles={['groom']} fallback={null}>
      <InventoryPage state={state} navigate={navigate} onAdd={invAddItem} onReceive={invReceive} onEdit={invEdit} onAdjust={invAdjust} onDelete={invDelete} />
    </RoleGate>
  );
}
function InventoryLogRoute() {
  const { state, navigate } = useApp();
  return <RoleGate roles={['groom']} fallback={null}><InventoryLogPage state={state} navigate={navigate} /></RoleGate>;
}
function TrainingRegisterRoute() {
  const { state, navigate, handleEnroll } = useApp();
  return (
    <RoleGate roles={['owner']} message="Chỉ Chủ ngựa mới đăng ký huấn luyện">
      <TrainingRegisterPage state={state} navigate={navigate} onEnroll={handleEnroll} />
    </RoleGate>
  );
}
function PostExamRoute() {
  const { state, navigate, showSuccess, handlePostExam, handleUnlock, handleManualLock } = useApp();
  return (
    <RoleGate roles={['veterinarian']} message="Chỉ Thú y mới truy cập trang này">
      <PostExamPage state={state} navigate={navigate} onSave={showSuccess} onPostExam={handlePostExam} onUnlock={handleUnlock} onManualLock={handleManualLock} />
    </RoleGate>
  );
}
function RehabCenterRoute() {
  const { state, handleActivateRehab } = useApp();
  return (
    <RoleGate roles={['manager']} message="Chỉ Quản lý mới kích hoạt gói phục hồi">
      <RehabCenterPage state={state} onActivate={handleActivateRehab} />
    </RoleGate>
  );
}
function RaceResultsRoute() {
  const { state } = useApp();
  return <RaceResultsPage horses={state.horses.filter(h => h.clubId === state.user.clubId)} />;
}
function StaffRoute() {
  const { state, navigate, handleUpdatePermissions } = useApp();
  return <StaffPage state={state} navigate={navigate} onUpdatePermissions={handleUpdatePermissions} />;
}
function NotificationsRoute() {
  const { state, markNotificationRead, openNotification } = useApp();
  return <NotificationsPage notifications={visibleNotifications(state.notifications, state.user)} onMarkRead={markNotificationRead} onOpen={openNotification} />;
}
function ProfileRoute() {
  const { state, navigate, handleLogout, showSuccess } = useApp();
  return <ProfilePage user={state.user} state={state} navigate={navigate} onLogout={handleLogout} onSave={showSuccess} />;
}

// ── Route table ──────────────────────────────────────────────────────────────

export default function AppRoutes() {
  const P = PAGE_PATHS;
  return (
    <Routes>
      {/* Public */}
      <Route path={P.home} element={<HomeRoute />} />
      <Route path={P.login} element={<LoginRoute />} />
      <Route path={P.register} element={<RegisterRoute />} />

      {/* Logged in, role not chosen / club membership steps */}
      <Route element={<RequireAuth />}>
        <Route path={P.onboarding} element={<OnboardingRoute />} />
        <Route path={P['join-center']} element={<JoinCenterRoute />} />
        <Route path={P.pending} element={<PendingRoute />} />

        {/* Logged in + role assigned: full application shell */}
        <Route element={<RequireRole />}>
          <Route element={<AppShell />}>
            <Route path={P.dashboard} element={<DashboardRoute />} />

            <Route path={P['horse-list']} element={<HorseListRoute />} />
            <Route path={P['horse-create']} element={<HorseCreateRoute />} />
            <Route path={HORSE_DETAIL_PATTERN} element={<HorseDetailRoute />} />
            <Route path={P['my-horses']} element={<MyHorsesRoute />} />
            <Route path={P['trainer-select']} element={<TrainerSelectRoute />} />
            <Route path={P['trainer-profile']} element={<TrainerProfileRoute />} />
            <Route path={P['center-requests']} element={<CenterRequestsRoute />} />
            <Route path={P['member-requests']} element={<MemberRequestsRoute />} />

            <Route path={P['health-records']} element={<HealthRecordsRoute />} />
            <Route path={P['vet-health-form']} element={<VetHealthFormRoute />} />
            <Route path={P['post-exam']} element={<PostExamRoute />} />

            <Route path={P['training-hub']} element={<TrainingHubRoute />} />
            <Route path={P['training-register']} element={<TrainingRegisterRoute />} />
            <Route path={P['rehab-center']} element={<RehabCenterRoute />} />

            <Route path={P['care-hub']} element={<CareHubRoute />} />
            <Route path={P.inventory} element={<InventoryRoute />} />
            <Route path={P['inventory-log']} element={<InventoryLogRoute />} />

            <Route path={P.performance} element={<PerformancePage />} />
            <Route path={P['race-results']} element={<RaceResultsRoute />} />
            <Route path={P.reports} element={<ReportsPage />} />

            <Route path={P.staff} element={<StaffRoute />} />
            <Route path={P.notifications} element={<NotificationsRoute />} />
            <Route path={P.profile} element={<ProfileRoute />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={P.dashboard} replace />} />
    </Routes>
  );
}
