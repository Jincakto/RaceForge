import { type AppState } from '../types/reference';

export function ownerView(state: AppState): AppState {
  const user = state.user;
  if (user?.role !== 'owner') return { ...state, horses: [], healthRecords: [], trainingPlans: [], trainingSessions: [], tasks: [], notifications: [], horseClubRequests: [], memberRequests: [] };
  const horses = state.horses.filter(horse => horse.ownerId === user.id);
  const ids = new Set(horses.map(horse => horse.id));
  return {
    ...state, horses,
    notifications: state.notifications.filter(notification => {
      const horseId = ({ n1: 'RH-001', n2: 'RH-001', n3: 'RH-002' } as Record<string, string>)[notification.id];
      return horseId ? ids.has(horseId) : notification.id === 'n4' || state.horseClubRequests.some(request => request.id === notification.id && request.ownerId === user.id);
    }),
    healthRecords: state.healthRecords.filter(record => ids.has(record.horseId)),
    trainingPlans: state.trainingPlans.filter(plan => ids.has(plan.horseId)),
    trainingSessions: state.trainingSessions.filter(session => ids.has(session.horseId)),
    tasks: state.tasks.filter(task => ids.has(task.horseId)),
    horseClubRequests: state.horseClubRequests.filter(request => request.ownerId === user.id),
    memberRequests: state.memberRequests.filter(request => request.userId === user.id),
  };
}

export function validateHorseFields(horse: { name: string; color: string; age: number; weight: number; height: number }): string {
  if (!horse.name.trim() || !horse.color.trim()) return 'Vui lòng nhập tên ngựa và màu lông.';
  if (!Number.isInteger(horse.age) || horse.age < 1 || horse.age > 40) return 'Tuổi ngựa phải từ 1 đến 40.';
  if (!Number.isFinite(horse.weight) || horse.weight <= 0 || !Number.isFinite(horse.height) || horse.height <= 0) return 'Cân nặng và chiều cao phải lớn hơn 0.';
  return '';
}

export function addOwnerHorse(state: AppState, horse: import('../data').Horse): AppState {
  if (state.user?.role !== 'owner' || horse.ownerId !== state.user.id) throw new Error('Bạn chỉ được tạo hồ sơ ngựa của mình.');
  const invalid = validateHorseFields(horse);
  if (invalid) throw new Error(invalid);
  if (state.horses.some(item => item.id === horse.id)) throw new Error('Mã ngựa đã tồn tại.');
  return { ...state, horses: [...state.horses, { ...horse, name: horse.name.trim(), clubId: null, ownerName: state.user.name, approvalStatus: 'pending', vetClearance: false }], selectedHorseId: horse.id, trainerSelectHorseId: horse.id };
}

export function assignOwnerTrainer(state: AppState, horseId: string, trainerId: string): AppState {
  const horse = state.horses.find(item => item.id === horseId);
  const trainer = state.users.find(item => item.id === trainerId);
  if (state.user?.role !== 'owner' || horse?.ownerId !== state.user.id) throw new Error('Không tìm thấy ngựa của bạn.');
  if (!state.user.clubId || trainer?.role !== 'head_trainer' || trainer.clubId !== state.user.clubId || trainer.status !== 'active' || !trainer.verified) throw new Error('Huấn luyện viên phải đang hoạt động trong trung tâm của bạn.');
  return { ...state, horses: state.horses.map(item => item.id === horseId ? { ...item, headTrainerId: trainer.id, headTrainerName: trainer.name } : item), trainerSelectHorseId: null };
}

