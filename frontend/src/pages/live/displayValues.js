export const displayLabels = {
  fullName:'Họ tên',email:'Email',phone:'Số điện thoại',status:'Trạng thái',emailVerified:'Đã xác thực email',avatarUrl:'Ảnh đại diện',role:'Vai trò',requestedRole:'Vai trò đăng ký',roleName:'Vai trò',userId:'Mã tài khoản',
  medicalRecordId:'Mã hồ sơ khám',profileId:'Mã hồ sơ sức khỏe',veterinarianId:'Mã bác sĩ thú y',examType:'Loại khám',examinedAt:'Thời điểm khám',healthStatus:'Tình trạng sức khỏe',diagnosis:'Chẩn đoán',treatment:'Điều trị',medication:'Thuốc',careRecommendation:'Hướng dẫn chăm sóc',notes:'Ghi chú',systemNote:'Nhận xét hệ thống',trainingNote:'Hướng dẫn tập luyện',confirmedAt:'Thời điểm xác nhận',createdAt:'Ngày tạo',updatedAt:'Cập nhật lúc',correctionOfId:'Hồ sơ được hiệu chỉnh',vitalSign:'Chỉ số sinh tồn',clinicalExams:'Khám lâm sàng',bodyTemperature:'Nhiệt độ cơ thể',restingHeartRate:'Nhịp tim nghỉ',restingRespiratoryRate:'Nhịp thở nghỉ',examinationArea:'Vùng khám',conditionStatus:'Tình trạng',abnormalityType:'Bất thường',severity:'Mức độ',
  planId:'Mã kế hoạch',horseId:'Mã ngựa',createdBy:'Người tạo',planName:'Tên kế hoạch',goal:'Mục tiêu',duration:'Thời lượng',startDate:'Ngày bắt đầu',endDate:'Ngày kết thúc',sessionId:'Mã buổi tập',scheduledStart:'Giờ tập dự kiến',scheduledEnd:'Giờ kết thúc dự kiến',actualStart:'Bắt đầu thực tế',actualEnd:'Kết thúc thực tế',heartRate:'Nhịp tim',avgSpeed:'Vận tốc trung bình',maxSpeed:'Vận tốc tối đa',recordedBy:'Người ghi nhận',evaluation:'Đánh giá',distance:'Quãng đường',intensity:'Cường độ',surface:'Mặt sân',
  packageId:'Mã gói',packageName:'Tên gói',packageType:'Loại gói',description:'Mô tả',durationDays:'Số ngày',price:'Giá gói',horsePackageId:'Mã đăng ký',paymentStatus:'Thanh toán',totalPrice:'Tổng tiền',registeredAt:'Ngày đăng ký',paidAt:'Ngày thanh toán',remainingDays:'Số ngày còn lại',
  requestId:'Mã yêu cầu',reviewNote:'Ghi chú xét duyệt',reviewedAt:'Thời điểm xét duyệt',user:'Người đăng ký',requestedRoleId:'Vai trò đăng ký',auditId:'Mã lịch sử',action:'Thao tác',result:'Kết quả',reason:'Lý do / quyền thay đổi',performedBy:'Người thực hiện',entityType:'Đối tượng',entityId:'Mã đối tượng',
  raceHistoryId:'Mã kết quả đua',raceName:'Tên giải',raceDate:'Ngày đua',finishPosition:'Thứ hạng',completionTime:'Thời gian hoàn thành',racecourse:'Trường đua',jockeyName:'Nài ngựa',prize:'Tiền thưởng',
};
export const displayEnums = {
  CLUB_MANAGER:'Quản lý trung tâm',HEAD_TRAINER:'Huấn luyện viên trưởng',VETERINARIAN:'Bác sĩ thú y',GROOM:'Nhân viên chăm sóc',HORSE_OWNER:'Chủ ngựa',USER:'Tài khoản cơ bản',
  ACTIVE:'Đang hoạt động',INACTIVE:'Ngừng hoạt động',PENDING:'Đang chờ xử lý',APPROVED:'Đã duyệt',REJECTED:'Đã từ chối',NOT_SUBMITTED:'Chưa gửi tiếp nhận',DRAFT:'Bản nháp',CONFIRMED:'Đã xác nhận',READY:'Đủ điều kiện sức khỏe',INJURED:'Bị thương',QUARANTINED:'Đang cách ly',
  INITIAL:'Khám ban đầu',PERIODIC:'Khám định kỳ',FOLLOW_UP:'Tái khám',NORMAL:'Bình thường',ABNORMAL:'Bất thường',MILD:'Nhẹ',MODERATE:'Trung bình',SEVERE:'Nặng',CRITICAL:'Nguy kịch',LEGS:'Chân',EYES:'Mắt',RESPIRATORY:'Hệ hô hấp',SKIN:'Da',MOVEMENT:'Vận động',GENERAL_CONDITION:'Tình trạng tổng quát',
  TRAINING_LOCK:'Khóa tập luyện',ALLOW_TRAINING:'Cho phép tập luyện',SCHEDULED:'Đã xếp lịch',COMPLETED:'Đã hoàn tất',MISSED:'Bỏ buổi',CANCELLED:'Đã hủy',PAUSED:'Tạm dừng',PAID:'Đã thanh toán',FAILED:'Thất bại',SUCCESS:'Thành công',GRANT:'Cấp quyền',REVOKE:'Thu hồi quyền',
  BASIC:'Cơ bản',RACING:'Thi đấu',PERFORMANCE:'Nâng cao hiệu suất',RECOVERY:'Phục hồi',
};
const units={bodyTemperature:'°C',restingHeartRate:'bpm',heartRate:'bpm',restingRespiratoryRate:'lần/phút',avgSpeed:'km/h',maxSpeed:'km/h'};
export const hiddenDetailFields = new Set(['roleId','clinicalExamId','vitalSignId']);
export function readableDate(value, dateOnly=false){
  if(!value)return 'Chưa có';
  const raw=String(value).replace(/(\.\d{3})\d+/,'$1');
  const date=new Date(raw);
  if(Number.isNaN(date.getTime()))return String(value);
  return dateOnly?date.toLocaleDateString('vi-VN'):date.toLocaleString('vi-VN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
}
export function readableValue(key,value){
  if(value===null||value===undefined||value==='')return 'Chưa có';
  if(typeof value==='boolean')return value?'Có':'Chưa';
  if(units[key])return `${value} ${units[key]}`;
  if(/At$/.test(key)||['examinedAt','scheduledStart','scheduledEnd','actualStart','actualEnd'].includes(key))return readableDate(value);
  if(['startDate','endDate','raceDate','dateOfBirth'].includes(key))return readableDate(value,true);
  if(['price','totalPrice','prize'].includes(key)&&Number.isFinite(Number(value)))return `${Number(value).toLocaleString('vi-VN')} VND`;
  // Translate enum fields only; user-entered notes and diagnoses are preserved verbatim.
  if(['roleName','status','healthStatus','examType','conditionStatus','examinationArea','severity','trainingNote','packageType','paymentStatus','action','result'].includes(key))return displayEnums[value]||String(value);
  return String(value);
}
