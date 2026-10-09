export const SEED_HORSE_CLUB_REQUESTS = [];

// Horse 1: Thunder King — ALL GREEN (sức khỏe hoàn hảo, thành tích xuất sắc)
// Horse 2: Storm Wreck  — ALL RED  (chấn thương, sức khỏe kém, nhiều vấn đề)

export const HORSES = [
  {
    id: 'RH-001', name: 'Thunder King', breed: 'Thoroughbred', age: 5, color: 'Bay',
    gender: 'Stallion', weight: 512, height: 163, stable: 'Stable A', stall: 'A-12',
    clubId: 'c1', ownerId: 'u6', ownerName: 'Nguyen Van An',
    headTrainerId: 'u2', headTrainerName: 'Nguyen Minh Tuan',
    vetId: 'u4', vetName: 'Dr. Le Thi An', groomId: 'u5', groomName: 'Le Van Nam',
    healthStatus: 'Eligible', trainingStatus: 'Active', lifecycle: 'training',
    sire: 'Redoute’s Choice', dam: 'Silver Mist', damSire: 'Fastnet Rock', medicalHistory: 'Không có tiền sử bệnh nghiêm trọng. Tiêm phòng đầy đủ.',
    approvalStatus: 'approved', registrationDate: '15/03/2021', approvedAt: '20/03/2021',
    totalRaces: 12, wins: 7, vetClearance: true,
    biography: 'Thoroughbred giống thuần chủng nhập từ Úc năm 2021. Tiếng là nước rút xuất sắc ở chặng cuối, nhịp tim hồi phục nhanh sau cường độ cao. Tốc độ đỉnh 59.9 km/h.',
    imageUrl: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=700&h=500&fit=crop&auto=format',
    achievements: [
      { id: 'a1', date: '10/09/2026', title: 'Saigon Sprint Cup', description: 'Vô địch cự ly 1200m, dẫn đầu từ góc cua cuối', prize: '50,000,000 VND', position: 1 },
      { id: 'a2', date: '20/07/2026', title: 'Summer Classic 1600m', description: 'Vô địch cự ly 1600m với khoảng cách 2 thân so với ngựa thứ 2', prize: '80,000,000 VND', position: 1 },
      { id: 'a3', date: '15/08/2026', title: 'Golden Gate Stakes', description: 'Hạng nhì cự ly 1400m, sát nút với ngựa vô địch', prize: '20,000,000 VND', position: 2 },
    ],
    raceHistory: [
      { id: 'rh1', date: '10/09/2026', raceName: 'Saigon Sprint Cup', distance: '1200m', position: 1, totalHorses: 10, time: '1:11.24', venue: 'Phú Thọ Racecourse', jockey: 'Nguyen Duc', prize: '50,000,000 VND' },
      { id: 'rh2', date: '15/08/2026', raceName: 'Golden Gate Stakes', distance: '1400m', position: 2, totalHorses: 12, time: '1:25.10', venue: 'Phú Thọ Racecourse', jockey: 'Nguyen Duc', prize: '20,000,000 VND' },
      { id: 'rh3', date: '20/07/2026', raceName: 'Summer Classic', distance: '1600m', position: 1, totalHorses: 9, time: '1:38.55', venue: 'Phú Thọ Racecourse', jockey: 'Nguyen Duc', prize: '80,000,000 VND' },
      { id: 'rh4', date: '05/06/2026', raceName: 'Monsoon Mile', distance: '1600m', position: 3, totalHorses: 11, time: '1:39.80', venue: 'Phú Thọ Racecourse', jockey: 'Nguyen Duc', prize: '10,000,000 VND' },
    ],
  },
  {
    id: 'RH-002', name: 'Storm Wreck', breed: 'Quarter Horse', age: 9, color: 'Dark Bay',
    gender: 'Gelding', weight: 598, height: 158, stable: 'Stable C', stall: 'C-08',
    clubId: 'c1', ownerId: 'u6', ownerName: 'Nguyen Van An',
    headTrainerId: 'u2', headTrainerName: 'Nguyen Minh Tuan',
    vetId: 'u4', vetName: 'Dr. Le Thi An', groomId: 'u5', groomName: 'Le Van Nam',
    healthStatus: 'Injured', trainingStatus: 'Inactive', lifecycle: 'awaiting_vet',
    sire: 'Dash for Cash', dam: 'Dark Lady', damSire: 'Easy Jet', medicalHistory: 'Chấn thương dây chằng chân phải trước (09/2026).',
    approvalStatus: 'approved', registrationDate: '10/02/2023', approvedAt: '15/02/2023',
    totalRaces: 6, wins: 1, vetClearance: false,
    biography: 'Cựu ngựa đua từ Hà Nội. Hiện đang phục hồi sau chấn thương dây chằng chân phải trước nghiêm trọng. Nhịp tim nghỉ bất thường, cân nặng vượt mức, tiên lượng cần 4-6 tuần phục hồi.',
    imageUrl: 'https://images.unsplash.com/photo-1566288623394-377af472d81b?w=700&h=500&fit=crop&auto=format',
    achievements: [],
    raceHistory: [
      { id: 'rh5', date: '12/05/2026', raceName: 'Northern Sprint Open', distance: '1000m', position: 4, totalHorses: 10, time: '1:02.80', venue: 'Gia Lâm Racecourse', jockey: 'Tran Van Hung', prize: '0 VND' },
      { id: 'rh6', date: '01/04/2026', raceName: 'Spring Classic', distance: '1200m', position: 1, totalHorses: 8, time: '1:16.40', venue: 'Gia Lâm Racecourse', jockey: 'Tran Van Hung', prize: '25,000,000 VND' },
    ],
  },
];

export const PERFORMANCE_DATA = [
  { month: 'T4', speed: 54.2, fitness: 72, heartRate: 178 },
  { month: 'T5', speed: 55.8, fitness: 76, heartRate: 182 },
  { month: 'T6', speed: 56.4, fitness: 79, heartRate: 180 },
  { month: 'T7', speed: 57.9, fitness: 83, heartRate: 176 },
  { month: 'T8', speed: 57.2, fitness: 81, heartRate: 179 },
  { month: 'T9', speed: 58.6, fitness: 87, heartRate: 185 },
];
