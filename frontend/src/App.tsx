import { TrainingProtocolsPage } from './trainingProtocolsPage';
import { TrainerProfileForm } from './trainerProfileForm';
import { permissionForPage } from './permissionApi';
import { clearRecommendations } from './recommendations';
import { passwordSetupLink, createPasswordSetupSubmitter, passwordSetupError, requestPasswordReset, restoreSessionForLocation } from './passwordSetup';
import { auth, request, ApiError } from './api';
import { loadRemote, userFromApi, CENTER } from './remote';
import { makeRemoteActions } from './remoteActions';
import { VetHealthFormPage, nextMedId, REGION_DEFS } from './vetForm';
import { HealthRecordsPage } from './healthRecords';
import { IntakeBoardPage, VetAssignedPage, IntakeProgress, IdentityBadge, intakeStage, vetVisible } from './intake';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { makeTrainingHandlers } from './trainingLogic';
import { PackageCatalogPage, TrainerAssignPage } from './packages';
import { TrainingRegisterPage } from './trainingRegister';
import { TrainingHubPage } from './trainingPlans';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import {
  SEED_USERS, SEED_CLUBS, SEED_REQUESTS, SEED_HORSE_CLUB_REQUESTS,
  HORSES, MEDICAL_RECORDS, INTAKE_RECORDS, TRAINING_PLANS, TRAINING_SESSIONS,
  PERFORMANCE_DATA, NOTIFICATIONS,
  RATIONS, SEED_INVENTORY, SEED_INV_LOGS,
  computeTrainingSuggestion, SEED_ENROLLMENTS, TRAINING_PACKAGES, REHAB_PACKAGES, type TrainingPackage,
  LIFECYCLE_LABEL, LIFECYCLE_ORDER, getLifecycle, isHeavySession, nextSeq,
  type Role, type AppUser, type Club, type MemberRequest, type Horse,
  type HorseClubRequest, type Achievement, type TrainingPlan, type RaceHistoryEntry,
  type TrainingSession, type HealthRecord, type TrainingSuggestion,
  type Enrollment, type AppNotification, type Lifecycle,
  type InjuryDetail,
  type InvItem, type InvLog, type InvCategory, type InvUnit, type FoodKind, type CareRecord, type Incident,
} from './data';
import { Badge, Card, Btn, Input, Select, Textarea } from './ui';
import { TrainerHistoryTab, PhotosTab, logChange } from './horseExtras';
import { ReasonDialog, FEATURES, NoPermission, IdChip, dispId, GENDER_LABEL, AccountManagementPage, PermissionMatrixPage, AuditLogPage, AdminDashboard, type AuditEntry } from './admin';

// ── Types ─────────────────────────────────────────────────────────────────────

type Page =
  | 'home' | 'login' | 'register' | 'onboarding' | 'join-center' | 'pending'
  | 'dashboard' | 'horse-list' | 'horse-detail' | 'horse-create' | 'horse-edit'
  | 'my-horses' | 'center-requests' | 'package-catalog' | 'trainer-assign'
  | 'trainer-profile'
  | 'health-records' | 'vet-health-form'
  | 'training-hub' | 'care-hub'
  | 'performance' | 'race-results' | 'reports'
  | 'staff' | 'member-requests' | 'notifications' | 'profile'
  | 'accounts' | 'permissions' | 'audit-log'
  | 'training-register' | 'vet-assign' | 'post-exam' | 'rehab-center' | 'inventory' | 'inventory-log';

interface AppState {
  user: AppUser | null;
  page: Page;
  users: AppUser[];
  clubs: Club[];
  memberRequests: MemberRequest[];
  horses: Horse[];
  horseClubRequests: HorseClubRequest[];
  examHorseId: string | null;
  healthRecords: HealthRecord[];
  trainingPlans: TrainingPlan[];
  trainingSessions: TrainingSession[];
  inventory: InvItem[];
  invLogs: InvLog[];
  careRecords: CareRecord[];
  incidents: Incident[];
  notifications: AppNotification[];
  enrollments: Enrollment[];
  errorMsg: string | null;
  selectedHorseId: string;
  packages: TrainingPackage[];
  viewTrainerId: string | null;
  showSuccess: string | null;
  userPermissions: Record<string, Page[]>;
  rolePerms: Record<string, string[]>;
  auditLog: AuditEntry[];
}

// ── Shared UI ─────────────────────────────────────────────────────────────────


function StatCard({ label, value, sub, color = 'navy' }: { label: string; value: string | number; sub?: string; color?: string }) {
  const c: Record<string, string> = { navy: 'from-[#1a2844] to-[#243558]', gold: 'from-[#c9973b] to-[#e8b85a]', green: 'from-[#1a4a3a] to-[#236b54]', red: 'from-red-600 to-red-500', purple: 'from-purple-700 to-purple-500' };
  return (
    <div className={`bg-gradient-to-br ${c[color] || c.navy} text-white rounded-xl p-5 shadow-md`}>
      <p className="text-xs font-medium opacity-70 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold mt-1 font-serif">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
    </div>
  );
}

function SuccessToast({ message }: { message: string }) {
  return (
    <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3">
      <span className="text-lg">✓</span><span className="font-medium text-sm">{message}</span>
    </div>
  );
}

function ErrorToast({ message }: { message: string }) {
  return (
    <div className="fixed top-6 right-6 z-50 max-w-md bg-red-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-start gap-3">
      <span className="text-lg leading-tight">⛔</span><span className="font-medium text-sm">{message}</span>
    </div>
  );
}

const LIFECYCLE_STYLE: Record<Lifecycle, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  awaiting_vet: 'bg-sky-100 text-sky-700 border-sky-200',
  ready: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  training: 'bg-blue-100 text-blue-800 border-blue-200',
  locked: 'bg-red-100 text-red-700 border-red-300',
  rehab: 'bg-orange-100 text-orange-800 border-orange-200',
};

