export const SEED_USERS = [
  // Manager
  {
    id: 'u1', name: 'Nguyen Van Binh', email: 'manager@raceforce.vn', password: '123456',
    role: 'manager', clubId: 'c1', status: 'active', avatar: 'NB', verified: true,
    phone: '0901 234 567',
    bio: 'Quản lý trung tâm huấn luyện với 10 năm kinh nghiệm trong ngành đua ngựa chuyên nghiệp.',
  },
  // Head Trainer
  {
    id: 'u2', name: 'Nguyen Minh Tuan', email: 'trainer@raceforce.vn', password: '123456',
    role: 'head_trainer', clubId: 'c1', status: 'active', avatar: 'NT', verified: true,
    phone: '0912 345 678',
    bio: 'Head Trainer với 12 năm kinh nghiệm huấn luyện ngựa đua Thoroughbred và Arabian.',
    experience: '12 năm huấn luyện ngựa đua · Trước đây làm tại Happy Valley (HK)',
    certifications: 'FEI Level 3 Trainer · BHS Stage 4 · Certified Equine Fitness Trainer',
    achievements: 'Đã đào tạo 3 nhà vô địch quốc gia · Tỷ lệ thắng trung bình của ngựa được huấn luyện: 62%',
  },
  // Head Trainer 2 (chưa vào trung tâm — chờ manager duyệt)
  {
    id: 'u3', name: 'Tran Duc Khai', email: 'trainer2@raceforce.vn', password: '123456',
    role: 'head_trainer', clubId: null, status: 'active', avatar: 'TK', verified: true,
    phone: '0933 456 789',
    bio: 'Cựu jockey chuyển sang huấn luyện. Chuyên về conditioning và sprint training.',
    experience: '8 năm jockey + 5 năm huấn luyện · Top 3 jockey quốc gia 2018-2020',
    certifications: 'FEI Level 2 Trainer · Former Professional Jockey License',
    achievements: '15 giải vô địch với tư cách jockey · Huấn luyện 2 ngựa vô địch khu vực',
  },
  // Veterinarian
  {
    id: 'u4', name: 'Dr. Le Thi An', email: 'vet@raceforce.vn', password: '123456',
    role: 'veterinarian', clubId: 'c1', status: 'active', avatar: 'LA', verified: true,
    phone: '0945 678 901',
    bio: 'Bác sĩ thú y chuyên về ngựa đua với hơn 8 năm kinh nghiệm.',
    certifications: 'DVM · Chuyên khoa ngựa đua · Chứng chỉ siêu âm cơ xương khớp',
  },
  // Groom
  {
    id: 'u5', name: 'Le Van Nam', email: 'groom@raceforce.vn', password: '123456',
    role: 'groom', clubId: 'c1', status: 'active', avatar: 'LN', verified: true,
    phone: '0956 789 012',
    bio: 'Groom chuyên nghiệp với 7 năm kinh nghiệm chăm sóc ngựa đua.',
  },
  // Owner 1 (đã có 2 ngựa — 1 ok, 1 có vấn đề)
  {
    id: 'u6', name: 'Nguyen Van An', email: 'owner@raceforce.vn', password: '123456',
    role: 'owner', clubId: 'c1', status: 'active', avatar: 'NA', verified: true,
    phone: '0967 890 123',
    bio: 'Chủ ngựa đua với đam mê thể thao kỵ mã. Sở hữu 2 ngựa đua tại Saigon Racing Center.',
  },
  // Owner 2 (mới, chưa có ngựa)
  {
    id: 'u7', name: 'Pham Thi Lan', email: 'owner2@raceforce.vn', password: '123456',
    role: 'owner', clubId: 'c1', status: 'active', avatar: 'PL', verified: true,
    phone: '0978 901 234',
    bio: 'Chủ ngựa mới gia nhập. Đang tìm kiếm ngựa giống phù hợp.',
  },
];

export const SEED_CLUBS = [
  {
    id: 'c1', name: 'Saigon Racing Center', location: 'TP. Hồ Chí Minh',
    description: 'Trung tâm huấn luyện ngựa đua hàng đầu tại Việt Nam, thành lập năm 2015 với đội ngũ chuyên nghiệp.',
    managerId: 'u1', managerName: 'Nguyen Van Binh', memberCount: 6, founded: '2015', logoLetter: 'S',
  },
  {
    id: 'c2', name: 'Hanoi Equestrian Center', location: 'Hà Nội',
    description: 'Trung tâm huấn luyện ngựa đua truyền thống tại Hà Nội, chuyên về các giải đua quốc gia và quốc tế.',
    managerId: 'u99', managerName: 'Tran Duc Manh', memberCount: 12, founded: '2010', logoLetter: 'H',
  },
  {
    id: 'c3', name: 'Da Nang Racing Center', location: 'Đà Nẵng',
    description: 'Trung tâm huấn luyện ngựa đua miền Trung với sân đua tiêu chuẩn quốc tế.',
    managerId: 'u98', managerName: 'Le Hoang Nam', memberCount: 8, founded: '2018', logoLetter: 'D',
  },
];

export const SEED_REQUESTS = [
  {
    id: 'req001', userId: 'u3', userName: 'Tran Duc Khai', userEmail: 'trainer2@raceforce.vn',
    userAvatar: 'TK', userRole: 'head_trainer', clubId: 'c1',
    requestedAt: '20/09/2026', expiresAt: '27/09/2026', status: 'pending', assignedRole: 'head_trainer',
  },
];
