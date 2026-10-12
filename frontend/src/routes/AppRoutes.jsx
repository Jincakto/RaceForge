import { useState, lazy, Suspense } from 'react';
import { liveApi } from '../services/api.ts';
import { WorkflowWorkspace } from '../pages/training/WorkflowWorkspace.tsx';
import { NoAccess } from '../components/ui/NoAccess.jsx';
import { scopeState } from '../utils/routeScope.js';
import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { useApp } from '../hooks/useApp.js';
import { PAGE_PATHS, HORSE_DETAIL_PATTERN, pathToPage } from './paths.js';
import { RequireAuth, RequireRole, RoleGate } from './guards.jsx';
import { PAGE_TITLES } from '../data/constants.js';

import { AppLayout } from '../components/layout/AppLayout.jsx';
import { SuccessToast, ErrorToast } from '../components/ui/Toast.jsx';

import { HomePage } from '../pages/auth/HomePage.jsx';
import { LoginPage } from '../pages/auth/LoginPage.jsx';
import { RegisterPage } from '../pages/auth/RegisterPage.jsx';
const OnboardingPage=lazy(()=>import('../pages/auth/OnboardingPage.jsx').then(module=>({default:module.OnboardingPage})));
const JoinCenterPage=lazy(()=>import('../pages/auth/JoinCenterPage.jsx').then(module=>({default:module.JoinCenterPage})));
const PendingPage=lazy(()=>import('../pages/auth/PendingPage.jsx').then(module=>({default:module.PendingPage})));

const ManagerDashboard=lazy(()=>import('../pages/dashboard/ManagerDashboard.jsx').then(module=>({default:module.ManagerDashboard})));
const HeadTrainerDashboard=lazy(()=>import('../pages/dashboard/HeadTrainerDashboard.jsx').then(module=>({default:module.HeadTrainerDashboard})));
const VetDashboard=lazy(()=>import('../pages/dashboard/VetDashboard.jsx').then(module=>({default:module.VetDashboard})));
const GroomDashboard=lazy(()=>import('../pages/dashboard/GroomDashboard.jsx').then(module=>({default:module.GroomDashboard})));
const OwnerDashboard=lazy(()=>import('../pages/dashboard/OwnerDashboard.jsx').then(module=>({default:module.OwnerDashboard})));

const HorseListPage=lazy(()=>import('../pages/horses/HorseListPage.jsx').then(module=>({default:module.HorseListPage})));
const HorseDetailPage=lazy(()=>import('../pages/horses/HorseDetailPage.jsx').then(module=>({default:module.HorseDetailPage})));
const HorseCreatePage=lazy(()=>import('../pages/horses/HorseCreatePage.jsx').then(module=>({default:module.HorseCreatePage})));
const MyHorsesPage=lazy(()=>import('../pages/horses/MyHorsesPage.jsx').then(module=>({default:module.MyHorsesPage})));
const TrainerSelectPage=lazy(()=>import('../pages/horses/TrainerSelectPage.jsx').then(module=>({default:module.TrainerSelectPage})));
const TrainerProfilePage=lazy(()=>import('../pages/horses/TrainerProfilePage.jsx').then(module=>({default:module.TrainerProfilePage})));
const CenterRequestsPage=lazy(()=>import('../pages/horses/CenterRequestsPage.jsx').then(module=>({default:module.CenterRequestsPage})));

const MemberRequestsPage=lazy(()=>import('../pages/members/MemberRequestsPage.jsx').then(module=>({default:module.MemberRequestsPage})));
const StaffPage=lazy(()=>import('../pages/members/StaffPage.jsx').then(module=>({default:module.StaffPage})));

const TrainingHubPage=lazy(()=>import('../pages/training/TrainingHubPage.jsx').then(module=>({default:module.TrainingHubPage})));
const TrainingRegisterPage=lazy(()=>import('../pages/training/TrainingRegisterPage.jsx').then(module=>({default:module.TrainingRegisterPage})));
const RehabCenterPage=lazy(()=>import('../pages/training/RehabCenterPage.jsx').then(module=>({default:module.RehabCenterPage})));

