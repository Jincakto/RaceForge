export const TRAINING_PLANS = [
  {
    id: 28, horseId: 14, phase: 'Competition Prep',
    startDate: '01/09/2026', endDate: '31/10/2026',
    distance: '1200m', workload: 'High', surface: 'Turf',
    goals: 'Cải thiện tốc độ sprint, chuẩn bị cho Saigon Grand Prix 15/10',
    status: 'Active', locked: false, createdBy: 'Nguyen Minh Tuan', progress: 65,
    weeklyKm: 42, sessionsPerWeek: 5, restDaysPerWeek: 2, intensityScore: 88,
    algorithmRationale: 'Sức khỏe xuất sắc (Eligible) · Tuổi đỉnh cao 5 tuổi · Nhịp tim nghỉ 32 bpm (tim mạch tốt)',
  },
];

export const TRAINING_SESSIONS = [
  {
    id: 30, horseId: 14, planId: 28, date: '25/09/2026', time: '09:00',
    type: 'Sprint Interval', trainerName: 'Nguyen Minh Tuan', trainerId: 3,
    assignedStaffIds: [6], assignedStaffNames: ['Le Van Nam'],
    status: 'Scheduled', distance: '4 × 200m', targetTime: '23s/rep',
    notes: 'Tập trung vào xuất phát cổng + nước rút chặng cuối', conflictChecked: true,
  },
  {
    id: 31, horseId: 14, planId: 28, date: '23/09/2026', time: '08:00',
    type: 'Race-Pace Gallop', trainerName: 'Nguyen Minh Tuan', trainerId: 3,
    assignedStaffIds: [6], assignedStaffNames: ['Le Van Nam'],
    status: 'Completed', distance: '1200m', targetTime: '74s',
    notes: 'Duy trì nhịp tốt, tập trung vào góc cua', conflictChecked: true, postExamDone: true,
    result: { time: '73.8s', speed: '58.6', heartRate: 188, notes: 'Phong độ xuất sắc — kỷ lục cá nhân mới!', performanceScore: 94 },
  },
  {
    id: 32, horseId: 14, planId: 28, date: '21/09/2026', time: '07:00',
    type: 'Recovery Trot', trainerName: 'Nguyen Minh Tuan', trainerId: 3,
    assignedStaffIds: [6], assignedStaffNames: ['Le Van Nam'],
    status: 'Completed', distance: '3000m', targetTime: '—',
    notes: 'Phục hồi tích cực sau Sprint Interval', conflictChecked: true, postExamDone: true,
    result: { time: '—', speed: '20.4', heartRate: 138, notes: 'Thư giãn tốt, không có dấu hiệu mỏi', performanceScore: 82 },
  },
];

export const SEED_ENROLLMENTS = [
  { id: 515, horseId: 14, packageId: 511, packageName: 'Thi đấu', sessionsTotal: 36, sessionsDone: 23, status: 'active', trainerId: 3, trainerName: 'Nguyen Minh Tuan', startedAt: '01/09/2026', scheduleConfirmed: true },
];
