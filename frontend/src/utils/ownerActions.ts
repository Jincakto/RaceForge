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