const CareHubPage=lazy(()=>import('../pages/care/CareHubPage.jsx').then(module=>({default:module.CareHubPage})));
const InventoryPage=lazy(()=>import('../pages/care/InventoryPage.jsx').then(module=>({default:module.InventoryPage})));
const InventoryLogPage=lazy(()=>import('../pages/care/InventoryLogPage.jsx').then(module=>({default:module.InventoryLogPage})));

const HealthRecordsPage=lazy(()=>import('../pages/health/HealthRecordsPage.jsx').then(module=>({default:module.HealthRecordsPage})));
const VetHealthFormPage=lazy(()=>import('../pages/health/VetHealthFormPage.jsx').then(module=>({default:module.VetHealthFormPage})));
const PostExamPage=lazy(()=>import('../pages/health/PostExamPage.jsx').then(module=>({default:module.PostExamPage})));

const PerformancePage=lazy(()=>import('../pages/analytics/PerformancePage.jsx').then(module=>({default:module.PerformancePage})));
const RaceResultsPage=lazy(()=>import('../pages/analytics/RaceResultsPage.jsx').then(module=>({default:module.RaceResultsPage})));
const ReportsPage=lazy(()=>import('../pages/analytics/ReportsPage.jsx').then(module=>({default:module.ReportsPage})));

const NotificationsPage=lazy(()=>import('../pages/account/NotificationsPage.jsx').then(module=>({default:module.NotificationsPage})));
const ProfilePage=lazy(()=>import('../pages/account/ProfilePage.jsx').then(module=>({default:module.ProfilePage})));
import { visibleNotifications } from '../utils/notifications.js';

function useRouteApp(){const app=useApp();return {...app,state:scopeState(app.state)};}
function ApiWorkflowRoute(){const {state}=useRouteApp();const [store,setStore]=useState({horses:[],byHorse:{},catalog:[]});if(!liveApi)return <NoAccess text="Đây là trang API. Chế độ Demo sử dụng các trang Medical và Training trên sidebar."/>;if(!['owner','manager','veterinarian'].includes(state.user.role))return <NoAccess text="Chức năng API hiện dành cho Chủ ngựa, CM và Thú y."/>;return <WorkflowWorkspace user={state.user} legacyHorses={[]} store={store} setStore={setStore}/>;}
// ── Route elements: bind each page to the global state/actions ───────────────

function PublicToast() {
  const { state } = useRouteApp();
  return state.showSuccess ? <SuccessToast message={state.showSuccess} /> : null;
}

function HomeRoute() {
  const { navigate } = useRouteApp();
  return <><PublicToast /><HomePage navigate={navigate} /></>;
}
function LoginRoute() {
  const { state, navigate, handleLogin } = useRouteApp();
  return <><PublicToast /><LoginPage navigate={navigate} users={state.users} onLogin={handleLogin} /></>;
}
function RegisterRoute() {
  const { navigate, handleRegister } = useRouteApp();
  return <><PublicToast /><RegisterPage navigate={navigate} onRegister={handleRegister} /></>;
}
function OnboardingRoute() {
  const { state, navigate, handleLogout } = useRouteApp();
  return <><PublicToast /><OnboardingPage user={state.user} navigate={navigate} onLogout={handleLogout} /></>;
}
function JoinCenterRoute() {
  const { state, navigate, handleJoinRequest, handleLogout } = useRouteApp();
  return <JoinCenterPage user={state.user} clubs={state.clubs} navigate={navigate} onJoinRequest={handleJoinRequest} onLogout={handleLogout} />;
}
function PendingRoute() {
  const { state, navigate, handleLogout } = useRouteApp();
  return <PendingPage user={state.user} clubs={state.clubs} navigate={navigate} memberRequests={state.memberRequests} onLogout={handleLogout} />;
}

