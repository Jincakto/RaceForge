import { useCallback, useEffect, useState } from 'react';
import { type AppState, type Page } from './types/reference';
import {
  SEED_USERS, SEED_CLUBS, SEED_REQUESTS, HORSES, SEED_HORSE_CLUB_REQUESTS,
  MEDICAL_RECORDS, TRAINING_PLANS, TRAINING_SESSIONS, GROOM_TASKS, NOTIFICATIONS,
  type AppUser,
} from './data';
import { HomePage } from './pages/public/HomePage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';
import { ownerView } from './utils/ownerActions';
import { MyHorsesPage } from './pages/horses/MyHorsesPage';
import { OwnerDashboard } from './pages/dashboard/OwnerDashboard';
import { ManagerDashboard } from './pages/dashboard/ManagerDashboard';
import { AppLayout } from './components/layout/AppLayout';
import { SuccessToast } from './components/common/SuccessToast';

const ownerPages = new Set<Page>(['my-horses']);
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
  const renderOwnerPage = () => {
    if (state.page === 'my-horses') return <MyHorsesPage user={state.user!} state={scopedOwnerState} navigate={navigate} onSelectHorse={selectHorse} onSubmitToCenter={() => showSuccess('Gửi đăng ký sẽ được triển khai tiếp theo.')} />;
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
