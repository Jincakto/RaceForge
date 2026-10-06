import { type AppState } from '../types/reference';

export function ownerView(state: AppState): AppState {
  const user = state.user;
  if (user?.role !== 'owner') return { ...state, horses: [], healthRecords: [], trainingPlans: [], trainingSessions: [], tasks: [], horseClubRequests: [], memberRequests: [] };
  const horses = state.horses.filter(horse => horse.ownerId === user.id);
  const ids = new Set(horses.map(horse => horse.id));
  return {
    ...state, horses,
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
