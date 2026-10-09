export const GROOM_TASKS = [
  { id: 'gt1', horseId: 'RH-001', date: '25/09/2026', type: 'Cho ăn sáng', time: '06:00', description: '5kg hỗn hợp ngũ cốc + 3kg cỏ khô + Vitamin E', status: 'Pending', completedAt: null },
  { id: 'gt2', horseId: 'RH-001', date: '25/09/2026', type: 'Chải chuốt', time: '07:00', description: 'Chải lông toàn thân, vệ sinh móng, chải bờm đuôi', status: 'Pending', completedAt: null },
  { id: 'gt3', horseId: 'RH-001', date: '25/09/2026', type: 'Dọn chuồng', time: '08:00', description: 'Dọn rác thải, thay lớp rơm mới, khử trùng nền', status: 'Pending', completedAt: null },
  { id: 'gt4', horseId: 'RH-001', date: '25/09/2026', type: 'Cho ăn trưa', time: '12:00', description: '3kg ngũ cốc + kiểm tra nước uống (tối thiểu 15L)', status: 'Pending', completedAt: null },
  { id: 'gt5', horseId: 'RH-001', date: '25/09/2026', type: 'Đi bộ thư giãn', time: '14:00', description: '20 phút đi bộ nhẹ tại bãi cỏ', status: 'Pending', completedAt: null },
  { id: 'gt6', horseId: 'RH-001', date: '25/09/2026', type: 'Cho ăn tối', time: '18:00', description: '5kg ngũ cốc + điện giải ORS + 4kg cỏ khô', status: 'Pending', completedAt: null },
  { id: 'gt7', horseId: 'RH-002', date: '25/09/2026', type: 'Hydrotherapy', time: '09:00', description: 'Ngâm chân phải trước trong nước lạnh 20 phút', status: 'Pending', completedAt: null },
  { id: 'gt8', horseId: 'RH-002', date: '25/09/2026', type: 'Thay băng', time: '10:00', description: 'Thay băng cố định chân phải trước, kiểm tra tình trạng sưng', status: 'Pending', completedAt: null },
];

export const RATIONS = {
  'RH-001': { approvedBy: 'Dr. Le Thi An', approvedAt: '15/09/2026', meals: [
    { meal: 'Sáng', time: '06:00', grain: 5, hay: 3, vitamin: 1, vitaminName: 'Vitamin E', water: 20 },
    { meal: 'Trưa', time: '12:00', grain: 3, hay: 2, vitamin: 0, vitaminName: '', water: 15 },
    { meal: 'Tối', time: '18:00', grain: 5, hay: 4, vitamin: 1, vitaminName: 'Omega 3', water: 20 },
  ] },
  'RH-002': { approvedBy: 'Dr. Le Thi An', approvedAt: '21/09/2026', meals: [
    { meal: 'Sáng', time: '06:30', grain: 4, hay: 2, vitamin: 1, vitaminName: 'Collagen hỗ trợ gân', water: 15 },
    { meal: 'Trưa', time: '12:30', grain: 2, hay: 2, vitamin: 0, vitaminName: '', water: 15 },
    { meal: 'Tối', time: '18:30', grain: 4, hay: 3, vitamin: 1, vitaminName: 'Collagen hỗ trợ gân', water: 15 },
  ] },
};

export const SEED_INVENTORY = [
  { id: 'inv1', clubId: 'c1', name: 'Hỗn hợp ngũ cốc', category: 'food', foodKind: 'grain', unit: 'kg', qty: 40, threshold: 15 },
  { id: 'inv2', clubId: 'c1', name: 'Cỏ khô Timothy', category: 'food', foodKind: 'hay', unit: 'kg', qty: 60, threshold: 20 },
  { id: 'inv3', clubId: 'c1', name: 'Vitamin tổng hợp', category: 'food', foodKind: 'vitamin', unit: 'gói', qty: 12, threshold: 5 },
  { id: 'inv4', clubId: 'c1', name: 'Băng cuộn cố định', category: 'medical', unit: 'cái', qty: 10, threshold: 4 },
  { id: 'inv5', clubId: 'c1', name: 'Dung dịch sát trùng', category: 'medical', unit: 'lít', qty: 3, threshold: 1 },
  { id: 'inv6', clubId: 'c1', name: 'Phenylbutazone (NSAID)', category: 'medical', unit: 'gói', qty: 8, threshold: 3 },
  { id: 'inv7', clubId: 'c1', name: 'Đá lạnh', category: 'medical', unit: 'kg', qty: 30, threshold: 10 },
  { id: 'inv8', clubId: 'c1', name: 'Móc vệ sinh móng', category: 'tool', unit: 'cái', qty: 6, threshold: 2 },
  { id: 'inv9', clubId: 'c1', name: 'Xẻng dọn chuồng', category: 'tool', unit: 'cái', qty: 4, threshold: 2 },
];

export const SEED_INV_LOGS = SEED_INVENTORY.map((i, n) => ({
  id: `il-seed${n}`, clubId: i.clubId, itemId: i.id, itemName: i.name, unit: i.unit, kind: 'in',
  delta: i.qty, balance: i.qty, reason: 'Tồn đầu kỳ', byId: 'u5', byName: 'Le Van Nam',
  date: '20/09/2026', at: '20/09/2026 08:00', ts: 1_000 + n,
}));