export function submitOwnerHorse(state: AppState, horseId: string, at = new Date()): AppState {
  const user = state.user;
  const horse = state.horses.find(item => item.id === horseId);
  if (user?.role !== 'owner' || horse?.ownerId !== user.id) throw new Error('Không tìm thấy ngựa của bạn.');
  if (!user.clubId || !state.clubs.some(club => club.id === user.clubId)) throw new Error('Bạn cần tham gia trung tâm trước khi gửi đăng ký.');
  if (horse.clubId) throw new Error('Ngựa đã thuộc một trung tâm.');
  if (state.horseClubRequests.some(request => request.horseId === horseId && request.status === 'pending')) throw new Error('Ngựa đang có yêu cầu chờ duyệt.');
  const expires = new Date(at); expires.setDate(expires.getDate() + 7);
  const request: import('../data').HorseClubRequest = {
    id: crypto.randomUUID(), horseId, horseName: horse.name, horseBreed: horse.breed,
    horseImageUrl: horse.imageUrl, ownerId: user.id, ownerName: user.name, clubId: user.clubId,
    submittedAt: at.toLocaleDateString('vi-VN'), expiresAt: expires.toLocaleDateString('vi-VN'),
    status: 'pending', reviewNote: '',
  };
  return { ...state, horseClubRequests: [...state.horseClubRequests, request], notifications: [{ id: request.id, type: 'system', message: `Đã gửi đăng ký ${horse.name} vào trung tâm. Đang chờ Quản lý duyệt.`, time: 'Vừa xong', read: false }, ...state.notifications], horses: state.horses.map(item => item.id === horseId ? { ...item, approvalStatus: 'pending' } : item) };
}

export function updateOwnerHorse(state: AppState, updated: import('../data').Horse): AppState {
  const horse = state.horses.find(item => item.id === updated.id);
  if (state.user?.role !== 'owner' || horse?.ownerId !== state.user.id || updated.ownerId !== state.user.id) throw new Error('Bạn chỉ được sửa ngựa của mình.');
  const invalid = validateHorseFields({ ...horse, name: updated.name, weight: updated.weight, height: updated.height });
  if (invalid) throw new Error(invalid);
  const allowed = { name: updated.name.trim(), biography: updated.biography, weight: updated.weight, height: updated.height, stable: updated.stable, stall: updated.stall, imageUrl: updated.imageUrl };
  return { ...state, horses: state.horses.map(item => item.id === updated.id ? { ...item, ...allowed } : item) };
}

export function validDisplayDate(value: string): boolean {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false;
  const [day, month, year] = value.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function addOwnerAchievement(state: AppState, horseId: string, achievement: import('../data').Achievement): AppState {
  const horse = state.horses.find(item => item.id === horseId);
  if (state.user?.role !== 'owner' || horse?.ownerId !== state.user.id) throw new Error('Bạn chỉ được thêm thành tích cho ngựa của mình.');
  if (!achievement.title.trim() || !validDisplayDate(achievement.date)) throw new Error('Nhập tên thành tích và ngày hợp lệ dạng DD/MM/YYYY.');
  if (achievement.position !== undefined && (!Number.isInteger(achievement.position) || achievement.position < 1)) throw new Error('Thứ hạng phải là số nguyên lớn hơn 0.');
  return { ...state, horses: state.horses.map(item => item.id === horseId ? { ...item, achievements: [...item.achievements, { ...achievement, title: achievement.title.trim() }] } : item) };
}

export function markOwnerNotification(state: AppState, id: string): AppState {
  const permitted = new Set(ownerView(state).notifications.map(item => item.id));
  if (!permitted.has(id)) return state;
  return { ...state, notifications: state.notifications.map(item => item.id === id ? { ...item, read: true } : item) };
}

export function updateOwnerProfile(state: AppState, name: string): AppState {
  if (state.user?.role !== 'owner') throw new Error('Trang này dành cho Chủ ngựa.');
  if (!name.trim()) throw new Error('Vui lòng nhập họ tên.');
  const trimmed = name.trim();
  const user = { ...state.user, name: trimmed, avatar: trimmed.split(/\s+/).slice(-2).map(word => word[0]).join('').toUpperCase() };
  return { ...state, user, users: state.users.map(item => item.id === user.id ? user : item), horses: state.horses.map(item => item.ownerId === user.id ? { ...item, ownerName: trimmed } : item) };
}
