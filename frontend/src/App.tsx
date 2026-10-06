import { useCallback, useEffect, useState } from 'react';
import { type AppState, type Page } from './types/reference';
import {
  SEED_USERS, SEED_CLUBS, SEED_REQUESTS, HORSES, SEED_HORSE_CLUB_REQUESTS,
  MEDICAL_RECORDS, TRAINING_PLANS, TRAINING_SESSIONS, GROOM_TASKS, NOTIFICATIONS,
  type AppUser, type Horse, type Achievement,
} from './data';
import { HomePage } from './pages/public/HomePage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';
import { HealthRecordsPage } from './pages/health/HealthRecordsPage';
import { HorseDetailPage } from './pages/horses/HorseDetailPage';
import { TrainerSelectPage } from './pages/staff/TrainerSelectPage';
import { HorseCreatePage } from './pages/horses/HorseCreatePage';
import { ownerView, addOwnerHorse, assignOwnerTrainer, submitOwnerHorse, updateOwnerHorse, addOwnerAchievement } from './utils/ownerActions';
import { MyHorsesPage } from './pages/horses/MyHorsesPage';
import { OwnerDashboard } from './pages/dashboard/OwnerDashboard';
import { ManagerDashboard } from './pages/dashboard/ManagerDashboard';
import { AppLayout } from './components/layout/AppLayout';
import { SuccessToast } from './components/common/SuccessToast';

