import { liveApi } from './services/api.ts';
import { authService } from './services/authService.ts';
import { tokenStore } from './services/tokenStore.ts';
import { WorkflowWorkspace } from './pages/training/WorkflowWorkspace.tsx';
import { CenterRequestsPage } from './pages/staff/CenterRequestsPage.tsx';
import { demoCatalog, legacyHorse, type WorkflowStore } from './utils/workflowStore.ts';
import { useCallback, useEffect, useState } from 'react';
import { type AppState, type Page } from './types/reference.ts';
import {
  SEED_USERS, SEED_CLUBS, SEED_REQUESTS, HORSES, SEED_HORSE_CLUB_REQUESTS,
  MEDICAL_RECORDS, TRAINING_PLANS, TRAINING_SESSIONS, GROOM_TASKS, NOTIFICATIONS,
  type AppUser, type Horse, type Achievement,
} from './data.ts';
import { HomePage } from './pages/public/HomePage.tsx';
import { LoginPage } from './pages/public/LoginPage.tsx';
import { RegisterPage } from './pages/public/RegisterPage.tsx';
import { ProfilePage } from './pages/profile/ProfilePage.tsx';
import { NotificationsPage } from './pages/notifications/NotificationsPage.tsx';
import { RaceResultsPage } from './pages/performance/RaceResultsPage.tsx';
import { PerformancePage } from './pages/performance/PerformancePage.tsx';
import { HealthRecordsPage } from './pages/health/HealthRecordsPage.tsx';
import { HorseDetailPage } from './pages/horses/HorseDetailPage.tsx';
import { TrainerSelectPage } from './pages/staff/TrainerSelectPage.tsx';
import { HorseCreatePage } from './pages/horses/HorseCreatePage.tsx';
import { ownerView, addOwnerHorse, assignOwnerTrainer, submitOwnerHorse, updateOwnerHorse, addOwnerAchievement, markOwnerNotification, updateOwnerProfile } from './utils/ownerActions.ts';
import { MyHorsesPage } from './pages/horses/MyHorsesPage.tsx';
import { OwnerDashboard } from './pages/dashboard/OwnerDashboard.tsx';
import { ManagerDashboard } from './pages/dashboard/ManagerDashboard.tsx';
import { AppLayout } from './components/layout/AppLayout.tsx';
import { SuccessToast } from './components/common/SuccessToast.tsx';

