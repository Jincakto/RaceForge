import { HORSES, SEED_HORSE_CLUB_REQUESTS } from '../data/horses.js';
import { SEED_USERS, SEED_CLUBS, SEED_REQUESTS } from '../data/users.js';
import { MEDICAL_RECORDS } from '../data/health.js';
import { TRAINING_PLANS, TRAINING_SESSIONS, SEED_ENROLLMENTS } from '../data/training.js';
import { NOTIFICATIONS } from '../data/notifications.js';
import { SEED_INVENTORY, SEED_INV_LOGS } from '../data/care.js';
export function createInitialState(api=false){
  const state={user:null,users:SEED_USERS,clubs:SEED_CLUBS,memberRequests:SEED_REQUESTS,
    horses:HORSES.map(h=>({...h,backendHealthStatus:h.healthStatus==='Eligible'?'READY':h.healthStatus==='Injured'?'INJURED':null,trainingLocked:!!h.lock})),
    horseClubRequests:SEED_HORSE_CLUB_REQUESTS,
    healthRecords:MEDICAL_RECORDS.map(r=>({...r,status:'CONFIRMED',examType:'PERIODIC',healthStatus:r.result==='Eligible'?'READY':r.result==='Injured'?'INJURED':null,systemNote:r.autoNote || 'Dữ liệu mẫu Phuc'})),
    trainingPlans:TRAINING_PLANS,trainingSessions:TRAINING_SESSIONS,inventory:SEED_INVENTORY,invLogs:SEED_INV_LOGS,careRecords:[],incidents:[],notifications:NOTIFICATIONS,
    enrollments:SEED_ENROLLMENTS.map(e=>({...e,paymentStatus:'PAID',packageType:'RACING',endDate:'2026-12-08'})),
    errorMsg:null,selectedHorseId:HORSES[0]?.id||0,trainerSelectHorseId:null,viewTrainerId:null,showSuccess:null,userPermissions:{}};
  if(api){for(const key of Object.keys(state))if(Array.isArray(state[key]))state[key]=[];state.selectedHorseId=0;}
  return structuredClone(state);
}
