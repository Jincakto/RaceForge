import { createContext, useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pagePath } from '../routes/paths';
import { RATIONS, SEED_INVENTORY, SEED_INV_LOGS } from '../data/care';
import { CARE_LABELS, LIFECYCLE_LABEL, REHAB_PACKAGES, TODAY, TRAINING_PACKAGES } from '../data/constants';
import { MEDICAL_RECORDS } from '../data/health';
import { HORSES, SEED_HORSE_CLUB_REQUESTS } from '../data/horses';
import { NOTIFICATIONS } from '../data/notifications';
import { SEED_ENROLLMENTS, TRAINING_PLANS, TRAINING_SESSIONS } from '../data/training';
import { SEED_CLUBS, SEED_REQUESTS, SEED_USERS } from '../data/users';
import { isLow } from '../utils/care';
import { addDays, addWeeks, toDDMMYYYY } from '../utils/date';
import { fmtQty } from '../utils/format';
import { sortHealthRecords } from '../utils/health';
import { getLifecycle, isHeavySession, lockMessage } from '../utils/horse';
import { newNotif, trainerTarget } from '../utils/notifications';

export const AppContext = createContext(null);

/** Holds all in-memory application state + actions. Replace the handler bodies with services/ calls when the Spring Boot API is wired in. */
export function AppProvider({ children }) {
  const [state, setState] = useState({
    user: null,
    users: SEED_USERS, clubs: SEED_CLUBS, memberRequests: SEED_REQUESTS,
    horses: HORSES, horseClubRequests: SEED_HORSE_CLUB_REQUESTS,
    healthRecords: MEDICAL_RECORDS, trainingPlans: TRAINING_PLANS, trainingSessions: TRAINING_SESSIONS,
    inventory: SEED_INVENTORY, invLogs: SEED_INV_LOGS, careRecords: [], incidents: [], notifications: NOTIFICATIONS, enrollments: SEED_ENROLLMENTS, errorMsg: null,
    selectedHorseId: 'RH-001', trainerSelectHorseId: null, viewTrainerId: null, showSuccess: null,
    userPermissions: {},
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const routerNavigate = useNavigate();
  const routerNavigateRef = useRef(routerNavigate);
  routerNavigateRef.current = routerNavigate;
  // Synchronous mirror of selectedHorseId so navigate('horse-detail') right after selectHorse(id) hits the right URL.
  const selectedHorseRef = useRef(state.selectedHorseId);

  /** Navigate by page key ('dashboard', 'horse-list', ...). Paths live in routes/paths.js. */
  const navigate = useCallback((page) => {
    routerNavigateRef.current(pagePath(page, { horseId: selectedHorseRef.current }));
  }, []);

  const selectHorse = useCallback((id) => {
    selectedHorseRef.current = id;
    setState(s => ({ ...s, selectedHorseId: id }));
  }, []);

  const showError = useCallback((msg) => {
    setState(s => ({ ...s, errorMsg: msg }));
    setTimeout(() => setState(s => ({ ...s, errorMsg: null })), 6000);
  }, []);

  const showSuccess = useCallback((msg) => {
    setState(s => ({ ...s, showSuccess: msg }));
    setTimeout(() => setState(s => ({ ...s, showSuccess: null })), 3000);
  }, []);

  const handleLogin = useCallback((user) => {
    setState(s => ({ ...s, user }));
    navigate(user.role ? 'dashboard' : 'onboarding');
  }, [navigate]);

  const handleRegister = useCallback((user) => {
    setState(s => ({ ...s, users: [...s.users, user], user }));
    navigate('onboarding');
    showSuccess(`Chào mừng ${user.name.split(' ').pop()}! OTP xác thực thành công.`);
  }, [showSuccess, navigate]);

  const handleJoinRequest = useCallback((clubId) => {
    setState(s => {
      if (!s.user) return s;
      const existing = s.memberRequests.find(r => r.userId === s.user.id && r.clubId === clubId);
      if (existing?.status === 'approved') return s;

      const requestedAt = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const req = { id: existing?.id ?? `req${crypto.randomUUID()}`, userId: s.user.id, userName: s.user.name, userEmail: s.user.email, userAvatar: s.user.avatar, userRole: s.user.role, clubId, requestedAt, expiresAt: addWeeks(requestedAt, 1), status: 'pending', assignedRole: null };
      // Replace the existing request and remove any older duplicates for this user and club.
      const memberRequests = s.memberRequests.filter(r => r.userId !== req.userId || r.clubId !== clubId || r === existing).map(r => r === existing ? req : r);
      return { ...s, memberRequests: existing ? memberRequests : [...memberRequests, req] };
    });
  }, []);

  const handleApproveRequest = useCallback((reqId, role) => {
    setState(s => {
      const req = s.memberRequests.find(r => r.id === reqId);
      if (!req) return s;
      return {
        ...s,
        memberRequests: s.memberRequests.map(r => r.id === reqId ? { ...r, status: 'approved', assignedRole: role } : r),
        users: s.users.map(u => u.id === req.userId ? { ...u, role, clubId: req.clubId } : u),
        clubs: s.clubs.map(c => c.id === req.clubId ? { ...c, memberCount: c.memberCount + 1 } : c),
      };
    });
    showSuccess('Đã duyệt và phân công vai trò!');
  }, [showSuccess]);

  const handleRejectRequest = useCallback((reqId) => {
    setState(s => ({ ...s, memberRequests: s.memberRequests.map(r => r.id === reqId ? { ...r, status: 'rejected' } : r) }));
    showSuccess('Đã từ chối yêu cầu.');
  }, [showSuccess]);

  const handleCreateHorse = useCallback((horse) => {
    setState(s => {
      const clubId = s.user.clubId;
      const req = clubId ? { id: `hcr${Date.now()}`, horseId: horse.id, horseName: horse.name, horseBreed: horse.breed, horseImageUrl: horse.imageUrl, ownerId: s.user.id, ownerName: s.user.name, clubId, submittedAt: TODAY, expiresAt: '02/10/2026', status: 'pending', reviewNote: '' } : null;
      return {
        ...s, horses: [...s.horses, horse],
        horseClubRequests: req ? [...s.horseClubRequests, req] : s.horseClubRequests,
        notifications: clubId ? [newNotif({ type: 'approval', message: `Chủ ngựa ${s.user.name} gửi đăng ký ngựa "${horse.name}" — chờ bạn duyệt vào nhóm`, toRoles: ['manager'], clubId, action: 'center-requests' }), ...s.notifications] : s.notifications,
      };
    });
    navigate('my-horses');
    showSuccess(`Hồ sơ "${horse.name}" đã gửi cho Quản lý duyệt!`);
  }, [showSuccess, navigate]);

  const handleUpdateHorse = useCallback((updated) => {
    setState(s => ({ ...s, horses: s.horses.map(h => h.id === updated.id ? updated : h) }));
  }, []);

  const handleSelectTrainer = useCallback((horseId, trainerId) => {
    const trainer = state.users.find(u => u.id === trainerId);
    setState(s => ({
      ...s,
      horses: s.horses.map(h => h.id === horseId ? { ...h, headTrainerId: trainerId, headTrainerName: trainer?.name || '' } : h),
      trainerSelectHorseId: null,
    }));
    navigate('my-horses');
    showSuccess(`Đã chọn ${trainer?.name} làm Head Trainer!`);
  }, [showSuccess, state.users, navigate]);

  const handleSubmitToCenter = useCallback((horseId) => {
    setState(s => {
      const horse = s.horses.find(h => h.id === horseId);
      if (!horse || !s.user.clubId) return s;
      const req = { id: `hcr${Date.now()}`, horseId, horseName: horse.name, horseBreed: horse.breed, horseImageUrl: horse.imageUrl, ownerId: s.user.id, ownerName: s.user.name, clubId: s.user.clubId, submittedAt: '25/09/2026', expiresAt: '02/10/2026', status: 'pending', reviewNote: '' };
      return {
        ...s, horseClubRequests: [...s.horseClubRequests, req],
        horses: s.horses.map(h => h.id === horseId ? { ...h, approvalStatus: 'pending', lifecycle: 'pending' } : h),
        notifications: [newNotif({ type: 'approval', message: `Chủ ngựa ${s.user.name} gửi đăng ký ngựa "${horse.name}" — chờ bạn duyệt vào nhóm`, toRoles: ['manager'], clubId: s.user.clubId, action: 'center-requests' }), ...s.notifications],
      };
    });
    showSuccess('Đã nộp đơn đăng ký ngựa!');
  }, [showSuccess]);

  const handleApproveHorse = useCallback((reqId) => {
    setState(s => {
      const req = s.horseClubRequests.find(r => r.id === reqId);
      if (!req) return s;
      return {
        ...s,
        horseClubRequests: s.horseClubRequests.map(r => r.id === reqId ? { ...r, status: 'approved' } : r),
        horses: s.horses.map(h => h.id === req.horseId ? { ...h, clubId: req.clubId, approvalStatus: 'approved', approvedAt: TODAY, lifecycle: 'awaiting_vet', healthStatus: 'Pending Vet', trainingStatus: 'Inactive' } : h),
        notifications: [
          newNotif({ type: 'health', message: `Ngựa "${req.horseName}" (chủ: ${req.ownerName}) vừa được duyệt — cần khám sức khỏe trước khi huấn luyện`, toRoles: ['veterinarian'], clubId: req.clubId, action: 'post-exam' }),
          newNotif({ type: 'approval', message: `Ngựa "${req.horseName}" đã được duyệt vào trung tâm — trạng thái: Chờ khám sức khỏe`, toUserIds: [req.ownerId], clubId: req.clubId, action: 'my-horses' }),
          ...s.notifications,
        ],
      };
    });
    showSuccess('Ngựa đã vào trung tâm!');
  }, [showSuccess]);

  const handleRejectHorse = useCallback((reqId, note) => {
    setState(s => {
      const req = s.horseClubRequests.find(r => r.id === reqId);
      return {
        ...s,
        horseClubRequests: s.horseClubRequests.map(r => r.id === reqId ? { ...r, status: 'rejected', reviewNote: note } : r),
        horses: s.horses.map(h => req && h.id === req.horseId ? { ...h, approvalStatus: 'rejected' } : h),
        notifications: req ? [newNotif({ type: 'approval', message: `Đơn đăng ký ngựa "${req.horseName}" bị từ chối${note ? `: ${note}` : ''}`, toUserIds: [req.ownerId], clubId: req.clubId, action: 'my-horses' }), ...s.notifications] : s.notifications,
      };
    });
    showSuccess('Đã từ chối đơn đăng ký ngựa.');
  }, [showSuccess]);

  const handleLogout = useCallback(() => {
    setState(s => ({ ...s, user: null }));
    navigate('home');
  }, [navigate]);

  const handleUpdatePermissions = useCallback((userId, pages) => {
    setState(s => ({ ...s, userPermissions: { ...s.userPermissions, [userId]: pages } }));
  }, []);

  const handleViewTrainer = useCallback((uid) => {
    setState(s => ({ ...s, viewTrainerId: uid }));
    navigate('trainer-profile');
  }, [navigate]);

  const handleSaveHealthRecord = useCallback((rec) => {
    setState(s => {
      const allRecords = [...s.healthRecords, rec];
      const latest = sortHealthRecords(allRecords.filter(r => r.horseId === rec.horseId))[0];
      const notifications = [...s.notifications];
      const examinedHorse = s.horses.find(h => h.id === rec.horseId);
      const injurySummary = Object.values(rec.injuryDetails || {}).map(d => `${d.issue} (${d.severity === 'severe' ? 'nặng' : d.severity === 'moderate' ? 'vừa' : 'nhẹ'})`).join(', ');
      const shouldLock = !!examinedHorse && getLifecycle(examinedHorse) === 'training' && rec.trainingEligibility === 'not-eligible';
      const lockReason = rec.diagnosis?.trim() || injurySummary || rec.trainingReasons?.join('; ') || 'Không đủ điều kiện huấn luyện';
      if (examinedHorse && injurySummary) {
        notifications.unshift(
          newNotif({ type: 'health', message: `Phát hiện chấn thương ở "${examinedHorse.name}": ${injurySummary}.`, toUserIds: [examinedHorse.ownerId], clubId: examinedHorse.clubId || undefined, action: 'horse-detail', horseId: examinedHorse.id }),
          newNotif({ type: 'health', message: `Hồ sơ mới của "${examinedHorse.name}": ${injurySummary}. ${shouldLock ? 'Ngựa đã bị khóa huấn luyện.' : 'Cần điều chỉnh và theo dõi trong các buổi tập.'}`, ...trainerTarget(examinedHorse), clubId: examinedHorse.clubId || undefined, action: 'health-records', horseId: examinedHorse.id }),
        );
      }
      if (shouldLock && examinedHorse && s.user) {
        const voidedCount = s.trainingSessions.filter(x => x.horseId === examinedHorse.id && x.status === 'Scheduled' && isHeavySession(x.type)).length;
        notifications.unshift(
          newNotif({ type: 'lock', message: `KHÓA HUẤN LUYỆN: "${examinedHorse.name}" — ${lockReason}. ${voidedCount} buổi tập nặng chuyển sang "Không thực hiện".`, toUserIds: [examinedHorse.ownerId], clubId: examinedHorse.clubId || undefined, action: 'horse-detail', horseId: examinedHorse.id }),
          newNotif({ type: 'lock', message: `KHÓA HUẤN LUYỆN: "${examinedHorse.name}" — ${lockReason}. Hãy rà soát lại lịch tập.`, ...trainerTarget(examinedHorse), clubId: examinedHorse.clubId || undefined, action: 'training-hub', horseId: examinedHorse.id }),
          newNotif({ type: 'lock', message: `"${examinedHorse.name}" cần kích hoạt gói phục hồi (${lockReason}).`, toRoles: ['manager'], clubId: examinedHorse.clubId || undefined, action: 'rehab-center', horseId: examinedHorse.id }),
        );
      }
      const horses = s.horses.map(h => {
        if (h.id !== rec.horseId) return h;
        const lc0 = getLifecycle(h);
        if (lc0 === 'locked' || lc0 === 'rehab') return h;
        if (shouldLock) return {
          ...h, healthStatus: 'Injured', trainingStatus: 'Inactive', vetClearance: false, lifecycle: 'locked',
          lock: { reason: lockReason, notes: rec.notes, lockedAt: TODAY, lockedById: s.user.id, lockedByName: s.user.name },
          recoveryBadge: null,
        };
        let next = h;
        if (latest.trainingEligibility === 'eligible')
          next = { ...h, vetClearance: true, healthStatus: 'Eligible', trainingStatus: 'Active' };
        else if (latest.trainingEligibility === 'conditional')
          next = { ...h, healthStatus: 'Monitor', trainingStatus: 'Active' };
        else if (latest.trainingEligibility === 'not-eligible')
          next = { ...h, vetClearance: false, healthStatus: 'Injured', trainingStatus: 'Inactive' };
        let lc = lc0;
        if ((lc0 === 'awaiting_vet' || lc0 === 'ready') && latest.trainingEligibility === 'eligible') lc = 'ready';
        else if (lc0 === 'ready') lc = 'awaiting_vet';
        if (lc !== 'training') next = { ...next, trainingStatus: 'Inactive' };
        if (lc0 === 'awaiting_vet' && lc === 'ready')
          notifications.unshift(newNotif({ type: 'health', message: `Ngựa "${h.name}" đã được Thú y xác nhận ĐỦ ĐIỀU KIỆN HUẤN LUYỆN — trạng thái: Sẵn sàng huấn luyện. Hãy chọn gói huấn luyện.`, toUserIds: [h.ownerId], clubId: h.clubId || undefined, action: 'training-register' }));
        return { ...next, lifecycle: lc };
      });
      return {
        ...s,
        healthRecords: allRecords,
        horses,
        notifications,
        enrollments: shouldLock ? s.enrollments.map(e => e.horseId === rec.horseId && e.status === 'active' ? { ...e, status: 'paused', pausedAt: TODAY, pauseReason: lockReason, scheduleConfirmed: false } : e) : s.enrollments,
        trainingPlans: shouldLock ? s.trainingPlans.map(p => p.horseId === rec.horseId && p.status === 'Active' ? { ...p, status: 'Paused' } : p) : s.trainingPlans,
        trainingSessions: shouldLock ? s.trainingSessions.map(x => x.horseId === rec.horseId && x.status === 'Scheduled' && isHeavySession(x.type) ? { ...x, status: 'Not Performed', voidedByLock: true } : x) : s.trainingSessions,
      };
    });
  }, []);

  const handleEnroll = useCallback((horseId, packageId) => {
    const s = stateRef.current;
    const horse = s.horses.find(h => h.id === horseId);
    const pkg = TRAINING_PACKAGES.find(p => p.id === packageId);
    if (!horse || !pkg || !s.user) return 'Không tìm thấy ngựa hoặc gói huấn luyện.';
    if (s.user.role !== 'owner' || horse.ownerId !== s.user.id) return 'Chỉ chủ ngựa mới đăng ký huấn luyện cho ngựa của mình.';
    if (getLifecycle(horse) !== 'ready') return 'Chỉ ngựa "Sẵn sàng huấn luyện" mới đăng ký huấn luyện được.';
    if (s.enrollments.some(e => e.horseId === horseId && e.status !== 'completed')) return 'Ngựa này đã có một gói huấn luyện — mỗi ngựa chỉ được chọn một gói.';
    const trainers = s.users.filter(u => u.role === 'head_trainer' && u.clubId === horse.clubId);
    if (trainers.length === 0) return 'Trung tâm chưa có Head Trainer để phân công.';
    const load = (id) => s.enrollments.filter(e => e.trainerId === id && e.status !== 'completed').length;
    const trainer = [...trainers].sort((a, b) => load(a.id) - load(b.id))[0];
    const phase = pkg.id === 'pk-foundation' ? 'Foundation' : pkg.id === 'pk-performance' ? 'Base Building' : 'Competition Prep';
    const stamp = Date.now();
    const planId = `tp${stamp}`;
    const sessionTypes = pkg.id === 'pk-foundation'
      ? ['Walk & Trot', 'Endurance', 'Recovery']
      : pkg.id === 'pk-performance'
        ? ['Interval', 'Tempo', 'Recovery']
        : ['Sprint', 'Race-Pace', 'Recovery'];
    const generatedSessions = Array.from({ length: pkg.sessions }, (_, index) => {
      const type = sessionTypes[index % sessionTypes.length];
      return {
        id: `ts${stamp}-${index + 1}`,
        horseId,
        planId,
        date: addDays(TODAY, index + 1),
        time: '09:00',
        type,
        trainerName: trainer.name,
        trainerId: trainer.id,
        assignedStaffIds: [trainer.id],
        assignedStaffNames: [trainer.name],
        status: 'Scheduled',
        distance: type === 'Recovery' ? 'Đi bộ 20 phút' : pkg.id === 'pk-foundation' ? '800m' : '1200m',
        targetTime: type === 'Recovery' ? '20 phút' : 'Theo giáo án',
        notes: `Buổi ${index + 1}/${pkg.sessions} · Tự động tạo theo gói ${pkg.name}`,
        conflictChecked: false,
      };
    });
    setState(st => ({
      ...st,
      horses: st.horses.map(h => h.id === horseId ? { ...h, lifecycle: 'training', trainingStatus: 'Active', headTrainerId: trainer.id, headTrainerName: trainer.name } : h),
      enrollments: [...st.enrollments, { id: `en${stamp}`, horseId, packageId, packageName: pkg.name, sessionsTotal: pkg.sessions, sessionsDone: 0, status: 'active', trainerId: trainer.id, trainerName: trainer.name, startedAt: TODAY, scheduleConfirmed: false }],
      trainingPlans: [...st.trainingPlans, { id: planId, horseId, phase, startDate: TODAY, endDate: addWeeks(TODAY, pkg.weeks), distance: '1200m', workload: pkg.id === 'pk-foundation' ? 'Moderate' : 'High', surface: 'Turf', goals: `Gói ${pkg.name}: ${pkg.sessions} buổi / ${pkg.weeks} tuần — lịch được tạo tự động theo số buổi`, status: 'Active', locked: false, createdBy: `Gói ${pkg.name} (tự động)`, progress: 0 }],
      trainingSessions: [...st.trainingSessions, ...generatedSessions],
      notifications: [
        newNotif({ type: 'training', message: `Bạn được phân công huấn luyện ngựa "${horse.name}" — hệ thống đã tạo đủ ${pkg.sessions} buổi theo ngày. Hãy rà soát và xác nhận lịch.`, toUserIds: [trainer.id], clubId: horse.clubId || undefined, action: 'training-hub' }),
        newNotif({ type: 'training', message: `Ngựa "${horse.name}" đã đăng ký gói huấn luyện ${pkg.name}, Head Trainer: ${trainer.name}`, toRoles: ['manager'], clubId: horse.clubId || undefined }),
        ...st.notifications,
      ],
    }));
    showSuccess(`Đã chọn gói ${pkg.name}. Head Trainer ${trainer.name} được tự động phân công!`);
    return null;
  }, [showSuccess]);

  const reject = useCallback((msg) => { showError(msg); return msg; }, [showError]);

  const nowStamp = () => { const d = new Date(); return { at: `${TODAY} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, ts: Date.now() }; };
  const mkLog = (item, u, p) => {
    const { at, ts } = nowStamp();
    return { id: `il${ts}${Math.random().toString(36).slice(2, 6)}`, clubId: item.clubId, itemId: item.id, itemName: item.name, unit: item.unit, byId: u.id, byName: u.name, date: TODAY, at, ts, ...p };
  };
  const lowNotif = (before, after) =>
    isLow(after) && (!before || !isLow(before) || after.qty < before.qty)
      ? [newNotif({ type: 'inventory', message: `Sắp hết: "${after.name}" còn ${fmtQty(after.qty)} ${after.unit} (ngưỡng ${fmtQty(after.threshold)}). Hãy nhập thêm vào kho.`, toRoles: ['groom'], clubId: after.clubId, action: 'inventory' })] : [];

  const invAddItem = useCallback((f) => {
    const s = stateRef.current; const u = s.user;
    if (!u || u.role !== 'groom' || !u.clubId) return reject('Chỉ Groom mới quản lý kho.');
    const name = f.name.trim();
    if (!name) return reject('Vui lòng nhập tên vật tư.');
    if (!(f.qty >= 0) || !(f.threshold >= 0)) return reject('Số lượng và ngưỡng phải là số không âm.');
    if (s.inventory.some(i => i.clubId === u.clubId && i.name.toLowerCase() === name.toLowerCase())) return reject('Vật tư này đã có trong kho. Hãy dùng "Nhập" để thêm số lượng.');
    const item = { id: `inv${Date.now()}`, clubId: u.clubId, name, category: f.category, foodKind: f.category === 'food' ? f.foodKind : undefined, unit: f.unit, qty: f.qty, threshold: f.threshold };
    setState(st => ({ ...st, inventory: [...st.inventory, item], invLogs: [...st.invLogs, mkLog(item, u, { kind: 'in', delta: item.qty, balance: item.qty, reason: 'Thêm vật tư mới / tồn đầu' })], notifications: [...lowNotif(undefined, item), ...st.notifications] }));
    showSuccess(`Đã thêm "${name}" vào kho`);
    return null;
  }, [reject, showSuccess]);

  const invReceive = useCallback((itemId, qty, dateISO) => {
    const s = stateRef.current; const u = s.user;
    const item = s.inventory.find(i => i.id === itemId);
    if (!u || u.role !== 'groom' || !item) return reject('Không tìm thấy vật tư.');
    if (!(qty > 0)) return reject('Số lượng nhập phải lớn hơn 0.');
    if (!dateISO) return reject('Vui lòng chọn ngày nhập.');
    setState(st => {
      const cur = st.inventory.find(i => i.id === itemId); if (!cur) return st;
      const next = { ...cur, qty: Math.round((cur.qty + qty) * 100) / 100 };
      return { ...st, inventory: st.inventory.map(i => i.id === itemId ? next : i), invLogs: [...st.invLogs, mkLog(cur, u, { kind: 'in', delta: qty, balance: next.qty, date: toDDMMYYYY(dateISO), reason: 'Nhập hàng' })] };
    });
    showSuccess(`Đã nhập ${fmtQty(qty)} ${item.unit} ${item.name}`);
    return null;
  }, [reject, showSuccess]);

  const invEdit = useCallback((itemId, f) => {
    const s = stateRef.current; const u = s.user;
    const item = s.inventory.find(i => i.id === itemId);
    if (!u || u.role !== 'groom' || !item) return reject('Không tìm thấy vật tư.');
    const name = f.name.trim();
    if (!name) return reject('Vui lòng nhập tên vật tư.');
    if (!(f.threshold >= 0)) return reject('Ngưỡng cảnh báo phải là số không âm.');
    if (s.inventory.some(i => i.id !== itemId && i.clubId === item.clubId && i.name.toLowerCase() === name.toLowerCase())) return reject('Đã có vật tư khác trùng tên.');
    const next = { ...item, name, category: f.category, foodKind: f.category === 'food' ? f.foodKind : undefined, unit: f.unit, threshold: f.threshold };
    setState(st => ({ ...st, inventory: st.inventory.map(i => i.id === itemId ? next : i), invLogs: [...st.invLogs, mkLog(next, u, { kind: 'edit', delta: 0, balance: next.qty, reason: `Sửa thông tin (từ "${item.name}", ngưỡng ${fmtQty(item.threshold)} ${item.unit} → "${name}", ngưỡng ${fmtQty(next.threshold)} ${next.unit})` })], notifications: [...lowNotif(item, next), ...st.notifications] }));
    showSuccess('Đã cập nhật vật tư');
    return null;
  }, [reject, showSuccess]);

  const invAdjust = useCallback((itemId, qty, reason) => {
    const s = stateRef.current; const u = s.user;
    const item = s.inventory.find(i => i.id === itemId);
    if (!u || u.role !== 'groom' || !item) return reject('Không tìm thấy vật tư.');
    if (!(qty >= 0)) return reject('Số tồn thực tế phải là số không âm.');
    if (!reason.trim()) return reject('Vui lòng nhập lý do điều chỉnh.');
    if (qty === item.qty) return reject('Số tồn không thay đổi.');
    const next = { ...item, qty };
    setState(st => ({ ...st, inventory: st.inventory.map(i => i.id === itemId ? next : i), invLogs: [...st.invLogs, mkLog(item, u, { kind: 'adjust', delta: Math.round((qty - item.qty) * 100) / 100, balance: qty, reason: reason.trim() })], notifications: [...lowNotif(item, next), ...st.notifications] }));
    showSuccess('Đã kiểm kê và cập nhật số tồn');
    return null;
  }, [reject, showSuccess]);

  const invDelete = useCallback((itemId) => {
    const s = stateRef.current; const u = s.user;
    const item = s.inventory.find(i => i.id === itemId);
    if (!u || u.role !== 'groom' || !item) return reject('Không tìm thấy vật tư.');
    setState(st => ({ ...st, inventory: st.inventory.filter(i => i.id !== itemId), invLogs: [...st.invLogs, mkLog(item, u, { kind: 'edit', delta: 0, balance: 0, reason: `Xóa vật tư (tồn lúc xóa: ${fmtQty(item.qty)} ${item.unit})` })] }));
    showSuccess(`Đã xóa "${item.name}"`);
    return null;
  }, [reject, showSuccess]);

  const completeCare = useCallback((horseId, taskKey, supplies) => {
    const s = stateRef.current; const u = s.user;
    const horse = s.horses.find(h => h.id === horseId);
    const fail = (message) => { reject(message); return { ok: false, message, shortages: [] }; };
    if (!u || u.role !== 'groom' || !horse || horse.clubId !== u.clubId) return fail('Không thể thực hiện thao tác này.');
    if (s.careRecords.some(r => r.horseId === horseId && r.date === TODAY && r.taskKey === taskKey)) return fail('Việc này đã được đánh dấu hoàn thành hôm nay.');
    const inv = s.inventory.filter(i => i.clubId === u.clubId);
    const needs = new Map();
    const add = (id, q) => needs.set(id, (needs.get(id) || 0) + q);
    if (taskKey.startsWith('feed-')) {
      const meal = RATIONS[horseId]?.meals.find(m => `feed-${m.meal}` === taskKey);
      if (!meal) return fail(`"${horse.name}" chưa có khẩu phần được duyệt cho bữa này.`);
      const lines = [['grain', meal.grain, 'ngũ cốc'], ['hay', meal.hay, 'cỏ'], ['vitamin', meal.vitamin, 'vitamin']];
      for (const [kind, q, label] of lines) {
        if (!(q > 0)) continue;
        const it = inv.find(i => i.foodKind === kind);
        if (!it) return fail(`Kho chưa có vật tư loại ${label}. Hãy thêm vật tư này vào "Kho của tôi" (nhóm Thức ăn, loại ${label}).`);
        add(it.id, q);
      }
    } else for (const l of supplies) add(l.itemId, l.qty);
    const shortages = Array.from(needs.entries()).map(([id, need]) => { const it = inv.find(i => i.id === id); return { itemId: id, name: it?.name || '?', have: it?.qty || 0, need, unit: it?.unit || '', ok: !!it && it.qty >= need }; }).filter(x => !x.ok);
    if (shortages.length) {
      const message = shortages.map(x => `Không đủ ${x.name}: còn ${fmtQty(x.have)} ${x.unit}, cần ${fmtQty(x.need)} ${x.unit}`).join('; ');
      reject(message);
      return { ok: false, message, shortages: shortages.map(({ ok: _o, ...r }) => r) };
    }
    const { at, ts } = nowStamp();
    const label = CARE_LABELS[taskKey] || taskKey;
    setState(st => {
      let inventory = st.inventory; const logs = []; const notes = []; const deductions = [];
      needs.forEach((q, id) => {
        const cur = inventory.find(i => i.id === id);
        const next = { ...cur, qty: Math.round((cur.qty - q) * 100) / 100 };
        inventory = inventory.map(i => i.id === id ? next : i);
        deductions.push({ itemId: id, itemName: cur.name, unit: cur.unit, qty: q });
        logs.push(mkLog(cur, u, { kind: 'out', delta: -q, balance: next.qty, horseId, horseName: horse.name, task: label }));
        notes.push(...lowNotif(cur, next));
      });
      const rec = { id: `cr${ts}${Math.random().toString(36).slice(2, 5)}`, clubId: u.clubId, horseId, date: TODAY, taskKey, taskLabel: label, doneAt: at, byName: u.name, deductions };
      return { ...st, inventory, invLogs: [...st.invLogs, ...logs], careRecords: [...st.careRecords, rec], notifications: [...notes, ...st.notifications] };
    });
    showSuccess(`${horse.name}: đã hoàn thành "${label}"`);
    return { ok: true };
  }, [reject, showSuccess]);

  const undoCare = useCallback((recordId) => {
    const s = stateRef.current; const u = s.user;
    const rec = s.careRecords.find(r => r.id === recordId);
    if (!u || u.role !== 'groom' || !rec) return reject('Không tìm thấy bản ghi.');
    const horse = s.horses.find(h => h.id === rec.horseId);
    setState(st => {
      let inventory = st.inventory; const logs = [];
      for (const d of rec.deductions) {
        const cur = inventory.find(i => i.id === d.itemId); if (!cur) continue;
        const next = { ...cur, qty: Math.round((cur.qty + d.qty) * 100) / 100 };
        inventory = inventory.map(i => i.id === d.itemId ? next : i);
        logs.push(mkLog(cur, u, { kind: 'refund', delta: d.qty, balance: next.qty, horseId: rec.horseId, horseName: horse?.name, task: `Hủy "${rec.taskLabel}"` }));
      }
      return { ...st, inventory, invLogs: [...st.invLogs, ...logs], careRecords: st.careRecords.filter(r => r.id !== recordId) };
    });
    showSuccess('Đã hủy hoàn thành và hoàn lại vật tư vào kho');
    return null;
  }, [reject, showSuccess]);

  const reportIncident = useCallback((f) => {
    const s = stateRef.current; const u = s.user;
    const horse = s.horses.find(h => h.id === f.horseId);
    if (!u || u.role !== 'groom' || !horse) return reject('Vui lòng chọn ngựa.');
    if (!f.description.trim()) return reject('Vui lòng nhập mô tả sự cố.');
    const { at } = nowStamp();
    const inc = { id: `inc${Date.now()}`, clubId: horse.clubId || u.clubId, horseId: horse.id, horseName: horse.name, type: f.type, description: f.description.trim(), imageUrl: f.imageUrl, reportedById: u.id, reportedByName: u.name, at, date: TODAY };
    setState(st => ({ ...st, incidents: [inc, ...st.incidents], notifications: [
      newNotif({ type: 'incident', message: `SỰ CỐ: "${horse.name}" — ${f.type}. ${inc.description} (báo cáo bởi ${u.name})`, toRoles: ['veterinarian'], clubId: inc.clubId, action: 'health-records', horseId: horse.id }),
      newNotif({ type: 'incident', message: `Groom ${u.name} báo sự cố "${f.type}" của "${horse.name}" — đã gửi Thú y`, toRoles: ['manager'], clubId: inc.clubId, action: 'horse-detail', horseId: horse.id }),
      ...st.notifications] }));
    showSuccess('Đã gửi báo cáo sự cố cho Thú y và Quản lý');
    return null;
  }, [reject, showSuccess]);

  const handleCreatePlan = useCallback((plan) => {
    const s = stateRef.current;
    const horse = s.horses.find(h => h.id === plan.horseId);
    if (!horse || !s.user) return reject('Vui lòng chọn ngựa.');
    if (s.user.role !== 'head_trainer') return reject('Chỉ Head Trainer mới lập giáo án.');
    if (horse.lock) return reject(lockMessage(horse, 'tạo giáo án'));
    const lc = getLifecycle(horse);
    if (lc !== 'training') return reject(`Ngựa "${horse.name}" đang ở trạng thái "${LIFECYCLE_LABEL[lc]}", chưa có gói huấn luyện đang hiệu lực để lập giáo án.`);
    if (!plan.startDate || !plan.endDate) return reject('Bắt buộc nhập ngày bắt đầu và ngày kết thúc giáo án.');
    setState(st => ({
      ...st,
      trainingPlans: [plan, ...st.trainingPlans],
      notifications: [newNotif({ type: 'training', message: `Head Trainer ${s.user.name} lập giáo án ${plan.phase} cho "${horse.name}" (${plan.startDate} → ${plan.endDate})`, toUserIds: [horse.ownerId], clubId: horse.clubId || undefined, action: 'horse-detail', horseId: horse.id }), ...st.notifications],
    }));
    showSuccess('Đã tạo giáo án!');
    return null;
  }, [reject, showSuccess]);

  const handleCreateSession = useCallback((session) => {
    const s = stateRef.current;
    const horse = s.horses.find(h => h.id === session.horseId);
    if (!horse) return reject('Vui lòng chọn ngựa.');
    if (s.user?.role !== 'head_trainer') return reject('Chỉ Head Trainer mới lập lịch buổi tập.');
    if (!s.enrollments.some(e => e.horseId === horse.id && e.status !== 'completed')) return reject(`Ngựa "${horse.name}" chưa có gói huấn luyện đang hiệu lực — chủ ngựa cần đăng ký gói trước.`);
    if (horse.lock) return reject(lockMessage(horse, 'tạo buổi tập mới'));
    if (!session.date) return reject('Bắt buộc chọn ngày tập.');
    setState(st => ({ ...st, trainingSessions: [session, ...st.trainingSessions] }));
    showSuccess('Đã lên lịch buổi tập!');
    return null;
  }, [reject, showSuccess]);

  const handleStartSession = useCallback((sessionId) => {
    const s = stateRef.current;
    const session = s.trainingSessions.find(x => x.id === sessionId);
    const horse = session && s.horses.find(h => h.id === session.horseId);
    if (!session || !horse) return reject('Không tìm thấy buổi tập.');
    if (horse.lock) return reject(lockMessage(horse, 'bắt đầu buổi tập'));
    const en = s.enrollments.find(e => e.horseId === horse.id && e.status !== 'completed');
    if (en && !en.scheduleConfirmed) return reject(`Lịch tập của "${horse.name}" chưa được Head Trainer điều chỉnh và xác nhận lại sau khi gỡ khóa — lịch cũ không tự động chạy lại.`);
    if (getLifecycle(horse) !== 'training') return reject(`Ngựa "${horse.name}" đang ở trạng thái "${LIFECYCLE_LABEL[getLifecycle(horse)]}", chưa thể bắt đầu buổi tập.`);
    setState(st => ({ ...st, trainingSessions: st.trainingSessions.map(x => x.id === sessionId ? { ...x, status: 'In Progress' } : x) }));
    showSuccess('Đã bắt đầu buổi tập!');
    return null;
  }, [reject, showSuccess]);

  const handleCompleteSession = useCallback((sessionId, result) => {
    const st0 = stateRef.current;
    const session = st0.trainingSessions.find(x => x.id === sessionId);
    const horse = session && st0.horses.find(h => h.id === session.horseId);
    if (!session || !horse) return reject('Không tìm thấy buổi tập.');
    if (st0.user?.role !== 'head_trainer') return reject('Chỉ Head Trainer mới ghi nhận kết quả buổi tập.');
    if (session.status !== 'In Progress') return reject('Chỉ buổi tập đang diễn ra mới hoàn thành được.');
    if (!result.time.trim()) return reject('Vui lòng nhập thời gian thực tế của buổi tập.');
    setState(st => ({
      ...st,
      trainingSessions: st.trainingSessions.map(x => x.id === sessionId ? { ...x, status: 'Completed', result } : x),
      enrollments: st.enrollments.map(e => e.horseId === horse.id && e.status === 'active' ? { ...e, sessionsDone: Math.min(e.sessionsTotal, e.sessionsDone + 1) } : e),
      trainingPlans: st.trainingPlans.map(p => p.horseId === horse.id && p.status === 'Active' ? { ...p, progress: Math.min(100, p.progress + 3) } : p),
      notifications: [newNotif({ type: 'health', message: `Buổi tập ${session.type} của "${horse.name}" đã hoàn thành — Thú y cần khám lại sau buổi tập`, toRoles: ['veterinarian'], clubId: horse.clubId || undefined, action: 'post-exam' }), ...st.notifications],
    }));
    showSuccess('Buổi tập hoàn thành — đã báo Thú y khám lại.');
    return null;
  }, [reject, showSuccess]);

  const handlePostExam = useCallback((sessionId, form) => {
    const s = stateRef.current;
    const session = s.trainingSessions.find(x => x.id === sessionId);
    const horse = session && s.horses.find(h => h.id === session.horseId);
    if (!session || !horse || !s.user) return reject('Không tìm thấy buổi tập.');
    if (s.user.role !== 'veterinarian') return reject('Chỉ Thú y mới ghi kết quả khám sau buổi tập.');
    if (session.postExamDone) return reject('Buổi tập này đã được khám sau tập.');
    const elig = form.trainingEligibility;
    if (!elig) return reject('Vui lòng nhập đủ sinh hiệu (nhiệt độ + nhịp tim) để hệ thống đánh giá.');
    const club = s.clubs.find(c => c.id === horse.clubId);
    const problem = elig === 'not-eligible';
    const diagnosis = form.diagnosis?.trim() || form.trainingReasons?.join('; ') || 'Không đủ điều kiện sau buổi tập';
    const rec = { ...form, id: `m${Date.now()}`, date: TODAY, type: 'Khám sau buổi tập', vet: s.user.name, isPostTraining: true, diagnosis, ownerId: horse.ownerId, headTrainerId: horse.headTrainerId, managerId: club?.managerId, createdAt: Date.now() };
    if (!problem) {
      const cond = elig === 'conditional';
      setState(st => ({
        ...st,
        healthRecords: [...st.healthRecords, rec],
        horses: cond ? st.horses.map(h => h.id === horse.id ? { ...h, healthStatus: 'Monitor' } : h) : st.horses,
        trainingSessions: st.trainingSessions.map(x => x.id === sessionId ? { ...x, postExamDone: true } : x),
        notifications: [
          newNotif({ type: 'health', message: cond ? `Khám sau tập "${horse.name}": ĐƯỢC HUẤN LUYỆN CÓ ĐIỀU KIỆN. ${rec.trainingAdjustments?.join(' ') || ''}` : `Khám sau tập "${horse.name}": đủ điều kiện, không phát hiện bất thường.`, ...trainerTarget(horse), clubId: horse.clubId || undefined, action: 'health-records' }),
          ...(cond ? [newNotif({ type: 'health', message: `Sau buổi tập, "${horse.name}" cần theo dõi thêm (huấn luyện có điều kiện) — xem hồ sơ y tế`, toUserIds: [horse.ownerId], clubId: horse.clubId || undefined, action: 'horse-detail', horseId: horse.id })] : []),
          ...st.notifications,
        ],
      }));
      showSuccess(`Đã lưu hồ sơ khám sau tập: ${horse.name} ${cond ? 'huấn luyện có điều kiện' : 'đạt chuẩn'}.`);
      return null;
    }
    const voidedCount = s.trainingSessions.filter(x => x.horseId === horse.id && x.status === 'Scheduled' && isHeavySession(x.type)).length;
    const notes = form.notes || '';
    setState(st => ({
      ...st,
      healthRecords: [...st.healthRecords, { ...rec, trainingNote: `${rec.trainingNote || ''}\n\nKHÓA HUẤN LUYỆN được kích hoạt sau buổi tập.`.trim() }],
      horses: st.horses.map(h => h.id === horse.id ? { ...h, healthStatus: 'Injured', trainingStatus: 'Inactive', vetClearance: false, lifecycle: h.rehab ? 'rehab' : 'locked', recoveryBadge: null, lock: { reason: diagnosis, notes, lockedAt: TODAY, lockedById: st.user.id, lockedByName: st.user.name } } : h),
      enrollments: st.enrollments.map(e => e.horseId === horse.id && e.status === 'active' ? { ...e, status: 'paused', pausedAt: TODAY, pauseReason: diagnosis, scheduleConfirmed: false } : e),
      trainingPlans: st.trainingPlans.map(p => p.horseId === horse.id && p.status === 'Active' ? { ...p, status: 'Paused' } : p),
      trainingSessions: st.trainingSessions.map(x => x.id === sessionId ? { ...x, postExamDone: true } : x.horseId === horse.id && x.status === 'Scheduled' && isHeavySession(x.type) ? { ...x, status: 'Not Performed', voidedByLock: true } : x),
      notifications: [
        newNotif({ type: 'lock', message: `KHÓA HUẤN LUYỆN: "${horse.name}" — ${diagnosis}. Gói tạm dừng, ${voidedCount} buổi tập nặng đã xếp bị đánh dấu "Không thực hiện".`, ...trainerTarget(horse), clubId: horse.clubId || undefined, action: 'training-hub' }),
        newNotif({ type: 'lock', message: `Ngựa "${horse.name}" bị chấn thương / không đủ điều kiện sau tập (${diagnosis}) và đã bị khóa huấn luyện.`, toUserIds: [horse.ownerId], clubId: horse.clubId || undefined, action: 'horse-detail', horseId: horse.id }),
        newNotif({ type: 'lock', message: `Ngựa "${horse.name}" bị khóa huấn luyện (${diagnosis}). Cần chọn và kích hoạt gói phục hồi chức năng.`, toRoles: ['manager'], clubId: horse.clubId || undefined, action: 'rehab-center' }),
        ...st.notifications,
      ],
    }));
    showSuccess(`Đã KHÓA HUẤN LUYỆN cho ${horse.name}. Gói tạm dừng, đã thông báo HLV, Groom và Quản lý.`);
    return null;
  }, [reject, showSuccess]);

  const handleManualLock = useCallback((horseId, reason) => {
    const s = stateRef.current;
    const horse = s.horses.find(h => h.id === horseId);
    if (!horse || !s.user) return reject('Không tìm thấy ngựa.');
    if (s.user.role !== 'veterinarian') return reject('Chỉ Thú y mới có quyền khóa huấn luyện.');
    if (horse.lock) return reject('Ngựa này đang bị khóa huấn luyện.');
    if (!reason.trim()) return reject('Vui lòng nhập lý do khóa thủ công.');
    const voidedCount = s.trainingSessions.filter(x => x.horseId === horse.id && x.status === 'Scheduled' && isHeavySession(x.type)).length;
    const club = s.clubs.find(c => c.id === horse.clubId);
    const record = {
      id: `m${Date.now()}`, horseId, date: TODAY, type: 'Khóa huấn luyện thủ công', vet: s.user.name,
      notes: reason.trim(), result: 'Injured', medications: '', isPostTraining: false, vetClearanceGranted: false,
      diagnosis: reason.trim(), autoEvaluation: 'fail', trainingEligibility: 'not-eligible',
      trainingReasons: [reason.trim()], trainingAdjustments: ['Tạm ngưng huấn luyện ngay lập tức.', 'Tái khám trước khi quay lại tập.'],
      trainingNote: 'Khóa thủ công theo chỉ định của Thú y.',
      ownerId: horse.ownerId, headTrainerId: horse.headTrainerId, managerId: club?.managerId, createdAt: Date.now(),
    };
    setState(st => ({
      ...st,
      healthRecords: [...st.healthRecords, record],
      horses: st.horses.map(h => h.id === horseId ? {
        ...h, healthStatus: 'Injured', trainingStatus: 'Inactive', vetClearance: false,
        lifecycle: 'locked', recoveryBadge: null,
        lock: { reason: reason.trim(), notes: 'Khóa thủ công bởi Thú y', lockedAt: TODAY, lockedById: st.user.id, lockedByName: st.user.name },
      } : h),
      enrollments: st.enrollments.map(e => e.horseId === horseId && e.status === 'active' ? { ...e, status: 'paused', pausedAt: TODAY, pauseReason: reason.trim(), scheduleConfirmed: false } : e),
      trainingPlans: st.trainingPlans.map(p => p.horseId === horseId && p.status === 'Active' ? { ...p, status: 'Paused' } : p),
      trainingSessions: st.trainingSessions.map(x => x.horseId === horseId && x.status === 'Scheduled' && isHeavySession(x.type) ? { ...x, status: 'Not Performed', voidedByLock: true } : x),
      notifications: [
        newNotif({ type: 'lock', message: `Thú y đã KHÓA THỦ CÔNG "${horse.name}": ${reason.trim()}. ${voidedCount} buổi nặng chuyển sang "Không thực hiện".`, ...trainerTarget(horse), clubId: horse.clubId || undefined, action: 'training-hub', horseId }),
        newNotif({ type: 'lock', message: `Ngựa "${horse.name}" đã bị Thú y khóa huấn luyện: ${reason.trim()}.`, toUserIds: [horse.ownerId], clubId: horse.clubId || undefined, action: 'horse-detail', horseId }),
        newNotif({ type: 'lock', message: `"${horse.name}" bị khóa thủ công và cần gói phục hồi.`, toRoles: ['manager'], clubId: horse.clubId || undefined, action: 'rehab-center', horseId }),
        ...st.notifications,
      ],
    }));
    showSuccess(`Đã khóa thủ công ${horse.name}.`);
    return null;
  }, [reject, showSuccess]);

  const handleActivateRehab = useCallback((horseId, packageId) => {
    const s = stateRef.current;
    const horse = s.horses.find(h => h.id === horseId);
    const pkg = REHAB_PACKAGES.find(p => p.id === packageId);
    if (!horse || !pkg || !s.user) return 'Không tìm thấy ngựa hoặc gói phục hồi.';
    if (s.user.role !== 'manager') return reject('Chỉ Quản lý mới kích hoạt gói phục hồi.');
    if (!horse.lock) return 'Ngựa này không bị khóa huấn luyện.';
    if (horse.rehab) return 'Ngựa đã có gói phục hồi đang chạy.';
    const en = s.enrollments.find(e => e.horseId === horseId && e.status !== 'completed');
    setState(st => ({
      ...st,
      horses: st.horses.map(h => h.id === horseId ? { ...h, lifecycle: 'rehab', trainingStatus: 'Resting', rehab: { packageId, name: pkg.name, durationWeeks: pkg.weeks, activatedAt: TODAY, activatedBy: st.user.name } } : h),
      notifications: [
        newNotif({ type: 'rehab', message: `Gói huấn luyện${en ? ` "${en.packageName}"` : ''} của "${horse.name}" vừa được TẠM DỪNG. Gói phục hồi "${pkg.name}" (${pkg.weeks} tuần) đã được kích hoạt. Tình trạng hiện tại (chẩn đoán Thú y): ${horse.lock.reason}`, toUserIds: [horse.ownerId], clubId: horse.clubId || undefined, action: 'horse-detail', horseId }),
        newNotif({ type: 'rehab', message: `Gói phục hồi "${pkg.name}" đã kích hoạt cho "${horse.name}". Cập nhật sức khỏe và gỡ khóa khi ngựa đủ điều kiện.`, toRoles: ['veterinarian'], clubId: horse.clubId || undefined, action: 'post-exam' }),
        newNotif({ type: 'rehab', message: `"${horse.name}" bắt đầu gói phục hồi "${pkg.name}" — thực hiện chăm sóc phục hồi theo lịch`, toRoles: ['groom'], clubId: horse.clubId || undefined, action: 'care-hub' }),
        ...st.notifications,
      ],
    }));
    showSuccess(`Đã kích hoạt gói phục hồi "${pkg.name}" cho ${horse.name}.`);
    return null;
  }, [reject, showSuccess]);

  const handleUnlock = useCallback((horseId, note) => {
    const s = stateRef.current;
    const horse = s.horses.find(h => h.id === horseId);
    if (!horse || !s.user) return 'Không tìm thấy ngựa.';
    if (s.user.role !== 'veterinarian') return reject('Chỉ Thú y mới có quyền gỡ khóa huấn luyện.');
    if (!horse.lock) return 'Ngựa này không bị khóa.';
    if (!note.trim()) return 'Vui lòng ghi cập nhật sức khỏe xác nhận ngựa đủ điều kiện trước khi gỡ khóa.';
    const club = s.clubs.find(c => c.id === horse.clubId);
    const rec = {
      id: `m${Date.now()}`, horseId, date: TODAY, type: 'Cập nhật sức khỏe — gỡ khóa', vet: s.user.name, notes: note, result: 'Eligible',
      medications: '', isPostTraining: false, vetClearanceGranted: true, diagnosis: note, autoEvaluation: 'pass', trainingEligibility: 'eligible',
      trainingNote: 'Gỡ KHÓA HUẤN LUYỆN — Head Trainer cần điều chỉnh và xác nhận lại lịch tập.',
      ownerId: horse.ownerId, headTrainerId: horse.headTrainerId, managerId: club?.managerId, createdAt: Date.now(),
    };
    setState(st => ({
      ...st,
      healthRecords: [...st.healthRecords, rec],
      horses: st.horses.map(h => h.id === horseId ? { ...h, lock: null, rehab: null, lifecycle: 'training', healthStatus: 'Eligible', trainingStatus: 'Active', vetClearance: true, recoveryBadge: { date: TODAY, note } } : h),
      enrollments: st.enrollments.map(e => e.horseId === horseId && e.status === 'paused' ? { ...e, status: 'active', pausedAt: undefined, pauseReason: undefined, scheduleConfirmed: false } : e),
      notifications: [
        newNotif({ type: 'training', message: `Thú y đã gỡ khóa cho "${horse.name}" và đánh dấu ĐÃ HỒI PHỤC. Hãy điều chỉnh và XÁC NHẬN LẠI lịch tập — lịch cũ sẽ không tự chạy lại.`, ...trainerTarget(horse), clubId: horse.clubId || undefined, action: 'training-hub', horseId }),
        newNotif({ type: 'health', message: `"${horse.name}" đã đủ điều kiện và được gỡ khóa huấn luyện. Chờ Head Trainer xác nhận lại lịch tập.`, toUserIds: [horse.ownerId], clubId: horse.clubId || undefined, action: 'horse-detail', horseId }),
        newNotif({ type: 'health', message: `"${horse.name}" kết thúc phục hồi và được gỡ khóa huấn luyện`, toRoles: ['manager'], clubId: horse.clubId || undefined }),
        ...st.notifications,
      ],
    }));
    showSuccess(`Đã gỡ khóa huấn luyện cho ${horse.name}.`);
    return null;
  }, [reject, showSuccess]);

  const handleConfirmSchedule = useCallback((horseId, note, restoreIds) => {
    const s = stateRef.current;
    const horse = s.horses.find(h => h.id === horseId);
    if (!horse || !s.user) return 'Không tìm thấy ngựa.';
    if (s.user.role !== 'head_trainer') return reject('Chỉ Head Trainer mới xác nhận lịch tập.');
    if (horse.lock) return reject(lockMessage(horse, 'xác nhận lịch tập'));
    setState(st => ({
      ...st,
      enrollments: st.enrollments.map(e => e.horseId === horseId && e.status === 'active' ? { ...e, scheduleConfirmed: true } : e),
      trainingPlans: st.trainingPlans.map(p => p.horseId === horseId && p.status === 'Paused' ? { ...p, status: 'Active' } : p),
      trainingSessions: st.trainingSessions.map(x => restoreIds.includes(x.id) ? { ...x, status: 'Scheduled', voidedByLock: false, notes: `${x.notes}${note ? ` [Điều chỉnh sau khóa: ${note}]` : ''}` } : x),
      notifications: [
        newNotif({ type: 'training', message: `Head Trainer đã xác nhận lại lịch tập cho "${horse.name}"${note ? ` — điều chỉnh: ${note}` : ''}. Ngựa tiếp tục chương trình huấn luyện.`, toUserIds: [horse.ownerId], clubId: horse.clubId || undefined }),
        newNotif({ type: 'training', message: `Lịch tập của "${horse.name}" đã được xác nhận lại — có thể đưa ngựa ra tập`, toRoles: ['veterinarian'], clubId: horse.clubId || undefined }),
        ...st.notifications,
      ],
    }));
    showSuccess('Đã xác nhận lịch tập!');
    return null;
  }, [reject, showSuccess]);
  const markNotificationRead = useCallback((id) => {
    setState(s => ({ ...s, notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) }));
  }, []);

  const openNotification = useCallback((n) => {
    if (!n.action) return;
    if (n.horseId) selectHorse(n.horseId);
    navigate(n.action);
  }, [selectHorse, navigate]);

  const value = useMemo(() => ({
    state,
    setState,
    navigate,
    showError,
    showSuccess,
    handleLogin,
    handleRegister,
    handleJoinRequest,
    handleApproveRequest,
    handleRejectRequest,
    handleCreateHorse,
    handleUpdateHorse,
    handleSelectTrainer,
    handleSubmitToCenter,
    handleApproveHorse,
    handleRejectHorse,
    handleLogout,
    handleUpdatePermissions,
    handleViewTrainer,
    handleSaveHealthRecord,
    handleEnroll,
    invAddItem,
    invReceive,
    invEdit,
    invAdjust,
    invDelete,
    completeCare,
    undoCare,
    reportIncident,
    handleCreatePlan,
    handleCreateSession,
    handleStartSession,
    handleCompleteSession,
    handlePostExam,
    handleManualLock,
    handleActivateRehab,
    handleUnlock,
    handleConfirmSchedule,
    selectHorse,
    markNotificationRead,
    openNotification,
  }), [state, showError, showSuccess, handleLogin, handleRegister, handleJoinRequest, handleApproveRequest, handleRejectRequest, handleCreateHorse, handleUpdateHorse, handleSelectTrainer, handleSubmitToCenter, handleApproveHorse, handleRejectHorse, handleLogout, handleUpdatePermissions, handleViewTrainer, handleSaveHealthRecord, handleEnroll, invAddItem, invReceive, invEdit, invAdjust, invDelete, completeCare, undoCare, reportIncident, handleCreatePlan, handleCreateSession, handleStartSession, handleCompleteSession, handlePostExam, handleManualLock, handleActivateRehab, handleUnlock, handleConfirmSchedule, selectHorse, navigate, markNotificationRead, openNotification]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
