import { useState } from 'react';
import { Btn, Card, Input, Select, Textarea } from './ui';
import type { Horse } from './data';
export function PendingNotice({ children }: { children: React.ReactNode }) {
  return <div data-ui-translate="off" role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Chờ API</strong><div className="mt-1">{children}</div><p className="mt-1 text-xs">Giao diện đã dựng; thao tác chưa được gửi/lưu. Không có dữ liệu giả hoặc dữ liệu cục bộ.</p></div>;
}
export function StaffCreationDesign() {
  const [form, setForm] = useState({ name: '', email: '', role: 'manager', phone: '' });
  const set = (key: keyof typeof form) => (value: string) => setForm(f => ({ ...f, [key]: value }));
  return <div className="max-w-3xl space-y-4"><PendingNotice>Cần API và quyền dành cho Admin để tạo tài khoản nhân sự và cấp/thu hồi quyền. Chỉ chủ ngựa được tự đăng ký. Quản lý, thú y và huấn luyện viên phải được Admin tạo; frontend không tự nâng quyền tài khoản.</PendingNotice><Card className="p-6 space-y-4"><h2 className="font-serif text-xl font-bold">Admin — staff accounts</h2><div className="grid grid-cols-2 gap-4"><Input label="Full name" value={form.name} onChange={set('name')} required /><Input label="Work email" value={form.email} onChange={set('email')} type="email" required /><Input label="Phone" value={form.phone} onChange={set('phone')} /><Select label="Role assigned by Admin" value={form.role} onChange={set('role')} options={[{ value: 'manager', label: 'Club manager' }, { value: 'veterinarian', label: 'Veterinarian' }, { value: 'head_trainer', label: 'Trainer' }]} /></div><p className="text-sm text-gray-500">Staff receive an account invitation and change their password on first sign in. Only Admin creates staff accounts and assigns permissions.</p><Btn variant="gold" disabled>Create staff account — waiting for Admin API</Btn></Card></div>;
}
export function ApprovedEditRequest({ horse }: { horse: Horse }) {
  const [reason, setReason] = useState('');
  const [field, setField] = useState('name');
  const [value, setValue] = useState('');
  const [evidence, setEvidence] = useState('');
  return <Card className="p-5 space-y-3"><h3 className="font-semibold">Request changes to approved profile</h3><PendingNotice>Hồ sơ gốc đã khóa. Cần API gửi yêu cầu sửa, lưu giá trị cũ/mới, lý do, minh chứng và kết quả duyệt. Quản lý duyệt hoặc từ chối trước khi dữ liệu gốc thay đổi.</PendingNotice><div className="grid grid-cols-2 gap-3"><Select label="Field to change" value={field} onChange={setField} options={[{ value: 'name', label: 'Horse name' }, { value: 'birthDate', label: 'Date of birth' }, { value: 'color', label: 'Coat colour' }, { value: 'height', label: 'Height (cm)' }]} /><div className="text-sm"><div className="font-medium mb-2">Current value</div><p data-ui-translate="off" className="p-2 bg-gray-50 rounded-lg">{String(horse[field as keyof Horse] ?? '—')}</p></div><Input label="Requested value" value={value} onChange={setValue} required /><Input label="Evidence URL" value={evidence} onChange={setEvidence} type="url" /></div><Textarea label="Changes and reason" value={reason} onChange={setReason} required /><Btn disabled variant="gold">Submit change request — waiting for API</Btn></Card>;
}