const ownerPages = new Set<Page>(['my-horses', 'horse-create', 'trainer-select', 'horse-detail', 'health-records', 'performance', 'race-results', 'notifications', 'profile']);
const ownerTitles: Partial<Record<Page, string>> = { dashboard: 'Dashboard — Chủ ngựa', 'my-horses': 'Ngựa của tôi', 'horse-create': 'Đăng ký ngựa mới', 'horse-detail': 'Chi tiết ngựa', 'trainer-select': 'Chọn Head Trainer', 'health-records': 'Hồ sơ y tế', performance: 'Hiệu suất', 'race-results': 'Kết quả đua', notifications: 'Thông báo', profile: 'Hồ sơ cá nhân' };
const operationPages = new Set<Page>(['training-hub','vet-health-form','center-requests']);
const availablePages = new Set<Page>(['home', 'login', 'register', 'dashboard']);
function pageFromLocation(): Page {
  const path = window.location.pathname.replace(/^\//, '');
  if (path === 'manager' || path === 'owner' || path === 'dashboard') return 'dashboard';
  if (ownerPages.has(path as Page) || operationPages.has(path as Page)) return path as Page;
  return path === 'login' || path === 'register' ? path : 'home';
}

export default function App() {
  const [state, setState] = useState<AppState>(() => ({
    user: null, page: typeof window === 'undefined' ? 'home' : pageFromLocation(),
    users: SEED_USERS, clubs: SEED_CLUBS, memberRequests: SEED_REQUESTS,
    horses: HORSES, horseClubRequests: SEED_HORSE_CLUB_REQUESTS,
    healthRecords: MEDICAL_RECORDS, trainingPlans: TRAINING_PLANS, trainingSessions: TRAINING_SESSIONS,
    tasks: GROOM_TASKS, notifications: NOTIFICATIONS,
    selectedHorseId: 14, trainerSelectHorseId: null, viewTrainerId: null,
    showSuccess: null, userPermissions: {},
  }));
  const [workflow,setWorkflow] = useState<WorkflowStore>(()=>({horses:liveApi?[]:HORSES.map(legacyHorse),byHorse:{},catalog:liveApi?[]:demoCatalog}));
  useEffect(()=>{const expired=()=>{setState(s=>({...s,user:null,page:'login',showSuccess:'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'}));setWorkflow({horses:[],byHorse:{},catalog:[]});window.history.replaceState({},'', '/login');};window.addEventListener('raceforge:unauthorized',expired);return()=>window.removeEventListener('raceforge:unauthorized',expired);},[]);
  useEffect(() => {
    if (!state.showSuccess) return;
    const timer = setTimeout(() => setState(current => ({ ...current, showSuccess: null })), 3000);
    return () => clearTimeout(timer);
  }, [state.showSuccess]);
  useEffect(() => {
    const onBack = () => setState(current => ({ ...current, page: pageFromLocation() }));
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, []);
  const navigate = useCallback((page: Page) => {
    if (page === 'login' && state.user && liveApi) { void authService.logout().catch(()=>{}); tokenStore.clear(); setWorkflow({horses:[],byHorse:{},catalog:[]}); }
    if (liveApi && state.user && ['dashboard',...ownerPages].includes(page)) page = 'training-hub';
    if (!availablePages.has(page) && !ownerPages.has(page) && !operationPages.has(page)) {
      setState(current => ({ ...current, showSuccess: 'Trang này sẽ được triển khai ở đợt sau.' }));
      return;
    }
    if (operationPages.has(page) && state.user && ((page === 'center-requests' && state.user.role !== 'manager') || (page === 'vet-health-form' && state.user.role !== 'veterinarian') || !['owner','manager','veterinarian'].includes(state.user.role || ''))) { setState(s=>({...s,showSuccess:'Vai trò không có quyền truy cập.'})); return; }
    if (ownerPages.has(page) && state.user?.role !== 'owner') {
      setState(current => ({ ...current, showSuccess: 'Trang này dành cho Chủ ngựa.' })); return;
    }
    setState(current => ({ ...current, page, user: page === 'login' ? null : current.user }));
    window.history.pushState({}, '', page === 'home' ? '/' : page === 'dashboard' ? '/dashboard' : `/${page}`);
    window.scrollTo(0, 0);
  }, [state.user]);
  const handleLogin = useCallback((user: AppUser) => {
    setState(current => ({ ...current, user }));
    if (liveApi) setWorkflow({horses:[],byHorse:{},catalog:[]});
    navigate(user.role === 'veterinarian' || (liveApi && ['owner','manager'].includes(user.role || '')) ? 'training-hub' : user.role === 'manager' || user.role === 'owner' ? 'dashboard' : 'home');
    if (user.role !== 'manager' && user.role !== 'owner' && user.role !== 'veterinarian') setState(current => ({ ...current, showSuccess: 'Đăng nhập thành công. Trang dành cho vai trò của bạn sẽ được triển khai sau.' }));
  }, [navigate]);
  const handleRegister = useCallback((user: AppUser) => {
    setState(current => ({ ...current, users: [...current.users, user] }));
    navigate('login');
    setState(current => ({ ...current, showSuccess: 'OTP xác thực thành công. Bạn có thể đăng nhập.' }));
  }, [navigate]);
  const showSuccess = (message: string) => setState(current => ({ ...current, showSuccess: message }));
  const selectHorse = (id: number) => setState(current => current.horses.some(horse => horse.id === id && horse.ownerId === current.user?.id) ? { ...current, selectedHorseId: id } : current);
  const scopedOwnerState = ownerView({...state,horses:state.horses.map(h=>{const current=workflow.horses.find(x=>x.horseId===h.id);return current?{...h,healthStatus:current.healthStatus==='READY'?'Eligible' as const:current.healthStatus==='INJURED'?'Injured' as const:current.healthStatus==='QUARANTINED'?'Monitor' as const:'Pending Vet' as const,trainingStatus:current.trainingLocked?'Resting' as const:h.trainingStatus,vetClearance:current.healthStatus==='READY'}:h;})});
  const handleCreateHorse = (horse: Horse) => {
    try { const next=addOwnerHorse(state, horse); setState(next); setWorkflow(w=>({...w,horses:[...w.horses,legacyHorse(next.horses.find(h=>h.id===horse.id)!)]})); navigate('trainer-select'); showSuccess('Đã tạo hồ sơ ngựa.'); }
    catch (error) { showSuccess(error instanceof Error ? error.message : 'Không thể tạo hồ sơ ngựa.'); }
  };
  const handleSelectTrainer = (horseId: number, trainerId: number) => {
    try { setState(assignOwnerTrainer(state, horseId, trainerId)); navigate('my-horses'); showSuccess('Đã chọn Head Trainer.'); }
    catch (error) { showSuccess(error instanceof Error ? error.message : 'Không thể chọn Head Trainer.'); }
  };
  const handleSubmitToCenter = (horseId: number) => {
    try { setState(submitOwnerHorse(state, horseId)); showSuccess('Đã gửi đăng ký ngựa. Đang chờ Quản lý trung tâm duyệt.'); }
    catch (error) { showSuccess(error instanceof Error ? error.message : 'Không thể gửi đăng ký.'); }
  };
  const handleUpdateHorse = (horse: Horse) => {
    try { setState(updateOwnerHorse(state, horse)); }
    catch (error) { showSuccess(error instanceof Error ? error.message : 'Không thể cập nhật ngựa.'); }
  };
  const handleAddAchievement = (horseId: number, achievement: Achievement) => {
    try { setState(addOwnerAchievement(state, horseId, achievement)); }
    catch (error) { showSuccess(error instanceof Error ? error.message : 'Không thể thêm thành tích.'); }
  };
  const renderOwnerPage = () => {
    if (state.page === 'profile') return <ProfilePage key={state.user!.id} user={state.user!} state={scopedOwnerState} navigate={navigate} onLogout={() => navigate('login')} onSave={showSuccess} onUpdateName={name => setState(current => updateOwnerProfile(current, name))} />;
    if (state.page === 'notifications') return <NotificationsPage notifications={scopedOwnerState.notifications} onMarkRead={id => setState(current => markOwnerNotification(current, id))} />;
    if (state.page === 'race-results') return <RaceResultsPage horses={scopedOwnerState.horses} />;
    if (state.page === 'performance') return <PerformancePage horses={scopedOwnerState.horses} />;
    if (state.page === 'health-records') return <HealthRecordsPage state={scopedOwnerState} navigate={navigate} medicalByHorse={Object.fromEntries(Object.entries(workflow.byHorse).filter(([id])=>scopedOwnerState.horses.some(h=>h.id===Number(id))).map(([id,d])=>[id,d.records]))} />;
    if (state.page === 'horse-detail') return <HorseDetailPage medicalRecords={workflow.byHorse[state.selectedHorseId]?.records || []} currentMedicalHorse={workflow.horses.find(h=>h.horseId===state.selectedHorseId)} state={scopedOwnerState} navigate={navigate} onUpdateHorse={handleUpdateHorse} onShowSuccess={showSuccess} onAddAchievement={handleAddAchievement} />;
    if (state.page === 'trainer-select') return <TrainerSelectPage user={state.user!} state={scopedOwnerState} navigate={navigate} onSelectTrainer={handleSelectTrainer} />;
    if (state.page === 'horse-create') return <HorseCreatePage user={state.user!} state={scopedOwnerState} navigate={navigate} onCreateHorse={handleCreateHorse} />;
    if (state.page === 'my-horses') return <MyHorsesPage user={state.user!} state={scopedOwnerState} navigate={navigate} onSelectHorse={selectHorse} onSubmitToCenter={handleSubmitToCenter} />;
    return <OwnerDashboard state={scopedOwnerState} navigate={navigate} onSelectHorse={selectHorse} />;
  };
  let content;
  if (state.page === 'register') content = <RegisterPage navigate={navigate} onRegister={handleRegister} />;
  else if (state.page === 'login' || ((state.page === 'dashboard' || ownerPages.has(state.page) || operationPages.has(state.page)) && !state.user)) content = <LoginPage navigate={navigate} users={state.users} onLogin={handleLogin} />;
  else if (state.user && state.page === 'center-requests' && state.user.role === 'manager') content = <AppLayout user={state.user} page={state.page} title="CM Approval" navigate={navigate} state={state}><CenterRequestsPage state={state} onChange={setState}/></AppLayout>;
  else if (state.user && ['owner','manager','veterinarian'].includes(state.user.role || '') && (state.page === 'training-hub' || (state.page === 'vet-health-form' && state.user.role === 'veterinarian') || (liveApi && (state.page === 'dashboard' || ownerPages.has(state.page))))) content = <AppLayout user={state.user} page={state.page} title="Medical & Training" navigate={navigate} state={liveApi?{...state,horses:[],healthRecords:[],notifications:[],horseClubRequests:[],memberRequests:[]}:state}><WorkflowWorkspace key={state.user.id} user={state.user} legacyHorses={liveApi?[]:state.horses} store={workflow} setStore={setWorkflow}/></AppLayout>;
  else if (state.page === 'dashboard' && state.user?.role === 'manager') content = <AppLayout user={state.user} page="dashboard" title="Dashboard" navigate={navigate} state={state}><ManagerDashboard state={state} navigate={navigate} /></AppLayout>;
  else if ((state.page === 'dashboard' || ownerPages.has(state.page)) && state.user?.role === 'owner') content = <AppLayout user={state.user} page={state.page} title={ownerTitles[state.page] || 'Chủ ngựa'} navigate={navigate} state={scopedOwnerState}>{renderOwnerPage()}</AppLayout>;
  else content = <HomePage navigate={navigate} />;
  return <>{state.showSuccess && <SuccessToast message={state.showSuccess} />}{content}</>;
}
