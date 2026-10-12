/** Filter all routed views before supplying props; state mutations enforce permissions separately. */
export function scopeState(state){
  if(!state.user)return {...state,horses:[],healthRecords:[],enrollments:[],trainingPlans:[],trainingSessions:[]};
  const horses=state.horses.filter(h=>state.user.role==='owner'?h.ownerId===state.user.id:!!state.user.clubId && (h.clubId===state.user.clubId || (state.user.role==='manager' && state.horseClubRequests.some(r=>r.horseId===h.id && r.clubId===state.user.clubId && r.status==='pending'))));
  const ids=new Set(horses.map(h=>h.id));
  return {...state,horses,healthRecords:state.healthRecords.filter(r=>ids.has(r.horseId)),enrollments:state.enrollments.filter(r=>ids.has(r.horseId)),trainingPlans:state.trainingPlans.filter(r=>ids.has(r.horseId)),trainingSessions:state.trainingSessions.filter(r=>ids.has(r.horseId)),horseClubRequests:state.horseClubRequests.filter(r=>state.user.role==='owner'?r.ownerId===state.user.id:r.clubId===state.user.clubId),memberRequests:state.memberRequests.filter(r=>state.user.role==='owner'?r.userId===state.user.id:r.clubId===state.user.clubId)};
}
