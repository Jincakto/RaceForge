export const LIFECYCLE_ORDER = ['pending', 'awaiting_vet', 'ready', 'training', 'locked', 'rehab'];

export const LIFECYCLE_LABEL = {
  pending: 'Chờ duyệt',
  awaiting_vet: 'Chờ khám sức khỏe',
  ready: 'Sẵn sàng huấn luyện',
  training: 'Đang huấn luyện',
  locked: 'Khóa huấn luyện (Tạm dừng)',
  rehab: 'Đang phục hồi',
};

export const TRAINING_PACKAGES = [
  { id: 'pk-foundation', name: 'Nền tảng', tagline: 'Xây thể lực và kỹ thuật cơ bản', sessions: 12, weeks: 6, price: '18,000,000 VND', focus: ['Làm quen cổng xuất phát', 'Phát triển sức bền nền', 'Đánh giá thể trạng định kỳ'] },
  { id: 'pk-performance', name: 'Hiệu suất', tagline: 'Tăng tốc độ và khả năng hồi phục', sessions: 24, weeks: 10, price: '36,000,000 VND', focus: ['Interval & Race-Pace theo thuật toán 80/20', 'Theo dõi nhịp tim sau tập', 'Báo cáo tiến độ hằng tuần'], popular: true },
  { id: 'pk-competition', name: 'Thi đấu', tagline: 'Chuẩn bị đỉnh cao cho mùa giải', sessions: 36, weeks: 14, price: '58,000,000 VND', focus: ['Mô phỏng cự ly thi đấu', 'Chiến thuật chạy theo cự ly', 'Tapering trước giải'] },
];

export const REHAB_PACKAGES = [
  { id: 'rb-light', name: 'Phục hồi nhẹ', description: 'Cho căng cơ, mệt mỏi quá mức, chỉ số sinh tồn chưa ổn định.', weeks: 2, items: ['Nghỉ ngơi chủ động', 'Đi bộ thư giãn 20 phút/ngày', 'Bổ sung điện giải'] },
  { id: 'rb-hydro', name: 'Thủy trị liệu & Vật lý trị liệu', description: 'Cho viêm khớp, sưng chân, đau cơ xương.', weeks: 4, items: ['Hydrotherapy 2 lần/ngày', 'Chườm lạnh & băng cố định', 'Tái khám mỗi tuần'] },
  { id: 'rb-tendon', name: 'Phục hồi gân – dây chằng', description: 'Cho tổn thương gân, dây chằng cần giai đoạn hồi phục dài.', weeks: 8, items: ['Siêu âm theo dõi 2 tuần/lần', 'Đi bộ có kiểm soát tăng dần', 'Chế độ dinh dưỡng collagen'] },
];

export const ROLE_LABELS = {
  manager: 'Quản lý trung tâm', head_trainer: 'Head Trainer',
  veterinarian: 'Thú y', groom: 'Groom', owner: 'Chủ ngựa',
};

export const DEMO_ACCOUNTS = [
  { email: 'manager@raceforce.vn', password: '123456', role: 'Quản lý trung tâm', icon: '🏛', color: 'bg-[#1a2844]' },
  { email: 'trainer@raceforce.vn', password: '123456', role: 'Head Trainer', icon: '🏇', color: 'bg-blue-700' },
  { email: 'vet@raceforce.vn', password: '123456', role: 'Thú y', icon: '🩺', color: 'bg-emerald-700' },
  { email: 'groom@raceforce.vn', password: '123456', role: 'Groom', icon: '🧹', color: 'bg-amber-600' },
  { email: 'owner@raceforce.vn', password: '123456', role: 'Chủ ngựa', icon: '👤', color: 'bg-purple-700' },
  { email: 'owner2@raceforce.vn', password: '123456', role: 'Chủ ngựa (mới)', icon: '👤', color: 'bg-purple-500' },
];

export const CARE_LABELS = {
  'feed-Sáng': 'Cho ăn bữa sáng', 'feed-Trưa': 'Cho ăn bữa trưa', 'feed-Tối': 'Cho ăn bữa tối',
  clean: 'Vệ sinh chuồng', bath: 'Tắm rửa', ice: 'Ngâm chân nước đá', treat: 'Hỗ trợ trị thương',
};

export const FOOD_KIND_LABEL = { grain: 'Ngũ cốc', hay: 'Cỏ', vitamin: 'Vitamin', other: 'Khác' };

export const INV_CAT_LABEL = { food: 'Thức ăn', medical: 'Thuốc và vật tư y tế', tool: 'Dụng cụ' };

export const INV_UNITS = ['kg', 'lít', 'gói', 'cái'];

export const LOG_KIND = {
  in: { label: 'Nhập kho', cls: 'bg-emerald-100 text-emerald-700' }, out: { label: 'Xuất kho', cls: 'bg-red-100 text-red-700' },
  refund: { label: 'Hoàn kho', cls: 'bg-sky-100 text-sky-700' }, adjust: { label: 'Kiểm kê', cls: 'bg-amber-100 text-amber-700' },
  edit: { label: 'Sửa / Xóa', cls: 'bg-gray-100 text-gray-600' },
};

export const PAGE_TITLES = {
  dashboard: 'Dashboard', 'horse-list': 'Ngựa trong trung tâm', 'horse-detail': 'Chi tiết ngựa',
  'horse-create': 'Đăng ký ngựa mới', 'horse-edit': 'Chỉnh sửa ngựa', 'my-horses': 'Ngựa của tôi',
  'center-requests': 'Duyệt đăng ký ngựa', 'trainer-select': 'Chọn Head Trainer',
  'trainer-profile': 'Hồ sơ ứng viên',
  'health-records': 'Hồ sơ y tế', 'vet-health-form': 'Nhập liệu sức khỏe',
  'training-hub': 'Huấn luyện & Giáo án', 'care-hub': 'Chăm sóc & Cho ăn',
  performance: 'Hiệu suất', 'race-results': 'Kết quả đua', reports: 'Báo cáo',
  staff: 'Nhân sự', 'member-requests': 'Yêu cầu tham gia', notifications: 'Thông báo', profile: 'Hồ sơ',
  'training-register': 'Đăng ký huấn luyện', 'post-exam': 'Khám sau tập & Khóa', 'rehab-center': 'Gói phục hồi', inventory: 'Kho của tôi', 'inventory-log': 'Lịch sử kho',
};

export const TODAY = '25/09/2026';