const ownerPages = new Set<Page>(['my-horses', 'horse-create', 'trainer-select', 'horse-detail', 'health-records']);
const availablePages = new Set<Page>(['home', 'login', 'register', 'dashboard']);
function pageFromLocation(): Page {
  const path = window.location.pathname.replace(/^\//, '');
  if (path === 'manager' || path === 'owner' || path === 'dashboard') return 'dashboard';
  if (ownerPages.has(path as Page)) return path as Page;
  return path === 'login' || path === 'register' ? path : 'home';
}

export default function App() {
  const [state, setState] = useState<AppState>(() => ({
    user: null, page: typeof window === 'undefined' ? 'home' : pageFromLocation(),
    users: SEED_USERS, clubs: SEED_CLUBS, memberRequests: SEED_REQUESTS,
    horses: HORSES, horseClubRequests: SEED_HORSE_CLUB_REQUESTS,
    healthRecords: MEDICAL_RECORDS, trainingPlans: TRAINING_PLANS, trainingSessions: TRAINING_SESSIONS,
    tasks: GROOM_TASKS, notifications: NOTIFICATIONS,
    selectedHorseId: 'RH-001', trainerSelectHorseId: null, viewTrainerId: null,
    showSuccess: null, userPermissions: {},
  }));
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
    if (!availablePages.has(page) && !ownerPages.has(page)) {
      setState(current => ({ ...current, showSuccess: 'Trang này sẽ được triển khai ở đợt sau.' }));
      return;
    }
    if (ownerPages.has(page) && state.user?.role !== 'owner') {
      setState(current => ({ ...current, showSuccess: 'Trang này dành cho Chủ ngựa.' })); return;
    }
    setState(current => ({ ...current, page, user: page === 'login' ? null : current.user }));
    window.history.pushState({}, '', page === 'home' ? '/' : page === 'dashboard' ? '/dashboard' : `/${page}`);
    window.scrollTo(0, 0);
  }, [state.user?.role]);
  const handleLogin = useCallback((user: AppUser) => {
    setState(current => ({ ...current, user }));
    navigate(user.role === 'manager' || user.role === 'owner' ? 'dashboard' : 'home');
    if (user.role !== 'manager' && user.role !== 'owner') setState(current => ({ ...current, showSuccess: 'Đăng nhập thành công. Trang dành cho vai trò của bạn sẽ được triển khai sau.' }));
  }, [navigate]);
  const handleRegister = useCallback((user: AppUser) => {
    setState(current => ({ ...current, users: [...current.users, user] }));
    navigate('login');
    setState(current => ({ ...current, showSuccess: 'OTP xác thực thành công. Bạn có thể đăng nhập.' }));
  }, [navigate]);
  const showSuccess = (message: string) => setState(current => ({ ...current, showSuccess: message }));
  const selectHorse = (id: string) => setState(current => current.horses.some(horse => horse.id === id && horse.ownerId === current.user?.id) ? { ...current, selectedHorseId: id } : current);
  const scopedOwnerState = ownerView(state);
  const handleCreateHorse = (horse: Horse) => {
    try { setState(addOwnerHorse(state, horse)); navigate('trainer-select'); showSuccess('Đã tạo hồ sơ ngựa.'); }
    catch (error) { showSuccess(error instanceof Error ? error.message : 'Không thể tạo hồ sơ ngựa.'); }
  };
  const handleSelectTrainer = (horseId: string, trainerId: string) => {
    try { setState(assignOwnerTrainer(state, horseId, trainerId)); navigate('my-horses'); showSuccess('Đã chọn Head Trainer.'); }
    catch (error) { showSuccess(error instanceof Error ? error.message : 'Không thể chọn Head Trainer.'); }
  };
  const handleSubmitToCenter = (horseId: string) => {
    try { setState(submitOwnerHorse(state, horseId)); showSuccess('Đã gửi đăng ký ngựa. Đang chờ Quản lý trung tâm duyệt.'); }
    catch (error) { showSuccess(error instanceof Error ? error.message : 'Không thể gửi đăng ký.'); }
  };
  const handleUpdateHorse = (horse: Horse) => {
    try { setState(updateOwnerHorse(state, horse)); }
    catch (error) { showSuccess(error instanceof Error ? error.message : 'Không thể cập nhật ngựa.'); }
  };
  const handleAddAchievement = (horseId: string, achievement: Achievement) => {
    try { setState(addOwnerAchievement(state, horseId, achievement)); }
    catch (error) { showSuccess(error instanceof Error ? error.message : 'Không thể thêm thành tích.'); }
  };
  const renderOwnerPage = () => {
    if (state.page === 'health-records') return <HealthRecordsPage state={scopedOwnerState} navigate={navigate} />;
    if (state.page === 'horse-detail') return <HorseDetailPage state={scopedOwnerState} navigate={navigate} onUpdateHorse={handleUpdateHorse} onShowSuccess={showSuccess} onAddAchievement={handleAddAchievement} />;
    if (state.page === 'trainer-select') return <TrainerSelectPage user={state.user!} state={scopedOwnerState} navigate={navigate} onSelectTrainer={handleSelectTrainer} />;
    if (state.page === 'horse-create') return <HorseCreatePage user={state.user!} state={scopedOwnerState} navigate={navigate} onCreateHorse={handleCreateHorse} />;
    if (state.page === 'my-horses') return <MyHorsesPage user={state.user!} state={scopedOwnerState} navigate={navigate} onSelectHorse={selectHorse} onSubmitToCenter={handleSubmitToCenter} />;
    return <OwnerDashboard state={scopedOwnerState} navigate={navigate} onSelectHorse={selectHorse} />;
  };
  let content;
  if (state.page === 'register') content = <RegisterPage navigate={navigate} onRegister={handleRegister} />;
  else if (state.page === 'login' || ((state.page === 'dashboard' || ownerPages.has(state.page)) && !state.user)) content = <LoginPage navigate={navigate} users={state.users} onLogin={handleLogin} />;
  else if (state.page === 'dashboard' && state.user?.role === 'manager') content = <AppLayout user={state.user} page="dashboard" title="Dashboard" navigate={navigate} state={state}><ManagerDashboard state={state} navigate={navigate} /></AppLayout>;
  else if ((state.page === 'dashboard' || ownerPages.has(state.page)) && state.user?.role === 'owner') content = <AppLayout user={state.user} page={state.page} title={state.page === 'dashboard' ? 'Dashboard — Chủ ngựa' : 'Ngựa của tôi'} navigate={navigate} state={scopedOwnerState}>{renderOwnerPage()}</AppLayout>;
  else content = <HomePage navigate={navigate} />;
  return <>{state.showSuccess && <SuccessToast message={state.showSuccess} />}{content}</>;
}
