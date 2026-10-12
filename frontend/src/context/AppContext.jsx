import { createInitialState } from '../utils/initialState.js';
import * as flow from '../utils/phucWorkflow.js';
import { liveApi } from '../services/api.ts';
import { authService } from '../services/authService.ts';
import { tokenStore } from '../services/tokenStore.ts';
import { demoId } from '../utils/demoId.ts';
import { createContext, useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { pagePath } from '../routes/paths.js';
import { RATIONS } from '../data/care.js';
import { CARE_LABELS, LIFECYCLE_LABEL, TODAY } from '../data/constants.js';
import { isLow } from '../utils/care.js';
import { addDays, addWeeks, toDDMMYYYY } from '../utils/date.js';
import { fmtQty } from '../utils/format.js';
import { sortHealthRecords } from '../utils/health.js';
import { getLifecycle, isHeavySession, lockMessage } from '../utils/horse.js';
import { newNotif, trainerTarget } from '../utils/notifications.js';

export const AppContext = createContext(null);

/** Holds all in-memory application state + actions. Replace the handler bodies with services/ calls when the Spring Boot API is wired in. */
export function AppProvider({ children }) {
  const [state, setState] = useState(()=>createInitialState(liveApi));

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

  const transition=useCallback((reducer,...args)=>{try{if(liveApi)throw new Error('Thao tác này dùng trang Medical & Training API.');const next=reducer(stateRef.current,...args);stateRef.current=next;setState(next);return null;}catch(e){const message=e instanceof Error?e.message:'Thao tác thất bại.';showError(message);return message;}},[showError]);
  const handleSaveDraft=useCallback(rec=>transition(flow.saveDraft,rec),[transition]);
  const handleConfirmMedical=useCallback(id=>transition(flow.confirmMedical,id),[transition]);
  const handlePayPackage=useCallback((id,success)=>transition(flow.payPackage,id,success),[transition]);
  const handleResumePackage=useCallback((id,reason)=>transition(flow.resumePackage,id,reason),[transition]);
  useEffect(()=>{const expired=()=>{setState(s=>({...s,user:null,errorMsg:'Phiên đăng nhập hết hạn.'}));navigate('login');};window.addEventListener('raceforge:unauthorized',expired);return()=>window.removeEventListener('raceforge:unauthorized',expired);},[navigate]);
  const handleLogin = useCallback((user) => {
    setState(s => ({ ...s, user }));
    navigate(liveApi && ['owner','manager','veterinarian'].includes(user.role) ? 'api-workflow' : user.role ? 'dashboard' : 'onboarding');
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
      const req = { id: existing?.id ?? demoId(), userId: s.user.id, userName: s.user.name, userEmail: s.user.email, userAvatar: s.user.avatar, userRole: s.user.role, clubId, requestedAt, expiresAt: addWeeks(requestedAt, 1), status: 'pending', assignedRole: null };
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

  const handleCreateHorse = useCallback((horse) => { const error=transition(flow.createHorse,horse);if(!error){navigate('my-horses');showSuccess('Đã tạo hồ sơ; chờ CM Approval trước Initial Medical.');}return error; },[transition,navigate,showSuccess]);

  const handleUpdateHorse = useCallback((horse) => transition(flow.updateOwnerHorse,horse),[transition,navigate,showSuccess]);

  const handleSelectTrainer = useCallback((horseId, trainerId) => {
    const own=state.horses.find(h=>h.id===horseId && h.ownerId===state.user?.id);
    const trainer = state.users.find(u => u.id === trainerId);
    if(state.user?.role!=='owner' || !own || trainer?.role!=='head_trainer' || trainer.clubId!==state.user.clubId || trainer.status!=='active' || !trainer.verified){showError('Chỉ chọn HLV đang hoạt động trong trung tâm cho ngựa của bạn.');return;}
    setState(s => ({
      ...s,
      horses: s.horses.map(h => h.id === horseId ? { ...h, headTrainerId: trainerId, headTrainerName: trainer?.name || '' } : h),
      trainerSelectHorseId: null,
    }));
    navigate('my-horses');
    showSuccess(`Đã chọn ${trainer?.name} làm Head Trainer!`);
  }, [showSuccess, state.users, state.user, state.horses, showError, navigate]);

  const handleSubmitToCenter = useCallback((id) => transition(flow.submitHorse,id),[transition,navigate,showSuccess]);

  const handleApproveHorse = useCallback((id) => {const error=transition(flow.approveHorse,id);if(!error)showSuccess('Đã duyệt. Chờ Initial Medical.');return error;},[transition,navigate,showSuccess]);

  const handleRejectHorse = useCallback((id,note)=>transition(flow.rejectHorse,id,note),[transition]);

  const handleLogout = useCallback(() => {
    if(liveApi){void authService.logout().catch(()=>{});tokenStore.clear();}
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

  const handleSaveHealthRecord = handleSaveDraft;

  const handleEnroll = useCallback((id,packageId) => {const error=transition(flow.registerPackage,id,packageId);if(!error)showSuccess('Đăng ký gói thành công. Chờ thanh toán mô phỏng.');return error;},[transition,navigate,showSuccess]);

  const reject = useCallback((msg) => { showError(msg); return msg; }, [showError]);

  const nowStamp = () => { const d = new Date(); return { at: `${TODAY} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, ts: Date.now() }; };
  const mkLog = (item, u, p) => {
    const { at, ts } = nowStamp();
    return { id: demoId(), clubId: item.clubId, itemId: item.id, itemName: item.name, unit: item.unit, byId: u.id, byName: u.name, date: TODAY, at, ts, ...p };
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
    const item = { id: demoId(), clubId: u.clubId, name, category: f.category, foodKind: f.category === 'food' ? f.foodKind : undefined, unit: f.unit, qty: f.qty, threshold: f.threshold };
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
      const rec = { id: demoId(), clubId: u.clubId, horseId, date: TODAY, taskKey, taskLabel: label, doneAt: at, byName: u.name, deductions };
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
    const inc = { id: demoId(), clubId: horse.clubId || u.clubId, horseId: horse.id, horseName: horse.name, type: f.type, description: f.description.trim(), imageUrl: f.imageUrl, reportedById: u.id, reportedByName: u.name, at, date: TODAY };
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
    if(s.user?.role!=='head_trainer')return reject('Chỉ Head Trainer được bắt đầu buổi tập.');
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

  const handlePostExam = useCallback((sessionId,form)=>{const session=stateRef.current.trainingSessions.find(s=>s.id===sessionId && s.status==='Completed' && !s.postExamDone);if(!session)return 'Buổi tập không chờ khám.';const record={...form,id:form.id||demoId(),horseId:session.horseId,sessionId,examType:'FOLLOW_UP'};const error=transition(flow.saveDraft,record);if(error)return error;return transition(flow.confirmMedical,record.id);},[transition]);

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
      id: demoId(), horseId, date: TODAY, type: 'Khóa huấn luyện thủ công', vet: s.user.name,
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

  const handleActivateRehab = useCallback((id,packageId) => {const error=transition(flow.approveRecovery,id,packageId);if(!error)showSuccess('Đã duyệt Recovery; gói thường tạm dừng, chờ chủ ngựa thanh toán.');return error;},[transition,navigate,showSuccess]);

  const handleUnlock = useCallback((id,reason) => {const error=transition(flow.unlockHorse,id,reason);if(!error)showSuccess('Đã Unlock riêng. Gói gốc vẫn chờ CM Resume.');return error;},[transition,navigate,showSuccess]);

  const handleConfirmSchedule = useCallback((horseId, note, restoreIds) => {
    const s = stateRef.current;
    const horse = s.horses.find(h => h.id === horseId);
    if (!horse || !s.user) return 'Không tìm thấy ngựa.';
    if (s.user.role !== 'head_trainer') return reject('Chỉ Head Trainer mới xác nhận lịch tập.');
    if (horse.lock) return reject(lockMessage(horse, 'xác nhận lịch tập'));
    if(!s.enrollments.some(e=>e.horseId===horseId && e.status==='active' && e.paymentStatus==='PAID' && e.packageType!=='RECOVERY'))return reject('Cần gói thường ACTIVE/PAID; CM Resume trước khi xác nhận lịch.');
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
    handleSaveDraft, handleConfirmMedical, handlePayPackage, handleResumePackage,
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
  }), [handleSaveDraft, handleConfirmMedical, handlePayPackage, handleResumePackage,state, showError, showSuccess, handleLogin, handleRegister, handleJoinRequest, handleApproveRequest, handleRejectRequest, handleCreateHorse, handleUpdateHorse, handleSelectTrainer, handleSubmitToCenter, handleApproveHorse, handleRejectHorse, handleLogout, handleUpdatePermissions, handleViewTrainer, handleSaveHealthRecord, handleEnroll, invAddItem, invReceive, invEdit, invAdjust, invDelete, completeCare, undoCare, reportIncident, handleCreatePlan, handleCreateSession, handleStartSession, handleCompleteSession, handlePostExam, handleManualLock, handleActivateRehab, handleUnlock, handleConfirmSchedule, selectHorse, navigate, markNotificationRead, openNotification]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
