import { readJson } from './demoAuth.js'

export const clubKey = 'raceforge-club-v1'
export const roles = ['Head Trainer', 'Trainer', 'Veterinarian', 'Groom', 'Horse Owner']
export const seedClub = {
  name: 'Royal Stables', location: 'TP. Hồ Chí Minh', email: 'contact@royalstables.example',
  horses: [
    { id: 'RF-021', name: 'Thunder King', breed: 'Thoroughbred', age: 5, status: 'Đủ điều kiện', owner: 'Trần Quốc Bảo' },
    { id: 'RF-022', name: 'Silver Comet', breed: 'Arabian', age: 4, status: 'Theo dõi', owner: 'Phạm Gia Linh' },
    { id: 'RF-023', name: 'Golden Arrow', breed: 'Thoroughbred', age: 6, status: 'Đủ điều kiện', owner: 'Trần Quốc Bảo' },
  ],
  horseRequests: [
    { id: 'HR-01', name: 'Moonlight', breed: 'Arabian', age: 3, owner: 'Trần Quốc Bảo', status: 'pending' },
    { id: 'HR-02', name: 'Storm', breed: 'Thoroughbred', age: 4, owner: 'Phạm Gia Linh', status: 'pending' },
    { id: 'HR-03', name: 'Sunrise', breed: 'Thoroughbred', age: 5, owner: 'Lê Minh', status: 'pending' },
  ],
  staff: [
    { id: 'ST-01', name: 'Lê Thành Long', email: 'long@example.com', role: 'Head Trainer', active: true },
    { id: 'ST-02', name: 'Nguyễn Hà', email: 'ha@example.com', role: 'Veterinarian', active: true },
  ],
  memberRequests: [
    { id: 'MR-01', name: 'Phạm Gia Linh', email: 'linh@example.com', role: 'Trainer', status: 'pending' },
    { id: 'MR-02', name: 'Lê Minh', email: 'minh@example.com', role: 'Groom', status: 'pending' },
  ],
  races: [], activity: [],
}
export function loadClub() { return readJson(localStorage, clubKey, structuredClone(seedClub)) }
export function saveClub(club) { localStorage.setItem(clubKey, JSON.stringify(club)) }
export function decideRequest(club, type, id, approved, role) {
  const field = type === 'horse' ? 'horseRequests' : 'memberRequests'
  const request = club[field].find(item => item.id === id)
  if (!request || request.status !== 'pending') return club
  const next = { ...club, [field]: club[field].map(item => item.id === id ? { ...item, status: approved ? 'approved' : 'rejected' } : item) }
  if (approved && type === 'horse') next.horses = [...club.horses, { ...request, id: crypto.randomUUID(), status: 'Theo dõi' }]
  if (approved && type === 'member') next.staff = [...club.staff, { id: crypto.randomUUID(), name: request.name, email: request.email, role: role || request.role, active: true }]
  return next
}
export function csvReport(club) {
  const escape = value => '"' + String(value).replace(/^[=+\-@\t\r]/, "'$&").replaceAll('"', '""') + '"'
  return '\uFEFF' + [['Mã ngựa', 'Tên ngựa', 'Giống', 'Tuổi', 'Tình trạng', 'Chủ ngựa'], ...club.horses.map(horse => [horse.id, horse.name, horse.breed, horse.age, horse.status, horse.owner])].map(row => row.map(escape).join(',')).join('\r\n')
}

export function exportClubReport(club) {
  const url = URL.createObjectURL(new Blob([csvReport(club)], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = 'raceforge-horses.csv'; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
