import {newNotif} from './notifications.js';
import { validDisplayDate } from './ownerActions.ts';
import { demoId } from './demoId.ts';
import { numericId } from '../types/api.ts';
import { addWeeks, addDays, toDDMMYYYY } from './date.js';
import { TRAINING_PACKAGES, REHAB_PACKAGES } from '../data/constants.js';
const today = () => toDDMMYYYY(new Date().toISOString().slice(0,10));
function role(state, expected) { if (state.user?.role !== expected) throw new Error('Vai trò không có quyền thực hiện thao tác.'); }
function horseInClub(state,id) { const horse=state.horses.find(h=>h.id===numericId(id)); if(!horse || !state.user?.clubId || horse.clubId!==state.user.clubId)throw new Error('Không tìm thấy ngựa trong trung tâm của bạn.'); return horse; }
const openPackage = e => ['pending','active','paused'].includes(e.status);
export function createHorse(state, input) {
  role(state,'owner');numericId(input.id);
  if(input.ownerId!==state.user.id || state.horses.some(h=>h.id===input.id))throw new Error('ID hoặc chủ ngựa không hợp lệ.');
  if(!input.name?.trim() || !input.color?.trim() || !Number.isInteger(input.age) || input.age<1 || input.age>40 || !Number.isFinite(input.weight) || input.weight<=0 || !Number.isFinite(input.height) || input.height<=0)throw new Error('Kiểm tra tên, màu lông, tuổi, cân nặng và chiều cao.');
  const horse={...input,name:input.name.trim(),clubId:null,ownerId:state.user.id,ownerName:state.user.name,approvalStatus:'pending',lifecycle:'pending',vetClearance:false,healthStatus:'Pending Vet',backendHealthStatus:null,trainingLocked:false,trainingStatus:'Pending Approval',lock:null,rehab:null};
  const next={...state,horses:[...state.horses,horse]};return state.user.clubId?submitHorse(next,horse.id):next;
}
export function submitHorse(state,id) {
  role(state,'owner');const horse=state.horses.find(h=>h.id===numericId(id));
  if(!horse || horse.ownerId!==state.user.id || horse.clubId)throw new Error('Không tìm thấy ngựa chưa vào trung tâm của bạn.');
  if(!state.user.clubId)throw new Error('Bạn cần tham gia trung tâm.');
  if(state.horseClubRequests.some(r=>r.horseId===id && r.status==='pending'))throw new Error('Đã có yêu cầu chờ duyệt.');
  const request={id:demoId(),horseId:id,horseName:horse.name,horseBreed:horse.breed,horseImageUrl:horse.imageUrl,ownerId:state.user.id,ownerName:state.user.name,clubId:state.user.clubId,submittedAt:today(),expiresAt:addWeeks(today(),1),status:'pending',reviewNote:''};
  return {...state,notifications:[newNotif({type:'approval',message:`Đăng ký ngựa ${horse.name}: chờ CM Approval.`,toRoles:['manager'],clubId:request.clubId,horseId:id,action:'center-requests'}),...state.notifications],horseClubRequests:[...state.horseClubRequests,request],horses:state.horses.map(h=>h.id===id?{...h,approvalStatus:'pending',lifecycle:'pending'}:h)};
}
export function approveHorse(state,id) {
  role(state,'manager');const request=state.horseClubRequests.find(r=>r.id===numericId(id) && r.status==='pending' && r.clubId===state.user.clubId);
  if(!request)throw new Error('Không tìm thấy yêu cầu chờ duyệt trong trung tâm.');
  return {...state,notifications:[newNotif({type:'health',message:`${request.horseName} đã được CM duyệt; chờ Initial Medical.`,toUserIds:[request.ownerId],clubId:request.clubId,horseId:request.horseId,action:'my-horses'}),newNotif({type:'health',message:`${request.horseName} cần khám ban đầu.`,toRoles:['veterinarian'],clubId:request.clubId,horseId:request.horseId,action:'vet-health-form'}),...state.notifications],horseClubRequests:state.horseClubRequests.map(r=>r.id===id?{...r,status:'approved'}:r),horses:state.horses.map(h=>h.id===request.horseId?{...h,clubId:request.clubId,approvalStatus:'approved',approvedAt:today(),lifecycle:'awaiting_vet',healthStatus:'Pending Vet',backendHealthStatus:null,trainingStatus:'Inactive',vetClearance:false}:h)};
}
export function updateOwnerHorse(state,input) {
  role(state,'owner');const horse=state.horses.find(h=>h.id===input.id && h.ownerId===state.user.id);if(!horse)throw new Error('Bạn chỉ được sửa ngựa của mình.');
  const allowed={name:input.name?.trim(),biography:input.biography,imageUrl:input.imageUrl,weight:input.weight,height:input.height,stable:input.stable,stall:input.stall};
  if(!allowed.name || !Number.isFinite(allowed.weight) || allowed.weight<=0 || !Number.isFinite(allowed.height) || allowed.height<=0)throw new Error('Thông tin hồ sơ không hợp lệ.');
  if(input.achievements?.length===horse.achievements.length+1){const item=input.achievements.at(-1);if(!item.title?.trim() || !validDisplayDate(item.date) || !Number.isInteger(item.position) || item.position<1)throw new Error('Thành tích cần tên, ngày DD/MM/YYYY và thứ hạng hợp lệ.');allowed.achievements=[...horse.achievements,item];}
  return {...state,horses:state.horses.map(h=>h.id===horse.id?{...h,...allowed}:h)};
}
export function saveDraft(state,input) {
  role(state,'veterinarian');const horse=horseInClub(state,input.horseId);numericId(input.id);
  const existing=state.healthRecords.find(r=>r.id===input.id);
  if(existing && (existing.status!=='DRAFT' || existing.veterinarianId!==state.user.id || existing.horseId!==horse.id))throw new Error('Chỉ sửa bản nháp do bạn tạo.');
  const examType=input.examType || (input.isPostTraining?'FOLLOW_UP':'PERIODIC');
  if(examType==='INITIAL' && horse.approvalStatus!=='approved')throw new Error('Cần CM Approval trước Initial Medical.');
  if(!['INITIAL','PERIODIC','FOLLOW_UP'].includes(examType))throw new Error('Loại khám không hợp lệ.');
  const record={...input,examType,status:'DRAFT',veterinarianId:state.user.id,vet:state.user.name,confirmedAt:null,systemNote:input.systemNote || input.autoNote || 'DEMO: chờ Confirm để áp dụng kết quả.',healthStatus:input.healthStatus || null};
  return {...state,healthRecords:[...state.healthRecords.filter(r=>r.id!==record.id),record]};
}
export function confirmMedical(state,id) {
  role(state,'veterinarian');const record=state.healthRecords.find(r=>r.id===numericId(id));
  if(!record || record.status!=='DRAFT' || record.veterinarianId!==state.user.id)throw new Error('Chỉ Confirm bản nháp của bạn.');
  const horse=horseInClub(state,record.horseId);
  if(!['READY','INJURED','QUARANTINED'].includes(record.healthStatus) || record.autoEvaluation==='incomplete' || !record.trainingEligibility || Object.values(record.clinical || {}).length<8 || Object.values(record.clinical || {}).some(v=>!v) || ![record.vitals?.temperature,record.vitals?.heartRate,record.vitals?.respRate].every(v=>Number.isFinite(Number(v)) && Number(v)>0))throw new Error('Hoàn tất sinh hiệu, lâm sàng và Health status trước Confirm.');
  if(record.examType==='INITIAL' && horse.approvalStatus!=='approved')throw new Error('Chưa CM Approval.');
  if(record.healthStatus==='READY' && record.trainingEligibility==='not-eligible')throw new Error('Không thể READY khi kết quả nghiêm trọng.');
  const shouldLock=record.healthStatus!=='READY' || record.trainingEligibility==='not-eligible';
  const lock=(horse.lock?(shouldLock && !horse.lock.medicalRecordId?{...horse.lock,medicalRecordId:id}:horse.lock):null) || (shouldLock?{reason:record.diagnosis || record.healthStatus,notes:record.notes,lockedAt:today(),lockedById:state.user.id,lockedByName:state.user.name,medicalRecordId:id}:null);
  const trainingLocked=!!lock || horse.trainingLocked || shouldLock;
  const confirmed={...record,status:'CONFIRMED',confirmedAt:new Date().toISOString()};
  const initialDone=record.examType==='INITIAL' || state.healthRecords.some(r=>r.horseId===horse.id && r.examType==='INITIAL' && r.status==='CONFIRMED');
  return {...state,notifications:[newNotif({type:'health',message:`Medical ${horse.name} đã Confirm: ${record.healthStatus}. ${trainingLocked?'Training Lock vẫn đang bật.':'Có thể kiểm tra điều kiện đăng ký gói.'}`,toUserIds:[horse.ownerId],clubId:horse.clubId,horseId:horse.id,action:'health-records'}),...state.notifications],healthRecords:state.healthRecords.map(r=>r.id===id?confirmed:r),horses:state.horses.map(h=>h.id===horse.id?{...h,backendHealthStatus:record.healthStatus,healthStatus:record.healthStatus==='READY'?'Eligible':record.healthStatus==='INJURED'?'Injured':'Monitor',vetClearance:record.healthStatus==='READY' && initialDone,trainingLocked,lock,lifecycle:trainingLocked?(h.rehab?'rehab':'locked'):initialDone?(state.enrollments.some(e=>e.horseId===h.id && e.status==='active' && e.packageType!=='RECOVERY')?'training':'ready'):'awaiting_vet',trainingStatus:trainingLocked?'Inactive':h.trainingStatus}:h),trainingSessions:state.trainingSessions.map(s=>s.id===record.sessionId?{...s,postExamDone:true}:shouldLock && s.horseId===horse.id && s.status==='Scheduled'?{...s,status:'Not Performed',voidedByLock:true}:s)};
}
export function unlockHorse(state,id,reason) {
  role(state,'veterinarian');const horse=horseInClub(state,id);
  if(!horse.lock || horse.backendHealthStatus!=='READY' || !reason?.trim() || reason.trim().length>1000)throw new Error('Cần khóa hiện tại, Health READY và lý do mở khóa tối đa 1000 ký tự.');
  return {...state,notifications:[newNotif({type:'training',message:`Thú y đã Unlock ${horse.name}. Gói gốc chờ CM Resume riêng.`,toRoles:['manager','head_trainer'],clubId:horse.clubId,horseId:id,action:'rehab-center'}),...state.notifications],horses:state.horses.map(h=>h.id===id?{...h,lock:null,trainingLocked:false,lifecycle:h.rehab?'rehab':'ready',healthStatus:'Eligible',trainingStatus:'Inactive',recoveryBadge:{date:today(),note:reason.trim()}}:h)};
}
export function registerPackage(state,id,packageId) {
  role(state,'owner');const horse=horseInClub(state,id);const pkg=TRAINING_PACKAGES.find(p=>p.id===numericId(packageId));
  if(horse.ownerId!==state.user.id || !pkg || horse.lock || horse.trainingLocked || horse.backendHealthStatus!=='READY' || !state.healthRecords.some(r=>r.horseId===id && r.examType==='INITIAL' && r.status==='CONFIRMED'))throw new Error('Cần Initial Medical đã Confirm, READY và không khóa tập.');
  if(state.enrollments.some(e=>e.horseId===id && openPackage(e)))throw new Error('Đã có gói chờ thanh toán, đang tập hoặc tạm dừng.');
  const trainer=state.users.find(u=>u.role==='head_trainer' && u.clubId===horse.clubId && u.status==='active');
  if(!trainer)throw new Error('Trung tâm chưa có Head Trainer.');
  const enrollment={id:demoId(),horseId:id,packageId,packageName:pkg.name,packageType:'BASIC',sessionsTotal:pkg.sessions,sessionsDone:0,status:'pending',paymentStatus:'PENDING',totalPrice:Number(pkg.price.replace(/[^\d]/g,'')),trainerId:trainer.id,trainerName:trainer.name,startedAt:null,durationDays:pkg.weeks*7,remainingDays:null,scheduleConfirmed:false};
  return {...state,enrollments:[...state.enrollments,enrollment]};
}
export function payPackage(state,id,successful) {
  role(state,'owner');const enrollment=state.enrollments.find(e=>e.id===numericId(id));if(!enrollment || !state.horses.some(h=>h.id===enrollment.horseId && h.ownerId===state.user.id) || enrollment.status!=='pending' || enrollment.paymentStatus!=='PENDING')throw new Error('Không tìm thấy gói chờ thanh toán của bạn.');
  const start=new Date();const end=new Date(start);end.setDate(end.getDate()+enrollment.durationDays-1);
  const next={...enrollment,status:successful?'active':'cancelled',paymentStatus:successful?'PAID':'FAILED',startedAt:successful?today():null,startDate:successful?start.toISOString().slice(0,10):null,endDate:successful?end.toISOString().slice(0,10):null};
  const normal=successful && enrollment.packageType!=='RECOVERY';
  const planId=normal?demoId():null;
  const plan=normal?{id:planId,horseId:enrollment.horseId,phase:'Foundation',startDate:today(),endDate:addWeeks(today(),enrollment.durationDays/7),distance:'1200m',workload:'Moderate',surface:'Turf',goals:enrollment.packageName,status:'Active',locked:false,createdBy:state.user.name,progress:0}:null;
  const sessions=normal?Array.from({length:enrollment.sessionsTotal},(_,index)=>({id:demoId(),horseId:enrollment.horseId,planId,date:addDays(today(),index+1),time:'09:00',type:index%5===4?'Recovery':'Endurance',trainerId:enrollment.trainerId,trainerName:enrollment.trainerName,assignedStaffIds:[enrollment.trainerId],assignedStaffNames:[enrollment.trainerName],status:'Scheduled',distance:'1200m',targetTime:'Theo giáo án',notes:'Lịch sau thanh toán; Head Trainer cần xác nhận.',conflictChecked:false})):[];
  return {...state,enrollments:state.enrollments.map(e=>e.id===id?next:e),trainingPlans:plan?[...state.trainingPlans,plan]:state.trainingPlans,trainingSessions:[...state.trainingSessions,...sessions],horses:state.horses.map(h=>h.id===enrollment.horseId && successful?{...h,lifecycle:enrollment.packageType==='RECOVERY'?'rehab':'training',trainingStatus:enrollment.packageType==='RECOVERY'?'Resting':'Active'}:h)};
}
export function approveRecovery(state,id,packageId) {
  role(state,'manager');const horse=horseInClub(state,id);const pkg=REHAB_PACKAGES.find(p=>p.id===numericId(packageId));
  if(!horse.lock || !pkg || !state.healthRecords.some(r=>r.horseId===id && r.status==='CONFIRMED' && r.id===horse.lock.medicalRecordId))throw new Error('Cần Training Lock từ Medical đã Confirm.');
  if(state.enrollments.some(e=>e.horseId===id && e.packageType==='RECOVERY' && ['pending','active'].includes(e.status)))throw new Error('Đã có Recovery chờ thanh toán hoặc đang hoạt động.');
  const original=state.enrollments.find(e=>e.horseId===id && e.packageType!=='RECOVERY' && e.status==='active');
  const remaining=original?.endDate?Math.max(0,Math.ceil((Date.parse(original.endDate+'T00:00:00Z')-Date.now())/86400000)+1):0;
  const recovery={id:demoId(),horseId:id,packageId,packageName:pkg.name,packageType:'RECOVERY',sessionsTotal:0,sessionsDone:0,status:'pending',paymentStatus:'PENDING',totalPrice:0,durationDays:pkg.weeks*7,remainingDays:null,replacedHorsePackageId:original?.id || null,trainerId:horse.headTrainerId,trainerName:horse.headTrainerName};
  return {...state,enrollments:[...state.enrollments.map(e=>e.id===original?.id?{...e,status:'paused',remainingDays:remaining,pausedAt:today(),scheduleConfirmed:false}:e),recovery],horses:state.horses.map(h=>h.id===id?{...h,lifecycle:'rehab',trainingStatus:'Resting',rehab:{packageId,name:pkg.name,durationWeeks:pkg.weeks,activatedAt:today(),activatedBy:state.user.name,horsePackageId:recovery.id}}:h),trainingPlans:state.trainingPlans.map(p=>p.horseId===id && p.status==='Active'?{...p,status:'Paused'}:p)};
}
export function resumePackage(state,id,reason) {
  role(state,'manager');const recovery=state.enrollments.find(e=>e.id===numericId(id));if(!recovery)throw new Error('Không tìm thấy Recovery.');const horse=horseInClub(state,recovery.horseId);const original=state.enrollments.find(e=>e.id===recovery.replacedHorsePackageId);
  if(!reason?.trim() || horse.lock || horse.trainingLocked || horse.backendHealthStatus!=='READY' || recovery.packageType!=='RECOVERY' || recovery.status!=='active' || recovery.paymentStatus!=='PAID' || !original || original.horseId!==horse.id || original.status!=='paused' || original.paymentStatus!=='PAID' || !original.remainingDays || state.enrollments.some(e=>e.horseId===horse.id && e.id!==id && e.status==='active'))throw new Error('Chưa đủ điều kiện Resume gói gốc.');
  const start=new Date();const end=new Date(start);end.setDate(end.getDate()+original.remainingDays-1);
  return {...state,enrollments:state.enrollments.map(e=>e.id===id?{...e,status:'completed'}:e.id===original.id?{...e,status:'active',startDate:start.toISOString().slice(0,10),endDate:end.toISOString().slice(0,10),scheduleConfirmed:false}:e),horses:state.horses.map(h=>h.id===horse.id?{...h,rehab:null,lifecycle:'training',trainingStatus:'Active'}:h)};
}

export function rejectHorse(state,id,note){role(state,'manager');const request=state.horseClubRequests.find(r=>r.id===numericId(id) && r.clubId===state.user.clubId && r.status==='pending');if(!request)throw new Error('Không tìm thấy yêu cầu chờ duyệt.');return {...state,horseClubRequests:state.horseClubRequests.map(r=>r.id===id?{...r,status:'rejected',reviewNote:note?.trim()||''}:r),horses:state.horses.map(h=>h.id===request.horseId?{...h,approvalStatus:'rejected'}:h)};}
