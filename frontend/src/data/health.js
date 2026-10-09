export const MEDICAL_RECORDS = [
  {
    id: 'm1', horseId: 'RH-001', date: '22/09/2026', type: 'Kiểm tra định kỳ', vet: 'Dr. Le Thi An',
    notes: 'Tất cả chỉ số xuất sắc. Ngựa trong phong độ đỉnh cao, sẵn sàng thi đấu.',
    result: 'Eligible', medications: 'Vitamin E 500IU/ngày', isPostTraining: false, vetClearanceGranted: true,
    vitals: { heartRate: '32', temperature: '37.7', weight: '512', respRate: '11', bloodPressure: '108/68' },
    diagnosis: 'Sức khỏe tổng thể xuất sắc. Tim mạch và cơ xương khớp không có bất thường.',
    recommendations: 'Tiếp tục chế độ tập luyện Competition Prep. Bổ sung vitamin E và điện giải hàng ngày.',
  },
  {
    id: 'm2', horseId: 'RH-001', date: '20/08/2026', type: 'Tiêm phòng', vet: 'Dr. Le Thi An',
    notes: 'Tiêm vaccine cúm ngựa (EIV) và uốn ván định kỳ. Phản ứng bình thường.',
    result: 'Completed', medications: 'EIV Vaccine + Tetanus Toxoid', isPostTraining: false, vetClearanceGranted: false,
    vitals: { heartRate: '38', temperature: '38.0', weight: '510', respRate: '13', bloodPressure: '112/72' },
    diagnosis: 'Hoàn thành tiêm chủng định kỳ đúng lịch.',
    recommendations: 'Nghỉ nhẹ 24 giờ sau tiêm. Theo dõi phản ứng.',
  },
  {
    id: 'm3', horseId: 'RH-002', date: '21/09/2026', type: 'Khám chấn thương', vet: 'Dr. Le Thi An',
    notes: 'Phát hiện tổn thương dây chằng bên ngoài chân phải trước. Sưng rõ, phản ứng đau dương tính.',
    result: 'Injured', medications: 'NSAID (Phenylbutazone 4.4mg/kg) · Bao đá lạnh 20 phút × 3/ngày · Băng cố định',
    isPostTraining: false, vetClearanceGranted: false,
    vitals: { heartRate: '52', temperature: '38.9', weight: '598', respRate: '18', bloodPressure: '128/85' },
    diagnosis: 'Chấn thương dây chằng chân phải trước độ II. Siêu âm xác nhận tổn thương sợi collagen.',
    recommendations: 'Cấm vận động hoàn toàn 4 tuần. Hydrotherapy ngày 2 lần. Tái khám sau 2 tuần. Cân nặng cần giảm 20-30kg.',
  },
];