function LifecycleBadge({ horse }: { horse: Horse }) {
  const lc = getLifecycle(horse);
  const rejected = horse.approvalStatus === 'rejected';
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${rejected ? 'bg-red-100 text-red-700 border-red-200' : LIFECYCLE_STYLE[lc]}`}>{lc === 'locked' ? '🔒 ' : ''}{rejected ? 'Bị từ chối' : LIFECYCLE_LABEL[lc]}</span>;
}

function RecoveryBadge({ horse }: { horse: Horse }) {
  if (!horse.recoveryBadge) return null;
  return <span title={horse.recoveryBadge.note} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-teal-50 text-teal-700 border-teal-200">Đã hồi phục</span>;
}

function LifecycleStepper({ horse }: { horse: Horse }) {
  const lc = getLifecycle(horse);
  const steps: Lifecycle[] = ['pending', 'awaiting_vet', 'ready', 'training', 'locked', 'rehab'];
  const idx = LIFECYCLE_ORDER.indexOf(lc);
  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {steps.map((st, i) => {
        const cur = st === lc; const done = i < idx;
        return (
          <div key={st} className="flex items-center gap-1 flex-1 min-w-fit">
            <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border whitespace-nowrap ${cur ? (st === 'locked' ? 'bg-red-600 text-white border-red-600' : 'bg-[#c9973b] text-white border-[#c9973b]') : done ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-gray-400 border-gray-200'}`}>
              <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${cur ? 'bg-white/30' : done ? 'bg-emerald-500 text-white' : 'bg-gray-100'}`}>{done ? '✓' : i + 1}</span>{LIFECYCLE_LABEL[st]}
            </div>
            {i < steps.length - 1 && <span className="text-gray-300 text-xs">›</span>}
          </div>
        );
      })}
    </div>
  );
}

function PedigreeBlock({ horse }: { horse: Horse }) {
  if (!horse.sire && !horse.dam && !horse.medicalHistory) return null;
  return (
    <div className="grid grid-cols-3 gap-3 text-sm">
      {[['Cha (Sire)', horse.sire], ['Mẹ (Dam)', horse.dam]].map(([k, v]) => <div key={k as string} className="p-2.5 bg-gray-50 rounded-lg border border-gray-100"><div className="text-[11px] text-gray-400 uppercase">{k as string}</div><div className="font-medium">{(v as string) || '—'}</div></div>)}
      {horse.medicalHistory && <div className="col-span-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100"><div className="text-[11px] text-gray-400 uppercase">Tiền sử bệnh</div><div className="text-gray-700">{horse.medicalHistory}</div></div>}
    </div>
  );
}

function UserAvatarDropdown({ user, onLogout }: { user: AppUser; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="w-10 h-10 rounded-full bg-[#c9973b] flex items-center justify-center text-white text-sm font-bold hover:bg-[#b8852a] transition-all shadow-lg">{user.avatar}</button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="font-semibold text-[#0f1729] text-sm truncate">{user.name}</div>
              <div className="text-xs text-gray-500 truncate mt-0.5">{user.email}</div>
            </div>
            <button onClick={() => { setOpen(false); onLogout(); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-all text-left">→ Đăng xuất</button>
          </div>
        </>
      )}
    </div>
  );
}

// ── OTP Modal ─────────────────────────────────────────────────────────────────

function OTPModal({ email, code, onVerify, onClose }: { email: string; code: string; onVerify: () => void | Promise<void>; onClose: () => void }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const verify = async () => {
    if (busy) return;
    if (!/^\d{6}$/.test(input)) { setError('Nhập mã OTP gồm 6 chữ số.'); return; }
    setBusy(true); setError('');
    try { await auth.verify(email, input); await onVerify(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7 z-10">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#c9973b]/15 flex items-center justify-center text-3xl mx-auto mb-4">📧</div>
          <h3 className="font-serif font-bold text-xl text-[#0f1729]">Xác thực OTP</h3>
          <p className="text-gray-500 text-sm mt-1">Mã đã gửi đến <strong className="text-[#0f1729]">{email}</strong></p>
        </div>
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
          <div className="text-xs text-amber-600 font-medium mb-1">🔐 Mã xác thực trong email</div>
          <div className="font-mono text-2xl font-bold text-[#c9973b] tracking-[0.4em]"><button type="button" onClick={async () => { try { await auth.resend(email); setError('Đã gửi lại mã OTP.'); } catch (e) { setError((e as Error).message); } }}>Gửi lại mã</button></div>
        </div>
        <div className="space-y-4">
          <input value={input} onChange={e => setInput(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-2xl font-mono tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-[#c9973b]"
            onKeyDown={e => e.key === 'Enter' && verify()} />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button onClick={verify} className="w-full py-3 bg-[#c9973b] hover:bg-[#b8852a] text-white font-semibold rounded-xl transition-all">Xác nhận →</button>
        </div>
      </div>
    </div>
  );
}

function FirstPasswordChange({ user, onSave }: { user: AppUser; onSave: (password: string) => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    if (password.length < 8) return setError('Mật khẩu mới phải có ít nhất 8 ký tự.');
    if (password === user.password) return setError('Mật khẩu mới phải khác mật khẩu tạm thời.');
    if (password !== confirm) return setError('Mật khẩu xác nhận không khớp.');
    onSave(password);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1729] p-4">
      <Card className="w-full max-w-md p-7">
        <div className="mb-5"><h2 className="font-serif text-xl font-bold text-[#0f1729]">Đổi mật khẩu lần đầu</h2><p className="mt-1 text-sm text-gray-500">Tài khoản nhân viên của bạn đang dùng mật khẩu tạm thời do Quản trị viên cấp.</p></div>
        <div className="space-y-4">
          <Input label="Mật khẩu mới" type="password" required value={password} onChange={v => { setPassword(v); setError(''); }} hint="Tối thiểu 8 ký tự và khác mật khẩu tạm thời." />
          <Input label="Xác nhận mật khẩu mới" type="password" required value={confirm} onChange={v => { setConfirm(v); setError(''); }} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Btn variant="gold" className="w-full justify-center" onClick={submit}>Đổi mật khẩu & vào hệ thống</Btn>
        </div>
      </Card>
    </div>
  );
}

// ── Image Upload ──────────────────────────────────────────────────────────────

function ImageUpload({ value, onChange, onRemove }: { value: string; onChange: (url: string) => void; onRemove: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Ảnh phải nhỏ hơn 5MB'); return; }
    const reader = new FileReader();
    reader.onload = ev => onChange(ev.target?.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Ảnh ngựa</label>
      {value ? (
        <div className="relative rounded-xl overflow-hidden h-40">
          <img src={value} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center gap-3 opacity-0 hover:opacity-100 transition-opacity">
            <button onClick={() => fileRef.current?.click()} className="bg-white text-[#1a2844] px-3 py-1.5 rounded-lg text-sm font-medium">🔄 Đổi ảnh</button>
            <button onClick={onRemove} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium">🗑 Xóa</button>
          </div>
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded">Hover để thay đổi</div>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()} className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-[#c9973b] hover:bg-amber-50 transition-all">
          <span className="text-3xl">📸</span>
          <span className="text-sm text-gray-500">Nhấn để tải ảnh lên</span>
          <span className="text-xs text-gray-400">JPG, PNG — tối đa 5MB</span>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <div className="mt-2 flex gap-2 flex-wrap">
        {[
          { url: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=600&h=400&fit=crop', label: 'Bay' },
          { url: 'https://images.unsplash.com/photo-1534073928676-67ae3c1f5c03?w=600&h=400&fit=crop', label: 'Grey' },
          { url: 'https://images.unsplash.com/photo-1598974357801-cbca100e65d3?w=600&h=400&fit=crop', label: 'Chestnut' },
          { url: 'https://images.unsplash.com/photo-1566288623394-377af472d81b?w=600&h=400&fit=crop', label: 'Black' },
        ].map(opt => (
          <button key={opt.label} onClick={() => onChange(opt.url)} className={`text-xs px-3 py-1 rounded-full border transition-all ${value === opt.url ? 'bg-[#c9973b] text-white border-[#c9973b]' : 'border-gray-200 text-gray-500 hover:border-[#c9973b]'}`}>{opt.label}</button>
        ))}
      </div>
    </div>
  );
}

// ── Role helpers ──────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrator', manager: 'Club Manager', head_trainer: 'Trainer',
  veterinarian: 'Veterinarian', groom: 'Groom', owner: 'Horse Owner',
};

const DEMO_ACCOUNTS = [
  { email: 'admin@raceforce.vn', password: '123456', role: 'Administrator', icon: '🛡', color: 'bg-rose-700' },
  { email: 'manager@raceforce.vn', password: '123456', role: 'Club Manager', icon: '🏛', color: 'bg-[#1a2844]' },
  { email: 'trainer@raceforce.vn', password: '123456', role: 'Trainer', icon: '🏇', color: 'bg-blue-700' },
  { email: 'vet@raceforce.vn', password: '123456', role: 'Veterinarian', icon: '🩺', color: 'bg-emerald-700' },
  { email: 'groom@raceforce.vn', password: '123456', role: 'Groom', icon: '🧹', color: 'bg-amber-600' },
  { email: 'owner@raceforce.vn', password: '123456', role: 'Horse Owner', icon: '👤', color: 'bg-purple-700' },
  { email: 'owner2@raceforce.vn', password: '123456', role: 'Horse Owner (new)', icon: '👤', color: 'bg-purple-500' },
];

// ── Homepage ──────────────────────────────────────────────────────────────────

function HomePage({ navigate }: { navigate: (p: Page) => void }) {
  return (
    <div className="min-h-screen bg-[#0f1729] overflow-x-hidden">
      <nav className="flex items-center justify-between px-10 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#c9973b] flex items-center justify-center text-white text-lg">🐎</div>
          <div>
            <div className="text-white font-serif font-bold text-lg leading-none">RaceForce</div>
            <div className="text-[#c9973b] text-[10px] tracking-widest uppercase">Horse Racing Management</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('login')} className="px-5 py-2 text-sm text-gray-300 hover:text-white font-medium transition-colors">Sign in</button>
          <button onClick={() => navigate('register')} className="px-5 py-2 bg-[#c9973b] hover:bg-[#b8852a] text-white text-sm font-semibold rounded-lg transition-all">Register</button>
        </div>
      </nav>
      <div className="max-w-6xl mx-auto px-10 pt-20 pb-16 grid grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#c9973b]/20 border border-[#c9973b]/30 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c9973b] animate-pulse" />
            <span className="text-[#c9973b] text-xs font-medium tracking-wider uppercase">Racehorse management platform</span>
          </div>
          <h1 className="text-white font-serif text-5xl font-bold leading-tight mb-5">
            Professional racehorse<br /><span className="text-[#c9973b]">training club</span><br />management
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed mb-8">Health, AI training plans, daily care and race results — all in one system.</p>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('register')} className="px-7 py-3.5 bg-[#c9973b] hover:bg-[#b8852a] text-white font-semibold rounded-xl transition-all text-base shadow-lg shadow-[#c9973b]/20">Get started free →</button>
            <button onClick={() => navigate('login')} className="px-7 py-3.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl transition-all text-base border border-white/20">Sign in</button>
          </div>
        </div>
        <div className="relative">
          <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
            <img src="https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=700&h=500&fit=crop&auto=format" alt="Racehorse" className="w-full h-80 object-cover" />
          </div>
          <div className="absolute -bottom-4 -left-4 bg-white rounded-xl p-4 shadow-xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 text-lg">✓</div>
              <div><div className="font-semibold text-sm">Thunder King</div><div className="text-xs text-gray-500">Eligible to race</div></div>
            </div>
          </div>
          <div className="absolute -top-4 -right-4 bg-[#1a2844] rounded-xl p-4 shadow-xl">
            <div className="text-white text-xs font-medium opacity-60 mb-1">AI recommendation</div>
            <div className="text-[#c9973b] font-serif text-lg font-bold">Race preparation</div>
            <div className="text-white text-xs opacity-60">Prep · 88/100</div>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-10 pb-20">
        <div className="grid grid-cols-3 gap-6">
          {[
            { icon: '🤖', title: 'Smart training plans', desc: 'The system recommends a training plan based on health, age, weight and veterinarian findings.' },
            { icon: '🏥', title: 'Digital health examinations', desc: 'Veterinarians record vital signs and clinical findings that feed directly into training recommendations.' },
            { icon: '👥', title: 'Clear role-based workflows', desc: 'Club Manager, Trainer, Veterinarian, Groom and Horse Owner each have a dedicated workflow.' },
          ].map(f => (
            <div key={f.title} className="p-6 bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl transition-all">
              <div className="text-3xl mb-4">{f.icon}</div>
              <div className="text-white font-semibold mb-2">{f.title}</div>
              <div className="text-gray-400 text-sm leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10 py-6 px-10 flex items-center justify-between">
        <div className="text-white text-sm font-serif font-bold">RaceForce <span className="text-gray-600">© 2026</span></div>
        <div className="text-gray-600 text-sm">Racehorse training club management system</div>
      </div>
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────

function LoginPage({ navigate, users, onLogin }: { navigate: (p: Page) => void; users: AppUser[]; onLogin: (u: AppUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [forgot, setForgot] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setup, setSetup] = useState(() => passwordSetupLink(window.location.search));
  const submitSetup = useMemo(() => setup ? createPasswordSetupSubmitter(setup) : null, [setup]);
  const submitting = useRef(false);
  const di = 'w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b]';

  const handle = async () => {
    if (submitting.current) return;
    if (setup && password !== confirmPassword) { setError('Mật khẩu xác nhận không khớp.'); return; }
    if (!setup && !forgot && (!email.trim() || !password)) { setError('Please enter your email and password'); return; }
    submitting.current = true;
    setLoading(true); setError(''); setNotice('');
    try {
      if (forgot && !setup) {
        await requestPasswordReset(email);
        setNotice('Nếu email có tài khoản đã đặt mật khẩu, hệ thống đã gửi liên kết. Vui lòng kiểm tra hộp thư và thư rác. Tài khoản chưa kích hoạt cần dùng email mời của admin.');
        return;
      }
      if (setup && submitSetup) {
        await submitSetup(password);
        window.history.replaceState({}, '', '/');
        setSetup(null); setPassword(''); setConfirmPassword(''); setEmail('');
        setNotice('Đã đặt mật khẩu. Vui lòng đăng nhập bằng email của tài khoản và mật khẩu mới.');
        navigate('login');
        return;
      }
      onLogin(userFromApi(await auth.login(email.trim(), password)));
    }
    catch (e) { setError(setup ? passwordSetupError(e, setup.invitation) : (e as Error).message); }
    finally { submitting.current = false; setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0f1729] flex">
      <div className="flex-1 flex flex-col items-center justify-center px-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #c9973b 0%, transparent 60%)' }} />
        <div className="relative z-10 w-full max-w-sm">
          <button onClick={() => navigate('home')} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-8 transition-colors">← Home</button>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#c9973b] flex items-center justify-center text-xl">🐎</div>
            <div><div className="text-white font-serif font-bold text-xl">RaceForce</div><div className="text-[#c9973b] text-xs">Horse Racing Management</div></div>
          </div>
          <h2 className="text-white font-serif text-3xl font-bold mb-6">{setup ? (setup.invitation ? 'Activate staff account' : 'Đặt mật khẩu mới') : forgot ? 'Forgot password' : 'Sign in'}</h2>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label><input type="email" value={email} disabled={!!setup} onChange={e => setEmail(e.target.value)} placeholder={setup ? 'Tài khoản được xác định bằng liên kết email' : 'email@example.com'} className={di} /></div>
            {!forgot && (<div><label className="block text-sm font-medium text-gray-300 mb-1.5">{setup ? 'Mật khẩu mới' : 'Password'}</label><input type="password" value={password} disabled={loading} autoComplete={setup ? 'new-password' : 'current-password'} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={di} onKeyDown={e => e.key === 'Enter' && handle()} /></div>)}
            {setup && <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Nhập lại mật khẩu mới</label><input type="password" value={confirmPassword} disabled={loading} autoComplete="new-password" onChange={e => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu mới" className={di} onKeyDown={e => e.key === 'Enter' && handle()} /></div>}
            {error && <div className="p-3 bg-red-900/30 border border-red-700/40 rounded-lg text-red-400 text-sm">{error}</div>}
            {notice && <div className="p-3 bg-emerald-900/30 border border-emerald-700/40 rounded-lg text-emerald-300 text-sm" role="status">{notice}</div>}
            <button onClick={handle} disabled={loading} className="w-full py-3 bg-[#c9973b] hover:bg-[#b8852a] text-white font-semibold rounded-xl transition-all text-sm disabled:opacity-60">{setup ? (loading ? 'Đang đặt mật khẩu...' : 'Đặt mật khẩu') : forgot ? (loading ? 'Đang gửi...' : 'Gửi liên kết qua email') : (loading ? 'Signing in...' : 'Sign in →')}</button>
          </div>
          {!setup && <button disabled={loading} onClick={() => { setForgot(!forgot); setPassword(''); setConfirmPassword(''); setError(''); setNotice(''); }} className="mt-4 text-[#c9973b] hover:underline text-sm">{forgot ? 'Quay lại đăng nhập' : 'Forgot password?'}</button>}
          <p className="text-center text-gray-500 text-sm mt-5">No account yet? <button onClick={() => navigate('register')} className="text-[#c9973b] hover:underline font-medium">Register</button></p>
          <p className="mt-2 text-center text-xs text-gray-500">Staff accounts are issued by an administrator.</p>

          {/* Quick Login Demo */}
          <div className="mt-7 border-t border-white/10 pt-6">
            <p className="text-gray-500 text-xs text-center mb-3 uppercase tracking-wider font-medium">Quick sign-in (demo)</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map(acc => (
                <button key={acc.email} disabled={!!setup || forgot || loading} onClick={() => { setEmail(acc.email); setPassword(''); setError('Enter the password for this server account.'); }}
                  className="flex items-center gap-2 p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-left">
                  <span className={`w-7 h-7 rounded-lg ${acc.color} flex items-center justify-center text-white text-sm flex-shrink-0`}>{acc.icon}</span>
                  <div className="min-w-0"><div className="text-white text-xs font-medium truncate">{acc.role}</div></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="w-[42%] relative hidden lg:block">
        <img src="https://images.unsplash.com/photo-1598974357801-cbca100e65d3?w=800&h=1000&fit=crop&auto=format" alt="Horse" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f1729] to-transparent" />
        <div className="absolute bottom-12 left-8 right-8">
          <blockquote className="text-white font-serif text-xl font-bold leading-snug">"Every training session is a step<br />towards the next victory."</blockquote>
          <p className="text-[#c9973b] text-sm mt-2">RaceForce · Professional racing platform</p>
        </div>
      </div>
    </div>
  );
}

// ── Register ──────────────────────────────────────────────────────────────────

function RegisterPage({ navigate, onRegister }: { navigate: (p: Page) => void; onRegister: (u: AppUser) => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const otpCode = useRef('');
  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));
  const di = 'w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b]';

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) { setError("Please complete all required fields"); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
    if (form.password.length < 8) { setError('Password must contain at least 8 characters'); return; }
    try { await auth.register({ fullName: form.name.trim(), email: form.email.trim(), password: form.password, phone: form.phone.trim() }); setError(''); setShowOtp(true); } catch (e) { setError((e as Error).message); }
  };

  const handleVerified = async () => {
    onRegister(userFromApi(await auth.login(form.email.trim(), form.password)));
  };

  return (
    <>
      {showOtp && <OTPModal email={form.email} code={otpCode.current} onVerify={handleVerified} onClose={() => setShowOtp(false)} />}
      <div className="min-h-screen bg-[#0f1729] flex">
        <div className="flex-1 flex flex-col items-center justify-center px-10">
          <div className="w-full max-w-sm">
            <button onClick={() => navigate('home')} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-8 transition-colors">← Home</button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#c9973b] flex items-center justify-center text-xl">🐎</div>
              <div><div className="text-white font-serif font-bold text-xl">RaceForce</div><div className="text-[#c9973b] text-xs">Horse Racing Management</div></div>
            </div>
            <h2 className="text-white font-serif text-3xl font-bold mb-2">Create account</h2>
            <p className="text-gray-400 text-sm mb-6">Registration is for <b className="text-[#c9973b]">Horse Owners</b>. Staff accounts are issued by an administrator.</p>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Full name <span className="text-red-400">*</span></label><input value={form.name} onChange={e => set('name')(e.target.value)} placeholder="Full name" className={di} /></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Email <span className="text-red-400">*</span></label><input type="email" value={form.email} onChange={e => set('email')(e.target.value)} placeholder="you@example.com" className={di} /></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Phone number</label><input value={form.phone} onChange={e => set('phone')(e.target.value)} placeholder="0912 345 678" className={di} /></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Password <span className="text-red-400">*</span></label><input type="password" value={form.password} onChange={e => set('password')(e.target.value)} placeholder="At least 8 characters" className={di} /></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm password <span className="text-red-400">*</span></label><input type="password" value={form.confirm} onChange={e => set('confirm')(e.target.value)} placeholder="Enter again" className={di} onKeyDown={e => e.key === 'Enter' && handleSubmit()} /></div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={handleSubmit} className="w-full py-3 bg-[#c9973b] hover:bg-[#b8852a] text-white font-semibold rounded-xl transition-all text-sm">Send OTP code →</button>
            </div>
            <p className="text-center text-gray-500 text-sm mt-5">Already have an account? <button onClick={() => navigate('login')} className="text-[#c9973b] hover:underline font-medium">Sign in</button></p>
          </div>
        </div>
        <div className="w-[42%] relative hidden lg:block">
          <img src="https://images.unsplash.com/photo-1566288623394-377af472d81b?w=800&h=1000&fit=crop&auto=format" alt="Horse" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f1729] to-transparent" />
        </div>
      </div>
    </>
  );
}

// ── Onboarding ─────────────────────────────────────────────────────────────────

function OnboardingPage({ user, navigate, onLogout }: { user: AppUser; navigate: (p: Page) => void; onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-[#0f1729] flex flex-col items-center justify-center px-6 relative">
      <div className="absolute top-5 right-6 z-10"><UserAvatarDropdown user={user} onLogout={onLogout} /></div>
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-[#c9973b] flex items-center justify-center text-3xl mx-auto mb-5">🐎</div>
          <h2 className="text-white font-serif text-3xl font-bold mb-2">Welcome, {user.name.split(' ').pop()}!</h2>
          <p className="text-gray-400">Your account is verified. Join a training club to get started.</p>
        </div>
        <div className="max-w-md w-full">
          <button onClick={() => navigate('join-center')} className="w-full p-8 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-[#c9973b]/50 rounded-2xl text-left transition-all">
            <div className="w-14 h-14 rounded-xl bg-emerald-900/40 border border-emerald-700/30 flex items-center justify-center text-2xl mb-5">🤝</div>
            <h3 className="text-white font-serif text-xl font-bold mb-2">Join a training club</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">Find a club and send a membership request. The Club Manager will review your request and assign your role.</p>
            <div className="text-emerald-400 text-sm font-semibold">Find a club →</div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Join Center ───────────────────────────────────────────────────────────────

function JoinCenterPage({ user, clubs, navigate, onJoinRequest, onLogout }:
  { user: AppUser; clubs: Club[]; navigate: (p: Page) => void; onJoinRequest: (clubId: string) => void; onLogout: () => void }) {
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const filtered = clubs.filter(c => c.managerId !== user.id && c.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="min-h-screen bg-[#0f1729] px-6 py-10 relative">
      <div className="absolute top-5 right-6 z-10"><UserAvatarDropdown user={user} onLogout={onLogout} /></div>
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate('onboarding')} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-8">← Back</button>
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-800/50 border border-emerald-700/30 flex items-center justify-center text-3xl mx-auto mb-4">🤝</div>
          <h2 className="text-white font-serif text-3xl font-bold mb-2">Join a club</h2>
          <p className="text-gray-400 text-sm">Send a request and wait for the Club Manager to assign your role</p>
        </div>
        <div className="relative mb-6"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clubs by name..." className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b]" /><span className="absolute left-3.5 top-3.5 text-gray-400">🔍</span></div>
        <div className="space-y-4">
          {filtered.map(club => {
            const sent = requested.has(club.id);
            return (
              <div key={club.id} className="bg-white/5 border border-white/15 rounded-xl p-5 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#1a2844] border border-white/10 flex items-center justify-center text-white font-serif font-bold text-lg">{club.logoLetter}</div>
                <div className="flex-1"><div className="text-white font-semibold">{club.name}</div><div className="text-gray-400 text-xs mt-0.5">📍 {club.location} · 👥 {club.memberCount} members · {club.founded}</div><div className="text-gray-500 text-xs mt-1">{club.description}</div></div>
                <button onClick={() => { if (!sent) { setRequested(p => new Set([...p, club.id])); onJoinRequest(club.id); } }}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${sent ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/30 cursor-default' : 'bg-[#c9973b] hover:bg-[#b8852a] text-white'}`}>
                  {sent ? "✓ Sent" : "Send request"}
                </button>
              </div>
            );
          })}
        </div>
        {requested.size > 0 && (
          <div className="mt-8 p-5 bg-emerald-900/30 border border-emerald-700/30 rounded-xl text-center">
            <div className="text-emerald-400 font-semibold mb-1">✓ Request sent!</div>
            <div className="text-emerald-600 text-sm">The Club Manager will review your request and assign your role.</div>
            <button onClick={() => navigate('pending')} className="mt-4 px-5 py-2 bg-emerald-700/40 hover:bg-emerald-700/60 text-emerald-300 text-sm rounded-lg transition-all">View status →</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pending ───────────────────────────────────────────────────────────────────

function PendingPage({ user, clubs, navigate, memberRequests, onLogout }:
  { user: AppUser; clubs: Club[]; navigate: (p: Page) => void; memberRequests: MemberRequest[]; onLogout: () => void }) {
  const myReqs = memberRequests.filter(r => r.userId === user.id);
  return (
    <div className="min-h-screen bg-[#0f1729] flex flex-col items-center justify-center px-6 relative">
      <div className="absolute top-5 right-6 z-10"><UserAvatarDropdown user={user} onLogout={onLogout} /></div>
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-2xl bg-amber-900/30 border border-amber-700/30 flex items-center justify-center text-4xl mx-auto mb-6">⏳</div>
        <h2 className="text-white font-serif text-2xl font-bold mb-2">Awaiting approval</h2>
        <p className="text-gray-400 text-sm mb-8">Your membership request is being reviewed by the Club Manager.</p>
        <div className="space-y-3 mb-8">
          {myReqs.map(r => {
            const club = clubs.find(c => c.id === r.clubId);
            return (
              <div key={r.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-lg bg-[#1a2844] flex items-center justify-center text-white font-bold">{club?.logoLetter || '?'}</div>
                <div className="flex-1"><div className="text-white text-sm font-medium">{club?.name}</div><div className="text-gray-500 text-xs">{r.requestedAt} · Expired {r.expiresAt}</div></div>
                <Badge status={r.status} />
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('join-center')} className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white text-sm rounded-lg transition-all">Find another club</button>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar / Layout ──────────────────────────────────────────────────────────

const NAV_ITEMS: Partial<Record<Role, { icon: string; label: string; page: Page; badge?: string }[]>> = {
  admin: [
    { icon: '⊞', label: 'Tổng quan', page: 'dashboard' },
    { icon: '👤', label: 'Quản lý tài khoản', page: 'accounts' },
    { icon: '🛡', label: 'Phân quyền', page: 'permissions' },
    { icon: '📜', label: 'Nhật ký thay đổi', page: 'audit-log' },
    { icon: '🔔', label: 'Thông báo', page: 'notifications' },
  ],
  manager: [
    { icon: '⊞', label: 'Dashboard', page: 'dashboard' },
    { icon: '🐎', label: 'Ngựa trong trung tâm', page: 'horse-list' },
    { icon: '📋', label: 'Tiếp nhận ngựa', page: 'center-requests', badge: 'horseReqs' },
    { icon: '🏷', label: 'Danh mục gói', page: 'package-catalog' },
    { icon: '🧑‍🏫', label: 'Trainer assignments', page: 'trainer-assign' },
    { icon: '🩹', label: 'Gói phục hồi', page: 'rehab-center', badge: 'rehabReqs' },
    { icon: '👥', label: 'Nhân sự', page: 'staff' },
    { icon: '🏆', label: 'Kết quả đua', page: 'race-results' },
    { icon: '📊', label: 'Báo cáo', page: 'reports' },
    { icon: '🔔', label: 'Thông báo', page: 'notifications' },
  ],
  head_trainer: [
    { icon: '⊞', label: 'Dashboard', page: 'dashboard' },
    { icon: '🐎', label: 'Ngựa', page: 'horse-list' },
    { icon: '📋', label: 'Huấn luyện & Lộ trình', page: 'training-hub' },
    { icon: '📈', label: 'Hiệu suất', page: 'performance' },
    { icon: '🔔', label: 'Thông báo', page: 'notifications' },
  ],
  veterinarian: [
    { icon: '⊞', label: 'Dashboard', page: 'dashboard' },
    { icon: '🐎', label: 'Ngựa', page: 'horse-list' },
    { icon: '🧑‍⚕️', label: 'Ngựa được giao khám', page: 'vet-assign' },
    { icon: '🏥', label: 'Lịch sử khám', page: 'health-records' },
    { icon: '📝', label: 'Khám sức khỏe', page: 'vet-health-form' },
    { icon: '🩺', label: 'Khám sau tập & Khóa', page: 'post-exam', badge: 'vetTodo' },
    { icon: '🔔', label: 'Thông báo', page: 'notifications' },
  ],
  groom: [
    { icon: '⊞', label: 'Dashboard', page: 'dashboard' },
    { icon: '🌿', label: 'Chăm sóc & Cho ăn', page: 'care-hub' },
    { icon: '📦', label: 'Kho của tôi', page: 'inventory' },
    { icon: '📜', label: 'Lịch sử kho', page: 'inventory-log' },
    { icon: '🔔', label: 'Thông báo', page: 'notifications' },
  ],
  owner: [
    { icon: '⊞', label: 'Dashboard', page: 'dashboard' },
    { icon: '🐎', label: 'Ngựa của tôi', page: 'my-horses' },
    { icon: '➕', label: 'Đăng ký ngựa mới', page: 'horse-create' },
    { icon: '🎯', label: 'Đăng ký huấn luyện', page: 'training-register' },
    { icon: '📈', label: 'Hiệu suất', page: 'performance' },
    { icon: '🏆', label: 'Kết quả đua', page: 'race-results' },
    { icon: '🔔', label: 'Thông báo', page: 'notifications' },
  ],
};

const DEFAULT_ROLE_PERMS: Record<string, string[]> = Object.fromEntries(
  (['manager', 'head_trainer', 'veterinarian', 'groom', 'owner'] as Role[]).map(r => [r, (NAV_ITEMS[r] || []).map(i => i.page as string).filter(pg => FEATURES.some(f => f.page === pg))]),
);

const GRANTABLE_PAGES: { page: Page; label: string; icon: string }[] = [
  { page: 'horse-list', label: 'Danh sách ngựa', icon: '🐎' },
  { page: 'health-records', label: 'Lịch sử khám', icon: '🏥' },
  { page: 'vet-health-form', label: 'Khám sức khỏe', icon: '📝' },
  { page: 'training-hub', label: 'Huấn luyện & Lộ trình', icon: '🏇' },
  { page: 'care-hub', label: 'Chăm sóc & Cho ăn', icon: '🌿' },
  { page: 'performance', label: 'Hiệu suất', icon: '📈' },
  { page: 'race-results', label: 'Kết quả đua', icon: '🏆' },
  { page: 'reports', label: 'Báo cáo', icon: '📊' },
  { page: 'center-requests', label: 'Duyệt đăng ký ngựa', icon: '📋' },
  { page: 'staff', label: 'Nhân sự', icon: '👥' },
];

function visibleNotifications(all: AppNotification[], user: AppUser): AppNotification[] {
  return all.filter(n => {
    if (n.clubId && n.clubId !== user.clubId) return false;
    if (user.role === 'groom' && ['training', 'lock', 'race', 'plan', 'session'].includes(n.type)) return false;
    if (!n.toRoles && !n.toUserIds) return true;
    return !!(n.toUserIds?.includes(user.id) || (user.role && n.toRoles?.includes(user.role)));
  });
}

function Sidebar({ user, page, navigate, memberReqCount, horseReqCount, vetTodoCount, rehabCount, grantedPages, rolePerms }:
  { user: AppUser; page: Page; navigate: (p: Page) => void; memberReqCount: number; horseReqCount: number; vetTodoCount: number; rehabCount: number; grantedPages: Page[]; rolePerms: Record<string, string[]> }) {
  const isFeature = (pg: string) => FEATURES.some(f => f.page === pg);
  const permitted = (pg: string) => user.role === 'admin' || !isFeature(pg) || (rolePerms[user.role!] || []).includes(pg);
  const matrixExtra = (rolePerms[user.role!] || []).filter(pg => !(NAV_ITEMS[user.role!] || []).some(i => i.page === pg)).map(pg => FEATURES.find(f => f.page === pg)!).filter(Boolean).map(f => ({ icon: f.icon, label: f.label, page: f.page as Page }));
  const roleItems = [...(NAV_ITEMS[user.role!] || []).filter(i => permitted(i.page)), ...matrixExtra];
  const rolePages = new Set(roleItems.map(i => i.page));
  const extraItems = GRANTABLE_PAGES
    .filter(g => grantedPages.includes(g.page) && !rolePages.has(g.page))
    .map(g => ({ icon: g.icon, label: g.label, page: g.page }));
  const items = [...roleItems, ...extraItems];
  return (
    <div className="w-60 min-h-screen bg-[#0f1729] flex flex-col flex-shrink-0">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#c9973b] flex items-center justify-center text-white text-lg">🐎</div>
          <div><div className="text-white font-serif font-bold text-base leading-tight">RaceForce</div><div className="text-[#c9973b] text-xs">Horse Racing Management</div></div>
        </div>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {items.map(item => {
          const badge = 'badge' in item ? (item as { badge?: string }).badge : undefined;
          const bc = badge === 'memberReqs' ? memberReqCount : badge === 'horseReqs' ? horseReqCount : badge === 'vetTodo' ? vetTodoCount : badge === 'rehabReqs' ? rehabCount : 0;
          const active = page === item.page;
          return (
            <button key={item.page} onClick={() => navigate(item.page)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${active ? 'bg-[#c9973b] text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}>
              <span className="text-base">{item.icon}</span><span className="flex-1">{item.label}</span>
              {bc > 0 && <span className="w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{bc}</span>}
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/10">
        <button onClick={() => navigate('profile')} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-all">
          <div className="w-8 h-8 rounded-full bg-[#c9973b] flex items-center justify-center text-white text-xs font-bold">{user.avatar}</div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-white text-sm font-medium truncate">{user.name}</div>
            <div className="text-gray-400 text-xs">{ROLE_LABELS[user.role!]}</div>
          </div>
        </button>
      </div>
    </div>
  );
}

function AppLayout({ user, page, title, navigate, children, state }:
  { user: AppUser; page: Page; title: string; navigate: (p: Page) => void; children: React.ReactNode; state: AppState }) {
  const unread = visibleNotifications(state.notifications, user).filter(n => !n.read).length;
  const myClub = state.clubs.find(c => c.managerId === user.id);
  const pendingMembers = myClub ? state.memberRequests.filter(r => r.clubId === myClub.id && r.status === 'pending').length : 0;
  const pendingHorses = myClub ? state.horseClubRequests.filter(r => r.clubId === myClub.id && r.status === 'pending').length : 0;
  const grantedPages = state.userPermissions[user.id] || [];
  const clubHorses = state.horses.filter(h => h.clubId === user.clubId);
  const rehabCount = myClub ? clubHorses.filter(h => h.lock && !h.rehab).length : 0;
  const vetTodoCount = user.role === 'veterinarian'
    ? clubHorses.filter(h => ['awaiting_vet', 'locked', 'rehab'].includes(getLifecycle(h))).length
      + state.trainingSessions.filter(s => s.status === 'Completed' && !s.postExamDone && clubHorses.some(h => h.id === s.horseId)).length
    : 0;
  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f2f7]">
      <Sidebar user={user} page={page} navigate={navigate} memberReqCount={pendingMembers} horseReqCount={pendingHorses} vetTodoCount={vetTodoCount} rehabCount={rehabCount} grantedPages={grantedPages} rolePerms={state.rolePerms} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0">
          <div className="flex-1"><h1 className="text-base font-semibold text-[#0f1729]">{title}</h1></div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('notifications')} className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
              🔔{unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{unread}</span>}
            </button>
            <button onClick={() => navigate('profile')} className="w-8 h-8 rounded-full bg-[#1a2844] flex items-center justify-center text-white text-xs font-bold">{user.avatar}</button>
          </div>
        </div>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

// ── Dashboards ────────────────────────────────────────────────────────────────

function ManagerDashboard({ state, navigate }: { state: AppState; navigate: (p: Page) => void }) {
  const myClub = state.clubs.find(c => c.managerId === state.user!.id);
  const horses = state.horses.filter(h => h.clubId === myClub?.id);
  const pendingHorses = myClub ? state.horseClubRequests.filter(r => r.clubId === myClub.id && r.status === 'pending') : [];
  const unassigned = state.enrollments.filter(e => e.status === 'active' && e.trainerStatus === 'unassigned' && horses.some(h => h.id === e.horseId));
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-serif font-bold text-[#0f1729]">{myClub?.name || 'Club'} — Overview</h2></div>
      {unassigned.length > 0 && <Card className="p-4 border-l-4 border-amber-400 bg-amber-50" onClick={() => navigate('trainer-assign')}><div className="flex items-center gap-3"><span className="text-xl">!</span><div className="flex-1"><div className="font-semibold text-amber-800">{unassigned.length} horse{unassigned.length === 1 ? '' : 's'} awaiting trainer assignment</div><div className="text-sm text-amber-600">{unassigned.map(e => horses.find(h => h.id === e.horseId)?.name).filter(Boolean).join(', ')}</div></div><span className="text-amber-600 text-sm font-medium">Assign →</span></div></Card>}
      {pendingHorses.length > 0 && <Card className="p-4 border-l-4 border-sky-400 bg-sky-50" onClick={() => navigate('center-requests')}><div className="flex items-center gap-3"><span className="text-xl">🐎</span><div className="flex-1"><div className="font-semibold text-sky-800">{pendingHorses.length} horse intake case{pendingHorses.length === 1 ? '' : 's'} pending</div><div className="text-sm text-sky-600">Automatically closes after 7 days</div></div><span className="text-sky-600 text-sm font-medium">Review →</span></div></Card>}
      {horses.filter(h => h.lock && !h.rehab).map(h => <Card key={h.id} className="p-4 border-l-4 border-red-500 bg-red-50" onClick={() => navigate('rehab-center')}><div className="flex items-center gap-3"><span className="text-xl">🔒</span><div className="flex-1"><div className="font-semibold text-red-800">{h.name} has a training lock — activate a rehabilitation package</div><div className="text-sm text-red-600">Diagnosis: {h.lock!.reason}</div></div><span className="text-red-600 text-sm font-medium">Choose package →</span></div></Card>)}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Horses in the club" value={horses.length} color="navy" />
        <StatCard label="Eligible" value={horses.filter(h => h.healthStatus === 'Eligible').length} color="green" />
        <StatCard label="Injured" value={horses.filter(h => h.healthStatus === 'Injured').length} color="red" />
        <StatCard label="Members" value={myClub?.memberCount || 0} color="navy" />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Horses in the club</h3><Btn variant="ghost" onClick={() => navigate('horse-list')}>View all →</Btn></div>
          {horses.map(h => (
            <div key={h.id} onClick={() => navigate('horse-detail')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-[#c9973b] transition-all mb-1">
              <img src={h.imageUrl || undefined} alt={h.name} className="w-10 h-10 rounded-lg object-cover bg-gray-200" />
              <div className="flex-1"><div className="font-medium text-sm">{h.name}</div><div className="text-xs text-gray-500">{h.breed} · {h.age}t</div></div>
              <LifecycleBadge horse={h} />
            </div>
          ))}
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Performance — Thunder King</h3>
          <ResponsiveContainer width="100%" height={200}><LineChart data={state.trainingSessions.filter(s => s.result).map(s => ({ month: s.date, speed: Number(s.result?.speed) }))}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="speed" stroke="#c9973b" strokeWidth={2} dot={false} name="Speed km/h" /><Line type="monotone" dataKey="fitness" stroke="#1a4a3a" strokeWidth={2} dot={false} name="Fitness %" /></LineChart></ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function HeadTrainerDashboard({ state, navigate }: { state: AppState; navigate: (p: Page) => void }) {
  const horses = state.horses.filter(h => h.clubId === state.user!.clubId);
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-serif font-bold text-[#0f1729]">Tổng quan huấn luyện</h2></div>
      {horses.filter(h => h.lock).map(h => <Card key={h.id} className="p-4 border-l-4 border-red-500 bg-red-50" onClick={() => navigate('training-hub')}><div className="flex items-center gap-3"><span className="text-xl">🔒</span><div className="flex-1"><div className="font-semibold text-red-800">{h.name} — KHÓA HUẤN LUYỆN</div><div className="text-sm text-red-600">{h.lock!.reason} · Gói tạm dừng, các buổi nặng đã đánh dấu "Không thực hiện"</div></div><span className="text-red-600 text-sm font-medium">Xem →</span></div></Card>)}
      {state.enrollments.filter(e => e.trainerId === state.user!.id && e.trainerStatus === 'pending').map(e => <Card key={e.id} className="p-4 border-l-4 border-sky-400 bg-sky-50" onClick={() => navigate('training-hub')}><div className="text-sm font-semibold text-sky-900">Có phân công mới cho ngựa "{state.horses.find(h => h.id === e.horseId)?.name}" — chờ bạn xác nhận</div></Card>)}
      {state.enrollments.filter(e => e.trainerId === state.user!.id && e.trainerStatus === 'confirmed' && e.status === 'active' && !e.scheduleConfirmed).map(e => <Card key={e.id} className="p-4 border-l-4 border-amber-400 bg-amber-50" onClick={() => navigate('training-hub')}><div className="flex items-center gap-3"><span className="text-xl">📅</span><div className="flex-1"><div className="font-semibold text-amber-800">{horses.find(h => h.id === e.horseId)?.name} — cần lập / xác nhận lịch tập</div><div className="text-sm text-amber-600">Gói {e.packageName} · còn {e.sessionsTotal - e.sessionsDone} buổi</div></div><span className="text-amber-600 text-sm font-medium">Mở →</span></div></Card>)}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Ngựa đang huấn luyện" value={horses.filter(h => h.trainingStatus === 'Active').length} color="navy" />
        <StatCard label="Giáo án đang chạy" value={state.trainingPlans.filter(p => p.status === 'Active').length} color="gold" />
        <StatCard label="Buổi tập tuần này" value={state.trainingSessions.filter(s => s.status === 'Scheduled').length} color="green" />
        <StatCard label="Tốc độ TB" value="58.6 km/h" color="navy" />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex justify-between items-center mb-4"><h3 className="font-semibold">Ngựa đang quản lý</h3><Btn variant="gold" onClick={() => navigate('training-hub')}>Mở Huấn luyện →</Btn></div>
          {horses.map(h => (
            <div key={h.id} onClick={() => navigate('horse-detail')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-[#c9973b] transition-all mb-1">
              <img src={h.imageUrl || undefined} className="w-10 h-10 rounded-lg object-cover" />
              <div className="flex-1"><div className="font-medium text-sm">{h.name}</div><div className="text-xs text-gray-500">Sức khỏe: {h.healthStatus}</div></div>
              <LifecycleBadge horse={h} />
            </div>
          ))}
        </Card>
        <Card className="p-5">
          <div className="flex justify-between items-center mb-4"><h3 className="font-semibold">Buổi tập gần đây</h3><Btn variant="ghost" onClick={() => navigate('training-hub')}>Xem tất →</Btn></div>
          {state.trainingSessions.slice(0, 3).map(s => (
            <div key={s.id} onClick={() => navigate('training-hub')} className="p-3 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer hover:border-[#c9973b] transition-all mb-2">
              <div className="flex items-center justify-between"><span className="font-medium text-sm">{s.type} — {s.distance}</span><Badge status={s.status} /></div>
              <div className="text-xs text-gray-500 mt-0.5">{s.date} · {s.time}</div>
              {s.result && <div className="text-xs text-emerald-600 mt-0.5">✓ {s.result.time} · {s.result.speed} km/h · Score {s.result.performanceScore}</div>}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function VetDashboard({ state, navigate }: { state: AppState; navigate: (p: Page) => void }) {
  const horses = state.horses.filter(h => h.clubId === state.user!.clubId);
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-serif font-bold text-[#0f1729]">Bảng điều khiển — Thú y</h2></div>
      {(() => {
        const awaiting = horses.filter(h => getLifecycle(h) === 'awaiting_vet' && h.approvalStatus === 'approved');
        const postPending = state.trainingSessions.filter(s => s.status === 'Completed' && !s.postExamDone && horses.some(h => h.id === s.horseId));
        const locked = horses.filter(h => h.lock);
        return <>
          {awaiting.length > 0 && <Card className="p-4 border-l-4 border-sky-400 bg-sky-50" onClick={() => navigate('post-exam')}><div className="flex items-center gap-3"><span className="text-xl">🩺</span><div className="flex-1"><div className="font-semibold text-sky-800">{awaiting.length} ngựa mới được duyệt cần khám trước huấn luyện</div><div className="text-sm text-sky-600">{awaiting.map(h => h.name).join(', ')}</div></div><span className="text-sky-600 text-sm font-medium">Xem →</span></div></Card>}
          {postPending.length > 0 && <Card className="p-4 border-l-4 border-amber-400 bg-amber-50" onClick={() => navigate('post-exam')}><div className="flex items-center gap-3"><span className="text-xl">🏇</span><div className="flex-1"><div className="font-semibold text-amber-800">{postPending.length} buổi tập chờ khám sau tập</div></div><span className="text-amber-600 text-sm font-medium">Khám →</span></div></Card>}
          {locked.length > 0 && <Card className="p-4 border-l-4 border-red-500 bg-red-50" onClick={() => navigate('post-exam')}><div className="flex items-center gap-3"><span className="text-xl">🔒</span><div className="flex-1"><div className="font-semibold text-red-800">{locked.length} ngựa đang bị khóa huấn luyện</div><div className="text-sm text-red-600">Chỉ Thú y mới có quyền gỡ khóa</div></div><span className="text-red-600 text-sm font-medium">Quản lý →</span></div></Card>}
        </>;
      })()}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Ngựa phụ trách" value={horses.length} color="navy" />
        <StatCard label="Đủ điều kiện" value={horses.filter(h => h.healthStatus === 'Eligible').length} color="green" />
        <StatCard label="Theo dõi" value={horses.filter(h => h.healthStatus === 'Monitor').length} color="gold" />
        <StatCard label="Chấn thương" value={horses.filter(h => h.healthStatus === 'Injured').length} color="red" />
      </div>
      <div className="grid grid-cols-2 gap-5">
        <Card className="p-5">
          <div className="flex justify-between items-center mb-4"><h3 className="font-semibold">Tình trạng sức khỏe</h3><Btn variant="gold" onClick={() => navigate('vet-health-form')}>+ Nhập khám</Btn></div>
          {horses.map(h => (
            <div key={h.id} onClick={() => navigate('vet-health-form')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-[#c9973b] transition-all mb-2">
              <img src={h.imageUrl || undefined} className="w-10 h-10 rounded-lg object-cover" />
              <div className="flex-1"><div className="font-medium text-sm">{h.name}</div><div className="text-xs text-gray-500">{h.vetClearance ? '✓ Đã xác nhận HLV' : '✗ Chưa xác nhận'}</div></div>
              <Badge status={h.healthStatus} />
            </div>
          ))}
        </Card>
        <Card className="p-5">
          <div className="flex justify-between items-center mb-4"><h3 className="font-semibold">Hồ sơ khám gần nhất</h3><Btn variant="ghost" onClick={() => navigate('health-records')}>Xem tất →</Btn></div>
          {sortHealthRecords(state.healthRecords.filter(r => horses.some(h => h.id === r.horseId))).slice(0, 3).map(r => (
            <div key={r.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 mb-2">
              <div className="flex items-center justify-between"><span className="font-medium text-sm">{r.type}</span><Badge status={r.result} /></div>
              <div className="text-xs text-gray-500 mt-0.5">{r.date} · {state.horses.find(h => h.id === r.horseId)?.name}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function GroomDashboard({ state, navigate }: { state: AppState; navigate: (p: Page) => void }) {
  const clubId = state.user!.clubId;
  const horses = state.horses.filter(h => h.clubId === clubId && h.approvalStatus === 'approved');
  const done = state.careRecords.filter(r => r.clubId === clubId && r.date === TODAY).length;
  const total = horses.reduce((n, h) => n + dailyTasks(h).length, 0);
  const low = state.inventory.filter(i => i.clubId === clubId && isLow(i));
  const treating = horses.filter(needsTreatment);
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-serif font-bold text-[#0f1729]">Bảng điều khiển — Nhân viên chăm sóc</h2><p className="text-sm text-gray-500">Hôm nay {TODAY}</p></div>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Ngựa phụ trách" value={horses.length} color="navy" />
        <StatCard label="Việc đã xong" value={`${done}/${total}`} color="green" />
        <StatCard label="Đang trị thương" value={treating.length} color="red" />
        <StatCard label="Vật tư sắp hết" value={low.length} color="gold" />
      </div>
      {low.length > 0 && <Card className="p-4 border-l-4 border-amber-400 bg-amber-50" onClick={() => navigate('inventory')}><div className="text-sm text-amber-800">📦 <strong>Sắp hết:</strong> {low.map(i => `${i.name} (${fmtQty(i.qty)} ${i.unit})`).join(', ')}</div></Card>}
      {treating.map(h => <Card key={h.id} className="p-4 border-l-4 border-red-400" onClick={() => navigate('care-hub')}><div className="flex items-center gap-3"><span className="text-xl">🩹</span><div className="flex-1"><div className="font-semibold">{h.name} — cần chăm sóc trị thương</div><div className="text-sm text-gray-500">{h.stable}, Ô {h.stall}{h.rehab ? ` · Phục hồi: ${h.rehab.name}` : ''}</div></div><span className="text-sm text-[#c9973b] font-medium">Xem hướng dẫn →</span></div></Card>)}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5" onClick={() => navigate('care-hub')}><div className="text-2xl mb-1">🌿</div><div className="font-semibold">Chăm sóc & Cho ăn</div><div className="text-sm text-gray-500">Sơ đồ chuồng, khẩu phần, công việc, báo sự cố</div></Card>
        <Card className="p-5" onClick={() => navigate('inventory')}><div className="text-2xl mb-1">📦</div><div className="font-semibold">Kho của tôi</div><div className="text-sm text-gray-500">Nhập, kiểm kê, theo dõi tồn kho</div></Card>
      </div>
    </div>
  );
}

function OwnerDashboard({ state, navigate }: { state: AppState; navigate: (p: Page) => void }) {
  const myHorses = state.horses.filter(h => h.ownerId === state.user!.id && h.clubId === state.user!.clubId);
  const totalWins = myHorses.reduce((s, h) => s + h.wins, 0);
  const totalRaces = myHorses.reduce((s, h) => s + h.totalRaces, 0);
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-serif font-bold text-[#0f1729]">Tổng quan — Chủ ngựa</h2></div>
      {myHorses.filter(h => getLifecycle(h) === 'ready' && !state.enrollments.some(e => e.horseId === h.id && e.status !== 'completed')).length > 0 && <Card className="p-4 border-l-4 border-emerald-500 bg-emerald-50" onClick={() => navigate('training-register')}><div className="flex items-center gap-3"><span className="text-xl">🎯</span><div className="flex-1"><div className="font-semibold text-emerald-800">Có ngựa sẵn sàng huấn luyện</div><div className="text-sm text-emerald-600">Chọn một gói huấn luyện để bắt đầu</div></div><span className="text-emerald-600 text-sm font-medium">Đăng ký →</span></div></Card>}
      {myHorses.filter(h => h.lock).map(h => <Card key={h.id} className="p-4 border-l-4 border-red-500 bg-red-50"><div className="flex items-center gap-3"><span className="text-xl">🔒</span><div className="flex-1"><div className="font-semibold text-red-800">{h.name} — gói huấn luyện đang tạm dừng</div><div className="text-sm text-red-600">Tình trạng: {h.lock!.reason}{h.rehab ? ` · Đang phục hồi: ${h.rehab.name}` : ''}</div></div></div></Card>)}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Ngựa trong trung tâm" value={myHorses.length} color="navy" />
        <StatCard label="Số lần thắng" value={totalWins} sub={`/${totalRaces} lần đua`} color="gold" />
        <StatCard label="Tỷ lệ thắng" value={totalRaces > 0 ? `${Math.round(totalWins / totalRaces * 100)}%` : '—'} color="green" />
        <StatCard label="Ngựa đủ điều kiện" value={myHorses.filter(h => h.healthStatus === 'Eligible').length} color="navy" />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Ngựa của tôi</h3><Btn variant="ghost" onClick={() => navigate('my-horses')}>Xem tất cả →</Btn></div>
          {myHorses.length === 0 ? (
            <div className="text-center py-8 text-gray-400"><div className="text-4xl mb-3">🐎</div><div className="text-sm mb-3">Chưa có ngựa nào trong trung tâm</div><Btn variant="gold" onClick={() => navigate('horse-create')}>Đăng ký ngựa mới</Btn></div>
          ) : myHorses.map(h => (
            <div key={h.id} onClick={() => navigate('horse-detail')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-[#c9973b] transition-all mb-2">
              <img src={h.imageUrl || undefined} className="w-12 h-12 rounded-lg object-cover" />
              <div className="flex-1"><div className="font-medium text-sm">{h.name}</div><div className="text-xs text-gray-500">{h.wins}T / {h.totalRaces}R</div></div>
              <LifecycleBadge horse={h} />
            </div>
          ))}
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Kết quả đua gần đây</h3></div>
          {myHorses.flatMap(h => h.raceHistory.slice(0, 2)).slice(0, 4).map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 mb-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${r.position === 1 ? 'bg-[#c9973b] text-white' : r.position <= 3 ? 'bg-gray-400 text-white' : 'bg-gray-200 text-gray-600'}`}>#{r.position}</div>
              <div className="flex-1"><div className="font-medium text-sm">{r.raceName}</div><div className="text-xs text-gray-500">{r.date} · {r.distance}</div></div>
              {r.prize !== '0 VND' && <div className="text-xs font-medium text-emerald-600">{r.prize}</div>}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ── Horse List ────────────────────────────────────────────────────────────────

function HorseListPage({ navigate, horses, role, clubId, onSelectHorse }:
  { navigate: (p: Page) => void; horses: Horse[]; role: Role; clubId: string | null; onSelectHorse: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Tất cả');
  const [gender, setGender] = useState('Tất cả');
  const [pageNo, setPageNo] = useState(1);
  const PER = 6;
  const q = search.trim().toLowerCase();
  const list = (clubId ? horses.filter(h => h.clubId === clubId) : horses).filter(h => {
    const ms = !q || h.name.toLowerCase().includes(q) || h.id.toLowerCase().includes(q) || (h.microchip || '').toLowerCase().includes(q);
    const mf = filter === 'Tất cả' || h.healthStatus === filter || h.trainingStatus === filter;
    const mg = gender === 'Tất cả' || (GENDER_LABEL[h.gender] || h.gender) === gender;
    return ms && mf && mg;
  });
  const pages = Math.max(1, Math.ceil(list.length / PER));
  const cur = Math.min(pageNo, pages);
  const rows = list.slice((cur - 1) * PER, cur * PER);
  const chip = (active: boolean) => `px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${active ? 'bg-[#1a2844] text-white border-[#1a2844]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#c9973b]'}`;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-serif font-bold text-[#0f1729]">Ngựa trong trung tâm</h2><p className="text-sm text-gray-500">{list.length} ngựa</p></div>
      </div>
      <div className="space-y-2">
        <div className="relative max-w-sm"><input value={search} onChange={e => { setSearch(e.target.value); setPageNo(1); }} placeholder="Tìm theo tên, mã ngựa hoặc UELN…" className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b] bg-white" /><span className="absolute left-2.5 top-2.5 text-gray-400 text-sm">🔍</span></div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 w-20">Trạng thái</span>
          {[['Tất cả', 'Tất cả'], ['Eligible', 'Đủ điều kiện'], ['Monitor', 'Cần theo dõi'], ['Injured', 'Chấn thương'], ['Active', 'Đang tập'], ['Resting', 'Nghỉ ngơi'], ['Inactive', 'Chưa tập']].map(([f, l]) => <button key={f} onClick={() => { setFilter(f); setPageNo(1); }} className={chip(filter === f)}>{l}</button>)}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 w-20">Giới tính</span>
          {['Tất cả', 'Stallion', 'Mare', 'Gelding'].map(f => <button key={f} onClick={() => { setGender(f); setPageNo(1); }} className={chip(gender === f)}>{f}</button>)}
        </div>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">{['Ngựa', 'Mã', 'Giới tính', 'Huấn luyện viên', 'Sức khỏe', 'Tập luyện', 'Trạng thái', 'T/R', ''].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((h, i) => (
              <tr key={h.id} onClick={() => { onSelectHorse(h.id); navigate('horse-detail'); }} className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                <td className="px-5 py-3"><div className="flex items-center gap-3"><img src={h.imageUrl || undefined} className="w-9 h-9 rounded-lg object-cover bg-gray-200" /><div><div className="font-semibold text-[#0f1729]">{h.name}</div><div className="text-xs text-gray-500">{h.breed} · {h.age}t</div></div></div></td>
                <td className="px-5 py-3"><IdChip kind="HRS" id={h.id} /></td>
                <td className="px-5 py-3 text-xs text-gray-600">{GENDER_LABEL[h.gender] || h.gender}</td>
                <td className="px-5 py-3 text-gray-600 text-xs">{(h.trainerHistory || []).filter(t => !t.to).map(t => t.name).join(', ') || '—'}</td>
                <td className="px-5 py-3"><Badge status={h.healthStatus} /></td>
                <td className="px-5 py-3"><Badge status={h.trainingStatus} /></td>
                <td className="px-5 py-3"><LifecycleBadge horse={h} /></td>
                <td className="px-5 py-3 font-mono text-xs">{h.wins}/{h.totalRaces}</td>
                <td className="px-5 py-3"><span className="text-[#c9973b] text-xs font-medium">Xem →</span></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={9} className="px-5 py-12 text-center text-gray-400"><div className="text-3xl mb-2">🐎</div>Không có ngựa phù hợp với bộ lọc.<div><button className="mt-2 text-[#c9973b] text-sm hover:underline" onClick={() => { setSearch(''); setFilter('Tất cả'); setGender('Tất cả'); }}>Xóa bộ lọc</button></div></td></tr>}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
          <span>Trang {cur}/{pages}</span>
          <div className="flex gap-2"><Btn size="sm" variant="secondary" disabled={cur <= 1} onClick={() => setPageNo(cur - 1)}>← Trước</Btn><Btn size="sm" variant="secondary" disabled={cur >= pages} onClick={() => setPageNo(cur + 1)}>Sau →</Btn></div>
        </div>
      </Card>
    </div>
  );
}

// ── Horse Detail ──────────────────────────────────────────────────────────────

function HorseDetailPage({ state, navigate, onUpdateHorse, onActivateHorse, onShowSuccess, onAudit }:
  { state: AppState; navigate: (p: Page) => void; onUpdateHorse: (h: Horse) => Promise<unknown>; onActivateHorse: (id: string) => Promise<unknown>; onShowSuccess: (m: string) => void; onAudit: (a: string, t: string, r?: string) => void }) {
  const user = state.user!;
  const horse = state.horses.find(h => h.id === state.selectedHorseId) || state.horses[0];
  const [activating, setActivating] = useState(false);
  const activationFlight = useRef(false);
  const [activationError, setActivationError] = useState('');
  const [tab, setTab] = useState('overview');
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: horse.name, height: String(horse.height), stable: horse.stable, stall: horse.stall, microchip: horse.microchip || '', evidenceUrl: horse.identityEvidence?.url || '', evidenceFileUrl: horse.identityEvidence?.fileUrl || '', evidenceNote: horse.identityEvidence?.note || '' });
  const [newAch, setNewAch] = useState({ title: '', date: '', description: '', prize: '', position: '1', doc: '' });
  const [showAchForm, setShowAchForm] = useState(false);
  const isOwner = user.role === 'owner' && horse.ownerId === user.id;
  const intakeRequest = state.horseClubRequests.find(r => r.horseId === horse.id && r.status === 'pending');
  const ownerCanEdit = isOwner && horse.approvalStatus !== 'approved' && (!intakeRequest || intakeStage(horse, intakeRequest) < 3);

  const [editErr, setEditErr] = useState<Record<string, string>>({});
  const saveEdit = async () => {
    const e: Record<string, string> = {};
    const hh = numOf(editForm.height);
    if (editForm.name.trim().length < 2 || editForm.name.length > 40) e.name = 'Tên ngựa từ 2 đến 40 ký tự.';
    if (isNaN(hh) || hh < 100 || hh > 200) e.height = 'Chiều cao hợp lệ từ 100 đến 200 cm.';
    if (!editForm.microchip) e.microchip = 'Vui lòng nhập số microchip.'; else if (!/^[0-9]{3}[a-zA-Z0-9]{12}$/.test(editForm.microchip)) e.microchip = 'UELN gồm 3 chữ số và 12 chữ/số.';
    else if (state.horses.some(x => x.id !== horse.id && x.microchip === editForm.microchip)) e.microchip = 'Số microchip này đã tồn tại trong hệ thống.';
    if (editForm.evidenceUrl.trim() && !/^https?:\/\/\S+\.\S+/.test(editForm.evidenceUrl.trim())) e.evidenceUrl = 'URL ảnh phải bắt đầu bằng http:// hoặc https://.';
    if (editForm.evidenceFileUrl.trim() && !/^https?:\/\/\S+/.test(editForm.evidenceFileUrl.trim())) e.evidenceFileUrl = 'File URL must begin with http:// or https://.';
    setEditErr(e);
    if (Object.keys(e).length) return;
    const diffs: string[] = [];
    if (hh !== horse.height) diffs.push(`chiều cao ${horse.height}→${hh} cm`);
    if (editForm.name !== horse.name) diffs.push(`tên "${horse.name}"→"${editForm.name}"`);
    const next: Horse = { ...horse, name: editForm.name.trim(), height: hh, stable: editForm.stable, stall: editForm.stall,
      microchip: editForm.microchip, identityVerified: editForm.microchip === horse.microchip ? horse.identityVerified : false, identityEvidence: { url: editForm.evidenceUrl.trim(), fileUrl: editForm.evidenceFileUrl.trim(), note: editForm.evidenceNote.trim() } };
    try { await onUpdateHorse(diffs.length ? { ...next, changeLog: logChange(horse, user.name, `cập nhật ${diffs.join(', ')}`) } : next);
    setEditMode(false); } catch (err) { setEditErr({ name: (err as Error).message }); }
  };

  const [achErr, setAchErr] = useState<Record<string, string>>({});
  const [editAchId, setEditAchId] = useState<string | null>(null);
  const addAchievement = () => {
    const e: Record<string, string> = {};
    if (!newAch.title.trim()) e.title = 'Nhập tên giải.'; else if (newAch.title.length > 80) e.title = 'Tối đa 80 ký tự.';
    if (!newAch.date) e.date = 'Chọn ngày.'; else if (newAch.date > '2026-09-25') e.date = 'Ngày thành tích không được ở tương lai.';
    if (newAch.description.length > 300) e.description = 'Mô tả tối đa 300 ký tự.';
    setAchErr(e);
    if (Object.keys(e).length) return;
    const item = { id: editAchId || `a${Date.now()}`, title: newAch.title.trim(), date: toDDMMYYYY(newAch.date), description: newAch.description, prize: newAch.prize, position: Number(newAch.position), doc: newAch.doc || undefined };
    const list = editAchId ? horse.achievements.map(a => a.id === editAchId ? item : a) : [...horse.achievements, item];
    void onUpdateHorse({ ...horse, achievements: list }).catch(() => {});
  };
  const [raceFormOpen, setRaceFormOpen] = useState(false);
  const [editRaceId, setEditRaceId] = useState<string | null>(null);
  const [raceF, setRaceF] = useState({ date: '', raceName: '', distance: '1200m', position: '1', totalHorses: '10', time: '', venue: '', jockey: '', prize: '' });
  const [raceE, setRaceE] = useState<Record<string, string>>({});
  const saveRace = async () => {
    const e: Record<string, string> = {};
    if (!raceF.raceName.trim()) e.raceName = 'Nhập tên giải đua.';
    if (!raceF.date) e.date = 'Chọn ngày đua.'; else if (raceF.date > toISO(TODAY)) e.date = 'Ngày đua không được ở tương lai.';
    const tot = Number(raceF.totalHorses);
    if (!Number.isInteger(tot) || tot < 2 || tot > 20) e.totalHorses = 'Số ngựa tham dự từ 2 đến 20.';
    else if (Number(raceF.position) > tot) e.position = 'Hạng không thể lớn hơn số ngựa tham dự.';
    if (raceF.time && !/^\d:\d{2}\.\d{2}$/.test(raceF.time)) e.time = 'Định dạng thời gian: 1:11.24';
    setRaceE(e);
    if (Object.keys(e).length) return;
    const item: RaceHistoryEntry = { id: editRaceId || `rh${Date.now()}`, ...raceF, date: toDDMMYYYY(raceF.date), position: Number(raceF.position), totalHorses: tot, prize: raceF.prize || '0 VND' };
    const list = editRaceId ? horse.raceHistory.map(r => r.id === editRaceId ? item : r) : [item, ...horse.raceHistory];
    try { await onUpdateHorse({ ...horse, raceHistory: list, totalRaces: list.length, wins: list.filter(r => r.position === 1).length });
    setRaceFormOpen(false); setEditRaceId(null); } catch (err) { setRaceE({ raceName: (err as Error).message }); }
  };

  const horseHealthRecords = sortHealthRecords(state.healthRecords.filter(r => r.horseId === horse.id));
  const latestHealth = horseHealthRecords[0];

  const isVetRole = user.role === 'veterinarian';
  const horseEnrollments = state.enrollments.filter(e => e.horseId === horse.id);
  const horseSessions = state.trainingSessions.filter(s => s.horseId === horse.id).sort((x, y) => parseDDMMYYYY(y.date) - parseDDMMYYYY(x.date));
  const isApproved = horse.approvalStatus === 'approved';
  const tabs = [['overview', 'Thông tin cơ bản'], ['updates', 'Cập nhật'], ['health', 'Các lần khám'], ...(isVetRole ? [] : [['training', 'Huấn luyện'], ['packages', 'Gói']])];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate('horse-list')} className="hover:text-[#c9973b]">Ngựa</button>
        <span>/</span><span className="text-[#0f1729] font-medium">{horse.name}</span>
      </div>
      <div className="relative rounded-xl overflow-hidden h-44">
        <img src={horse.imageUrl || undefined} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f1729]/80 to-transparent" />
        <div className="absolute inset-0 flex items-end p-6">
          <div className="flex items-end gap-4 flex-1">
            <div>
              <div className="flex items-center gap-2 mb-1"><LifecycleBadge horse={horse} /><RecoveryBadge horse={horse} /><Badge status={horse.healthStatus} /><Badge status={horse.trainingStatus} />{horse.vetClearance && <span className="bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full">✓ Đã được thú y xác nhận</span>}</div>
              <h2 className="text-white font-serif text-3xl font-bold">{horse.name}</h2>
              <p className="text-gray-300 text-sm flex items-center gap-2 flex-wrap"><IdChip kind="HRS" id={horse.id} className="!bg-white/10 !text-white !border-white/20" /> {horse.breed} · {GENDER_LABEL[horse.gender] || horse.gender} · {horse.age} tuổi · {horse.color}</p>
            </div>
            <div className="flex-1" />
            {ownerCanEdit && (
              <div className="flex gap-2">
                {editMode ? (
                  <><Btn variant="gold" onClick={saveEdit}>💾 Lưu</Btn><Btn variant="secondary" onClick={() => setEditMode(false)}>Huỷ</Btn></>
                ) : (
                  <Btn variant="gold" onClick={() => setEditMode(true)}>✏ Chỉnh sửa</Btn>
                )}
              </div>
            )}
            {user.role === 'manager' && isApproved && horse.trainingStatus !== 'Active' && <Btn variant="gold" disabled={activating} onClick={async () => {
              if (activationFlight.current) return;
              activationFlight.current = true; setActivating(true); setActivationError('');
              try { await onActivateHorse(horse.id); } catch (e) { setActivationError((e as Error).message); }
              finally { activationFlight.current = false; setActivating(false); }
            }}>{activating ? 'Đang kích hoạt...' : 'Kích hoạt ngựa'}</Btn>}
            {user.role === 'veterinarian' && <Btn variant="gold" onClick={() => navigate('vet-health-form')}>🏥 Nhập khám</Btn>}
            {user.role === 'head_trainer' && <Btn variant="gold" onClick={() => navigate('training-hub')}>📋 Giáo án</Btn>}
          </div>
        </div>
      </div>
      {activationError && <p role="alert" className="text-sm text-red-600">{activationError}</p>}
      {isOwner && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Horse information cannot be changed after Step 3</p>}
      {horse.approvalStatus === 'approved' && <Card className="p-3"><LifecycleStepper horse={horse} /></Card>}
      {horse.lock && (
        <Card className="p-4 border-l-4 border-red-500 bg-red-50">
          <div className="flex items-start gap-3"><span className="text-2xl">🔒</span>
            <div className="flex-1 text-sm">
              <div className="font-semibold text-red-800">KHÓA HUẤN LUYỆN — gói huấn luyện đang tạm dừng (không hủy)</div>
              <div className="text-red-700 mt-1">Chẩn đoán: {horse.lock.reason}{horse.lock.notes ? ` · ${horse.lock.notes}` : ''}</div>
              <div className="text-xs text-red-500 mt-1">Khóa bởi {horse.lock.lockedByName} · {horse.lock.lockedAt}{horse.rehab ? ` · Đang phục hồi: ${horse.rehab.name}` : ' · Chờ Quản lý kích hoạt gói phục hồi'}</div>
              <div className="text-xs text-red-500">{user.role === 'veterinarian' ? 'Bạn có thể gỡ khóa tại mục "Khám sau tập & Khóa".' : 'Chỉ Thú y mới có quyền gỡ khóa.'}</div>
            </div>
          </div>
        </Card>
      )}
      <div className="flex gap-0 border-b border-gray-200 overflow-x-auto">
        {tabs.map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} className={`px-5 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap ${tab === t ? 'border-[#c9973b] text-[#c9973b]' : 'border-transparent text-gray-500 hover:text-[#0f1729]'}`}>{l}</button>
        ))}
      </div>

      {tab === 'overview' && isApproved && (
        <Card className="flex items-start gap-3 border-l-4 border-[#1a2844] bg-slate-50 p-4">
          <span className="text-2xl">🔒</span>
          <div className="text-sm"><div className="font-semibold text-[#0f1729]">Thông tin hồ sơ đã được khóa</div><div className="text-gray-600">Ngựa đã được duyệt nhận vào câu lạc bộ; BE khóa dữ liệu đăng ký gốc. Kết quả đua và giải thưởng được cập nhật tại tab lịch sử đua.</div></div>
        </Card>
      )}
      {tab === 'overview' && !isApproved && (() => { const rq = state.horseClubRequests.find(r => r.horseId === horse.id && r.status !== 'expired'); return rq ? <Card className="p-5"><div className="mb-3 text-sm font-semibold text-[#0f1729]">Tiến trình tiếp nhận vào câu lạc bộ</div><IntakeProgress stage={intakeStage(horse, rq)} />{rq.status === 'rejected' && rq.reviewNote && <p className="mt-3 text-sm text-red-600">Lý do từ chối: {rq.reviewNote}</p>}</Card> : null; })()}
      {tab === 'overview' && (
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2">
            <Card className="p-5">
              <h3 className="font-semibold mb-4">Thông tin ngựa</h3>
              {editMode ? (
                <div className="space-y-3">
                  <Input label="Tên ngựa" value={editForm.name} maxLength={40} error={editErr.name} onChange={v => setEditForm(f => ({ ...f, name: v }))} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Chiều cao (cm)" value={editForm.height} error={editErr.height} onChange={v => setEditForm(f => ({ ...f, height: v }))} type="number" />
                    <Input label="Chuồng" value={editForm.stable} onChange={v => setEditForm(f => ({ ...f, stable: v }))} />
                    <Input label="Ô" value={editForm.stall} onChange={v => setEditForm(f => ({ ...f, stall: v }))} />
                  </div>
                  <Input label="UELN" value={editForm.microchip} maxLength={15} error={editErr.microchip} hint="Changing the identification code resets verification status." onChange={v => setEditForm(f => ({ ...f, microchip: v.replace(/[^a-zA-Z0-9]/g, '') }))} />
                  <Input label="Evidence image URL" value={editForm.evidenceUrl} error={editErr.evidenceUrl} onChange={v => setEditForm(f => ({ ...f, evidenceUrl: v }))} />
                  <Input label="Evidence file URL" value={editForm.evidenceFileUrl} error={editErr.evidenceFileUrl} onChange={v => setEditForm(f => ({ ...f, evidenceFileUrl: v }))} />
                  <Input label="Document Type" value={editForm.evidenceNote} onChange={v => setEditForm(f => ({ ...f, evidenceNote: v }))} />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-4">
                    {[['Giống', horse.breed], ['Giới tính', GENDER_LABEL[horse.gender] || horse.gender], ['Ngày sinh', horse.birthDate || '—'], ['Microchip', horse.microchip || 'Chưa khai báo'], ['Tuổi', `${horse.age} tuổi`], ['Màu lông', horse.color], ['Cân nặng', `${horse.weight} kg`], ['Chiều cao', `${horse.height} cm`], ['Chuồng', horse.stable], ['Ô', horse.stall]].map(([k, v]) => (
                      <div key={k as string} className="flex gap-2"><span className="text-sm text-gray-500 w-24">{k as string}</span><span className="text-sm font-medium">{v as string}</span></div>
                    ))}
                  </div>
                  {horse.biography && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 italic">"{horse.biography}"</p>}
                  <div className="mt-3"><PedigreeBlock horse={horse} /></div>
                </>
              )}
            </Card>
          </div>
          <div className="space-y-4">
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Định danh</h3><IdentityBadge verified={horse.identityVerified} /></div>
              <div className="text-xs text-gray-500">Số microchip</div><div className="font-mono text-sm">{horse.microchip || 'Chưa khai báo'}</div>
              {horse.identityEvidence?.url && <img src={horse.identityEvidence.url} alt="Minh chứng định danh" className="mt-3 h-28 w-full rounded-lg border border-gray-200 bg-gray-50 object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
              {horse.identityEvidence?.fileUrl && <Btn size="sm" variant="ghost" className="mt-2" onClick={() => window.open(horse.identityEvidence?.fileUrl, '_blank', 'noopener,noreferrer')}>Open evidence file</Btn>}
              <div className="mt-2 text-xs italic text-gray-500">{horse.identityEvidence?.note || 'Chưa có ghi chú minh chứng.'}</div>
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold mb-4">Nhân sự phụ trách</h3>
              {[['🏇', 'Huấn luyện viên hiện tại', (horse.trainerHistory || []).filter(t => !t.to).map(t => t.name).join(', ') || '—'], ['🩺', 'Bác sĩ thú y phụ trách', horse.vetName || '—'], ['🧹', 'Nhân viên chăm sóc', horse.groomName || '—'], ['👤', 'Chủ ngựa', horse.ownerName]].map(([ic, r, n]) => (
                <div key={r as string} className="flex items-center gap-3 mb-3"><span className="text-base">{ic}</span><div><div className="text-xs text-gray-500">{r as string}</div><div className="text-sm font-medium">{n as string}</div></div></div>
              ))}
            </Card>
            <Card className="p-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[['Đua', horse.totalRaces, 'text-[#0f1729]'], ['Thắng', horse.wins, 'text-emerald-700'], [`${horse.totalRaces > 0 ? Math.round(horse.wins / horse.totalRaces * 100) : 0}%`, 'Tỷ lệ thắng', 'text-[#c9973b]']].map(([v, l, c]) => (
                  <div key={l as string} className="p-2 bg-gray-50 rounded-lg"><div className={`text-xl font-serif font-bold ${c}`}>{v}</div><div className="text-xs text-gray-500">{l as string}</div></div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'health' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="font-semibold">Lịch sử sức khỏe</h3>
            <div className="flex gap-2">
              <Btn variant="secondary" onClick={() => navigate('health-records')}>Xem đầy đủ →</Btn>
              {user.role === 'veterinarian' && <Btn variant="gold" onClick={() => navigate('vet-health-form')}>+ Thêm khám mới</Btn>}
            </div>
          </div>
          {latestHealth && (
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-1">Khám gần nhất</div>
          )}
          {horseHealthRecords.map((r, idx) => (
            <Card key={r.id} className={`p-4 ${idx === 0 ? 'border-[#c9973b] border-2' : ''}`}>
              {idx === 0 && <div className="text-xs font-semibold text-[#c9973b] mb-2 flex items-center gap-1">🩺 Khám gần nhất</div>}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <IdChip kind="MED" id={r.id} /><div className="font-medium">{r.type}</div>
                    {r.isPostTraining && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Sau tập</span>}
                    {r.autoEvaluation === 'pass'  && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">✓ Đạt chuẩn</span>}
                    {r.autoEvaluation === 'watch' && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">⚠ Cần theo dõi</span>}
                    {r.autoEvaluation === 'fail'  && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">✕ Không đủ điều kiện</span>}
                  </div>
                  <div className="text-sm text-gray-500">{r.date} · {r.vet}</div>
                  {r.trainingEligibility && (
                    <div className="mt-1 text-xs">
                      {r.trainingEligibility === 'eligible'    && <span className="text-emerald-700">🟢 Đủ điều kiện huấn luyện</span>}
                      {r.trainingEligibility === 'conditional' && <span className="text-amber-700">🟡 Huấn luyện có điều kiện</span>}
                      {r.trainingEligibility === 'not-eligible' && <span className="text-red-700">🔴 Không đủ điều kiện huấn luyện</span>}
                    </div>
                  )}
                  {r.vitals && <div className="mt-2 grid grid-cols-3 gap-2 text-xs">{[['Nhịp tim', r.vitals.heartRate + ' bpm'], ['Nhiệt độ', r.vitals.temperature + '°C'], ['Nhịp thở', r.vitals.respRate + '/p']].map(([k, v]) => v.trim() !== 'bpm' && v.trim() !== '°C' && v.trim() !== '/p' ? <div key={k as string} className="bg-gray-50 p-1.5 rounded text-center"><div className="text-gray-400">{k as string}</div><div className="font-medium">{v as string}</div></div> : null)}</div>}
                  {r.conclusion ? <div className="mt-1 text-sm text-gray-700">Kết luận: “{r.conclusion}”</div> : r.notes && <div className="text-sm text-gray-600 mt-1">{r.notes}</div>}
                </div>
                <Badge status={r.result} />
              </div>
            </Card>
          ))}
          {horseHealthRecords.length === 0 && (
            <Card className="p-8 text-center">
              <div className="text-gray-400 text-sm mb-2">Chưa có hồ sơ khám nào</div>
              {user.role === 'veterinarian' && <Btn variant="gold" onClick={() => navigate('vet-health-form')}>Nhập khám đầu tiên</Btn>}
            </Card>
          )}
        </div>
      )}

      {tab === 'training' && !isVetRole && (
        <div className="space-y-6">
          <TrainerHistoryTab horse={horse} trainers={state.users.filter(u => u.role === 'head_trainer' && u.clubId === horse.clubId && !u.locked)} canEdit={user.role === 'manager' && horse.clubId === user.clubId} today={TODAY}
            onChange={async (list, text, reason) => { try { await onUpdateHorse({ ...horse, trainerHistory: list, changeLog: logChange(horse, user.name, text) }); onAudit(`Huấn luyện viên phụ trách: ${text}`, `${horse.name} (${dispId('HRS', horse.id)})`, reason); } catch {} }} />
          <div className="space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Lộ trình huấn luyện</h3>{(user.role === 'head_trainer' || user.role === 'manager') && <Btn variant="secondary" size="sm" onClick={() => navigate('training-hub')}>Mở trang huấn luyện →</Btn>}</div>
            {state.trainingPlans.filter(p => p.horseId === horse.id).map(p => (
              <Card key={p.id} className="p-5">
                <div className="mb-2 flex flex-wrap items-center gap-2"><IdChip kind="PLN" id={p.id} /><Badge status={p.phase} /><Badge status={p.status} /></div>
                <div className="text-sm text-gray-500">{p.startDate} → {p.endDate} · {p.distance} · Khối lượng: {p.workload === 'High' ? 'Cao' : p.workload === 'Medium' ? 'Vừa' : p.workload === 'Low' ? 'Nhẹ' : p.workload}</div>
                <div className="text-sm text-gray-600">Mục tiêu: {p.goals}</div>
                {p.algorithmRationale && <div className="mt-1 text-xs text-[#c9973b]">Cơ sở gợi ý: {p.algorithmRationale}</div>}
                <div className="mt-2"><div className="mb-1 flex justify-between text-xs text-gray-500"><span>Tiến độ</span><span>{p.progress}%</span></div><div className="h-2 w-full rounded-full bg-gray-200"><div className="h-2 rounded-full bg-[#c9973b]" style={{ width: `${p.progress}%` }} /></div></div>
              </Card>
            ))}
            {state.trainingPlans.filter(p => p.horseId === horse.id).length === 0 && <Card className="p-8 text-center text-sm text-gray-400">Chưa có lộ trình huấn luyện.</Card>}
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold">Lịch tập & kết quả</h3>
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200 bg-gray-50">{['Mã buổi', 'Ngày giờ', 'Nội dung', 'Huấn luyện viên', 'Trạng thái', 'Kết quả'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{h}</th>)}</tr></thead>
                <tbody>
                  {horseSessions.map(s => (
                    <tr key={s.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3"><IdChip kind="SES" id={s.id} /></td>
                      <td className="px-4 py-3 text-gray-600">{s.date} {s.time}</td>
                      <td className="px-4 py-3">{s.type}<div className="text-xs text-gray-400">{s.distance}</div></td>
                      <td className="px-4 py-3 text-gray-600">{s.trainerName}</td>
                      <td className="px-4 py-3"><Badge status={s.status} /></td>
                      <td className="px-4 py-3 text-xs text-gray-600">{s.result ? `${s.result.time} · ${s.result.speed} km/h · ${s.result.heartRate} lần/phút · ${s.result.performanceScore} điểm` : '—'}</td>
                    </tr>
                  ))}
                  {horseSessions.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Chưa có buổi tập nào.</td></tr>}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      )}

      {tab === 'packages' && !isVetRole && (
        <div className="space-y-3">
          <div className="flex items-center justify-between"><h3 className="font-semibold">Gói huấn luyện của {horse.name}</h3>{isOwner && isApproved && <Btn variant="gold" size="sm" onClick={() => navigate('training-register')}>Đăng ký gói →</Btn>}</div>
          {horseEnrollments.map(e => {
            const pct = Math.round(e.sessionsDone / e.sessionsTotal * 100);
            return (
              <Card key={e.id} className="p-5">
                <div className="flex flex-wrap items-center gap-2"><IdChip kind="ENR" id={e.id} /><span className="font-semibold">{e.packageName}</span><Badge status={e.status === 'active' ? 'Active' : e.status === 'paused' ? 'Paused' : 'Completed'} /></div>
                <div className="mt-1 text-sm text-gray-500">Bắt đầu {e.startedAt} · Huấn luyện viên: {e.trainerName || 'chưa phân công'}</div>
                <div className="mt-2"><div className="mb-1 flex justify-between text-xs text-gray-500"><span>Số buổi đã tập</span><span>{e.sessionsDone}/{e.sessionsTotal}</span></div><div className="h-2 w-full rounded-full bg-gray-200"><div className="h-2 rounded-full bg-[#c9973b]" style={{ width: `${pct}%` }} /></div></div>
              </Card>
            );
          })}
          {horseEnrollments.length === 0 && <Card className="p-10 text-center"><div className="mb-2 text-4xl">📦</div><div className="font-semibold text-gray-600">Ngựa chưa đăng ký gói huấn luyện</div></Card>}
        </div>
      )}

      {tab === 'updates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Thành tích của {horse.name}</h3>
            {isOwner && <Btn variant="gold" onClick={() => setShowAchForm(!showAchForm)}>+ Thêm thành tích</Btn>}
          </div>
          {showAchForm && isOwner && (
            <Card className="p-5 border-l-4 border-[#c9973b]">
              <h4 className="font-semibold mb-3">Thêm thành tích mới</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Input label="Tên giải / Sự kiện" value={newAch.title} onChange={v => setNewAch(a => ({ ...a, title: v }))} placeholder="Example: RaceForce Sprint Cup" required maxLength={80} error={achErr.title} /></div>
                <Input label="Ngày" value={newAch.date} type="date" max="2026-09-25" required error={achErr.date} onChange={v => setNewAch(a => ({ ...a, date: v }))} />
                <Select label="Hạng đạt được" value={newAch.position} onChange={v => setNewAch(a => ({ ...a, position: v }))} options={['1', '2', '3', '4', '5'].map(v => ({ value: v, label: `Hạng ${v}` }))} />
                <Input label="Giải thưởng" value={newAch.prize} onChange={v => setNewAch(a => ({ ...a, prize: v }))} placeholder="VD: 50,000,000 VND" />
                <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Tài liệu đính kèm</label><input type="file" accept=".pdf,image/*" onChange={e => setNewAch(a => ({ ...a, doc: e.target.files?.[0]?.name || a.doc }))} className="text-xs" />{newAch.doc && <div className="text-xs text-blue-600 mt-1">📎 {newAch.doc}</div>}</div>
                <div className="col-span-2"><Textarea label="Mô tả" value={newAch.description} onChange={v => setNewAch(a => ({ ...a, description: v }))} placeholder="Mô tả thành tích..." /></div>
              </div>
              <div className="flex gap-2 mt-3"><Btn variant="gold" onClick={addAchievement} >✓ Lưu</Btn><Btn variant="secondary" onClick={() => setShowAchForm(false)}>Huỷ</Btn></div>
            </Card>
          )}
          {horse.achievements.length === 0 && <Card className="p-10 text-center"><div className="text-4xl mb-3">🏆</div><div className="text-gray-500 font-semibold">Chưa có thành tích</div>{isOwner && <div className="text-sm text-gray-400 mt-1">Nhấn "+ Thêm thành tích" để ghi nhận</div>}</Card>}
          {horse.achievements.map(a => (
            <Card key={a.id} className="p-5">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 ${a.position === 1 ? 'bg-[#c9973b] text-white' : a.position === 2 ? 'bg-gray-400 text-white' : 'bg-amber-700 text-white'}`}>#{a.position}</div>
                <div className="flex-1"><div className="font-semibold">{a.title}</div><div className="text-sm text-gray-500">{a.date}</div><div className="text-sm text-gray-600 mt-1">{a.description}</div>{a.prize && <div className="text-emerald-600 text-sm font-medium mt-1">🏆 {a.prize}</div>}{a.doc && <div className="text-xs text-blue-600 mt-1">📎 {a.doc}</div>}</div>
                {isOwner && <div className="flex gap-1.5"><Btn size="sm" variant="secondary" onClick={() => { const [d, m, y] = a.date.split('/'); setNewAch({ title: a.title, date: `${y}-${m}-${d}`, description: a.description, prize: a.prize || '', position: String(a.position || 1), doc: a.doc || '' }); setEditAchId(a.id); setShowAchForm(true); }}>Sửa</Btn><Btn size="sm" variant="danger" onClick={() => { if (window.confirm(`Xóa thành tích "${a.title}"?`)) void onUpdateHorse({ ...horse, achievements: horse.achievements.filter(x => x.id !== a.id) }).catch(() => {}); }}>Xóa</Btn></div>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'updates' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center"><div><h3 className="font-semibold">Lịch sử thi đấu</h3><div className="text-sm text-gray-500">{horse.totalRaces} lần đua · {horse.wins} lần thắng</div></div>{isOwner && <Btn variant="gold" onClick={() => { setEditRaceId(null); setRaceE({}); setRaceF({ date: '', raceName: '', distance: '1200m', position: '1', totalHorses: '10', time: '', venue: '', jockey: '', prize: '' }); setRaceFormOpen(true); }}>+ Thêm kết quả</Btn>}</div>
          {raceFormOpen && isOwner && (
            <Card className="p-5 border-l-4 border-[#c9973b]">
              <h4 className="font-semibold mb-3">{editRaceId ? 'Sửa kết quả đua' : 'Thêm kết quả đua'}</h4>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Tên giải đua" value={raceF.raceName} maxLength={60} required error={raceE.raceName} onChange={v => setRaceF(r => ({ ...r, raceName: v }))} />
                <Input label="Ngày đua" type="date" max="2026-09-25" value={raceF.date} required error={raceE.date} onChange={v => setRaceF(r => ({ ...r, date: v }))} />
                <Select label="Cự ly" value={raceF.distance} onChange={v => setRaceF(r => ({ ...r, distance: v }))} options={['800m', '1000m', '1200m', '1400m', '1600m', '2000m'].map(v => ({ value: v, label: v }))} />
                <Select label="Hạng đạt" value={raceF.position} error={raceE.position} onChange={v => setRaceF(r => ({ ...r, position: v }))} options={Array.from({ length: 20 }, (_, i) => ({ value: String(i + 1), label: `Hạng ${i + 1}` }))} />
                <Input label="Số ngựa tham dự" type="number" value={raceF.totalHorses} error={raceE.totalHorses} onChange={v => setRaceF(r => ({ ...r, totalHorses: v }))} />
                <Input label="Thời gian" value={raceF.time} placeholder="1:11.24" error={raceE.time} onChange={v => setRaceF(r => ({ ...r, time: v }))} />
                <Input label="Trường đua" value={raceF.venue} maxLength={60} onChange={v => setRaceF(r => ({ ...r, venue: v }))} />
                <Input label="Jockey" value={raceF.jockey} maxLength={40} onChange={v => setRaceF(r => ({ ...r, jockey: v }))} />
                <div className="col-span-2"><Input label="Giải thưởng" value={raceF.prize} placeholder="50,000,000 VND" onChange={v => setRaceF(r => ({ ...r, prize: v }))} /></div>
              </div>
              <div className="flex gap-2 mt-3"><Btn variant="gold" onClick={saveRace}>✓ Lưu</Btn><Btn variant="secondary" onClick={() => setRaceFormOpen(false)}>Huỷ</Btn></div>
            </Card>
          )}
          {horse.raceHistory.length === 0 && <Card className="p-10 text-center"><div className="text-4xl mb-3">🏁</div><div className="text-gray-500">Chưa có lịch sử thi đấu</div></Card>}
          {horse.raceHistory.map(r => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${r.position === 1 ? 'bg-[#c9973b] text-white' : r.position <= 3 ? 'bg-gray-400 text-white' : 'bg-gray-200 text-gray-600'}`}>#{r.position}</div>
                <div className="flex-1">
                  <div className="font-semibold">{r.raceName}</div>
                  <div className="text-sm text-gray-500">{r.date} · {r.venue || '—'} · {r.distance}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Jockey: {r.jockey || '—'} · {r.totalHorses} ngựa tham dự{r.time && ` · TG: ${r.time}`}</div>
                </div>
                <div className="text-right">{r.prize !== '0 VND' && <div className="text-xs text-emerald-600">{r.prize}</div>}</div>
                {isOwner && <div className="flex gap-1.5"><Btn size="sm" variant="secondary" onClick={() => { const [d, m, y] = r.date.split('/'); setRaceF({ date: `${y}-${m}-${d}`, raceName: r.raceName, distance: r.distance, position: String(r.position), totalHorses: String(r.totalHorses), time: r.time, venue: r.venue, jockey: r.jockey, prize: r.prize }); setEditRaceId(r.id); setRaceE({}); setRaceFormOpen(true); }}>Sửa</Btn><Btn size="sm" variant="danger" onClick={() => { if (window.confirm(`Xóa kết quả "${r.raceName}"?`)) { const list = horse.raceHistory.filter(x => x.id !== r.id); void onUpdateHorse({ ...horse, raceHistory: list, totalRaces: list.length, wins: list.filter(x => x.position === 1).length }).catch(() => {}); } }}>Xóa</Btn></div>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'updates' && <PhotosTab horse={horse} canEdit={isOwner || (user.role === 'manager' && horse.clubId === user.clubId)} onChange={photos => void onUpdateHorse({ ...horse, photos, changeLog: logChange(horse, user.name, `cập nhật ảnh minh chứng (${photos.length} ảnh)`) }).catch(() => {})} />}

    </div>
  );
}

// ── Horse Create ──────────────────────────────────────────────────────────────

function HorseCreatePage({ user, state, navigate, onCreateHorse }:
  { user: AppUser; state: AppState; navigate: (p: Page) => void; onCreateHorse: (h: Horse) => Promise<unknown> }) {
  const [form, setForm] = useState({ name: '', microchip: '', breed: 'Thoroughbred', birthDate: '', color: '', gender: 'Stallion', height: '', evidenceUrl: '', evidenceFileUrl: '', evidenceNote: '' });
  const [raceHistory, setRaceHistory] = useState<RaceHistoryEntry[]>([]);
  const [showRaceForm, setShowRaceForm] = useState(false);
  const [newRace, setNewRace] = useState({ date: '', raceName: '', distance: '1200m', position: '1', totalHorses: '10', time: '', venue: '', jockey: '', prize: '' });
  const [raceErr, setRaceErr] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const todayIso = toISO(TODAY);
  const previewId = 'Mã do BE cấp';
  const set = (k: string) => (v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const addRace = () => {
    const e: Record<string, string> = {};
    if (!newRace.raceName.trim()) e.raceName = 'Nhập tên giải đua.';
    if (!newRace.date) e.date = 'Chọn ngày đua.'; else if (newRace.date > todayIso) e.date = 'Ngày đua không được ở tương lai.';
    setRaceErr(e);
    if (Object.keys(e).length) return;
    setRaceHistory(r => [...r, { id: `rh${Date.now()}`, ...newRace, date: toDDMMYYYY(newRace.date), position: Number(newRace.position), totalHorses: Number(newRace.totalHorses) }]);
    setNewRace({ date: '', raceName: '', distance: '1200m', position: '1', totalHorses: '10', time: '', venue: '', jockey: '', prize: '' });
    setShowRaceForm(false);
  };

  const handle = async () => {
    const e: Record<string, string> = {};
    const name = form.name.trim();
    if (!name) e.name = 'Vui lòng nhập tên ngựa.'; else if (name.length < 2 || name.length > 40) e.name = 'Tên ngựa từ 2 đến 40 ký tự.';
    if (!form.microchip) e.microchip = 'Vui lòng nhập số microchip.'; else if (!/^[0-9]{3}[a-zA-Z0-9]{12}$/.test(form.microchip)) e.microchip = 'UELN gồm 15 ký tự: 3 chữ số quốc gia và 12 chữ/số.';
    else if (state.horses.some(x => x.microchip === form.microchip)) e.microchip = 'Số microchip này đã tồn tại trong hệ thống.';
    if (!form.evidenceUrl.trim()) e.evidenceUrl = 'Vui lòng nhập URL ảnh minh chứng.';
    else if (!/^https?:\/\/\S+\.\S+/.test(form.evidenceUrl.trim())) e.evidenceUrl = 'URL ảnh phải bắt đầu bằng http:// hoặc https://.';
    if (form.evidenceFileUrl.trim() && !/^https?:\/\/\S+/.test(form.evidenceFileUrl.trim())) e.evidenceFileUrl = 'File URL must begin with http:// or https://.';
    if (form.evidenceNote.length > 300) e.evidenceNote = 'Ghi chú tối đa 300 ký tự.';
    if (!form.birthDate) e.birthDate = 'Vui lòng chọn ngày sinh.'; else if (form.birthDate >= todayIso) e.birthDate = 'Ngày sinh không được ở tương lai.';
    else if (form.birthDate < '1996-01-01') e.birthDate = 'Ngày sinh không hợp lý (trước năm 1996).';
    if (!form.color.trim()) e.color = 'Vui lòng nhập màu lông.'; else if (form.color.length > 30) e.color = 'Tối đa 30 ký tự.';
    const h = numOf(form.height);
    if (isNaN(h)) e.height = 'Vui lòng nhập chiều cao (số).'; else if (h < 100 || h > 200) e.height = 'Chiều cao hợp lệ từ 100 đến 200 cm.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const id = previewId;
    const age = Math.max(0, Math.floor((new Date(todayIso).getTime() - new Date(form.birthDate).getTime()) / 31557600000));
    try { await onCreateHorse({
      id, name, breed: form.breed, age, birthDate: toDDMMYYYY(form.birthDate), microchip: form.microchip || undefined, color: form.color.trim(), gender: form.gender,
      weight: 0, height: h, stable: '', stall: '', clubId: null,
      ownerId: user.id, ownerName: user.name, headTrainerId: '', headTrainerName: '',
      vetId: '', vetName: '', groomId: '', groomName: '',
      healthStatus: 'Pending Vet', trainingStatus: 'Pending Approval', approvalStatus: 'pending',
      registrationDate: TODAY, approvedAt: null, totalRaces: raceHistory.length,
      wins: raceHistory.filter(r => r.position === 1).length,
      vetClearance: false, biography: '', imageUrl: form.evidenceUrl.trim(), achievements: [], raceHistory,
      lifecycle: 'pending', identityVerified: false, identityEvidence: { url: form.evidenceUrl.trim(), fileUrl: form.evidenceFileUrl.trim(), note: form.evidenceNote.trim() }, medicalHistory: '',
    }); } catch (err) { setErrors({ name: (err as Error).message }); }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-gray-500"><button onClick={() => navigate('my-horses')} className="hover:text-[#c9973b]">Ngựa của tôi</button><span>/</span><span className="font-medium text-[#0f1729]">Đăng ký ngựa mới</span></div>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-serif font-bold text-[#0f1729]">Register horse profile</h2><p className="text-sm text-gray-500">The profile is created immediately and sent to the club for veterinarian assignment.</p></div>
        <div className="flex gap-2"><Btn variant="secondary" onClick={() => navigate('my-horses')}>Huỷ</Btn><Btn variant="gold" onClick={handle}>Gửi đăng ký →</Btn></div>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between"><h3 className="font-semibold text-[#0f1729]">Định danh ngựa</h3><IdentityBadge verified={false} /></div>
        <p className="text-xs text-gray-500">UELN có 15 ký tự (3 chữ số quốc gia và 12 chữ/số), duy nhất trong hệ thống; Quản lý đối chiếu với minh chứng khi tiếp nhận.</p>
        <div className="grid grid-cols-2 gap-4">
          <Input label="UELN" value={form.microchip} onChange={v => set('microchip')(v.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15))} placeholder="3 country digits + 12 letters/digits" required hint={`${form.microchip.length}/15 characters entered`} error={errors.microchip} />
          <div className="col-span-2"><Input label="Evidence image URL" value={form.evidenceUrl} onChange={set('evidenceUrl')} placeholder="https://..." error={errors.evidenceUrl} /></div>
          <div className="col-span-2"><Input label="Evidence file URL" value={form.evidenceFileUrl} onChange={set('evidenceFileUrl')} placeholder="https://..." error={errors.evidenceFileUrl} /></div>
          {form.evidenceUrl.trim() && /^https?:\/\//.test(form.evidenceUrl.trim()) && <div className="col-span-2"><img src={form.evidenceUrl.trim()} alt="Xem trước minh chứng" className="h-32 rounded-lg border border-gray-200 object-cover bg-gray-50" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /></div>}
          <div className="col-span-2"><Input label="Document Type" value={form.evidenceNote} onChange={set('evidenceNote')} placeholder="Example: Identification certificate" error={errors.evidenceNote} /></div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold text-[#0f1729]">Thông tin cơ bản</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Input label="Tên ngựa" value={form.name} onChange={set('name')} placeholder="VD: Silver Arrow" required maxLength={40} error={errors.name} /></div>
          <Select label="Giống ngựa" value={form.breed} onChange={set('breed')} options={['Thoroughbred', 'Arabian', 'Quarter Horse', 'Warmblood', 'Appaloosa'].map(v => ({ value: v, label: v }))} />
          <Select label="Gender" value={form.gender} onChange={set('gender')} options={['Stallion', 'Mare'].map(v => ({ value: v, label: v }))} />
          <Input label="Ngày sinh" value={form.birthDate} onChange={set('birthDate')} type="date" max={todayIso} required error={errors.birthDate} />
          <Input label="Màu lông" value={form.color} onChange={set('color')} placeholder="Bay, Grey, Chestnut..." required maxLength={30} error={errors.color} />
          <Input label="Chiều cao (cm)" value={form.height} onChange={set('height')} type="number" placeholder="160" required error={errors.height} />
        </div>
        {Object.values(errors).some(Boolean) && <p className="text-red-600 text-sm">Vui lòng sửa các trường được đánh dấu đỏ.</p>}
      </Card>

      {/* Race History */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div><h3 className="font-semibold text-[#0f1729]">Lịch sử đua (nộp kèm hồ sơ)</h3><p className="text-xs text-gray-400 mt-0.5">Không bắt buộc — cung cấp để trung tâm đánh giá tốt hơn</p></div>
          <Btn variant="secondary" onClick={() => setShowRaceForm(!showRaceForm)}>+ Thêm kết quả</Btn>
        </div>
        {showRaceForm && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Tên giải đua" value={newRace.raceName} onChange={v => setNewRace(r => ({ ...r, raceName: v }))} placeholder="Example: RaceForce Sprint Cup" required maxLength={60} error={raceErr.raceName} />
              <Input label="Ngày đua" value={newRace.date} onChange={v => setNewRace(r => ({ ...r, date: v }))} type="date" max={todayIso} required error={raceErr.date} />
              <Select label="Cự ly" value={newRace.distance} onChange={v => setNewRace(r => ({ ...r, distance: v }))} options={['800m', '1000m', '1200m', '1400m', '1600m', '2000m'].map(v => ({ value: v, label: v }))} />
              <Select label="Hạng đạt" value={newRace.position} onChange={v => setNewRace(r => ({ ...r, position: v }))} options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Hạng ${i + 1}` }))} />
              <Input label="Thời gian" value={newRace.time} onChange={v => setNewRace(r => ({ ...r, time: v }))} placeholder="VD: 1:11.24" />
              <Input label="Trường đua" value={newRace.venue} onChange={v => setNewRace(r => ({ ...r, venue: v }))} placeholder="VD: Phú Thọ Racecourse" />
              <Input label="Jockey" value={newRace.jockey} onChange={v => setNewRace(r => ({ ...r, jockey: v }))} placeholder="Tên jockey" />
              <Input label="Giải thưởng" value={newRace.prize} onChange={v => setNewRace(r => ({ ...r, prize: v }))} placeholder="VD: 50,000,000 VND" />
            </div>
            <div className="flex gap-2"><Btn variant="gold" onClick={addRace}>✓ Thêm</Btn><Btn variant="secondary" onClick={() => setShowRaceForm(false)}>Huỷ</Btn></div>
          </div>
        )}
        {raceHistory.length > 0 ? raceHistory.map(r => (
          <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100 mb-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${r.position === 1 ? 'bg-[#c9973b] text-white' : 'bg-gray-400 text-white'}`}>#{r.position}</div>
            <div className="flex-1"><div className="text-sm font-medium">{r.raceName}</div><div className="text-xs text-gray-500">{r.date} · {r.distance} · {r.time}</div></div>
            <button onClick={() => setRaceHistory(h => h.filter(x => x.id !== r.id))} className="text-red-400 hover:text-red-600 text-xs">✕ Xóa</button>
          </div>
        )) : <div className="text-center py-4 text-gray-400 text-sm">Chưa có lịch sử đua — Nhấn "+ Thêm kết quả" để nộp kèm</div>}
      </Card>
    </div>
  );
}

// ── My Horses ────────────────────────────────────────────────────────────────

function MyHorsesPage({ user, state, navigate, onSubmitToCenter, onSelectHorse }:
  { user: AppUser; state: AppState; navigate: (p: Page) => void; onSubmitToCenter: (horseId: string) => void; onSelectHorse: (id: string) => void }) {
  const myHorses = state.horses.filter(h => h.ownerId === user.id);
  const clubHorses = myHorses.filter(h => h.clubId === user.clubId);
  const unregistered = myHorses.filter(h => !h.clubId);
  const pendingReqs = state.horseClubRequests.filter(r => r.ownerId === user.id && r.status === 'pending');
  const myClub = state.clubs.find(c => c.id === user.clubId);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-serif font-bold text-[#0f1729]">Ngựa của tôi</h2><p className="text-sm text-gray-500">{myHorses.length} ngựa · {clubHorses.length} trong trung tâm</p></div>
        <Btn variant="gold" onClick={() => navigate('horse-create')}>+ Đăng ký ngựa mới</Btn>
      </div>
      {clubHorses.length > 0 && (
        <><div className="flex items-center gap-2"><div className="h-px flex-1 bg-gray-200" /><span className="text-xs font-semibold text-gray-400 uppercase px-2">Trong {myClub?.name}</span><div className="h-px flex-1 bg-gray-200" /></div>
          <div className="grid grid-cols-2 gap-4">
            {clubHorses.map(h => (
              <Card key={h.id} className="overflow-hidden" onClick={() => { onSelectHorse(h.id); navigate('horse-detail'); }}>
                <div className="relative h-32"><img src={h.imageUrl || undefined} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" /><div className="absolute bottom-2 left-3 right-3 flex items-end justify-between"><div><div className="text-white font-semibold text-sm">{h.name}</div><div className="text-gray-300 text-xs">{h.id}</div></div><Badge status={h.healthStatus} /></div></div>
                <div className="px-3 pt-3"><LifecycleBadge horse={h} /></div>
                <div className="p-3 text-xs text-gray-500 flex justify-between"><span>{h.breed} · {h.age}t</span><span>{h.wins}T/{h.totalRaces}R</span></div>
              </Card>
            ))}
          </div>
        </>
      )}
      {unregistered.length > 0 && (
        <><div className="flex items-center gap-2"><div className="h-px flex-1 bg-gray-200" /><span className="text-xs font-semibold text-gray-400 uppercase px-2">Chưa vào trung tâm</span><div className="h-px flex-1 bg-gray-200" /></div>
          {unregistered.map(h => {
            const hasPending = pendingReqs.some(r => r.horseId === h.id);
            return (
              <Card key={h.id} className="p-4">
                <div className="flex items-center gap-4">
                  {h.imageUrl ? <img src={h.imageUrl || undefined} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" /> : <div className="w-14 h-14 rounded-xl bg-gray-200 flex items-center justify-center text-2xl flex-shrink-0">🐎</div>}
                  <div className="flex-1">
                    <div className="font-semibold">{h.name}</div>
                    <div className="text-sm text-gray-500">{h.breed} · {h.age}t · {h.color}</div>
                    <div className="mt-1"><LifecycleBadge horse={h} /></div>
                    <div className="mt-1 flex items-center gap-2"><IdChip kind="HRS" id={h.id} /><IdentityBadge verified={h.identityVerified} /></div>
                  </div>
                  <div className="flex flex-col gap-2 items-end flex-shrink-0">
                    <Btn variant="secondary" size="sm" onClick={() => { onSelectHorse(h.id); navigate('horse-detail'); }}>{h.approvalStatus === 'pending' && hasPending ? 'Xem hồ sơ' : '✏ Chỉnh sửa hồ sơ'}</Btn>
                    {myClub && !hasPending && <Btn variant="gold" size="sm" onClick={() => onSubmitToCenter(h.id)}>📋 Đăng ký vào TTHL</Btn>}
                  </div>
                </div>
                {(() => { const rq = state.horseClubRequests.filter(r => r.horseId === h.id).slice(-1)[0]; return rq ? <div className="mt-4 border-t border-gray-100 pt-4"><IntakeProgress stage={intakeStage(h, rq)} />{rq.status === 'rejected' && <p className="mt-2 text-xs text-red-600">Lý do từ chối: {rq.reviewNote}</p>}</div> : null; })()}
              </Card>
            );
          })}
        </>
      )}
      {myHorses.length === 0 && <Card className="p-12 text-center"><div className="text-5xl mb-4">🐎</div><div className="font-semibold text-lg mb-1">Bạn chưa đăng ký ngựa nào</div><div className="text-gray-400 text-sm mb-5">Tạo hồ sơ và đăng ký vào trung tâm huấn luyện</div><Btn variant="gold" onClick={() => navigate('horse-create')}>+ Đăng ký ngựa đầu tiên</Btn></Card>}
    </div>
  );
}

// ── Trainer Select ────────────────────────────────────────────────────────────

// ── Trainer Profile (for manager to view before approving) ────────────────────

function TrainerProfilePage({ state, navigate, trainerId, onApproveRequest }:
  { state: AppState; navigate: (p: Page) => void; trainerId: string; onApproveRequest?: (reqId: string, role: Role) => void }) {
  const trainer = state.users.find(u => u.id === trainerId);
  const req = state.memberRequests.find(r => r.userId === trainerId && r.status === 'pending');
  if (!trainer) return <Card className="p-10 text-center"><div className="text-gray-500">Không tìm thấy thông tin</div></Card>;
  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-gray-500"><button onClick={() => navigate('member-requests')} className="hover:text-[#c9973b]">Yêu cầu tham gia</button><span>/</span><span className="font-medium">Hồ sơ ứng viên</span></div>
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-[#1a2844] to-[#243558] p-8">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-[#c9973b] flex items-center justify-center text-white text-2xl font-bold">{trainer.avatar}</div>
            <div className="flex-1">
              <h2 className="text-white font-serif text-2xl font-bold">{trainer.name}</h2>
              <p className="text-[#c9973b] font-medium mt-1">{trainer.role ? ROLE_LABELS[trainer.role] : 'Ứng viên'}</p>
              <p className="text-gray-400 text-sm mt-1">{trainer.email} · {trainer.phone}</p>
            </div>
            {req && onApproveRequest && <Btn variant="gold" onClick={() => { onApproveRequest(req.id, 'head_trainer'); navigate('member-requests'); }}>✓ Duyệt vào trung tâm</Btn>}
          </div>
        </div>
        <div className="p-6 space-y-5">
          {trainer.bio && <div><div className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-2">Giới thiệu</div><p className="text-gray-700 leading-relaxed">{trainer.bio}</p></div>}
          {trainer.experience && <div><div className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-2">Kinh nghiệm</div><p className="text-gray-700">{trainer.experience}</p></div>}
          {trainer.certifications && <div><div className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-2">Chứng chỉ & Bằng cấp</div><div className="space-y-1">{trainer.certifications.split(' · ').map(c => <div key={c} className="flex items-center gap-2"><span className="text-[#c9973b]">📜</span><span className="text-gray-700">{c}</span></div>)}</div></div>}
          {trainer.achievements && <div><div className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-2">Thành tích nổi bật</div><div className="space-y-1">{trainer.achievements.split(' · ').map(a => <div key={a} className="flex items-center gap-2"><span className="text-[#c9973b]">🏆</span><span className="text-gray-700">{a}</span></div>)}</div></div>}
        </div>
      </Card>
    </div>
  );
}

// ── Center Requests ───────────────────────────────────────────────────────────

// ── Member Requests ───────────────────────────────────────────────────────────

function MemberRequestsPage({ state, navigate, onApprove, onReject, onViewTrainer }:
  { state: AppState; navigate: (p: Page) => void; onApprove: (reqId: string, role: Role) => void; onReject: (reqId: string) => void; onViewTrainer: (uid: string) => void }) {
  const myClub = state.clubs.find(c => c.managerId === state.user!.id);
  const myReqs = state.memberRequests.filter(r => r.clubId === myClub?.id);
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const roleOpts: { value: Role; label: string }[] = [
    { value: 'head_trainer', label: 'Huấn luyện viên' }, { value: 'veterinarian', label: 'Thú y' },
    { value: 'groom', label: 'Nhân viên chăm sóc' }, { value: 'owner', label: 'Chủ ngựa' },
  ];
  return (
    <div className="space-y-5 max-w-3xl">
      <div><h2 className="text-xl font-serif font-bold">Yêu cầu tham gia</h2><p className="text-sm text-gray-500">{myReqs.filter(r => r.status === 'pending').length} chờ duyệt</p></div>
      {myReqs.filter(r => r.status === 'pending').length === 0 && <Card className="p-10 text-center"><div className="text-4xl mb-3">🤝</div><div className="font-semibold text-gray-600">Không có yêu cầu nào đang chờ</div></Card>}
      {myReqs.filter(r => r.status === 'pending').map(req => (
        <Card key={req.id} className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[#1a2844] text-white flex items-center justify-center font-bold">{req.userAvatar}</div>
            <div className="flex-1">
              <div className="font-semibold">{req.userName}</div>
              <div className="text-sm text-gray-500">{req.userEmail}</div>
              {req.userRole && <Badge status={req.userRole} />}
              <div className="text-xs text-gray-400 mt-1">Yêu cầu {req.requestedAt} · Hết hạn {req.expiresAt}</div>
            </div>
            <div className="flex flex-col gap-2">
              <Badge status="pending" />
              {req.userRole === 'head_trainer' && (
                <button onClick={() => onViewTrainer(req.userId)} className="text-xs text-[#c9973b] hover:underline font-medium">📋 Xem hồ sơ HLV →</button>
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1"><Select label="" value={roles[req.id] || (req.userRole || '')} onChange={v => setRoles(p => ({ ...p, [req.id]: v as Role }))} options={[{ value: '', label: '— Chọn vai trò —' }, ...roleOpts]} /></div>
            <Btn variant="gold" disabled={!roles[req.id] && !req.userRole} onClick={() => { const role = (roles[req.id] || req.userRole) as Role; if (role) onApprove(req.id, role); }}>✓ Duyệt</Btn>
            <Btn variant="danger" onClick={() => onReject(req.id)}>✕ Từ chối</Btn>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── Training Hub ──────────────────────────────────────────────────────────────

function toDDMMYYYY(iso: string): string {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

// ── Groom: Care Hub, Kho vật tư ───────────────────────────────────────────────

type CareResult = { ok: true } | { ok: false; message: string; shortages: { itemId: string; name: string; have: number; need: number; unit: string }[] };
type SupplyLine = { itemId: string; qty: number };

const CARE_LABELS: Record<string, string> = {
  'feed-Sáng': 'Cho ăn bữa sáng', 'feed-Trưa': 'Cho ăn bữa trưa', 'feed-Tối': 'Cho ăn bữa tối',
  clean: 'Vệ sinh chuồng', bath: 'Tắm rửa', ice: 'Ngâm chân nước đá', treat: 'Hỗ trợ trị thương',
};
const FOOD_KIND_LABEL: Record<FoodKind, string> = { grain: 'Ngũ cốc', hay: 'Cỏ', vitamin: 'Vitamin', other: 'Khác' };
const INV_CAT_LABEL: Record<InvCategory, string> = { food: 'Thức ăn', medical: 'Thuốc và vật tư y tế', tool: 'Dụng cụ' };
const INV_UNITS: InvUnit[] = ['kg', 'lít', 'gói', 'cái'];

function needsTreatment(h: Horse): boolean { return !!h.lock || !!h.rehab || h.healthStatus === 'Injured'; }
function numOf(v: string): number { return v.trim() === '' ? NaN : Number(v.replace(',', '.')); }
function shiftDate(d: string, off: number): string {
  const [dd, mm, yy] = d.split('/').map(Number);
  const x = new Date(yy, mm - 1, dd + off);
  return `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}/${x.getFullYear()}`;
}
function toISO(d: string): string { const [dd, mm, yy] = d.split('/'); return `${yy}-${mm}-${dd}`; }
function fmtQty(n: number): string { return String(Math.round(n * 100) / 100); }
function isLow(i: InvItem): boolean { return i.qty <= i.threshold; }

function dailyTasks(h: Horse) {
  const ration = RATIONS[h.id];
  const defTime = { Sáng: '06:00', Trưa: '12:00', Tối: '18:00' } as const;
  const meals = (['Sáng', 'Trưa', 'Tối'] as const).map(m => {
    const r = ration?.meals.find(x => x.meal === m);
    return { key: `feed-${m}`, icon: '🌾', label: CARE_LABELS[`feed-${m}`], time: r?.time || defTime[m], desc: r ? `${r.grain} kg ngũ cốc · ${r.hay} kg cỏ${r.vitamin ? ` · ${r.vitamin} gói ${r.vitaminName}` : ''}` : 'Chưa có khẩu phần được duyệt' };
  });
  const chores = [
    { key: 'clean', icon: '🧽', label: CARE_LABELS.clean, time: '08:00', desc: 'Dọn phân, thay rơm mới, khử trùng nền chuồng' },
    { key: 'bath', icon: '🚿', label: CARE_LABELS.bath, time: '09:00', desc: 'Tắm, lau khô, chải lông' },
    { key: 'ice', icon: '🧊', label: CARE_LABELS.ice, time: '10:00', desc: 'Ngâm chân nước đá khoảng 20 phút, kiểm tra sưng nóng' },
  ];
  const treat = needsTreatment(h) ? [{ key: 'treat', icon: '🩹', label: CARE_LABELS.treat, time: '16:00', desc: 'Thực hiện theo hướng dẫn của Thú y' }] : [];
  return [...meals, ...chores, ...treat].sort((a, b) => a.time.localeCompare(b.time));
}

function SupplyPicker({ items, rows, setRows }: { items: InvItem[]; rows: { itemId: string; qty: string }[]; setRows: (r: { itemId: string; qty: string }[]) => void }) {
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex gap-2 items-center">
          <select value={r.itemId} onChange={e => setRows(rows.map((x, j) => j === i ? { ...x, itemId: e.target.value } : x))} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
            <option value="">— Chọn vật tư —</option>
            {items.map(it => <option key={it.id} value={it.id}>{it.name} (còn {fmtQty(it.qty)} {it.unit})</option>)}
          </select>
          <input value={r.qty} onChange={e => setRows(rows.map((x, j) => j === i ? { ...x, qty: e.target.value } : x))} placeholder="SL" inputMode="decimal" className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <span className="text-xs text-gray-400 w-8">{items.find(it => it.id === r.itemId)?.unit}</span>
          <button onClick={() => setRows(rows.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">✕</button>
        </div>
      ))}
      <Btn variant="ghost" size="sm" onClick={() => setRows([...rows, { itemId: '', qty: '' }])}>＋ Thêm vật tư đã dùng</Btn>
    </div>
  );
}

function CareTaskRow({ horse, task, date, isToday, record, inventory, onComplete, onUndo, onReceive, navigate, defaultOpen = false }:
  { horse: Horse; task: ReturnType<typeof dailyTasks>[number]; date: string; isToday: boolean; record?: CareRecord; inventory: InvItem[];
    onComplete: (horseId: string, key: string, supplies: SupplyLine[]) => CareResult; onUndo: (id: string) => string | null;
    onReceive: (itemId: string, qty: number, dateISO: string) => string | null; navigate: (p: Page) => void; defaultOpen?: boolean }) {
  const isFeed = task.key.startsWith('feed-');
  const [rows, setRows] = useState<{ itemId: string; qty: string }[]>([]);
  const [open, setOpen] = useState(defaultOpen);
  const [fail, setFail] = useState<Extract<CareResult, { ok: false }> | null>(null);
  const [recvQty, setRecvQty] = useState<Record<string, string>>({});
  const [askRecv, setAskRecv] = useState(false);
  const [err, setErr] = useState('');

  const run = () => {
    setErr('');
    const supplies: SupplyLine[] = [];
    if (!isFeed) {
      for (const r of rows) {
        if (!r.itemId && !r.qty) continue;
        const q = numOf(r.qty);
        if (!r.itemId || !(q > 0)) { setErr('Mỗi dòng vật tư cần chọn vật tư và nhập số lượng > 0.'); return; }
        supplies.push({ itemId: r.itemId, qty: q });
      }
    }
    const res = onComplete(horse.id, task.key, supplies);
    if (res.ok) { setFail(null); setAskRecv(false); setRows([]); setOpen(false); } else { setFail(res); setAskRecv(false); setRecvQty({}); }
  };

  return (
    <Card className={`p-4 ${record ? 'border-l-4 border-emerald-500' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#1a2844]/10 flex items-center justify-center text-xl flex-shrink-0">{task.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap"><span className={`font-semibold ${record ? 'line-through text-gray-400' : ''}`}>{task.label}</span><span className="font-mono text-xs text-[#c9973b]">{task.time}</span></div>
          <div className="text-sm text-gray-500 mt-0.5">{task.desc}</div>
          {record && (
            <div className="mt-2 text-xs text-emerald-700">✓ Hoàn thành lúc {record.doneAt.split(' ')[1]} · {record.byName}
              {record.deductions.length > 0 && <div className="flex flex-wrap gap-1.5 mt-1.5">{record.deductions.map((d, i) => <span key={i} className="px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700">−{fmtQty(d.qty)} {d.unit} {d.itemName}</span>)}</div>}
            </div>
          )}
        </div>
        {record
          ? (isToday && <Btn variant="secondary" size="sm" onClick={() => { if (window.confirm('Hủy hoàn thành? Vật tư đã trừ sẽ được cộng lại vào kho.')) { const e = onUndo(record.id); if (e) setErr(e); } }}>↩ Hủy hoàn thành</Btn>)
          : isToday ? (
            <div className="flex flex-col gap-2 items-end">
              <Btn variant="gold" size="sm" onClick={run}>{isFeed ? '✓ Đã cho ăn' : 'Xong ✓'}</Btn>
              {!isFeed && <button onClick={() => setOpen(!open)} className="text-xs text-[#c9973b] hover:underline">{open ? 'Ẩn vật tư' : '＋ Vật tư đã dùng'}</button>}
            </div>
          ) : <span className="text-xs text-gray-400">Chưa làm</span>}
      </div>
      {!record && isToday && !isFeed && open && <div className="mt-3 pt-3 border-t border-gray-100"><div className="text-xs font-medium text-gray-600 mb-2">Vật tư đã dùng (tự động trừ kho)</div><SupplyPicker items={inventory} rows={rows} setRows={setRows} /></div>}
      {err && <div className="mt-3 text-sm text-red-600">⚠ {err}</div>}
      {fail && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 space-y-2">
          <div>⛔ {fail.message}</div>
          {fail.shortages.length > 0 && !askRecv && (
            <div className="flex items-center gap-2"><span>Bạn có muốn nhập thêm vào kho không?</span><Btn size="sm" variant="gold" onClick={() => { setAskRecv(true); setRecvQty(Object.fromEntries(fail.shortages.map(s => [s.itemId, fmtQty(Math.ceil((s.need - s.have) * 100) / 100)]))); }}>Nhập thêm</Btn><Btn size="sm" variant="secondary" onClick={() => setFail(null)}>Bỏ qua</Btn></div>
          )}
          {fail.shortages.length === 0 && <div className="flex gap-2"><Btn size="sm" variant="gold" onClick={() => navigate('inventory')}>Đi tới Kho của tôi</Btn><Btn size="sm" variant="secondary" onClick={() => setFail(null)}>Đóng</Btn></div>}
          {askRecv && (
            <div className="space-y-2">
              {fail.shortages.map(s => (
                <div key={s.itemId} className="flex items-center gap-2 text-gray-700"><span className="flex-1">{s.name}: nhận thêm</span><input value={recvQty[s.itemId] || ''} onChange={e => setRecvQty(p => ({ ...p, [s.itemId]: e.target.value }))} inputMode="decimal" className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-sm bg-white" /><span>{s.unit}</span></div>
              ))}
              <div className="flex gap-2">
                <Btn size="sm" variant="gold" onClick={() => {
                  for (const s of fail.shortages) {
                    const q = numOf(recvQty[s.itemId] || '');
                    if (!(q > 0)) { setErr('Nhập số lượng nhận thêm > 0.'); return; }
                  }
                  for (const s of fail.shortages) { const e = onReceive(s.itemId, numOf(recvQty[s.itemId]), toISO(date)); if (e) { setErr(e); return; } }
                  setFail(null); setAskRecv(false); setErr('');
                }}>Nhập vào kho</Btn>
                <Btn size="sm" variant="secondary" onClick={() => setAskRecv(false)}>Huỷ</Btn>
              </div>
              <div className="text-xs text-gray-500">Sau khi nhập kho, bấm lại nút hoàn thành.</div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function CareHubPage({ state, navigate, onComplete, onUndo, onReceive, onReport }:
  { state: AppState; navigate: (p: Page) => void;
    onComplete: (horseId: string, key: string, supplies: SupplyLine[]) => CareResult; onUndo: (id: string) => string | null;
    onReceive: (itemId: string, qty: number, dateISO: string) => string | null;
    onReport: (i: { horseId: string; type: string; description: string; imageUrl: string }) => string | null }) {
  const me = state.user!;
  const horses = state.horses.filter(h => h.clubId === me.clubId && h.approvalStatus === 'approved');
  const inventory = state.inventory.filter(i => i.clubId === me.clubId);
  const [tab, setTab] = useState<'map' | 'ration' | 'tasks' | 'treat' | 'incident'>('map');
  const [horseId, setHorseId] = useState(horses[0]?.id || '');
  const [dayOffset, setDayOffset] = useState(0);
  const date = shiftDate(TODAY, dayOffset);
  const isToday = dayOffset === 0;
  const horse = horses.find(h => h.id === horseId) || horses[0];
  const recFor = (hId: string, key: string) => state.careRecords.find(r => r.horseId === hId && r.date === date && r.taskKey === key);
  const doneCount = (h: Horse) => dailyTasks(h).filter(t => recFor(h.id, t.key)).length;
  const lowItems = inventory.filter(isLow);

  const [inc, setInc] = useState({ horseId: horse?.id || '', type: 'Bỏ ăn', description: '', imageUrl: '' });
  const [incErr, setIncErr] = useState('');
  const incidents = state.incidents.filter(i => i.clubId === me.clubId);

  const stables = Array.from(new Set(horses.map(h => h.stable))).sort();
  const treatHorses = horses.filter(needsTreatment);
  const guide = (h: Horse) => {
    const recs = state.healthRecords.filter(r => r.horseId === h.id && (r.diagnosis || r.recommendations || r.medications));
    return sortHealthRecords(recs)[0];
  };

  const tabs = [['map', '🗺 Sơ đồ & lịch'], ['ration', '🌾 Khẩu phần'], ['tasks', '✅ Công việc'], ['treat', '🩹 Trị thương'], ['incident', '🚨 Báo sự cố']] as const;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-xl font-serif font-bold">Chăm sóc & Chuồng trại</h2><p className="text-sm text-gray-500">Nhân viên chăm sóc · {horses.length} ngựa trong khu vực</p></div>
        <div className="flex items-center gap-2 bg-white border rounded-xl px-2 py-1.5 text-sm">
          <button onClick={() => setDayOffset(d => Math.max(-30, d - 1))} className="w-7 h-7 rounded-lg hover:bg-gray-100">‹</button>
          <span className="font-mono min-w-24 text-center">{date}{isToday ? ' · Hôm nay' : ''}</span>
          <button onClick={() => setDayOffset(d => Math.min(0, d + 1))} disabled={isToday} className="w-7 h-7 rounded-lg hover:bg-gray-100 disabled:opacity-30">›</button>
        </div>
      </div>
      {!isToday && <Card className="p-3 bg-gray-50 text-sm text-gray-600">Đang xem lịch ngày {date} (chỉ xem). Chỉ đánh dấu hoàn thành được cho ngày hôm nay.</Card>}
      {lowItems.length > 0 && <Card className="p-3 border-l-4 border-amber-400 bg-amber-50" onClick={() => navigate('inventory')}><div className="text-sm text-amber-800">📦 <strong>Sắp hết:</strong> {lowItems.map(i => `${i.name} (${fmtQty(i.qty)} ${i.unit})`).join(', ')} — nhấn để mở kho</div></Card>}

      <div className="flex gap-0 border-b border-gray-200 overflow-x-auto">
        {tabs.map(([t, l]) => <button key={t} onClick={() => setTab(t)} className={`px-5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${tab === t ? 'border-[#c9973b] text-[#c9973b]' : 'border-transparent text-gray-500 hover:text-[#0f1729]'}`}>{l}</button>)}
      </div>

      {tab !== 'treat' && horses.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {horses.map(h => <button key={h.id} onClick={() => { setHorseId(h.id); setInc(i => ({ ...i, horseId: h.id })); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm ${horse?.id === h.id ? 'bg-[#1a2844] text-white border-[#1a2844]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#c9973b]'}`}><img src={h.imageUrl || undefined} className="w-6 h-6 rounded-full object-cover bg-gray-200" />{h.name}</button>)}
        </div>
      )}
      {horses.length === 0 && <Card className="p-8 text-center text-sm text-gray-400">Chưa có ngựa nào trong trung tâm</Card>}

      {horse && tab === 'map' && (
        <div className="space-y-4">
          {stables.map(st => (
            <Card key={st} className="p-5">
              <h3 className="font-semibold mb-3">🏠 {st}</h3>
              <div className="grid grid-cols-4 gap-3">
                {horses.filter(h => h.stable === st).sort((a, b) => a.stall.localeCompare(b.stall)).map(h => {
                  const total = dailyTasks(h).length; const done = doneCount(h);
                  return (
                    <button key={h.id} onClick={() => setHorseId(h.id)} className={`text-left p-3 rounded-xl border-2 transition-all ${horse.id === h.id ? 'border-[#c9973b] bg-[#c9973b]/5' : 'border-gray-200 hover:border-[#c9973b]'}`}>
                      <div className="flex items-center justify-between text-xs mb-2"><span className="font-mono font-bold text-[#1a2844]">Ô {h.stall}</span>{needsTreatment(h) && <span className="text-red-600">🩹</span>}</div>
                      <img src={h.imageUrl || undefined} className="w-full h-20 object-cover rounded-lg bg-gray-200 mb-2" />
                      <div className="font-medium text-sm truncate">{h.name}</div>
                      <div className="mt-1.5 w-full bg-gray-200 rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.round(done / total * 100)}%` }} /></div>
                      <div className="text-[11px] text-gray-500 mt-1">{done}/{total} việc</div>
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
          <Card className="p-5">
            <h3 className="font-semibold mb-1">Lịch sinh hoạt — {horse.name} <span className="text-xs text-gray-400 font-normal">· {horse.stable}, Ô {horse.stall} · {date}</span></h3>
            <div className="mt-3 space-y-2">
              {dailyTasks(horse).map(t => { const r = recFor(horse.id, t.key); return (
                <div key={t.key} className="flex items-center gap-3 text-sm py-1.5 border-b border-gray-50 last:border-0">
                  <span className="font-mono text-xs text-[#c9973b] w-12">{t.time}</span><span>{t.icon}</span>
                  <span className={`flex-1 ${r ? 'line-through text-gray-400' : ''}`}>{t.label}</span>
                  {r ? <span className="text-xs text-emerald-600">✓ {r.doneAt.split(' ')[1]}</span> : <span className="text-xs text-gray-400">Chờ</span>}
                </div>
              ); })}
            </div>
          </Card>
        </div>
      )}

      {horse && tab === 'ration' && (() => {
        const ration = RATIONS[horse.id];
        if (!ration) return <Card className="p-8 text-center text-sm text-gray-500">🌾 <strong>{horse.name}</strong> chưa có khẩu phần được duyệt. Cần Thú y duyệt khẩu phần trước khi cho ăn.</Card>;
        const kinds = { grain: inventory.find(i => i.foodKind === 'grain'), hay: inventory.find(i => i.foodKind === 'hay'), vitamin: inventory.find(i => i.foodKind === 'vitamin') };
        return (
          <div className="space-y-4">
            <div className="text-sm text-gray-500">Khẩu phần đã duyệt bởi {ration.approvedBy} · {ration.approvedAt}</div>
            <div className="grid grid-cols-3 gap-4">
              <StatCard label="Ngũ cốc / ngày" value={`${ration.meals.reduce((a, m) => a + m.grain, 0)} kg`} color="gold" />
              <StatCard label="Cỏ / ngày" value={`${ration.meals.reduce((a, m) => a + m.hay, 0)} kg`} color="green" />
              <StatCard label="Vitamin / ngày" value={`${ration.meals.reduce((a, m) => a + m.vitamin, 0)} gói`} color="navy" />
            </div>
            {ration.meals.map(m => (
              <Card key={m.meal} className="p-5">
                <div className="flex items-center gap-2 mb-3"><span className="font-mono text-sm text-[#c9973b] font-bold">{m.time}</span><span className="font-semibold">Bữa {m.meal.toLowerCase()}</span>{recFor(horse.id, `feed-${m.meal}`) && <span className="text-xs text-emerald-600">✓ Đã cho ăn</span>}</div>
                <div className="grid grid-cols-4 gap-3 text-sm">
                  {[['Ngũ cốc', `${m.grain} kg`, kinds.grain?.name], ['Cỏ', `${m.hay} kg`, kinds.hay?.name], ['Vitamin', m.vitamin ? `${m.vitamin} gói` : '—', m.vitamin ? (m.vitaminName || kinds.vitamin?.name) : undefined], ['Nước', `${m.water} lít`, undefined]].map(([k, v, sub]) => (
                    <div key={k as string} className="p-3 bg-gray-50 rounded-lg"><div className="text-xs text-gray-500">{k as string}</div><div className="font-bold">{v as string}</div>{sub && <div className="text-[11px] text-gray-400 truncate">{sub as string}</div>}</div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        );
      })()}

      {horse && tab === 'tasks' && (
        <div className="space-y-3">
          <div className="text-sm text-gray-500">{horse.name} · {horse.stable}, Ô {horse.stall} · hoàn thành {doneCount(horse)}/{dailyTasks(horse).length} việc</div>
          {dailyTasks(horse).filter(t => t.key !== 'treat').map(t => (
            <CareTaskRow key={`${horse.id}-${date}-${t.key}`} horse={horse} task={t} date={date} isToday={isToday} record={recFor(horse.id, t.key)} inventory={inventory} onComplete={onComplete} onUndo={onUndo} onReceive={onReceive} navigate={navigate} />
          ))}
          {needsTreatment(horse) && <Card className="p-3 bg-red-50 border border-red-200 text-sm text-red-700">🩹 {horse.name} đang điều trị — xem tab "Trị thương" để thực hiện theo hướng dẫn Thú y.</Card>}
        </div>
      )}

      {tab === 'treat' && (
        <div className="space-y-4">
          {treatHorses.length === 0 && <Card className="p-8 text-center text-sm text-gray-400">Không có ngựa nào đang điều trị hoặc phục hồi</Card>}
          {treatHorses.map(h => {
            const g = guide(h); const task = dailyTasks(h).find(t => t.key === 'treat')!;
            return (
              <div key={h.id} className="space-y-2">
                <Card className="p-5 border-l-4 border-red-400">
                  <div className="flex items-center gap-3 mb-3"><img src={h.imageUrl || undefined} className="w-12 h-12 rounded-lg object-cover bg-gray-200" /><div className="flex-1"><div className="font-semibold">{h.name}</div><div className="text-xs text-gray-500">{h.stable}, Ô {h.stall}{h.rehab ? ` · Phục hồi: ${h.rehab.name}` : ''}</div></div></div>
                  {h.lock && <div className="text-sm text-red-700 mb-2"><strong>Chẩn đoán hiện tại:</strong> {h.lock.reason}</div>}
                  {g ? (
                    <div className="space-y-2 text-sm">
                      <div className="text-xs text-gray-400">Thú y {g.vet} ghi ngày {g.date}</div>
                      {g.diagnosis && <div><strong>Chẩn đoán:</strong> {g.diagnosis}</div>}
                      {g.medications && g.medications !== 'None' && <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg"><strong>Thuốc / điều trị:</strong> {g.medications}</div>}
                      {g.recommendations && <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg"><strong>Hướng dẫn chăm sóc:</strong> {g.recommendations}</div>}
                      {g.notes && <div className="text-gray-500">Ghi chú: {g.notes}</div>}
                    </div>
                  ) : <div className="text-sm text-gray-400">Thú y chưa ghi hướng dẫn chăm sóc cho ngựa này.</div>}
                </Card>
                <CareTaskRow key={`${h.id}-${date}-treat`} horse={h} task={task} date={date} isToday={isToday} record={recFor(h.id, 'treat')} inventory={inventory} onComplete={onComplete} onUndo={onUndo} onReceive={onReceive} navigate={navigate} defaultOpen />
              </div>
            );
          })}
        </div>
      )}

      {tab === 'incident' && (
        <div className="space-y-4">
          <Card className="p-5 border-l-4 border-red-400">
            <h3 className="font-semibold mb-4">🚨 Báo cáo sự cố đột xuất</h3>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Ngựa" value={inc.horseId} onChange={v => setInc(i => ({ ...i, horseId: v }))} options={horses.map(h => ({ value: h.id, label: `${h.name} (${h.stable}, Ô ${h.stall})` }))} />
              <Select label="Loại sự cố" value={inc.type} onChange={v => setInc(i => ({ ...i, type: v }))} options={['Bỏ ăn', 'Dấu hiệu đau bụng', 'Sốt', 'Móng bị xước', 'Khác'].map(v => ({ value: v, label: v }))} />
              <div className="col-span-2"><Textarea label="Mô tả *" value={inc.description} onChange={v => setInc(i => ({ ...i, description: v }))} placeholder="Quan sát được gì, từ lúc nào, mức độ..." /></div>
              <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Hình ảnh</label><ImageUpload value={inc.imageUrl} onChange={u => setInc(i => ({ ...i, imageUrl: u }))} onRemove={() => setInc(i => ({ ...i, imageUrl: '' }))} /></div>
            </div>
            {incErr && <div className="mt-3 text-sm text-red-600">⚠ {incErr}</div>}
            <Btn variant="danger" className="mt-4" onClick={() => { const e = onReport(inc); setIncErr(e || ''); if (!e) setInc(i => ({ ...i, description: '', imageUrl: '' })); }}>Gửi báo cáo cho Thú y & Quản lý</Btn>
          </Card>
          <h3 className="font-semibold">Báo cáo đã gửi</h3>
          {incidents.length === 0 && <Card className="p-5 text-sm text-gray-400 text-center">Chưa có báo cáo nào</Card>}
          {incidents.map(i => (
            <Card key={i.id} className="p-4 flex gap-3">
              {i.imageUrl && <img src={i.imageUrl} className="w-20 h-20 rounded-lg object-cover bg-gray-200" />}
              <div className="flex-1 text-sm"><div className="font-semibold">{i.horseName} · {i.type}</div><div className="text-gray-600 mt-0.5">{i.description}</div><div className="text-xs text-gray-400 mt-1">{i.at} · {i.reportedByName}</div></div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function InventoryPage({ state, navigate, onAdd, onReceive, onEdit, onAdjust, onDelete }:
  { state: AppState; navigate: (p: Page) => void;
    onAdd: (f: { name: string; category: InvCategory; foodKind: FoodKind; unit: InvUnit; qty: number; threshold: number }) => string | null;
    onReceive: (itemId: string, qty: number, dateISO: string) => string | null;
    onEdit: (itemId: string, f: { name: string; category: InvCategory; foodKind: FoodKind; unit: InvUnit; threshold: number }) => string | null;
    onAdjust: (itemId: string, qty: number, reason: string) => string | null;
    onDelete: (itemId: string) => string | null }) {
  const clubId = state.user!.clubId;
  const items = state.inventory.filter(i => i.clubId === clubId);
  const [panel, setPanel] = useState<{ mode: 'add' | 'receive' | 'adjust' | 'edit'; itemId?: string } | null>(null);
  const [f, setF] = useState({ name: '', category: 'food' as InvCategory, foodKind: 'grain' as FoodKind, unit: 'kg' as InvUnit, qty: '', threshold: '', date: toISO(TODAY), reason: '' });
  const [err, setErr] = useState('');
  const target = items.find(i => i.id === panel?.itemId);
  const open = (mode: 'add' | 'receive' | 'adjust' | 'edit', it?: InvItem) => {
    setErr(''); setPanel({ mode, itemId: it?.id });
    setF(p => ({ ...p, name: it?.name || '', category: it?.category || 'food', foodKind: it?.foodKind || 'other', unit: it?.unit || 'kg', qty: mode === 'adjust' && it ? fmtQty(it.qty) : '', threshold: it ? fmtQty(it.threshold) : '', date: toISO(TODAY), reason: '' }));
  };
  const submit = () => {
    let e: string | null = null;
    if (panel?.mode === 'add') e = onAdd({ name: f.name, category: f.category, foodKind: f.foodKind, unit: f.unit, qty: numOf(f.qty || '0'), threshold: numOf(f.threshold || '0') });
    if (panel?.mode === 'receive' && target) e = onReceive(target.id, numOf(f.qty), f.date);
    if (panel?.mode === 'adjust' && target) e = onAdjust(target.id, numOf(f.qty), f.reason);
    if (panel?.mode === 'edit' && target) e = onEdit(target.id, { name: f.name, category: f.category, foodKind: f.foodKind, unit: f.unit, threshold: numOf(f.threshold || '0') });
    if (e) setErr(e); else { setPanel(null); setErr(''); }
  };
  const catSelect = <Select label="Nhóm" value={f.category} onChange={v => setF(p => ({ ...p, category: v as InvCategory }))} options={(Object.keys(INV_CAT_LABEL) as InvCategory[]).map(k => ({ value: k, label: INV_CAT_LABEL[k] }))} />;
  const kindSelect = f.category === 'food' && <Select label="Loại thức ăn (dùng cho khẩu phần)" value={f.foodKind} onChange={v => setF(p => ({ ...p, foodKind: v as FoodKind }))} options={(Object.keys(FOOD_KIND_LABEL) as FoodKind[]).map(k => ({ value: k, label: FOOD_KIND_LABEL[k] }))} />;
  const unitSelect = <Select label="Đơn vị" value={f.unit} onChange={v => setF(p => ({ ...p, unit: v as InvUnit }))} options={INV_UNITS.map(u => ({ value: u, label: u }))} />;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-xl font-serif font-bold">Kho của tôi</h2><p className="text-sm text-gray-500">Nhân viên chăm sóc tự quản lý · {items.length} vật tư · {items.filter(isLow).length} sắp hết</p></div>
        <div className="flex gap-2"><Btn variant="secondary" onClick={() => navigate('inventory-log')}>📜 Lịch sử kho</Btn><Btn variant="gold" onClick={() => open('add')}>＋ Thêm vật tư</Btn></div>
      </div>

      {panel && (
        <Card className="p-5 border-l-4 border-[#c9973b]">
          <h3 className="font-semibold mb-4">{panel.mode === 'add' ? 'Thêm vật tư mới' : panel.mode === 'receive' ? `Nhập thêm hàng — ${target?.name}` : panel.mode === 'adjust' ? `Kiểm kê / chỉnh số tồn — ${target?.name}` : `Sửa vật tư — ${target?.name}`}</h3>
          <div className="grid grid-cols-2 gap-4">
            {(panel.mode === 'add' || panel.mode === 'edit') && <><div className="col-span-2"><Input label="Tên vật tư" required value={f.name} onChange={v => setF(p => ({ ...p, name: v }))} /></div>{catSelect}{unitSelect}{kindSelect}</>}
            {panel.mode === 'add' && <Input label="Số lượng ban đầu" type="number" value={f.qty} onChange={v => setF(p => ({ ...p, qty: v }))} />}
            {(panel.mode === 'add' || panel.mode === 'edit') && <Input label="Ngưỡng cảnh báo sắp hết" type="number" value={f.threshold} onChange={v => setF(p => ({ ...p, threshold: v }))} />}
            {panel.mode === 'receive' && <><Input label={`Số lượng nhận thêm (${target?.unit})`} required type="number" value={f.qty} onChange={v => setF(p => ({ ...p, qty: v }))} /><Input label="Ngày nhập" required type="date" value={f.date} onChange={v => setF(p => ({ ...p, date: v }))} /><div className="col-span-2 text-sm text-gray-500">Tồn hiện tại {fmtQty(target?.qty || 0)} {target?.unit} → sau nhập {fmtQty((target?.qty || 0) + (numOf(f.qty) || 0))} {target?.unit}</div></>}
            {panel.mode === 'adjust' && <><Input label={`Số tồn thực tế sau kiểm kê (${target?.unit})`} required type="number" value={f.qty} onChange={v => setF(p => ({ ...p, qty: v }))} /><Input label="Lý do điều chỉnh" required value={f.reason} onChange={v => setF(p => ({ ...p, reason: v }))} placeholder="VD: Kiểm kê cuối tuần, hao hụt" /></>}
          </div>
          {err && <div className="mt-3 text-sm text-red-600">⚠ {err}</div>}
          <div className="flex gap-2 mt-4"><Btn variant="gold" onClick={submit}>💾 Lưu</Btn><Btn variant="secondary" onClick={() => setPanel(null)}>Huỷ</Btn></div>
        </Card>
      )}

      {(Object.keys(INV_CAT_LABEL) as InvCategory[]).map(cat => {
        const list = items.filter(i => i.category === cat);
        return (
          <section key={cat} className="space-y-2">
            <h3 className="font-semibold text-[#0f1729]">{cat === 'food' ? '🌾' : cat === 'medical' ? '💊' : '🧰'} {INV_CAT_LABEL[cat]} <span className="text-xs text-gray-400 font-normal">({list.length})</span></h3>
            {list.length === 0 && <Card className="p-4 text-sm text-gray-400 text-center">Chưa có vật tư trong nhóm này</Card>}
            {list.map(i => (
              <Card key={i.id} className={`p-4 ${isLow(i) ? 'border-l-4 border-amber-400' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap"><span className="font-semibold">{i.name}</span>{i.foodKind && i.foodKind !== 'other' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{FOOD_KIND_LABEL[i.foodKind]}</span>}{isLow(i) && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-medium">Sắp hết</span>}</div>
                    <div className="text-xs text-gray-400 mt-0.5">Ngưỡng cảnh báo: {fmtQty(i.threshold)} {i.unit}</div>
                  </div>
                  <div className="text-right"><div className={`text-2xl font-bold font-mono ${isLow(i) ? 'text-amber-600' : 'text-[#1a2844]'}`}>{fmtQty(i.qty)}</div><div className="text-xs text-gray-500">{i.unit} tồn</div></div>
                  <div className="flex gap-1.5 flex-wrap justify-end w-64">
                    <Btn size="sm" variant="gold" onClick={() => open('receive', i)}>＋ Nhập</Btn>
                    <Btn size="sm" variant="secondary" onClick={() => open('adjust', i)}>Kiểm kê</Btn>
                    <Btn size="sm" variant="secondary" onClick={() => open('edit', i)}>Sửa</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => { if (window.confirm(`Xóa vật tư "${i.name}"? Lịch sử kho vẫn được giữ lại.`)) { const e = onDelete(i.id); if (e) setErr(e); } }}>🗑</Btn>
                  </div>
                </div>
              </Card>
            ))}
          </section>
        );
      })}
    </div>
  );
}

const LOG_KIND: Record<InvLog['kind'], { label: string; cls: string }> = {
  in: { label: 'Nhập kho', cls: 'bg-emerald-100 text-emerald-700' }, out: { label: 'Xuất kho', cls: 'bg-red-100 text-red-700' },
  refund: { label: 'Hoàn kho', cls: 'bg-sky-100 text-sky-700' }, adjust: { label: 'Kiểm kê', cls: 'bg-amber-100 text-amber-700' },
  edit: { label: 'Sửa / Xóa', cls: 'bg-gray-100 text-gray-600' },
};

function InventoryLogPage({ state, navigate }: { state: AppState; navigate: (p: Page) => void }) {
  const clubId = state.user!.clubId;
  const all = state.invLogs.filter(l => l.clubId === clubId).sort((a, b) => b.ts - a.ts);
  const [fItem, setFItem] = useState(''); const [fHorse, setFHorse] = useState('');
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [dir, setDir] = useState<'all' | 'in' | 'out'>('all');
  const itemOpts = Array.from(new Map(all.map(l => [l.itemId, l.itemName])).entries());
  const horseOpts = Array.from(new Map(all.filter(l => l.horseId).map(l => [l.horseId!, l.horseName || l.horseId!])).entries());
  const logs = all.filter(l => (!fItem || l.itemId === fItem) && (!fHorse || l.horseId === fHorse) && (!from || toISO(l.date) >= from) && (!to || toISO(l.date) <= to)
    && (dir === 'all' || (dir === 'in' ? l.delta > 0 : l.delta < 0)));
  const byHorse = new Map<string, { name: string; items: Map<string, { name: string; unit: string; qty: number }> }>();
  logs.filter(l => l.horseId && (l.kind === 'out' || l.kind === 'refund')).forEach(l => {
    const h = byHorse.get(l.horseId!) || { name: l.horseName || l.horseId!, items: new Map() };
    const it = h.items.get(l.itemId) || { name: l.itemName, unit: l.unit, qty: 0 };
    it.qty += -l.delta; h.items.set(l.itemId, it); byHorse.set(l.horseId!, h);
  });
  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-serif font-bold">Lịch sử kho</h2><p className="text-sm text-gray-500">{logs.length} dòng · Nhập (+) và Xuất (−)</p></div><Btn variant="secondary" onClick={() => navigate('inventory')}>← Kho của tôi</Btn></div>
      <Card className="p-4">
        <div className="grid grid-cols-5 gap-3">
          <Select label="Vật tư" value={fItem} onChange={setFItem} options={[{ value: '', label: 'Tất cả' }, ...itemOpts.map(([v, l]) => ({ value: v, label: l }))]} />
          <Select label="Ngựa" value={fHorse} onChange={setFHorse} options={[{ value: '', label: 'Tất cả' }, ...horseOpts.map(([v, l]) => ({ value: v, label: l }))]} />
          <Input label="Từ ngày" type="date" value={from} onChange={setFrom} />
          <Input label="Đến ngày" type="date" value={to} onChange={setTo} />
          <Select label="Loại dòng" value={dir} onChange={v => setDir(v as 'all' | 'in' | 'out')} options={[{ value: 'all', label: 'Tất cả' }, { value: 'in', label: 'Nhập (+)' }, { value: 'out', label: 'Xuất (−)' }]} />
        </div>
      </Card>
      <section className="space-y-2">
        <h3 className="font-semibold">Lượng tiêu thụ theo từng ngựa</h3>
        {byHorse.size === 0 && <Card className="p-4 text-sm text-gray-400 text-center">Chưa có lượt sử dụng nào theo bộ lọc</Card>}
        <div className="grid grid-cols-2 gap-3">
          {Array.from(byHorse.entries()).map(([hid, h]) => (
            <Card key={hid} className="p-4"><div className="font-semibold mb-2">{h.name} <span className="text-xs text-gray-400 font-mono">{hid}</span></div><div className="flex flex-wrap gap-1.5">{Array.from(h.items.values()).map(it => <span key={it.name} className="text-xs px-2 py-1 rounded-full bg-red-50 border border-red-200 text-red-700">{it.name}: {fmtQty(it.qty)} {it.unit}</span>)}</div></Card>
          ))}
        </div>
      </section>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 text-left"><tr><th className="px-4 py-2.5">Thời gian</th><th className="px-3">Loại</th><th className="px-3">Vật tư</th><th className="px-3 text-right">Thay đổi</th><th className="px-3 text-right">Tồn sau</th><th className="px-3">Ngựa</th><th className="px-3">Việc / lý do</th><th className="px-3">Người thao tác</th></tr></thead>
          <tbody>
            {logs.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Không có dòng nào</td></tr>}
            {logs.map(l => (
              <tr key={l.id} className="border-t border-gray-100">
                <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">{l.at}</td>
                <td className="px-3"><span className={`text-xs px-2 py-0.5 rounded-full ${LOG_KIND[l.kind].cls}`}>{LOG_KIND[l.kind].label}</span></td>
                <td className="px-3">{l.itemName}</td>
                <td className={`px-3 text-right font-mono font-bold ${l.delta > 0 ? 'text-emerald-600' : l.delta < 0 ? 'text-red-600' : 'text-gray-400'}`}>{l.delta > 0 ? '+' : ''}{fmtQty(l.delta)} {l.unit}</td>
                <td className="px-3 text-right font-mono">{fmtQty(l.balance)}</td>
                <td className="px-3">{l.horseName || '—'}</td>
                <td className="px-3 text-gray-500">{[l.task, l.reason].filter(Boolean).join(' · ') || '—'}</td>
                <td className="px-3 text-gray-500 whitespace-nowrap">{l.byName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── Vet Health Form ───────────────────────────────────────────────────────────

// ── Training Eligibility Logic ────────────────────────────────────────────────

type TEStatus = 'incomplete' | 'eligible' | 'conditional' | 'not-eligible';
interface NutritionSuggestion { category: string; items: string[]; note: string; }
interface TrainingEligResult {
  status: TEStatus;
  reasons: string[];
  adjustments: string[];
  trainingNote: string;
  nutritionSuggestions: NutritionSuggestion[];
}

function deriveTrainingEligibility(params: {
  hasMinVitals: boolean;
  hasFail: boolean;
  hrVal: number | null; tempVal: number | null; rrVal: number | null;
  hrSt: string; tempSt: string; rrSt: string;
  clinical: Record<string, string>;
  injuryDetails: Record<string, InjuryDetail>;
}): TrainingEligResult {
  const { hasMinVitals, hasFail, hrVal, tempVal, rrVal, hrSt, tempSt, rrSt, clinical, injuryDetails } = params;

  if (!hasMinVitals) return { status: 'incomplete', reasons: [], adjustments: [], trainingNote: '', nutritionSuggestions: [] };

  const severeInjuries = Object.entries(injuryDetails).filter(([, detail]) => detail.severity === 'severe');

  // CASE 3: Any vital exceeds ±10% or a severe injury is recorded → not eligible
  if (hasFail || severeInjuries.length > 0) {
    const reasons: string[] = [];
    if (hrSt === 'fail' && hrVal !== null) reasons.push(`Nhịp tim: ${hrVal} lần/phút (Bình thường: 28–44) — vượt ngưỡng ±10%`);
    if (tempSt === 'fail' && tempVal !== null) reasons.push(`Nhiệt độ: ${tempVal}°C (Bình thường: 37,2–38,3°C) — vượt ngưỡng ±10%`);
    if (rrSt === 'fail' && rrVal !== null) reasons.push(`Nhịp thở: ${rrVal} lần/phút (Bình thường: 8–16) — vượt ngưỡng ±10%`);
    severeInjuries.forEach(([, detail]) => reasons.push(`Chấn thương nặng: ${detail.issue}`));
    const adjustments = ['Tạm ngưng huấn luyện ngay lập tức.', 'Theo dõi sát tình trạng ngựa.', 'Tái khám trước khi được phép luyện tập trở lại.'];
    const trainingNote = `Lý do:\n${reasons.map(r => `- ${r}`).join('\n')}\n\nKhuyến nghị:\n${adjustments.map(a => `- ${a}`).join('\n')}`;
    return { status: 'not-eligible', reasons, adjustments, trainingNote, nutritionSuggestions: [] };
  }

  // CASE 2: watch — analyse causes
  const reasons: string[] = [];
  const adjustments: string[] = [];
  const nutritionSuggestions: NutritionSuggestion[] = [];
  let hasHighVital = false;
  let hasLowVital = false;

  if (hrSt === 'watch' && hrVal !== null) {
    if (hrVal > 44) { hasHighVital = true; reasons.push(`Nhịp tim cao hơn mức tham chiếu: ${hrVal} lần/phút (Bình thường: 28–44)`); }
    else { hasLowVital = true; reasons.push(`Nhịp tim thấp hơn mức tham chiếu: ${hrVal} lần/phút (Bình thường: 28–44)`); }
  }
  if (tempSt === 'watch' && tempVal !== null) {
    if (tempVal > 38.3) { hasHighVital = true; reasons.push(`Nhiệt độ cao hơn mức tham chiếu: ${tempVal}°C (Bình thường: 37,2–38,3°C)`); }
    else { hasLowVital = true; reasons.push(`Nhiệt độ thấp hơn mức tham chiếu: ${tempVal}°C (Bình thường: 37,2–38,3°C)`); }
  }
  if (rrSt === 'watch' && rrVal !== null) {
    if (rrVal > 16) { hasHighVital = true; reasons.push(`Nhịp thở cao hơn mức tham chiếu: ${rrVal} lần/phút (Bình thường: 8–16)`); }
    else { hasLowVital = true; reasons.push(`Nhịp thở thấp hơn mức tham chiếu: ${rrVal} lần/phút (Bình thường: 8–16)`); }
  }

  const clinicalLabels: Record<string, string> = {
    eyes: 'Mắt', nose: 'Mũi', mouth: 'Miệng / Nướu', movement: 'Vận động',
    eating: 'Ăn uống', waste: 'Phân và nước tiểu', skin: 'Da và lông', behavior: 'Hành vi',
  };
  const clinicalAbn: string[] = [];
  Object.entries(clinical).forEach(([k, v]) => {
    if (v === 'abnormal') {
      clinicalAbn.push(k);
      const detail = injuryDetails[k];
      const severityLabel = detail?.severity === 'moderate' ? 'vừa' : detail?.severity === 'severe' ? 'nặng' : 'nhẹ';
      reasons.push(`${clinicalLabels[k] || k}: ${detail?.issue || 'Bất thường'} (${severityLabel})`);
    }
  });

  // CASE 1: No issues → eligible
  if (reasons.length === 0) {
    return { status: 'eligible', reasons: [], adjustments: ['Huấn luyện bình thường theo kế hoạch hiện tại.'], trainingNote: '', nutritionSuggestions: [] };
  }

  // Build adjustments for conditional
  if (hasHighVital) {
    adjustments.push('Giảm cường độ huấn luyện.', 'Theo dõi phản ứng của ngựa trong buổi tập.', 'Đánh giá lại sau buổi tập.');
  } else if (hasLowVital && clinicalAbn.length === 0) {
    adjustments.push('Có thể tăng cường độ từ từ nếu các dấu hiệu khác bình thường.', 'Theo dõi phản ứng của ngựa.', 'Không tăng cường độ đột ngột.');
  }
  if (clinicalAbn.length > 0) {
    if (!hasHighVital && !hasLowVital) adjustments.push('Tiếp tục theo dõi trong các buổi tập.');
    adjustments.push('Đánh giá khẩu phần dinh dưỡng.', 'Tham khảo bác sĩ thú y về hỗ trợ dinh dưỡng phù hợp.');
    if (clinicalAbn.includes('skin')) {
      nutritionSuggestions.push({ category: 'Da / Lông', items: ['Chế độ ăn cân đối', 'Omega-3', 'Kẽm', 'Đồng'], note: 'Kẽm và đồng có vai trò đối với da, móng và mô liên kết. Việc bổ sung nên dựa trên khẩu phần và đánh giá dinh dưỡng thực tế.' });
    }
    if (clinicalAbn.includes('movement')) {
      nutritionSuggestions.push({ category: 'Khớp / Vận động', items: ['Đánh giá khẩu phần và tình trạng cơ-xương-khớp', 'Nutritional joint support (theo chỉ định bác sĩ thú y)'], note: 'Không kết luận ngựa bị viêm khớp. Các vấn đề vận động cần được đánh giá qua khám lâm sàng và gait assessment.' });
    }
    if (clinicalAbn.includes('eating') || clinicalAbn.includes('behavior')) {
      nutritionSuggestions.push({ category: 'Cơ / Phục hồi', items: ['Đánh giá khẩu phần năng lượng và protein', 'Đảm bảo cung cấp nước đầy đủ', 'Điện giải (theo đánh giá bác sĩ thú y khi có mất nước)'], note: 'Không tự động kê electrolyte hoặc sản phẩm cụ thể mà không có chỉ định bác sĩ thú y.' });
    }
    if (clinicalAbn.includes('nose') || clinicalAbn.includes('waste')) {
      adjustments.push('Kiểm tra tình trạng nước uống và vệ sinh chuồng trại.');
    }
  }

  const trainingNote = `Lý do:\n${reasons.map(r => `- ${r}`).join('\n')}\n\nKhuyến nghị:\n${adjustments.map(a => `- ${a}`).join('\n')}`;
  return { status: 'conditional', reasons, adjustments, trainingNote, nutritionSuggestions };
}

// ── TrainingEligibilityCard ───────────────────────────────────────────────────
// Reusable read-only card showing training condition derived from a health record

function TrainingEligibilityCard({ result, recordId, compact = false }: { result: TrainingEligResult; recordId?: string; compact?: boolean }) {
  if (result.status === 'incomplete') {
    return (
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <span className="text-2xl">📋</span>
        <div className="text-sm text-gray-500">Nhập đủ sinh hiệu (ít nhất nhiệt độ + nhịp tim) để xem điều kiện huấn luyện.</div>
      </div>
    );
  }

  const cfg = {
    eligible:    { dot: '🟢', label: 'ĐỦ ĐIỀU KIỆN HUẤN LUYỆN',         banner: 'bg-emerald-50 border-emerald-400', title: 'text-emerald-800', pill: 'bg-emerald-100 text-emerald-800 border-emerald-200', arrowIcon: '↑', arrowColor: 'text-emerald-700' },
    conditional: { dot: '🟡', label: 'ĐƯỢC HUẤN LUYỆN CÓ ĐIỀU KIỆN',    banner: 'bg-amber-50 border-amber-400',   title: 'text-amber-800',   pill: 'bg-amber-100 text-amber-800 border-amber-200',   arrowIcon: '↕', arrowColor: 'text-amber-700'   },
    'not-eligible': { dot: '🔴', label: 'KHÔNG ĐỦ ĐIỀU KIỆN HUẤN LUYỆN', banner: 'bg-red-50 border-red-500',       title: 'text-red-800',     pill: 'bg-red-100 text-red-800 border-red-200',         arrowIcon: '⛔', arrowColor: 'text-red-700'    },
  } as const;
  const c = cfg[result.status as keyof typeof cfg];

  return (
    <div className="space-y-3">
      {/* Status banner */}
      <div className={`flex items-center gap-4 p-4 rounded-xl border-2 ${c.banner}`}>
        <span className="text-3xl leading-none">{c.dot}</span>
        <div>
          <div className={`font-bold text-lg tracking-wide ${c.title}`}>{c.label}</div>
          {result.status === 'eligible' && <div className="text-sm text-emerald-700 mt-0.5">Có thể huấn luyện theo kế hoạch hiện tại.</div>}
          {result.status === 'not-eligible' && <div className="text-sm text-red-700 mt-0.5">Tạm ngưng huấn luyện — cần tái khám.</div>}
        </div>
      </div>

      {!compact && result.reasons.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Lý do</div>
          <div className="space-y-1.5">
            {result.reasons.map((r, i) => (
              <div key={i} className={`flex items-start gap-2 text-sm px-3 py-2 rounded-lg border ${result.status === 'not-eligible' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                <span className="font-bold mt-0.5 flex-shrink-0">{result.status === 'not-eligible' ? '✕' : '⚠'}</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!compact && result.adjustments.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Điều chỉnh huấn luyện</div>
          <div className="space-y-1.5">
            {result.adjustments.map((a, i) => (
              <div key={i} className={`flex items-center gap-2 text-sm ${c.arrowColor} font-medium`}>
                <span>{c.arrowIcon}</span><span>{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!compact && result.trainingNote && (
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3 font-semibold text-sm text-gray-700">
            <span>📝</span> Training Note
            <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Tự động tạo</span>
          </div>
          <pre className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed font-sans">{result.trainingNote}</pre>
        </div>
      )}

      {!compact && result.nutritionSuggestions.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Gợi ý hỗ trợ dinh dưỡng</div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-3 text-xs text-amber-700">
            ⚠️ <strong>Disclaimer:</strong> Đây là gợi ý hỗ trợ, không thay thế chẩn đoán hoặc chỉ định của bác sĩ thú y.
          </div>
          <div className="space-y-2">
            {result.nutritionSuggestions.map((ns, i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="font-semibold text-sm text-gray-800 mb-2">🌿 {ns.category}</div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {ns.items.map((item, j) => <span key={j} className="text-xs bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 rounded-full">{item}</span>)}
                </div>
                <div className="text-xs text-gray-500 italic">{ns.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recordId && (
        <div className="text-xs text-gray-400 pt-1">
          Nguồn: Health Examination #{recordId}
        </div>
      )}
    </div>
  );
}

// ── Health Records ────────────────────────────────────────────────────────────

// Parse "dd/mm/yyyy" → timestamp for correct chronological sorting
function parseDDMMYYYY(d: string): number {
  const p = d.split('/');
  if (p.length !== 3) return 0;
  return new Date(+p[2], +p[1] - 1, +p[0]).getTime();
}
function sortHealthRecords(records: HealthRecord[]): HealthRecord[] {
  return [...records].sort((a, b) => {
    const diff = parseDDMMYYYY(b.date) - parseDDMMYYYY(a.date);
    return diff !== 0 ? diff : (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });
}

// ── Other pages ───────────────────────────────────────────────────────────────

function PerformancePage({ state }: { state: AppState }) {
  const horse = state.horses.find(h => h.id === state.selectedHorseId);
  const sessions = state.trainingSessions.filter(s => s.horseId === horse?.id && s.result);
  const performance = sessions.map(s => ({ month: s.date, speed: Number(s.result?.speed) }));
  const topSpeed = performance.length ? `${Math.max(...performance.map(s => s.speed))} km/h` : '—';
  const radar: { subject: string; A: number }[] = [];
  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-serif font-bold">Hiệu suất — {horse?.name || 'Chưa có dữ liệu'}</h2></div>
      <div className="grid grid-cols-4 gap-4"><StatCard label="Tốc độ đỉnh" value={topSpeed} color="gold" /><StatCard label="Thể lực" value="—" sub="BE chưa cung cấp chỉ số thể lực" color="green" /><StatCard label="Điểm AI" value="—" sub="BE chưa cung cấp điểm AI" color="navy" /><StatCard label="Tỷ lệ thắng" value={horse?.totalRaces ? `${Math.round(horse.wins / horse.totalRaces * 100)}%` : '—'} color="navy" /></div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2"><Card className="p-5"><h3 className="font-semibold mb-4">Tốc độ & Thể lực theo tháng</h3><ResponsiveContainer width="100%" height={250}><LineChart data={performance}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="month" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Legend /><Line type="monotone" dataKey="speed" stroke="#c9973b" strokeWidth={2.5} dot={{ r: 4 }} name="Tốc độ (km/h)" /><Line type="monotone" dataKey="fitness" stroke="#1a4a3a" strokeWidth={2.5} dot={{ r: 4 }} name="Thể lực %" /></LineChart></ResponsiveContainer></Card></div>
        <Card className="p-5"><h3 className="font-semibold mb-4">Năng lực tổng thể</h3><ResponsiveContainer width="100%" height={250}><RadarChart data={radar}><PolarGrid stroke="#e5e7eb" /><PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} /><Radar dataKey="A" stroke="#c9973b" fill="#c9973b" fillOpacity={0.25} strokeWidth={2} /></RadarChart></ResponsiveContainer></Card>
      </div>
    </div>
  );
}

function RaceResultsPage({ horses }: { horses: Horse[] }) {
  const allRaces = horses.flatMap(h => h.raceHistory.map(r => ({ ...r, horseName: h.name })));
  allRaces.sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-serif font-bold">Kết quả đua</h2></div>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Tổng lần đua" value={allRaces.length} color="navy" />
        <StatCard label="Hạng 1" value={allRaces.filter(r => r.position === 1).length} color="gold" />
        <StatCard label="Top 3" value={allRaces.filter(r => r.position <= 3).length} color="green" />
        <StatCard label="Giải thưởng" value="185M VND" color="navy" />
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">{['Hạng', 'Tên giải', 'Ngựa', 'Ngày', 'Cự ly', 'Thời gian', 'Giải thưởng'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
          <tbody>
            {allRaces.map((r, i) => (
              <tr key={r.id} className={`border-b border-gray-50 hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                <td className="px-4 py-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${r.position === 1 ? 'bg-[#c9973b] text-white' : r.position <= 3 ? 'bg-gray-400 text-white' : 'bg-gray-200 text-gray-600'}`}>#{r.position}</div></td>
                <td className="px-4 py-3"><div className="font-medium">{r.raceName}</div><div className="text-xs text-gray-500">{r.venue}</div></td>
                <td className="px-4 py-3 text-gray-700">{r.horseName}</td>
                <td className="px-4 py-3 text-gray-600">{r.date}</td>
                <td className="px-4 py-3 text-gray-600">{r.distance}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.time}</td>
                <td className="px-4 py-3 font-medium text-emerald-600">{r.prize !== '0 VND' ? r.prize : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function ReportsPage({ onUnavailable }: { onUnavailable: () => void }) {
  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-serif font-bold">Báo cáo</h2></div>
      <div className="grid grid-cols-2 gap-5">
        {[{ title: 'Báo cáo hiệu suất tháng 9/2026', icon: '📈', type: 'Performance' }, { title: 'Báo cáo y tế & thú y', icon: '🏥', type: 'Health' }, { title: 'Kế hoạch tập luyện tháng', icon: '📋', type: 'Training' }, { title: 'Tổng kết mùa đua 2026', icon: '🏆', type: 'Racing' }].map(r => (
          <Card key={r.title} className="p-5 cursor-pointer hover:border-[#c9973b]"><div className="flex items-start gap-4"><div className="w-12 h-12 rounded-xl bg-[#1a2844]/10 flex items-center justify-center text-2xl">{r.icon}</div><div className="flex-1"><div className="font-semibold">{r.title}</div></div></div><div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100"><Badge status={r.type} /><Btn variant="secondary" onClick={onUnavailable}>⬇ Tải PDF</Btn></div></Card>
        ))}
      </div>
      <Card className="p-5"><h3 className="font-semibold mb-4">Tổng quan mùa giải 2026</h3><ResponsiveContainer width="100%" height={220}><BarChart data={[]}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="month" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Legend /><Bar dataKey="fitness" fill="#1a4a3a" name="Thể lực %" radius={[3, 3, 0, 0]} /><Bar dataKey="speed" fill="#c9973b" name="Tốc độ km/h" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></Card>
    </div>
  );
}

function PermissionsModal({ member, grantedPages, rolePages, onToggle, onClose }:
  { member: AppUser; grantedPages: Page[]; rolePages: Set<Page>; onToggle: (p: Page) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden">
        <div className="bg-[#1a2844] px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#c9973b] flex items-center justify-center text-white font-bold">{member.avatar}</div>
          <div className="flex-1"><div className="text-white font-semibold">{member.name}</div><div className="text-[#c9973b] text-xs">{member.role ? ROLE_LABELS[member.role] : '—'}</div></div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-500 mb-4">Trang mặc định theo vai trò được đánh dấu 🔒. Bật/tắt để cấp thêm quyền truy cập.</p>
          <div className="space-y-2">
            {GRANTABLE_PAGES.map(g => {
              const isDefault = rolePages.has(g.page);
              const isGranted = grantedPages.includes(g.page);
              const active = isDefault || isGranted;
              return (
                <div key={g.page} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${active ? 'border-[#c9973b] bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
                  <span className="text-lg">{g.icon}</span>
                  <span className="flex-1 text-sm font-medium">{g.label}</span>
                  {isDefault ? (
                    <span className="text-xs text-gray-400 flex items-center gap-1">🔒 Mặc định</span>
                  ) : (
                    <button
                      onClick={() => onToggle(g.page)}
                      className={`relative w-11 h-6 rounded-full transition-all flex-shrink-0 ${isGranted ? 'bg-[#c9973b]' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isGranted ? 'left-6' : 'left-1'}`} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="px-5 pb-5 flex justify-end"><Btn variant="gold" onClick={onClose}>Xong ✓</Btn></div>
      </div>
    </div>
  );
}

function StaffPage({ state, navigate, onUpdatePermissions }: { state: AppState; navigate: (p: Page) => void; onUpdatePermissions: (userId: string, pages: Page[]) => void }) {
  const myClub = state.clubs.find(c => c.managerId === state.user!.id);
  const members = state.users.filter(u => u.clubId === myClub?.id && u.id !== state.user!.id);
  const [permModalUserId, setPermModalUserId] = useState<string | null>(null);
  const permMember = members.find(m => m.id === permModalUserId);
  const rolePages = (role: Role | null): Set<Page> => new Set((role ? NAV_ITEMS[role] || [] : []).map(i => i.page));
  const grantedPages = (userId: string) => state.userPermissions[userId] || [];

  const handleToggle = (userId: string, page: Page) => {
    const current = grantedPages(userId);
    const next = current.includes(page) ? current.filter(p => p !== page) : [...current, page];
    onUpdatePermissions(userId, next);
  };

  return (
    <>
      {permMember && (
        <PermissionsModal
          member={permMember}
          grantedPages={grantedPages(permMember.id)}
          rolePages={rolePages(permMember.role)}
          onToggle={p => handleToggle(permMember.id, p)}
          onClose={() => setPermModalUserId(null)}
        />
      )}
      <div className="space-y-5">
          <div className="flex items-center justify-between"><div><h2 className="text-xl font-serif font-bold">Nhân sự</h2><p className="text-sm text-gray-500">{members.length} thành viên · tài khoản nhân sự do Admin cấp</p></div></div>
        <div className="grid grid-cols-2 gap-4">
          {members.map(m => {
            const extraCount = grantedPages(m.id).filter(p => !rolePages(m.role).has(p)).length;
            return (
              <Card key={m.id} className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#1a2844] text-white flex items-center justify-center font-bold">{m.avatar}</div>
                  <div className="flex-1">
                    <div className="font-semibold">{m.name}</div>
                    <div className="text-sm text-gray-500">{m.role ? ROLE_LABELS[m.role] : 'Chưa phân công'}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{m.email}</div>
                    {m.experience && <div className="text-xs text-[#c9973b] mt-1">{m.experience.split(' · ')[0]}</div>}
                    {extraCount > 0 && <div className="text-xs text-emerald-600 mt-1">+{extraCount} trang được cấp thêm</div>}
                  </div>
                  {m.role && <Badge status={m.role} />}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <Btn variant="secondary" size="sm" onClick={() => setPermModalUserId(m.id)}>🔑 Cấp quyền truy cập</Btn>
                </div>
              </Card>
            );
          })}
        </div>
        {members.length === 0 && <Card className="p-10 text-center"><div className="text-4xl mb-3">👥</div><div className="font-semibold text-gray-600">Chưa có thành viên nào</div><div className="text-sm text-gray-400 mt-1">Liên hệ Quản trị viên để tạo tài khoản nhân sự.</div></Card>}
      </div>
    </>
  );
}

function NotificationsPage({ notifications, onMarkRead, onOpen }: { notifications: AppNotification[]; onMarkRead: (id: string) => void; onOpen: (n: AppNotification) => void }) {
  const icons: Record<string, string> = { health: '🏥', training: '🏇', race: '🏆', system: '⚙️', lock: '🔒', rehab: '🩹', approval: '🐎', inventory: '📦', incident: '🚨' };
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between"><h2 className="text-xl font-serif font-bold">Thông báo</h2><Btn variant="ghost" onClick={() => notifications.forEach(n => onMarkRead(n.id))}>Đánh dấu tất cả đã đọc</Btn></div>
      {notifications.length === 0 && <Card className="p-10 text-center text-gray-400 text-sm">Chưa có thông báo</Card>}
      {notifications.map(n => (
        <Card key={n.id} className={`p-4 cursor-pointer ${!n.read ? (n.type === 'lock' ? 'border-l-4 border-red-500' : 'border-l-4 border-[#c9973b]') : ''}`} onClick={() => { onMarkRead(n.id); onOpen(n); }}>
          <div className="flex items-start gap-3"><span className="text-xl mt-0.5">{icons[n.type]}</span><div className="flex-1"><div className={`text-sm ${!n.read ? 'font-semibold' : 'text-gray-600'}`}>{n.message}</div><div className="text-xs text-gray-400 mt-0.5">{n.time}{n.action ? ' · Nhấn để mở' : ''}</div></div>{!n.read && <div className="w-2 h-2 rounded-full bg-[#c9973b] mt-2" />}</div>
        </Card>
      ))}
    </div>
  );
}

function ProfilePage({ user, state, navigate, onLogout, onSave, onError }:
  { user: AppUser; state: AppState; navigate: (p: Page) => void; onLogout: () => void; onSave: (msg: string) => void; onError: (msg: string) => void }) {
  const [name, setName] = useState(user.name);
  const myClub = state.clubs.find(c => c.id === user.clubId);
  return (
    <div className="space-y-5 max-w-2xl">
      <h2 className="text-xl font-serif font-bold">Profile</h2>
      <Card className="p-6">
        <div className="flex items-center gap-5 mb-6"><div className="w-20 h-20 rounded-full bg-[#1a2844] text-white flex items-center justify-center text-2xl font-bold">{user.avatar}</div><div><div className="text-xl font-semibold">{user.name}</div><div className="text-sm text-gray-500">{user.role ? ROLE_LABELS[user.role] : 'No role assigned'}</div>{myClub && <div className="text-sm text-[#c9973b] font-medium">🏛 {myClub.name}</div>}</div></div>
        <div className="grid grid-cols-2 gap-4"><Input label="Full name" value={name} onChange={setName} /><Input label="Email" value={user.email} onChange={() => {}} />{user.phone && <Input label="Phone" value={user.phone} onChange={() => {}} />}</div>
        {user.bio && <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 italic">"{user.bio}"</div>}
        {user.experience && <div className="mt-3"><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Experience</div><div className="text-sm text-gray-700">{user.experience}</div></div>}
        {user.certifications && <div className="mt-3"><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Certifications</div><div className="text-sm text-gray-700">{user.certifications}</div></div>}
        <Btn variant="gold" className="mt-4" onClick={async () => { try { await request('/users/me', 'PUT', { fullName: name.trim(), phone: user.phone || '', avatarUrl: user.avatarUrl || null }); onSave('Profile updated successfully.'); } catch (e) { onError((e as Error).message); } }}>Save</Btn>
      </Card>
      {user.role === 'veterinarian' && <TrainingProtocolsPage />}
      {user.role === 'head_trainer' && <TrainerProfileForm key={user.id} user={state.users.find(u => u.id === user.id) || user} />}
      {myClub && user.role !== 'manager' && <Card className="p-5"><h3 className="font-semibold mb-3">My Club</h3><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-[#1a2844] text-white flex items-center justify-center font-serif font-bold text-lg">{myClub.logoLetter}</div><div><div className="font-semibold">{myClub.name}</div><div className="text-sm text-gray-500">📍 {myClub.location} · Founded {myClub.founded}</div></div></div></Card>}
      <Btn variant="danger" onClick={onLogout}>Sign out</Btn>
    </div>
  );
}

// ── Training Registration (Owner) ─────────────────────────────────────────────

// ── Post-session exam & Lock (Vet) ────────────────────────────────────────────

function PostExamPage({ state, navigate, onSave, onPostExam, onUnlock, onManualLock }:
  { state: AppState; navigate: (p: Page) => void; onSave: (msg: string) => void;
    onPostExam: (sessionId: string, rec: HealthRecord) => string | null | Promise<string | null>;
    onUnlock: (horseId: string, note: string) => string | null | Promise<string | null>;
    onManualLock: (horseId: string, reason: string) => string | null }) {
  const horses = state.horses.filter(h => h.clubId === state.user!.clubId);
  const awaiting = horses.filter(h => getLifecycle(h) === 'awaiting_vet' && h.approvalStatus === 'approved');
  const pending = state.trainingSessions.filter(s => s.status === 'Completed' && !s.postExamDone && horses.some(h => h.id === s.horseId));
  const locked = horses.filter(h => h.lock);
  const [unlockFor, setUnlockFor] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const lockable = horses.filter(h => !h.lock && getLifecycle(h) === 'training');
  const [manualHorseId, setManualHorseId] = useState(lockable[0]?.id || '');
  const [manualReason, setManualReason] = useState('');
  const [manualError, setManualError] = useState('');
  const activeSession = state.trainingSessions.find(x => x.id === activeId);

  if (activeSession) {
    return <VetHealthFormPage key={activeSession.id} state={state} navigate={navigate} onSave={onSave} onSaveRecord={async rec => rec} today={TODAY} postSession={activeSession} onPostSubmit={onPostExam} onBack={() => setActiveId(null)} />;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div><h2 className="text-xl font-serif font-bold text-[#0f1729]">Khám sau tập & Khóa huấn luyện</h2><p className="text-sm text-gray-500">Chỉ Thú y mới có quyền kích hoạt và gỡ KHÓA HUẤN LUYỆN</p></div>

      <TrainingProtocolsPage />
      <section className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">🩺 Chờ khám trước huấn luyện <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">{awaiting.length}</span></h3>
        {awaiting.length === 0 && <Card className="p-5 text-sm text-gray-400 text-center">Không có ngựa nào đang chờ khám</Card>}
        {awaiting.map(h => (
          <Card key={h.id} className="p-4 flex items-center gap-3">
            <img src={h.imageUrl || undefined} className="w-12 h-12 rounded-lg object-cover bg-gray-200" />
            <div className="flex-1"><div className="font-semibold">{h.name}</div><div className="text-xs text-gray-500">Chủ: {h.ownerName} · {h.breed} · {h.age}t</div></div>
            <LifecycleBadge horse={h} />
            <Btn variant="gold" size="sm" onClick={() => navigate('vet-health-form')}>Khám & ghi hồ sơ →</Btn>
          </Card>
        ))}
        <p className="text-xs text-gray-400">Trong form nhập liệu, kết quả "Đủ điều kiện huấn luyện" sẽ chuyển ngựa sang "Sẵn sàng huấn luyện" và báo cho Chủ ngựa.</p>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">🏇 Buổi tập chờ khám lại <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{pending.length}</span></h3>
        {pending.length === 0 && <Card className="p-5 text-sm text-gray-400 text-center">Chưa có buổi tập nào hoàn thành cần khám</Card>}
        {pending.map(s => {
          const h = state.horses.find(x => x.id === s.horseId)!;
          return (
            <Card key={s.id} className="p-4 flex items-center gap-3">
              <img src={h.imageUrl || undefined} className="w-11 h-11 rounded-lg object-cover bg-gray-200" />
              <div className="flex-1"><div className="font-semibold">{h.name} · {s.type} {s.distance}</div><div className="text-xs text-gray-500">{s.date} · {s.time} · HLV {s.trainerName}</div></div>
              <Btn variant="gold" size="sm" onClick={() => setActiveId(s.id)}>Khám sau tập chi tiết →</Btn>
            </Card>
          );
        })}
        <p className="text-xs text-gray-400">Khám sau tập dùng đúng biểu mẫu và tiêu chuẩn của khám định kỳ (sinh hiệu, lâm sàng, đánh giá tự động). Kết quả "Không đủ điều kiện" tự động KHÓA HUẤN LUYỆN.</p>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">Khóa thủ công</h3>
        <Card className="p-5 border-l-4 border-orange-400">
          <p className="text-sm text-gray-600 mb-4">Dùng khi Thú y cần dừng huấn luyện ngay dù hệ thống chưa tự động kết luận mức nặng.</p>
          {lockable.length === 0 ? (
            <p className="text-sm text-gray-400">Không có ngựa đang huấn luyện có thể khóa.</p>
          ) : (
            <div className="space-y-3">
              <Select label="Ngựa cần khóa" value={manualHorseId} onChange={setManualHorseId} options={lockable.map(h => ({ value: h.id, label: h.name }))} />
              <Textarea label="Lý do / chỉ định của Thú y" value={manualReason} onChange={setManualReason} rows={2} placeholder="VD: Khập khiễng tăng sau vận động, cần dừng tập để chẩn đoán hình ảnh" />
              {manualError && <div className="text-sm text-red-600">{manualError}</div>}
              <Btn variant="danger" onClick={() => {
                const err = onManualLock(manualHorseId, manualReason);
                setManualError(err || '');
                if (!err) setManualReason('');
              }}>Khóa huấn luyện thủ công</Btn>
            </div>
          )}
        </Card>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">🔒 Ngựa đang bị khóa <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{locked.length}</span></h3>
        {locked.length === 0 && <Card className="p-5 text-sm text-gray-400 text-center">Không có ngựa nào bị khóa</Card>}
        {locked.map(h => (
          <Card key={h.id} className="p-5 border-l-4 border-red-500">
            <div className="flex items-center gap-3 mb-3"><img src={h.imageUrl || undefined} className="w-11 h-11 rounded-lg object-cover bg-gray-200" /><div className="flex-1"><div className="font-semibold">{h.name}</div><div className="text-xs text-gray-500">Khóa {h.lock!.lockedAt} · {h.lock!.lockedByName}</div></div><LifecycleBadge horse={h} /></div>
            <div className="text-sm text-gray-700 mb-1"><strong>Chẩn đoán:</strong> {h.lock!.reason}</div>
            {h.lock!.notes && <div className="text-sm text-gray-500 mb-1">{h.lock!.notes}</div>}
            <div className="text-xs text-gray-500 mb-3">{h.rehab ? `Gói phục hồi: ${h.rehab.name} (${h.rehab.durationWeeks} tuần)` : 'Chờ Quản lý kích hoạt gói phục hồi'}</div>
            <p className="text-xs text-gray-500">Chỉ gỡ khóa khi ngựa đã đủ điều kiện quay lại tập. Lý do gỡ khóa là bắt buộc và được ghi vào nhật ký thay đổi và lịch sử ngựa.</p>
            {errors[h.id] && <div className="text-sm text-red-600 mt-2">{errors[h.id]}</div>}
            <Btn variant="primary" className="mt-3" onClick={() => setUnlockFor(h.id)}>🔓 Gỡ khóa huấn luyện</Btn>
          </Card>
        ))}
      </section>
      {unlockFor && (() => { const uh = state.horses.find(x => x.id === unlockFor); return uh ? (
        <ReasonDialog title={`Gỡ khóa huấn luyện — ${uh.name}`} confirmLabel="Xác nhận gỡ khóa"
          description="Gỡ khóa cho phép ngựa quay lại tập luyện. Hãy nêu rõ căn cứ (kết quả khám, chỉ số, thời gian hồi phục). Lý do được ghi vào nhật ký thay đổi."
          onClose={() => setUnlockFor(null)}
          onConfirm={async reason => { const err = await onUnlock(uh.id, reason); setErrors(e => ({ ...e, [uh.id]: err || '' })); setUnlockFor(null); }} />
      ) : null; })()}
    </div>
  );
}

// ── Rehab Center (Manager) ────────────────────────────────────────────────────

function RehabCenterPage({ state, onActivate }:
  { state: AppState; onActivate: (horseId: string, packageId: string) => Promise<string | null> }) {
  const horses = state.horses.filter(h => h.clubId === state.user!.clubId);
  const waiting = horses.filter(h => h.lock && !h.rehab);
  const active = horses.filter(h => h.lock && h.rehab);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  return (
    <div className="space-y-6 max-w-4xl">
      <div><h2 className="text-xl font-serif font-bold text-[#0f1729]">Gói phục hồi chức năng</h2><p className="text-sm text-gray-500">Kích hoạt gói phục hồi cho ngựa bị khóa huấn luyện · Gói huấn luyện gốc giữ trạng thái "Tạm dừng"</p></div>
      <section className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">Chờ kích hoạt <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{waiting.length}</span></h3>
        {waiting.length === 0 && <Card className="p-8 text-center text-gray-400 text-sm"><div className="text-3xl mb-2">✅</div>Không có ngựa nào cần gói phục hồi</Card>}
        {waiting.map(h => {
          const en = state.enrollments.find(e => e.horseId === h.id && e.status !== 'completed');
          return (
            <Card key={h.id} className="p-5 border-l-4 border-red-500">
              <div className="flex items-center gap-3 mb-3"><img src={h.imageUrl || undefined} className="w-12 h-12 rounded-lg object-cover bg-gray-200" /><div className="flex-1"><div className="font-semibold">{h.name} <span className="text-xs text-gray-400 font-normal">· Chủ: {h.ownerName}</span></div><div className="text-xs text-gray-500">Khóa bởi {h.lock!.lockedByName} · {h.lock!.lockedAt}</div></div><LifecycleBadge horse={h} /></div>
              <div className="p-3 bg-red-50 rounded-lg text-sm text-red-800 mb-3"><strong>Chẩn đoán Thú y:</strong> {h.lock!.reason}{h.lock!.notes ? ` — ${h.lock!.notes}` : ''}</div>
              {en && <div className="text-xs text-gray-500 mb-3">Gói huấn luyện "{en.packageName}": <Badge status="Paused" /> · Giữ {en.sessionsDone}/{en.sessionsTotal} buổi</div>}
              <div className="grid grid-cols-3 gap-3">
                {state.packages.filter(p => p.active && p.packageType === 'RECOVERY').map(p => (
                  <button key={p.id} onClick={() => setChoice(c => ({ ...c, [h.id]: p.id }))} className={`text-left p-3 rounded-xl border-2 bg-white transition-all ${choice[h.id] === p.id ? 'border-[#c9973b] bg-[#c9973b]/5' : 'border-gray-200 hover:border-[#c9973b]/50'}`}>
                    <div className="font-semibold text-sm">{p.name}</div><div className="text-xs text-[#c9973b] font-medium mb-1">{p.durationDays} ngày</div>
                    <div className="text-xs text-gray-500 mb-2">{p.description}</div>
                    <ul className="space-y-0.5">{[].map((i: string) => <li key={i} className="text-[11px] text-gray-600">• {i}</li>)}</ul>
                  </button>
                ))}
              </div>
              {errors[h.id] && <div className="text-sm text-red-600 mt-2">{errors[h.id]}</div>}
              <Btn variant="gold" className="mt-3" disabled={!choice[h.id]} onClick={async () => { const message = await onActivate(h.id, choice[h.id]); setErrors(e => ({ ...e, [h.id]: message || '' })); }}>Kích hoạt gói phục hồi →</Btn>
            </Card>
          );
        })}
      </section>
      {active.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold">Đang phục hồi</h3>
          {active.map(h => <Card key={h.id} className="p-4 flex items-center gap-3"><img src={h.imageUrl || undefined} className="w-11 h-11 rounded-lg object-cover bg-gray-200" /><div className="flex-1"><div className="font-semibold">{h.name}</div><div className="text-xs text-gray-500">{h.rehab!.name} · {h.rehab!.durationWeeks} tuần · từ {h.rehab!.activatedAt}</div></div><LifecycleBadge horse={h} /><span className="text-xs text-gray-400">Chờ Thú y gỡ khóa</span></Card>)}
        </section>
      )}
    </div>
  );
}

// ── Page titles ───────────────────────────────────────────────────────────────

const PAGE_TITLES: Partial<Record<Page, string>> = {
  accounts: 'Account management', permissions: 'Permissions', 'audit-log': 'Audit log',
  dashboard: 'Overview', 'horse-list': 'Horses in the club', 'horse-detail': 'Horse details',
  'horse-create': 'Register a new horse', 'horse-edit': 'Edit horse', 'my-horses': 'My horses',
  'center-requests': 'Horse intake', 'package-catalog': 'Training package catalogue', 'trainer-assign': 'Trainer assignments',
  'trainer-profile': 'Candidate profile',
  'health-records': 'Medical records', 'vet-health-form': 'Health examination',
  'training-hub': 'Training & plans', 'care-hub': 'Care & feeding',
  performance: 'Performance', 'race-results': 'Race results', reports: 'Reports',
  staff: 'Staff', notifications: 'Notifications', profile: 'Profile',
  'training-register': 'Training registration', 'vet-assign': 'Assigned horses', 'post-exam': 'Post-training exams & locks', 'rehab-center': 'Rehabilitation packages', inventory: 'My inventory', 'inventory-log': 'Inventory history',
};

const TODAY = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());

function newNotif(n: Omit<AppNotification, 'id' | 'time' | 'read'>): AppNotification {
  return { ...n, id: `n${Date.now()}${Math.random().toString(36).slice(2, 6)}`, time: 'Vừa xong', read: false };
}

function addWeeks(d: string, weeks: number): string {
  const [dd, mm, yy] = d.split('/').map(Number);
  const dt = new Date(yy, mm - 1, dd + weeks * 7);
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
}

function addDays(d: string, days: number): string {
  const [dd, mm, yy] = d.split('/').map(Number);
  const dt = new Date(yy, mm - 1, dd + days);
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
}

function lockMessage(h: Horse, action: string): string {
  return `Ngựa "${h.name}" đang bị KHÓA HUẤN LUYỆN (${h.lock?.reason || 'theo chỉ định Thú y'}). Không thể ${action}. Gói huấn luyện đang tạm dừng; chỉ Thú y mới gỡ được khóa.`;
}

function trainerTarget(h: Horse): Pick<AppNotification, 'toUserIds' | 'toRoles'> {
  return h.headTrainerId ? { toUserIds: [h.headTrainerId] } : { toRoles: ['head_trainer'] };
}

function NoAccess({ text }: { text: string }) {
  return <Card className="p-10 text-center max-w-md"><div className="text-4xl mb-3">🔒</div><div className="font-semibold text-gray-600">{text}</div></Card>;
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [state, setState] = useState<AppState>({
    user: null, page: new URLSearchParams(window.location.search).has('token') ? 'login' : 'home',
    users: [], clubs: [{ id: CENTER, name: 'RaceForge', location: '', description: '', managerId: '', managerName: '', memberCount: 0, founded: '', logoLetter: 'R' }], memberRequests: [],
    horses: [], horseClubRequests: [], examHorseId: null,
    healthRecords: [], trainingPlans: [], trainingSessions: [],
    inventory: [], invLogs: [], careRecords: [], incidents: [], notifications: [], enrollments: [], errorMsg: null,
    selectedHorseId: '', packages: [], viewTrainerId: null, showSuccess: null,
    userPermissions: {}, rolePerms: DEFAULT_ROLE_PERMS,
    auditLog: [],
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const navigate = useCallback((page: Page) => setState(s => ({ ...s, page })), []);

  const showError = useCallback((msg: string) => {
    setState(s => ({ ...s, errorMsg: msg }));
    setTimeout(() => setState(s => ({ ...s, errorMsg: null })), 6000);
  }, []);

  const showSuccess = useCallback((msg: string) => {
    setState(s => ({ ...s, showSuccess: msg }));
    setTimeout(() => setState(s => ({ ...s, showSuccess: null })), 3000);
  }, []);

  const logAudit = useCallback((action: string, target: string, reason?: string) => {
    setState(s => {
      const u = s.user;
      const t = new Date();
      const time = `${String(t.getDate()).padStart(2, '0')}/${String(t.getMonth() + 1).padStart(2, '0')}/${t.getFullYear()} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
      const entry: AuditEntry = { id: `au${Date.now()}${Math.floor(Math.random() * 1000)}`, time, actor: u?.name || 'Hệ thống', actorRole: u?.role ? ROLE_LABELS[u.role] : '—', action, target, reason };
      return { ...s, auditLog: [entry, ...s.auditLog] };
    });
  }, []);

  const loadVersion = useRef(0);
  const verifiedHorses = useRef(new Set<string>());
  const reloadRemote = useCallback(async () => {
    const user = stateRef.current.user;
    if (!user) return;
    const version = ++loadVersion.current;
    let data: Awaited<ReturnType<typeof loadRemote>>;
    try { data = await loadRemote(user, showError); }
    catch (e) {
      if (version === loadVersion.current && stateRef.current.user?.id === user.id) showError((e as Error).message);
      return;
    }
    if (version !== loadVersion.current || stateRef.current.user?.id !== user.id) return;
    if (data.serverPermissions) {
      const rolePerms: Record<string, string[]> = {};
      for (const [role, pages] of Object.entries(DEFAULT_ROLE_PERMS)) {
        const codes = data.serverPermissions[role] || [];
        rolePerms[role] = pages.filter(page => { const code = permissionForPage(role as Role, page); return !code || codes.includes(code); });
      }
      setState(s => ({ ...s, rolePerms, auditLog: data.permissionAudit || [] }));
    }
    data.horses.forEach(h => { if (verifiedHorses.current.has(h.id)) h.identityVerified = true; });
    setState(s => ({ ...s, ...data, selectedHorseId: data.horses.some(h => h.id === s.selectedHorseId) ? s.selectedHorseId : data.horses[0]?.id || '' }));
  }, [showError]);
  useEffect(() => { if (state.user?.id) void reloadRemote(); }, [state.user?.id, state.page, reloadRemote]);
  useEffect(() => {
    let active = true;
    const expired = () => { loadVersion.current++; setState(s => ({ ...s, user: null, page: 'login', users: [], horses: [], healthRecords: [], enrollments: [], trainingPlans: [], trainingSessions: [], notifications: [] })); };
    window.addEventListener('raceforge:session-expired', expired);
    void restoreSessionForLocation(() => window.location.search, w => { if (active) { const user = userFromApi(w); setState(s => ({ ...s, user, page: 'dashboard' })); } }).catch(e => { if (active && !(e instanceof ApiError && e.status === 401)) showError((e as Error).message); });
    return () => { active = false; window.removeEventListener('raceforge:session-expired', expired); };
  }, [showError]);
  const remote = makeRemoteActions({ getState: () => stateRef.current, reload: reloadRemote, success: showSuccess, error: showError, navigate: p => navigate(p as Page) });
  const background = (p: Promise<unknown>) => { void p.catch(() => {}); };

  const handleLogin = useCallback((user: AppUser) => {
    setState(s => ({ ...s, user, page: 'dashboard' }));
  }, []);

  const handleRegister = useCallback((user: AppUser) => {
    setState(s => ({ ...s, user, page: 'dashboard' }));
    showSuccess('Đã xác thực email và đăng nhập tài khoản Chủ ngựa.');
  }, [showSuccess]);

  const handleLogout = useCallback(() => {
    loadVersion.current++; verifiedHorses.current.clear(); clearRecommendations();
    void auth.logout().catch(e => showError((e as Error).message));
    setState(s => ({ ...s, user: null, page: 'home', users: [], horses: [], healthRecords: [], notifications: [], enrollments: [], trainingPlans: [], trainingSessions: [] }));
  }, [showError]);


  // Public pages
  if (!state.user || ['home', 'login', 'register'].includes(state.page)) {
    return (
      <>
        {state.showSuccess && <SuccessToast message={state.showSuccess} />}
        {state.errorMsg && <ErrorToast message={state.errorMsg} />}
        {state.page === 'home' && <HomePage navigate={navigate} />}
        {state.page === 'login' && <LoginPage navigate={navigate} users={state.users} onLogin={handleLogin} />}
        {state.page === 'register' && <RegisterPage navigate={navigate} onRegister={handleRegister} />}
        {!state.user && !['home', 'login', 'register'].includes(state.page) && <HomePage navigate={navigate} />}
      </>
    );
  }

  // Onboarding pages
  if (['onboarding', 'join-center', 'pending', 'member-requests'].includes(state.page)) {
    setTimeout(() => setState(s => ({ ...s, page: 'dashboard' })), 0);
    return null;
  }
  if (!state.user.role) return <NoPermission text="Tài khoản chưa được gán vai trò. Vui lòng liên hệ Quản trị viên." />;

  const renderPage = (): React.ReactNode => {
    const role = state.user!.role!;
    const adminOnly: Page[] = ['accounts', 'permissions', 'audit-log'];
    if (adminOnly.includes(state.page) && role !== 'admin') return <NoPermission text="Chỉ Quản trị viên mới truy cập chức năng này." />;
    if (role === 'admin' && !adminOnly.concat(['dashboard', 'notifications', 'profile']).includes(state.page)) return <NoPermission text="Quản trị viên không thao tác nghiệp vụ huấn luyện. Hãy dùng các mục quản trị ở menu bên trái." />;
    if (role !== 'admin' && FEATURES.some(f => f.page === state.page) && !(state.rolePerms[role] || []).includes(state.page) && !(state.userPermissions[state.user!.id] || []).includes(state.page)) return <NoPermission text="Vai trò của bạn chưa được cấp quyền cho chức năng này." />;
    switch (state.page) {
      case 'accounts': return <AccountManagementPage actor={state.user!} users={state.users} clubs={state.clubs} onCreate={remote.createAccount} onCreateTrainerProfile={remote.createTrainerProfile} onToggleLock={remote.toggleLock} />;
      case 'permissions': return <PermissionMatrixPage rolePerms={state.rolePerms} audit={state.auditLog} onToggle={remote.togglePermission} />;
      case 'audit-log': return <AuditLogPage audit={state.auditLog} />;
      case 'dashboard': {
        const r = state.user!.role;
        if (r === 'manager') return <ManagerDashboard state={state} navigate={navigate} />;
        if (r === 'head_trainer') return <HeadTrainerDashboard state={state} navigate={navigate} />;
        if (r === 'veterinarian') return <VetDashboard state={state} navigate={navigate} />;
        if (r === 'groom') return <GroomDashboard state={state} navigate={navigate} />;
        if (r === 'owner') return <OwnerDashboard state={state} navigate={navigate} />;
        if (r === 'admin') return <AdminDashboard users={state.users} audit={state.auditLog} navigate={navigate as (p: string) => void} />;
        return null;
      }
      case 'horse-list': return <HorseListPage navigate={navigate} horses={state.user!.role === 'veterinarian' ? state.horses.filter(h => vetVisible(h, state.user!)) : state.horses} role={state.user!.role!} clubId={state.user!.clubId} onSelectHorse={id => setState(s => ({ ...s, selectedHorseId: id }))} />;
      case 'horse-detail': return state.horses.length === 0 ? <NoAccess text="Chưa có dữ liệu ngựa để hiển thị." /> : <HorseDetailPage state={state} navigate={navigate} onUpdateHorse={remote.updateHorse} onActivateHorse={remote.activateHorse} onShowSuccess={showSuccess} onAudit={logAudit} />;
      case 'horse-create': return <HorseCreatePage user={state.user!} state={state} navigate={navigate} onCreateHorse={remote.createHorse} />;
      case 'my-horses': return <MyHorsesPage user={state.user!} state={state} navigate={navigate} onSubmitToCenter={id => background(remote.submitHorse(id))} onSelectHorse={id => setState(s => ({ ...s, selectedHorseId: id }))} />;
      case 'package-catalog':
        if (state.user!.role !== 'manager') return <NoAccess text="Chỉ Quản lý mới quản lý danh mục gói" />;
        return <PackageCatalogPage packages={state.packages} enrollments={state.enrollments} onSave={remote.savePackage} onToggle={remote.togglePackage} />;
      case 'trainer-assign':
        if (state.user!.role !== 'manager') return <NoAccess text="Chỉ Quản lý mới phân công huấn luyện viên" />;
        return <TrainerAssignPage user={state.user!} users={state.users} horses={state.horses} enrollments={state.enrollments} onAssign={remote.assignTrainer} />;
      case 'trainer-profile': return <TrainerProfilePage state={state} navigate={navigate} trainerId={state.viewTrainerId || ''} onApproveRequest={() => remote.unavailable('quản lý cấp vai trò; chỉ admin được tạo tài khoản nhân sự')} />;
      case 'center-requests':
        if (state.user!.role !== 'manager') return <NoAccess text="Chỉ Quản lý CLB mới tiếp nhận ngựa" />;
        return <IntakeBoardPage user={state.user!} horses={state.horses} requests={state.horseClubRequests} records={state.healthRecords} users={state.users} onVerify={(id, verified) => { if (verified) verifiedHorses.current.add(id); else verifiedHorses.current.delete(id); setState(s => ({ ...s, horses: s.horses.map(h => h.id === id ? { ...h, identityVerified: verified } : h) })); }} onAssign={remote.assignVet} onApprove={remote.approveHorse} onReject={remote.rejectHorse} onOpenHorse={id => setState(s => ({ ...s, selectedHorseId: id, page: 'horse-detail' }))} />;
      case 'health-records': return <HealthRecordsPage state={state} navigate={navigate} />;
      case 'vet-health-form':
        if (state.user!.role !== 'veterinarian') return <HealthRecordsPage state={state} navigate={navigate} />;
        return <VetHealthFormPage state={state} navigate={navigate} onSave={showSuccess} onSaveRecord={remote.saveHealth} today={TODAY} onConsumeExamHorse={() => setState(s => ({ ...s, examHorseId: null }))} />;
      case 'training-hub': return <TrainingHubPage state={state} navigate={navigate as (p: string) => void} onCreatePlan={remote.createPlan} onGenerate={remote.generateSessions} onCheckIn={remote.checkIn} onRespond={remote.respondAssign} onStartSession={remote.startSession} onCompleteSession={remote.completeSession} onStopSession={remote.stopSession} onConfirmSchedule={() => 'Lịch tập được sinh và xác nhận qua API lộ trình.'} />;
      case 'care-hub': return <CareHubPage state={state} navigate={navigate} onComplete={() => ({ ok: false, message: 'BE chưa có API chăm sóc.', shortages: [] })} onUndo={() => 'BE chưa có API chăm sóc.'} onReceive={() => 'BE chưa có API kho.'} onReport={() => 'BE chưa có API sự cố.'} />;
      case 'inventory': return <InventoryPage state={state} navigate={navigate} onAdd={() => 'BE chưa có API kho.'} onReceive={() => 'BE chưa có API kho.'} onEdit={() => 'BE chưa có API kho.'} onAdjust={() => 'BE chưa có API kho.'} onDelete={() => 'BE chưa có API kho.'} />;
      case 'inventory-log': return <InventoryLogPage state={state} navigate={navigate} />;
      case 'training-register':
        if (state.user!.role !== 'owner') return <NoAccess text="Chỉ Chủ ngựa mới đăng ký huấn luyện" />;
        return <TrainingRegisterPage state={state} navigate={navigate as (p: string) => void} onPurchase={remote.purchasePackage} />;
      case 'vet-assign':
        if (state.user!.role !== 'veterinarian') return <NoAccess text="Chỉ Thú y mới truy cập trang này" />;
        return <VetAssignedPage user={state.user!} horses={state.horses} requests={state.horseClubRequests} onRespond={remote.respondVet} onExam={id => setState(s => ({ ...s, examHorseId: id, page: 'vet-health-form' }))} onOpenHorse={id => setState(s => ({ ...s, selectedHorseId: id, page: 'horse-detail' }))} />;
      case 'post-exam':
        if (state.user!.role !== 'veterinarian') return <NoAccess text="Chỉ Thú y mới truy cập trang này" />;
        return <PostExamPage state={state} navigate={navigate} onSave={showSuccess} onPostExam={remote.postExam} onUnlock={async (...args) => { const r = await remote.unlock(...args); return r.ok ? null : r.message; }} onManualLock={() => 'Hãy khám và xác nhận kết luận NOT_FIT để khóa huấn luyện qua BE.'} />;
      case 'rehab-center':
        if (state.user!.role !== 'manager') return <NoAccess text="Chỉ Quản lý mới kích hoạt gói phục hồi" />;
        return <RehabCenterPage state={state} onActivate={remote.activateRecovery} />;
      case 'performance': return <PerformancePage state={state} />;
      case 'race-results': return <RaceResultsPage horses={state.horses.filter(h => h.clubId === state.user!.clubId)} />;
      case 'reports': return <ReportsPage onUnavailable={() => remote.unavailable('xuất báo cáo PDF')} />;
      case 'staff': return <StaffPage state={state} navigate={navigate} onUpdatePermissions={() => remote.unavailable('quyền truy cập riêng từng người')} />;
      case 'notifications': return <NotificationsPage notifications={visibleNotifications(state.notifications, state.user!)} onMarkRead={id => background(request(`/notifications/${encodeURIComponent(id)}/read`, 'PATCH').then(() => reloadRemote()).catch(e => { showError((e as Error).message); throw e; }))} onOpen={n => { if (n.action) setState(s => ({ ...s, page: n.action as Page, selectedHorseId: n.horseId || s.selectedHorseId })); }} />;
      case 'profile': return <ProfilePage user={state.user!} state={state} navigate={navigate} onLogout={handleLogout} onSave={message => { showSuccess(message); background(request('/users/me').then(w => setState(s => ({ ...s, user: userFromApi(w) })))); }} onError={showError} />;
      default: return <ManagerDashboard state={state} navigate={navigate} />;
    }
  };

  return (
    <>
      {state.showSuccess && <SuccessToast message={state.showSuccess} />}
      {state.errorMsg && <ErrorToast message={state.errorMsg} />}
      <AppLayout user={state.user!} page={state.page} title={PAGE_TITLES[state.page] || 'RaceForce'} navigate={navigate} state={state}>
        {renderPage()}
      </AppLayout>
    </>
  );
}