/** Layout route: sidebar + top bar + toasts around every in-app page. */
function AppShell() {
  const { state, navigate } = useRouteApp();
  const { pathname } = useLocation();
  const page = pathToPage(pathname);
  if(liveApi && !['api-workflow','profile'].includes(page))return <Navigate to={PAGE_PATHS['api-workflow']} replace/>;
  return (
    <>
      {state.showSuccess && <SuccessToast message={state.showSuccess} />}
      {state.errorMsg && <ErrorToast message={state.errorMsg} />}
      <AppLayout user={state.user} page={page} title={PAGE_TITLES[page] || 'RaceForce'} navigate={navigate} state={state}>
        <div className="text-xs text-gray-500 mb-4">{liveApi?'API trực tiếp — xác thực JWT':'DEMO — giao diện Phuc + minh/frontend, dữ liệu trong phiên trang'}</div><Outlet />
      </AppLayout>
    </>
  );
}

function DashboardRoute() {
  const { state, navigate } = useRouteApp();
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
  const { state, navigate, selectHorse } = useRouteApp();
  return <HorseListPage navigate={navigate} horses={state.horses} role={state.user.role} clubId={state.user.clubId} onSelectHorse={selectHorse} />;
}
function HorseDetailRoute() {
  const { horseId: rawHorseId } = useParams();
  const horseId = Number(rawHorseId);
  const { state, navigate, selectHorse, handleUpdateHorse, showSuccess } = useRouteApp();
  // The URL is the source of truth for which horse is open.
  useEffect(() => { if (horseId && horseId !== state.selectedHorseId) selectHorse(horseId); }, [horseId, state.selectedHorseId, selectHorse]);
  return <HorseDetailPage state={{ ...state, selectedHorseId: horseId }} navigate={navigate} onUpdateHorse={handleUpdateHorse} onShowSuccess={showSuccess} />;
}
function HorseCreateRoute() {
  const { state, navigate, handleCreateHorse } = useRouteApp();
  return <HorseCreatePage user={state.user} state={state} navigate={navigate} onCreateHorse={handleCreateHorse} />;
}
function MyHorsesRoute() {
  const { state, navigate, handleSubmitToCenter, selectHorse } = useRouteApp();
  return <MyHorsesPage user={state.user} state={state} navigate={navigate} onSubmitToCenter={handleSubmitToCenter} onSelectHorse={selectHorse} />;
}
function TrainerSelectRoute() {
  const { state, navigate, handleSelectTrainer } = useRouteApp();
  return <TrainerSelectPage user={state.user} state={state} navigate={navigate} onSelectTrainer={handleSelectTrainer} />;
}
function TrainerProfileRoute() {
  const { state, navigate, handleApproveRequest } = useRouteApp();
  return <TrainerProfilePage state={state} navigate={navigate} trainerId={state.viewTrainerId || ''} onApproveRequest={handleApproveRequest} />;
}
function CenterRequestsRoute() {
  const { state, navigate, handleApproveHorse, handleRejectHorse } = useRouteApp();
  return <RoleGate roles={['manager']}><CenterRequestsPage state={state} navigate={navigate} onApprove={handleApproveHorse} onReject={handleRejectHorse}/></RoleGate>;
}
function MemberRequestsRoute() {
  const { state, navigate, handleApproveRequest, handleRejectRequest, handleViewTrainer } = useRouteApp();
  return <MemberRequestsPage state={state} navigate={navigate} onApprove={handleApproveRequest} onReject={handleRejectRequest} onViewTrainer={handleViewTrainer} />;
}
function HealthRecordsRoute() {
  const { state, navigate } = useRouteApp();
  return <HealthRecordsPage state={state} navigate={navigate} />;
}
function VetHealthFormRoute() {
  const { state, navigate, showSuccess, handleSaveHealthRecord, handleSaveDraft, handleConfirmMedical } = useRouteApp();
  return (
    <RoleGate roles={['veterinarian']} fallback={<HealthRecordsPage state={state} navigate={navigate} />}>
      <VetHealthFormPage state={state} navigate={navigate} onSave={showSuccess} onSaveRecord={handleSaveHealthRecord} onSaveDraft={handleSaveDraft} onConfirmRecord={handleConfirmMedical} />
    </RoleGate>
  );
}
function TrainingHubRoute() {
  const { state, navigate, showSuccess, handleCreatePlan, handleCreateSession, handleStartSession, handleCompleteSession, handleConfirmSchedule } = useRouteApp();
  return <TrainingHubPage state={state} navigate={navigate} onSave={showSuccess} onCreatePlan={handleCreatePlan} onCreateSession={handleCreateSession} onStartSession={handleStartSession} onCompleteSession={handleCompleteSession} onConfirmSchedule={handleConfirmSchedule} />;
}
function CareHubRoute() {
  const { state, navigate, completeCare, undoCare, invReceive, reportIncident } = useRouteApp();
  return (
    <RoleGate roles={['groom']} fallback={null}>
      <CareHubPage state={state} navigate={navigate} onComplete={completeCare} onUndo={undoCare} onReceive={invReceive} onReport={reportIncident} />
    </RoleGate>
  );
}
function InventoryRoute() {
  const { state, navigate, invAddItem, invReceive, invEdit, invAdjust, invDelete } = useRouteApp();
  return (
    <RoleGate roles={['groom']} fallback={null}>
      <InventoryPage state={state} navigate={navigate} onAdd={invAddItem} onReceive={invReceive} onEdit={invEdit} onAdjust={invAdjust} onDelete={invDelete} />
    </RoleGate>
  );
}
function InventoryLogRoute() {
  const { state, navigate } = useRouteApp();
  return <RoleGate roles={['groom']} fallback={null}><InventoryLogPage state={state} navigate={navigate} /></RoleGate>;
}
function TrainingRegisterRoute() {
  const { state, navigate, handleEnroll, handlePayPackage } = useRouteApp();
  return (
    <RoleGate roles={['owner']} message="Chỉ Chủ ngựa mới đăng ký huấn luyện">
      <TrainingRegisterPage state={state} navigate={navigate} onEnroll={handleEnroll} onPay={handlePayPackage} />
    </RoleGate>
  );
}
function PostExamRoute() {
  const { state, navigate, showSuccess, handlePostExam, handleUnlock, handleManualLock, handleSaveDraft, handleConfirmMedical } = useRouteApp();
  return (
    <RoleGate roles={['veterinarian']} message="Chỉ Thú y mới truy cập trang này">
      <PostExamPage state={state} navigate={navigate} onSave={showSuccess} onPostExam={handlePostExam} onUnlock={handleUnlock} onManualLock={handleManualLock} onSaveDraft={handleSaveDraft} onConfirmRecord={handleConfirmMedical} />
    </RoleGate>
  );
}
function RehabCenterRoute() {
  const { state, handleActivateRehab, handleResumePackage } = useRouteApp();
  return (
    <RoleGate roles={['manager']} message="Chỉ Quản lý mới kích hoạt gói phục hồi">
      <RehabCenterPage state={state} onActivate={handleActivateRehab} onResume={handleResumePackage} />
    </RoleGate>
  );
}
function RaceResultsRoute() {
  const { state } = useRouteApp();
  return <RaceResultsPage horses={state.horses.filter(h => h.clubId === state.user.clubId)} />;
}
function StaffRoute() {
  const { state, navigate, handleUpdatePermissions } = useRouteApp();
  return <StaffPage state={state} navigate={navigate} onUpdatePermissions={handleUpdatePermissions} />;
}
function NotificationsRoute() {
  const { state, markNotificationRead, openNotification } = useRouteApp();
  return <NotificationsPage notifications={visibleNotifications(state.notifications, state.user)} onMarkRead={markNotificationRead} onOpen={openNotification} />;
}
function ProfileRoute() {
  const { state, navigate, handleLogout, showSuccess } = useRouteApp();
  return <ProfilePage user={state.user} state={state} navigate={navigate} onLogout={handleLogout} onSave={showSuccess} />;
}

// ── Route table ──────────────────────────────────────────────────────────────

export default function AppRoutes() {
  const P = PAGE_PATHS;
  return (
    <Suspense fallback={<div role="status" className="p-6 text-gray-500">Đang tải trang...</div>}><Routes>
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
            <Route path={P['api-workflow']} element={<ApiWorkflowRoute/>} />
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
    </Routes></Suspense>
  );
}
