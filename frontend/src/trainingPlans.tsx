import { recommendationFor, recommendationView } from './recommendations';
import { request } from './api';
import { useEffect, useMemo, useState } from 'react';
import {
  computeTrainingSuggestion, isHeavySession,
  type Horse, type HealthRecord, type TrainingPlan, type TrainingSession, type Res, type TrainingSuggestion, type Enrollment,
} from './data';
import { Badge, Btn, Card, Input, Select, Textarea } from './ui';
import { IdChip, Modal, ReasonDialog } from './admin';
import { TrainerStatusPill } from './packages';
import {
  TODAY, addDays, diffDays, isoToD, dToIso, validDate, weekdayLabel, parseD, fmtD, WEEKDAYS,
  checkSessionDrafts, trainerPlanBlockReason, currentEnrollment, enrollmentTerm,
  INTENSITY_LEVELS, WORKLOAD_OF, WORKLOAD_LABEL, suggestedLevel, PHASES, SESSION_TYPES,
  type TrainingSlice, type PlanDraft, type SessionDraft,
} from './trainingLogic';

interface HubState extends TrainingSlice { healthRecords: HealthRecord[] }
type ResultT = NonNullable<TrainingSession['result']>;

interface HubProps {
  state: HubState;
  navigate: (p: string) => void;
  onCreatePlan: (d: PlanDraft) => Promise<Res<TrainingPlan>>;
  onGenerate: (horseId: string, planId: string, drafts: SessionDraft[]) => Promise<Res<TrainingSession[]>>;
  onCheckIn: (id: string, present: boolean, note: string) => Promise<Res<null>>;
  onRespond: (enrId: string, accept: boolean, reason: string) => Promise<Res<null>>;
  onStopSession: (id: string) => Promise<Res<null>>;
  onStartSession: (id: string) => string | null | Promise<string | null>;
  onCompleteSession: (id: string, r: ResultT) => string | null | Promise<string | null>;
  onConfirmSchedule: (horseId: string, note: string, restoreIds: string[]) => string | null | Promise<string | null>;
}

// ── Small helpers ────────────────────────────────────────────────────────────

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_FULL: Record<number, string> = { 0: 'CN', 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7' };
const DISTANCES = ['800m', '1000m', '1200m', '1400m', '1600m', '2000m'];
const WL_PILL: Record<string, string> = { Nhẹ: 'bg-teal-100 text-teal-800', Vừa: 'bg-blue-100 text-blue-800', Cao: 'bg-orange-100 text-orange-800' };

function latestRecord(records: HealthRecord[], horseId: string): HealthRecord | undefined {
  return records.filter(r => r.horseId === horseId)
    .sort((a, b) => (diffDays(b.date, a.date) || ((b.createdAt || 0) - (a.createdAt || 0))))[0];
}
const sortDiff = (a: string, b: string) => parseD(a).getTime() - parseD(b).getTime();
const dateLabel = (d: string) => `${weekdayLabel(d)} ${d}`;

function Stat({ label, value, tone = 'navy' }: { label: string; value: string | number; tone?: 'navy' | 'gold' | 'green' }) {
  const c = { navy: 'from-[#1a2844] to-[#243558]', gold: 'from-[#c9973b] to-[#e8b85a]', green: 'from-[#1a4a3a] to-[#236b54]' }[tone];
  return <div className={`rounded-xl bg-gradient-to-br ${c} p-5 text-white shadow-md`}><p className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</p><p className="mt-1 font-serif text-3xl font-bold">{value}</p></div>;
}

function ErrorBox({ text, onClose }: { text: string; onClose?: () => void }) {
  if (!text) return null;
  return <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><span>⛔</span><span className="flex-1">{text}</span>{onClose && <button onClick={onClose} className="text-red-400 hover:text-red-600">✕</button>}</div>;
}

function Progress({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs text-gray-500"><span>Bước {step + 1}/{labels.length}: <strong className="text-[#0f1729]">{labels[step]}</strong></span><span>{Math.round((step + 1) / labels.length * 100)}%</span></div>
      <div className="mb-3 h-2 w-full rounded-full bg-gray-200"><div className="h-2 rounded-full bg-[#c9973b] transition-all" style={{ width: `${(step + 1) / labels.length * 100}%` }} /></div>
      <div className="flex justify-between">
        {labels.map((l, i) => (
          <div key={l} className="flex flex-1 flex-col items-center gap-1">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i < step ? 'bg-emerald-600 text-white' : i === step ? 'bg-[#c9973b] text-white ring-4 ring-[#c9973b]/20' : 'bg-gray-200 text-gray-500'}`}>{i < step ? '✓' : i + 1}</div>
            <span className={`text-center text-[10px] ${i === step ? 'font-semibold text-[#c9973b]' : 'text-gray-400'}`}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekdayPicker({ value, onChange, error, max = 6 }: { value: number[]; onChange: (v: number[]) => void; error?: string; max?: number }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">Ngày tập trong tuần<span className="ml-0.5 text-red-500">*</span></label>
      <div className="flex flex-wrap gap-2">
        {DAY_ORDER.map(d => {
          const on = value.includes(d);
          return <button key={d} type="button" disabled={!on && value.length >= max} onClick={() => onChange(on ? value.filter(x => x !== d) : [...value, d])} aria-pressed={on} className={`h-10 w-12 rounded-lg border text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${on ? 'border-[#1a2844] bg-[#1a2844] text-white' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}>{WEEKDAYS[d]}</button>;
        })}
      </div>
      {error ? <p className="mt-0.5 text-xs text-red-600">{error}</p> : <p className="mt-0.5 text-xs text-gray-400">You may select up to {max} training sessions per week.</p>}
    </div>
  );
}

/** Nội dung buổi tập theo thứ trong tuần dựa trên đề xuất. */
function contentFor(sug: TrainingSuggestion | null, dow: number): { type: string; distance: string; target: string } {
  const e = sug?.weeklySchedule.find(w => w.day === DAY_FULL[dow]);
  if (!e || /nghỉ/i.test(e.intensity) || e.distance === '—') return { type: 'Chạy nhẹ phục hồi', distance: '1500m', target: '—' };
  return { type: /nghỉ|đi bộ/i.test(e.type) && e.intensity === 'Nghỉ' ? 'Chạy nhẹ phục hồi' : e.type, distance: e.distance, target: 'Theo giáo án' };
}

// ── Trainer-eligible horses ──────────────────────────────────────────────────

function useTrainerHorses(state: HubState) {
  const me = state.user!;
  const club = state.horses.filter(h => h.clubId === me.clubId);
  const mine = me.role === 'head_trainer'
    ? club.filter(h => h.headTrainerId === me.id || state.enrollments.some(e => e.horseId === h.id && e.trainerId === me.id && e.status !== 'completed'))
    : club;
  return { me, club, mine };
}

// ── Hub ──────────────────────────────────────────────────────────────────────

export function TrainingHubPage(props: HubProps) {
  const { state } = props;
  const { me, mine } = useTrainerHorses(state);
  const isTrainer = me.role === 'head_trainer';
  const [tab, setTab] = useState<'plans' | 'sessions' | 'schedule' | 'results'>('plans');
  const [view, setView] = useState<'hub' | 'wizard'>('hub');
  const [gen, setGen] = useState<{ horseId: string; planId: string; init?: { weekdays: number[]; time: string; weeks: number } } | null>(null);
  const [single, setSingle] = useState(false);
  const [actionError, setActionError] = useState('');
  const [confirmNote, setConfirmNote] = useState<Record<string, string>>({});
  const [skipRestore, setSkipRestore] = useState<Set<string>>(new Set());
  const [decline, setDecline] = useState<Enrollment | null>(null);
  const [accepting, setAccepting] = useState<Enrollment | null>(null);
  const [absentFor, setAbsentFor] = useState<TrainingSession | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [weekAnchor, setWeekAnchor] = useState(TODAY);

  const horseIds = new Set(mine.map(h => h.id));
  const myEnr = state.enrollments.filter(e => horseIds.has(e.horseId));
  const pendingMine = isTrainer ? state.enrollments.filter(e => e.trainerId === me.id && e.trainerStatus === 'pending' && e.status !== 'completed') : [];
  const mySessions = state.trainingSessions.filter(s => horseIds.has(s.horseId)).sort((a, b) => sortDiff(b.date, a.date) || b.time.localeCompare(a.time));
  const myPlans = state.trainingPlans.filter(p => horseIds.has(p.horseId));
  const hn = (id: string) => state.horses.find(h => h.id === id)?.name || 'Ngựa';

  const done = mySessions.filter(s => s.result);
  const avgScore = done.length ? Math.round(done.reduce((a, s) => a + s.result!.performanceScore, 0) / done.length) : 0;
  const speeds = done.map(s => parseFloat(s.result!.speed)).filter(n => !isNaN(n));
  const avgSpeed = speeds.length ? (speeds.reduce((a, n) => a + n, 0) / speeds.length).toFixed(1) : '—';

  if (view === 'wizard' && isTrainer) {
    return <TrainingPlanWizard state={state} onCancel={() => setView('hub')} onCreatePlan={props.onCreatePlan}
      onDone={(plan, init) => { setView('hub'); setTab('sessions'); setGen({ horseId: plan.horseId, planId: plan.id, init }); }} />;
  }

  const monday = (() => { const t = parseD(weekAnchor); t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return t; })();
  const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); const key = fmtD(d); return { key, label: `${['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][i]} ${d.getDate()}`, isToday: key === TODAY }; });
  const weekEnd = fmtD(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6));
  const weekSessionCount = mySessions.filter(s => weekDays.some(d => d.key === s.date) && s.status !== 'Cancelled').length;

  const listed = mySessions.filter(s => statusFilter === 'all' || s.status === statusFilter);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="font-serif text-xl font-bold">Huấn luyện & Lộ trình</h2><p className="text-sm text-gray-500">{isTrainer ? 'Huấn luyện viên' : 'Xem'} · {mine.length} ngựa phụ trách</p></div>
        <div className="flex gap-2">
          {isTrainer && tab === 'plans' && <Btn variant="gold" onClick={() => setView('wizard')}>+ Lập lộ trình</Btn>}
          {isTrainer && tab === 'sessions' && <>
            <Btn variant="secondary" onClick={() => setSingle(true)}>+ Buổi tập đơn</Btn>
            <Btn variant="gold" onClick={() => { const p = myPlans.find(x => x.status === 'Active'); if (!p) { setActionError('Chưa có lộ trình đang hoạt động — hãy lập lộ trình trước khi sinh buổi tập.'); return; } setGen({ horseId: p.horseId, planId: p.id }); }}>Sinh buổi tập</Btn>
          </>}
        </div>
      </div>

      {pendingMine.length > 0 && (
        <div className="space-y-3">
          {pendingMine.map(e => (
            <Card key={e.id} className="border-l-4 border-sky-400 bg-sky-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-sky-900">Quản lý phân công bạn huấn luyện "{hn(e.horseId)}"</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-sky-800">Gói {e.packageName} · Chủ ngựa {e.ownerName} · {e.sessionsTotal} buổi · hạn {e.expiresAt} <IdChip kind="ENR" id={e.id} /></div>
                </div>
                <div className="flex gap-2"><Btn variant="gold" onClick={() => setAccepting(e)}>Xác nhận</Btn><Btn variant="danger" onClick={() => setDecline(e)}>Từ chối</Btn></div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ErrorBox text={actionError} onClose={() => setActionError('')} />

      <div className="flex gap-0 border-b border-gray-200">
        {([['plans', '📋 Lộ trình'], ['sessions', '🏇 Buổi tập'], ['schedule', '📅 Lịch tuần'], ['results', '📊 Kết quả']] as const).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} className={`-mb-px border-b-2 px-5 py-2.5 text-sm font-medium transition-all ${tab === t ? 'border-[#c9973b] text-[#c9973b]' : 'border-transparent text-gray-500 hover:text-[#0f1729]'}`}>{l}</button>
        ))}
      </div>

      {tab === 'plans' && (
        <div className="space-y-4">
          {myEnr.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-[#0f1729]">Gói huấn luyện được phân công</h3>
              {myEnr.filter(e => e.status !== 'completed').map(e => {
                const h = state.horses.find(x => x.id === e.horseId)!;
                const t = enrollmentTerm(e);
                const voided = state.trainingSessions.filter(x => x.horseId === e.horseId && x.voidedByLock && x.status === 'Not Performed');
                const needsConfirm = e.trainerStatus === 'confirmed' && e.status === 'active' && !e.scheduleConfirmed;
                return (
                  <Card key={e.id} className={`p-4 ${e.status === 'paused' ? 'border-l-4 border-red-400' : needsConfirm ? 'border-l-4 border-amber-400' : ''}`}>
                    <div className="flex items-start gap-3">
                      {h.imageUrl ? <img src={h.imageUrl || undefined} alt="" className="h-11 w-11 rounded-lg bg-gray-200 object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100">🐎</div>}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{h.name}</span><IdChip kind="ENR" id={e.id} /><span className="text-xs text-gray-500">Gói {e.packageName}</span><Badge status={e.status === 'paused' ? 'Paused' : 'Active'} /><TrainerStatusPill status={e.trainerStatus} /></div>
                        <div className="mt-1 text-xs text-gray-500">Hiệu lực {t.text} · {t.expired ? 'đã hết hạn' : `còn ${t.left} ngày`}{e.trainerName && e.trainerId !== me.id && isTrainer ? ` · HLV: ${e.trainerName}` : ''}</div>
                        <div className="mt-2"><div className="mb-1 flex justify-between text-xs text-gray-500"><span>Đã tập {e.sessionsDone}/{e.sessionsTotal} buổi</span><span>Còn lại {e.sessionsTotal - e.sessionsDone} buổi</span></div><div className="h-2 w-full rounded-full bg-gray-200"><div className="h-2 rounded-full bg-[#c9973b]" style={{ width: `${Math.round(e.sessionsDone / Math.max(1, e.sessionsTotal) * 100)}%` }} /></div></div>
                        {e.status === 'paused' && <div className="mt-2 text-xs text-red-600">⏸ Tạm dừng từ {e.pausedAt}: {e.pauseReason}. Tiến độ được giữ nguyên, chờ Thú y gỡ khóa.</div>}
                        {needsConfirm && (
                          <div className="mt-3 space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                            <div className="text-sm font-medium text-amber-800">Thú y đã gỡ khóa. Lịch cũ chưa chạy lại — hãy điều chỉnh và xác nhận lịch tập.</div>
                            {voided.length > 0 && <div className="space-y-1">{voided.map(v => <label key={v.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!skipRestore.has(v.id)} onChange={() => setSkipRestore(p => { const n = new Set(p); if (n.has(v.id)) n.delete(v.id); else n.add(v.id); return n; })} />Khôi phục: {v.type} · {v.distance} · {v.date}</label>)}</div>}
                            {isTrainer && <><Textarea label="Điều chỉnh lộ trình (cường độ, cự ly, ghi chú)" value={confirmNote[e.horseId] || ''} onChange={v => setConfirmNote(p => ({ ...p, [e.horseId]: v }))} rows={2} placeholder="VD: Giảm 20% cường độ tuần đầu, tăng dần theo nhịp tim" />
                              <Btn variant="gold" onClick={async () => setActionError(await props.onConfirmSchedule(e.horseId, confirmNote[e.horseId] || '', voided.filter(v => !skipRestore.has(v.id)).map(v => v.id)) || '')}>✓ Xác nhận lịch tập</Btn></>}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
          {myPlans.length === 0 && <Card className="p-8 text-center"><div className="mb-2 text-4xl">📋</div><div className="font-semibold text-gray-600">Chưa có lộ trình nào</div>{isTrainer && <div className="mt-3"><Btn variant="gold" onClick={() => setView('wizard')}>+ Lập lộ trình đầu tiên</Btn></div>}</Card>}
          {myPlans.map(p => {
            const n = state.trainingSessions.filter(s => s.planId === p.id).length;
            return (
              <Card key={p.id} className="p-5">
                <div className="flex gap-2"><IdChip kind="PLN" id={p.id} /><Badge status={p.phase} /><Badge status={p.status} /></div>
                <div className="mt-2 font-semibold">{p.phase} — {hn(p.horseId)}</div>
                <div className="text-sm text-gray-500">{p.startDate} → {p.endDate} · {p.distance} · Cường độ {WORKLOAD_LABEL[p.workload] || p.workload} · {n} buổi tập</div>
                <div className="text-sm text-gray-600">Mục tiêu: {p.goals}</div>
                {p.algorithmRationale && <div className="mt-1 text-xs text-[#c9973b]">🤖 {p.algorithmRationale}</div>}
                {p.weeklyKm && <div className="mt-1 text-xs text-gray-400">{p.weeklyKm} km/tuần · {p.sessionsPerWeek} buổi · {p.restDaysPerWeek} ngày nghỉ · Điểm {p.intensityScore}</div>}
                <div className="mt-2"><div className="mb-1 flex justify-between text-xs text-gray-500"><span>Tiến độ</span><span>{p.progress}%</span></div><div className="h-2 w-full rounded-full bg-gray-200"><div className="h-2 rounded-full bg-[#c9973b]" style={{ width: `${p.progress}%` }} /></div></div>
                {isTrainer && p.status === 'Active' && <div className="mt-3"><Btn size="sm" variant="secondary" onClick={() => { setTab('sessions'); setGen({ horseId: p.horseId, planId: p.id }); }}>Sinh buổi tập</Btn></div>}
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm"><span className="text-gray-500">Lọc:</span>
            {[['all', 'Tất cả'], ['Scheduled', 'Đã lên lịch'], ['In Progress', 'Đang diễn ra'], ['Completed', 'Hoàn thành'], ['Not Performed', 'Không thực hiện']].map(([k, l]) => <button key={k} onClick={() => setStatusFilter(k)} className={`rounded-full border px-3 py-1 text-xs font-medium ${statusFilter === k ? 'border-[#1a2844] bg-[#1a2844] text-white' : 'border-gray-300 bg-white text-gray-600'}`}>{l}</button>)}
          </div>
          {listed.length === 0 && <Card className="p-8 text-center text-sm text-gray-500">Chưa có buổi tập nào{statusFilter !== 'all' ? ' ở bộ lọc này' : ''}.</Card>}
          {listed.map(s => {
            const canCheckIn = isTrainer && s.status === 'Scheduled' && !s.attendance && s.date === TODAY && s.trainerId === me.id;
            return (
              <Card key={s.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2"><IdChip kind="SES" id={s.id} /><Badge status={s.status} />{isHeavySession(s.type) && <span className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">Buổi nặng</span>}
                      {s.attendance && <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${s.attendance.status === 'present' ? 'border-emerald-200 bg-emerald-100 text-emerald-800' : 'border-red-200 bg-red-100 text-red-700'}`}>{s.attendance.status === 'present' ? 'Có mặt' : 'Vắng mặt'}</span>}</div>
                    <div className="font-semibold">{s.type} — {hn(s.horseId)} · {s.distance}</div>
                    <div className="text-sm text-gray-500">{dateLabel(s.date)} · {s.time} · Đích: {s.targetTime}</div>
                    {s.notes && <div className="text-sm text-gray-600">{s.notes}</div>}
                    <div className="mt-1 text-xs text-gray-400">Nhân viên chăm sóc: {s.assignedStaffNames.join(', ') || '—'}</div>
                    {s.attendance?.note && <div className="mt-1 text-xs text-red-600">Lý do vắng: {s.attendance.note}</div>}
                    {s.status === 'Not Performed' && s.voidedByLock && <div className="mt-1 text-xs text-red-600">⛔ Không thực hiện — ngựa bị khóa huấn luyện. Cần xác nhận lại lịch sau khi Thú y gỡ khóa.</div>}
                    {s.status === 'Scheduled' && isTrainer && s.date === TODAY && s.attendance?.status === 'present' && <div className="mt-1 text-xs text-emerald-700">Đã điểm danh — có thể bắt đầu buổi tập.</div>}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    {canCheckIn && <><Btn size="sm" variant="primary" onClick={async () => { const r = await props.onCheckIn(s.id, true, ''); setActionError(r.ok ? '' : r.message); }}>Bắt đầu buổi tập</Btn><Btn size="sm" variant="secondary" onClick={() => setAbsentFor(s)}>Vắng mặt</Btn></>}
                    {isTrainer && s.status === 'Scheduled' && s.canStart && <Btn size="sm" variant="gold" onClick={async () => setActionError(await props.onStartSession(s.id) || '')}>▶ Bắt đầu</Btn>}
                    {isTrainer && s.status === 'Scheduled' && !s.attendance && s.date !== TODAY && <span className="text-[11px] text-gray-400">Điểm danh vào ngày tập</span>}
                    {isTrainer && (s.canStop || s.canComplete) && completing !== s.id && <Btn size="sm" variant="primary" onClick={async () => { setActionError(''); if (s.canStop) { const stopped = await props.onStopSession(s.id); if (!stopped.ok) { setActionError(stopped.message); return; } } setCompleting(s.id); }}>{s.canStop ? 'Stop exercise & record recovery' : 'Record recovery results'}</Btn>}
                  </div>
                </div>
                {completing === s.id && <ResultForm onCancel={() => setCompleting(null)} onSubmit={async r => { const err = await props.onCompleteSession(s.id, r); setActionError(err || ''); if (!err) setCompleting(null); return err; }} />}
                {s.result && <div className="mt-3 grid grid-cols-4 gap-3 border-t border-gray-100 pt-3">{[['Thời gian (giây)', s.result.time], ['Tốc độ', `${s.result.speed} km/h`], ['Nhịp tim', `${s.result.heartRate} bpm`], ['Nhịp hồi phục 2 phút', `${s.result.performanceScore} bpm`]].map(([k, v]) => <div key={k} className="rounded-lg bg-gray-50 p-2 text-center"><div className="text-xs text-gray-500">{k}</div><div className="font-mono text-sm font-bold">{v}</div></div>)}</div>}
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'schedule' && (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4">
            <div><div className="font-semibold text-[#0f1729]">Tuần {fmtD(monday)} – {weekEnd}</div><div className="text-xs text-gray-500">{weekSessionCount} buổi tập</div></div>
            <div className="flex flex-wrap items-center gap-2">
              <Btn size="sm" variant="secondary" onClick={() => setWeekAnchor(fmtD(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7)))}>‹</Btn>
              <Btn size="sm" variant="secondary" onClick={() => setWeekAnchor(TODAY)}>Hôm nay</Btn>
              <input type="date" aria-label="Chọn ngày để nhảy đến tuần" value={dToIso(weekAnchor)} onChange={e => setWeekAnchor(isoToD(e.target.value))} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs" />
              <Btn size="sm" variant="secondary" onClick={() => setWeekAnchor(fmtD(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7)))}>›</Btn>
            </div>
          </div>
          {weekSessionCount === 0 && <div className="border-b border-gray-100 px-4 py-8 text-center text-sm text-gray-500">Chưa có buổi tập trong tuần này</div>}
          <div className="grid grid-cols-7 border-b border-gray-200">{weekDays.map(d => <div key={d.key} className={`px-2 py-3 text-center text-xs font-semibold ${d.isToday ? 'bg-[#c9973b]/10 text-[#c9973b]' : 'text-gray-500'}`}>{d.label}</div>)}</div>
          <div className="grid min-h-40 grid-cols-7 divide-x divide-gray-100">
            {weekDays.map(d => {
              const ev = mySessions.filter(s => s.date === d.key && s.status !== 'Cancelled').sort((a, b) => a.time.localeCompare(b.time));
              const color = (st: string) => st === 'Completed' ? 'bg-emerald-700' : st === 'In Progress' ? 'bg-[#c9973b]' : st === 'Not Performed' ? 'bg-red-500' : 'bg-[#1a2844]';
              return <div key={d.key} className={`space-y-1.5 p-2 ${d.isToday ? 'bg-[#c9973b]/5' : ''}`}>{ev.map(e => <div key={e.id} className={`rounded-lg p-2 text-xs text-white ${color(e.status)}`}><div className="font-semibold">{hn(e.horseId)}</div><div className="text-[10px] opacity-75">{e.time} · {e.type} {e.distance}</div>{e.status === 'Completed' && <div className="mt-1 text-[10px] font-medium">Hoàn thành</div>}{e.status === 'Not Performed' && <div className="mt-1 text-[10px] font-medium">{e.attendance?.status === 'absent' ? 'Vắng' : 'Không thực hiện'}</div>}</div>)}{ev.length === 0 && <div className="py-5 text-center text-xs text-gray-200">—</div>}</div>;
            })}
          </div>
        </Card>
      )}

      {tab === 'results' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4"><Stat label="Buổi tập hoàn thành" value={mySessions.filter(s => s.status === 'Completed').length} /><Stat label="Tốc độ TB" value={avgSpeed === '—' ? '—' : `${avgSpeed} km/h`} tone="gold" /><Stat label="Nhịp hồi phục TB" value={done.length ? `${avgScore} bpm` : '—'} tone="green" /></div>
          {done.length === 0 && <Card className="p-8 text-center text-sm text-gray-500">Chưa có kết quả. Hãy điểm danh, bắt đầu một buổi tập rồi ghi chỉ số ở tab Buổi tập.</Card>}
          {done.map(s => (
            <Card key={s.id} className="p-5">
              <div className="mb-1 flex items-center gap-2"><IdChip kind="SES" id={s.id} /><span className="font-semibold">{s.type} · {s.distance} · {s.date} — {hn(s.horseId)}</span></div>
              <div className="mt-3 grid grid-cols-4 gap-3">{[['Thời gian (giây)', s.result!.time], ['Tốc độ', `${s.result!.speed} km/h`], ['Nhịp tim', `${s.result!.heartRate} bpm`], ['Nhịp hồi phục 2 phút', `${s.result!.performanceScore} bpm`]].map(([k, v]) => <div key={k} className="rounded-lg bg-gray-50 p-3 text-center"><div className="text-xs text-gray-500">{k}</div><div className="mt-0.5 font-mono text-sm font-bold">{v}</div></div>)}</div>
              {s.result!.notes && <p className="mt-3 text-sm italic text-gray-600">"{s.result!.notes}"</p>}
            </Card>
          ))}
        </div>
      )}

      {accepting && (
        <Modal title="Xác nhận nhận huấn luyện?" onClose={() => setAccepting(null)}>
          <p className="text-sm text-gray-600">Bạn sẽ chịu trách nhiệm huấn luyện <strong>{hn(accepting.horseId)}</strong> theo gói {accepting.packageName} đến {accepting.expiresAt}.</p>
          <div className="mt-5 flex justify-end gap-2"><Btn variant="secondary" onClick={() => setAccepting(null)}>Hủy</Btn><Btn variant="gold" onClick={async () => { const r = await props.onRespond(accepting.id, true, ''); setActionError(r.ok ? '' : r.message); setAccepting(null); }}>Xác nhận</Btn></div>
        </Modal>
      )}
      {decline && <ReasonDialog title="Từ chối phân công" description={<>Từ chối huấn luyện <strong>{hn(decline.horseId)}</strong>? Quản lý sẽ được báo để phân công người khác.</>} confirmLabel="Từ chối phân công" danger onClose={() => setDecline(null)} onConfirm={async reason => { const r = await props.onRespond(decline.id, false, reason); setActionError(r.ok ? '' : r.message); setDecline(null); }} />}
      {absentFor && <ReasonDialog title="Ghi nhận vắng mặt" description={<>Buổi <strong>{absentFor.type}</strong> của {hn(absentFor.horseId)} sẽ chuyển sang "Không thực hiện".</>} confirmLabel="Ghi nhận vắng" danger onClose={() => setAbsentFor(null)} onConfirm={async reason => { const r = await props.onCheckIn(absentFor.id, false, reason); setActionError(r.ok ? '' : r.message); setAbsentFor(null); }} />}
      {gen && <SessionGenerator state={state} horseId={gen.horseId} planId={gen.planId} init={gen.init} onClose={() => setGen(null)} onGenerate={props.onGenerate} onDone={() => { setGen(null); setTab('sessions'); }} />}
      {single && <SingleSessionForm state={state} onClose={() => setSingle(false)} onGenerate={props.onGenerate} />}
    </div>
  );
}

// ── Result form ──────────────────────────────────────────────────────────────

function ResultForm({ onSubmit, onCancel }: { onSubmit: (r: ResultT) => string | null | Promise<string | null>; onCancel: () => void }) {
  const [f, setF] = useState({ time: '', speed: '', hr: '', score: '', notes: '' });
  const [e, setE] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (v: string) => { setF(p => ({ ...p, [k]: v })); setE(p => ({ ...p, [k]: '' })); };
  const submit = async () => {
    const x: Record<string, string> = {};
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(f.time.trim())) x.time = 'Nhập cự ly thực tế bằng km, tối đa 2 chữ số thập phân.';
    const sp = Number(f.speed);
    if (f.speed.trim() === '' || isNaN(sp) || sp < 0 || sp > 100) x.speed = 'Tốc độ từ 0 đến 100 km/h.';
    const hr = Number(f.hr);
    if (f.hr.trim() === '' || !Number.isInteger(hr) || hr < 20 || hr > 250) x.hr = 'Nhịp tim là số nguyên từ 20 đến 250 bpm.';
    const sc = Number(f.score);
    if (f.score.trim() === '' || !Number.isInteger(sc) || sc < 20 || sc > 250) x.score = 'Nhịp tim hồi phục phải từ 20 đến 250 bpm.';
    if (f.notes.length > 300) x.notes = 'Nhận xét tối đa 300 ký tự.';
    setE(x);
    if (Object.keys(x).length) return;
    const r = await onSubmit({ time: f.time.trim(), speed: String(sp), heartRate: hr, notes: f.notes.trim(), performanceScore: sc });
    if (r) setErr(r);
  };
  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <h4 className="mb-3 text-sm font-semibold">Ghi chỉ số buổi tập</h4>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Cự ly thực tế (km)" required value={f.time} onChange={set('time')} placeholder="VD: 1.2" hint="Cự ly đã hoàn thành, tối đa 2 chữ số thập phân" error={e.time} />
        <Input label="Tốc độ trung bình (km/h)" required type="number" value={f.speed} onChange={set('speed')} placeholder="VD: 58.6" hint="0–100" error={e.speed} />
        <Input label="Nhịp tim cuối bài (bpm)" required type="number" value={f.hr} onChange={set('hr')} placeholder="VD: 188" hint="20–250" error={e.hr} />
        <Input label="Nhịp tim sau hồi phục 2 phút (bpm)" required type="number" value={f.score} onChange={set('score')} placeholder="VD: 85" hint="Đo ít nhất 2 phút sau khi dừng bài; 20–250 bpm" error={e.score} />
        <div className="col-span-2"><Textarea label="Nhận xét" value={f.notes} onChange={set('notes')} rows={2} placeholder="Phong độ, kỹ thuật, tiến bộ..." hint={`${f.notes.length}/300`} />{e.notes && <p className="text-xs text-red-600">{e.notes}</p>}</div>
      </div>
      {err && <div className="mt-3"><ErrorBox text={err} /></div>}
      <div className="mt-4 flex gap-2"><Btn variant="gold" onClick={submit}>💾 Lưu & hoàn thành</Btn><Btn variant="secondary" onClick={onCancel}>Hủy</Btn></div>
    </div>
  );
}

// ── Session generator ────────────────────────────────────────────────────────

interface GenProps {
  state: HubState; horseId: string; planId: string;
  init?: { weekdays: number[]; time: string; weeks: number };
  onClose: () => void; onDone: () => void;
  onGenerate: HubProps['onGenerate'];
}

function SessionGenerator({ state, horseId, planId, init, onClose, onDone, onGenerate }: GenProps) {
  const me = state.user!;
  const horse = state.horses.find(h => h.id === horseId)!;
  const plan = state.trainingPlans.find(p => p.id === planId)!;
  const en = currentEnrollment(state.enrollments, horseId);
  const sug: TrainingSuggestion | null = null;
  const [weekdays, setWeekdays] = useState<number[]>(init?.weekdays ?? []);
  const [time, setTime] = useState(init?.time ?? '07:30');
  const [weeks, setWeeks] = useState(String(init?.weeks ?? 2));
  const [start, setStart] = useState(dToIso(diffDays(TODAY, plan.startDate) > 0 ? plan.startDate : TODAY));
  const [rows, setRows] = useState<SessionDraft[] | null>(null);
  const [formErr, setFormErr] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState(false);
  const [serverErr, setServerErr] = useState('');

  const build = async () => {
    setServerErr('');
    try {
      const stages = await request<any[]>(`/training-plans/${encodeURIComponent(planId)}/stages`);
      const output: SessionDraft[] = [];
      const dayKeys = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
      const startDate = en?.startedAt || plan.startDate;
      for (const stage of stages) {
        const days: string[] = typeof stage.weekdays_json === 'string' ? JSON.parse(stage.weekdays_json) : stage.daysOfWeek || [];
        for (let day = Number(stage.start_day || stage.startDay); day <= Number(stage.end_day || stage.endDay); day++) {
          const date = addDays(startDate, day-1);
          if (days.includes(dayKeys[parseD(date).getDay()])) output.push({ date, time: String(stage.session_time || stage.sessionTime).slice(0,5), type: stage.activity_name || stage.activityName, distance: 'Theo phác đồ', targetTime: '', notes: stage.objective || '' });
        }
      }
      setRows(output);
    } catch (e) { setServerErr((e as Error).message); }
  };

  const chk = rows ? checkSessionDrafts({ sessions: state.trainingSessions, enrollments: state.enrollments, horseId, trainerId: me.id }, rows) : null;
  const rowErr = rows?.map((r, i) => chk!.rows[i] || (validDate(r.date) && (diffDays(plan.startDate, r.date) < 0 || diffDays(r.date, plan.endDate) < 0) ? `Ngoài thời gian lộ trình (${plan.startDate} – ${plan.endDate})` : '')) || [];
  const hasErr = !!rows && (rowErr.some(Boolean) || !!chk?.global || rows.length === 0);
  const upd = (i: number, p: Partial<SessionDraft>) => setRows(rs => rs!.map((r, j) => j === i ? { ...r, ...p } : r));

  return (
    <Modal title="Sinh buổi tập" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm"><strong>{horse.name}</strong><IdChip kind="PLN" id={plan.id} /><span className="text-gray-500">{plan.phase} · {plan.startDate} – {plan.endDate}</span>{en && <span className="text-gray-500">· còn {en.sessionsTotal - en.sessionsDone} buổi trong gói</span>}</div>
        <WeekdayPicker value={weekdays} max={plan.sessionsPerWeek || 6} onChange={v => { setWeekdays(v); setFormErr(p => ({ ...p, weekdays: '' })); }} error={formErr.weekdays} />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Giờ tập" required type="time" value={time} onChange={setTime} error={formErr.time} />
          <Input label="Số tuần" required type="number" value={weeks} onChange={setWeeks} hint="1–12 tuần" error={formErr.weeks} />
          <Input label="Từ ngày" required type="date" value={start} min={dToIso(TODAY)} onChange={setStart} error={formErr.start} />
        </div>
        <Btn variant="secondary" onClick={build}>{rows ? 'Tạo lại bản xem trước' : 'Tạo bản xem trước'}</Btn>

        {rows && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm"><strong>Xem trước: {rows.length} buổi</strong><span className="text-xs text-gray-400">Có thể sửa hoặc xóa từng dòng</span></div>
            <Btn size="sm" variant="secondary" onClick={() => setRows(rs => {
              const base = rs?.[rs.length - 1];
              const date = base && validDate(base.date) ? addDays(base.date, 1) : TODAY;
              const c = contentFor(sug, parseD(date).getDay());
              return [...(rs || []), { date, time, type: c.type, distance: c.distance, targetTime: c.target, notes: `Replacement session for ${plan.phase}` }];
            })}>+ Add replacement date</Btn>
            {rows.length === 0 && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Không có buổi nào — hãy chọn ngày trong tuần hoặc thêm số tuần.</div>}
            {chk?.global && <ErrorBox text={chk.global} />}
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {rows.map((r, i) => (
                <div key={i} className={`rounded-lg border p-2 ${rowErr[i] ? 'border-red-300 bg-red-50/50' : 'border-gray-200'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-24 font-mono text-[11px] text-gray-500">SES-{String(Number(nextNum(state.trainingSessions)) + i).padStart(6, '0')}</span>
                    <input type="date" value={dToIso(r.date)} onChange={e => upd(i, { date: isoToD(e.target.value) })} className="rounded border border-gray-300 px-2 py-1 text-xs" />
                    <span className="text-xs text-gray-500">{validDate(r.date) ? weekdayLabel(r.date) : ''}</span>
                    <input type="time" value={r.time} onChange={e => upd(i, { time: e.target.value })} className="rounded border border-gray-300 px-2 py-1 text-xs" />
                    <select value={r.type} onChange={e => upd(i, { type: e.target.value })} className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-xs">{[...new Set([r.type, ...SESSION_TYPES])].map(t => <option key={t}>{t}</option>)}</select>
                    <input value={r.distance} onChange={e => upd(i, { distance: e.target.value })} className="w-20 rounded border border-gray-300 px-2 py-1 text-xs" aria-label="Cự ly" />
                    <button onClick={() => setRows(rs => rs!.filter((_, j) => j !== i))} aria-label="Xóa dòng" className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">Xóa</button>
                  </div>
                  {rowErr[i] && <div className="mt-1 text-xs text-red-600">{rowErr[i]}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
        {serverErr && <ErrorBox text={serverErr} />}
        <div className="flex justify-end gap-2"><Btn variant="secondary" onClick={onClose}>Hủy</Btn><Btn variant="gold" disabled={!rows || hasErr} onClick={() => setConfirm(true)}>Tạo {rows?.length || 0} buổi tập</Btn></div>
      </div>
      {confirm && rows && (
        <Modal title="Xác nhận tạo buổi tập?" onClose={() => setConfirm(false)}>
          <p className="text-sm text-gray-600">Tạo <strong>{rows.length}</strong> buổi tập cho <strong>{horse.name}</strong> từ {rows[0].date} đến {rows[rows.length - 1].date}.</p>
          <div className="mt-5 flex justify-end gap-2"><Btn variant="secondary" onClick={() => setConfirm(false)}>Quay lại</Btn><Btn variant="gold" onClick={async () => { const r = await onGenerate(horseId, planId, rows); setConfirm(false); if (!r.ok) setServerErr(r.message); else onDone(); }}>Xác nhận tạo</Btn></div>
        </Modal>
      )}
    </Modal>
  );
}

function nextNum(sessions: TrainingSession[]): number {
  return sessions.reduce((m, s) => { const x = /^SES-(\d{6})$/.exec(s.id); return x ? Math.max(m, Number(x[1])) : m; }, 0) + 1;
}

// ── Single session ───────────────────────────────────────────────────────────

function SingleSessionForm({ state, onClose, onGenerate }: { state: HubState; onClose: () => void; onGenerate: HubProps['onGenerate'] }) {
  const me = state.user!;
  const eligible = state.horses.filter(h => h.clubId === me.clubId && !trainerPlanBlockReason(h, state.enrollments, me.id));
  const blocked = state.horses.filter(h => h.clubId === me.clubId && (h.headTrainerId === me.id) && trainerPlanBlockReason(h, state.enrollments, me.id));
  const [f, setF] = useState({ horseId: eligible[0]?.id || '', date: '', time: '07:30', type: SESSION_TYPES[0], distance: '1200m', targetTime: '', notes: '' });
  const [e, setE] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (v: string) => { setF(p => ({ ...p, [k]: v })); setE(p => ({ ...p, [k]: '' })); setErr(''); };
  const plan = state.trainingPlans.find(p => p.horseId === f.horseId && p.status === 'Active');

  const submit = async () => {
    const x: Record<string, string> = {};
    if (!f.horseId) x.horseId = 'Chưa có ngựa hợp lệ để lập buổi tập.';
    const d = isoToD(f.date);
    if (!validDate(d)) x.date = 'Bắt buộc chọn ngày tập.'; else if (diffDays(TODAY, d) < 0) x.date = 'Ngày tập không được ở quá khứ.';
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(f.time)) x.time = 'Giờ không hợp lệ.';
    if (!f.distance.trim()) x.distance = 'Nhập cự ly.';
    if (f.notes.length > 300) x.notes = 'Ghi chú tối đa 300 ký tự.';
    if (!plan && f.horseId) x.horseId = 'Ngựa này chưa có lộ trình đang hoạt động.';
    if (!x.date && !x.time && f.horseId) {
      const draft: SessionDraft = { date: d, time: f.time, type: f.type, distance: f.distance.trim(), targetTime: f.targetTime.trim() || '—', notes: f.notes };
      const c = checkSessionDrafts({ sessions: state.trainingSessions, enrollments: state.enrollments, horseId: f.horseId, trainerId: me.id }, [draft]);
      if (c.rows[0]) x.date = c.rows[0]; else if (c.global) x.horseId = c.global;
    }
    setE(x);
    if (Object.keys(x).length) return;
    const r = await onGenerate(f.horseId, plan!.id, [{ date: d, time: f.time, type: f.type, distance: f.distance.trim(), targetTime: f.targetTime.trim() || '—', notes: f.notes }]);
    if (!r.ok) setErr(r.message); else onClose();
  };

  return (
    <Modal title="Lên lịch buổi tập đơn" onClose={onClose} wide>
      <div className="space-y-4">
        {eligible.length === 0 && <ErrorBox text="Chưa có ngựa nào đủ điều kiện lập buổi tập (cần được phân công, đã xác nhận và không bị khóa)." />}
        {blocked.length > 0 && <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">Không chọn được: {blocked.map(h => `${h.name} (${trainerPlanBlockReason(h, state.enrollments, me.id)})`).join('; ')}</div>}
        <Select label="Ngựa" required value={f.horseId} onChange={set('horseId')} options={eligible.map(h => ({ value: h.id, label: h.name }))} error={e.horseId} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Ngày" required type="date" value={f.date} min={dToIso(TODAY)} onChange={set('date')} hint="Không chọn ngày đã qua" error={e.date} />
          <Input label="Giờ" required type="time" value={f.time} onChange={set('time')} error={e.time} />
          <Select label="Loại buổi tập" value={f.type} onChange={set('type')} options={SESSION_TYPES.map(v => ({ value: v, label: v }))} />
          <Select label="Cự ly" value={f.distance} onChange={set('distance')} options={['200m', '400m', '800m', '1000m', '1200m', '1600m', '2000m', '2400m', '3000m'].map(v => ({ value: v, label: v }))} error={e.distance} />
          <Input label="Thời gian đích" value={f.targetTime} onChange={set('targetTime')} placeholder="VD: 74s" />
        </div>
        <Textarea label="Ghi chú" value={f.notes} onChange={set('notes')} rows={2} hint={`${f.notes.length}/300`} />
        {e.notes && <p className="text-xs text-red-600">{e.notes}</p>}
        {err && <ErrorBox text={err} />}
        <div className="flex justify-end gap-2"><Btn variant="secondary" onClick={onClose}>Hủy</Btn><Btn variant="gold" disabled={eligible.length === 0} onClick={submit}>Lưu buổi tập</Btn></div>
      </div>
    </Modal>
  );
}

// ── Training plan wizard ─────────────────────────────────────────────────────

const WIZ_STEPS = ['Chọn ngựa', 'Tình trạng', 'Mục tiêu', 'Chọn lịch', 'Xem trước', 'Xác nhận'];

interface WizProps {
  state: HubState; onCancel: () => void;
  onCreatePlan: HubProps['onCreatePlan'];
  onDone: (plan: TrainingPlan, init: { weekdays: number[]; time: string; weeks: number }) => void;
}

export function TrainingPlanWizard({ state, onCancel, onCreatePlan, onDone }: WizProps) {
  const { me, mine } = useTrainerHorses(state);
  const [step, setStep] = useState(0);
  const [horseId, setHorseId] = useState('');
  const [f, setF] = useState({ phase: '', goal: '', distance: '1200m', weeks: '4', start: dToIso(TODAY), level: '' });
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [time, setTime] = useState('07:30');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [submitErr, setSubmitErr] = useState('');
  const [busy, setBusy] = useState(false);

  const horse = mine.find(h => h.id === horseId);
  const rec = horse ? latestRecord(state.healthRecords, horse.id) : undefined;
  const [sug, setSug] = useState<TrainingSuggestion | null>(null);
  const en = horse ? currentEnrollment(state.enrollments, horse.id) : undefined;
  useEffect(() => {
    let active = true; setSug(null); setSubmitErr('');
    if (!en?.assignmentId || en.trainerStatus !== 'confirmed') return;
    void recommendationFor(en.id, en.assignmentId).then(value => {
      if (!active) return;
      setSug(recommendationView(value));
      setF(p => ({ ...p, start: dToIso(en.startedAt), weeks: String(Math.ceil(diffDays(en.startedAt, en.expiresAt)/7)) }));
      setWeekdays([...new Set<number>((value.stages || []).flatMap((s: any) => s.daysOfWeek.map((day: string) => ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'].indexOf(day))))]);
      setTime(value.stages?.[0]?.sessionTime?.slice(0,5) || '07:30');
    }).catch(e => { if (active) setSubmitErr((e as Error).message); });
    return () => { active = false; };
  }, [en?.id, en?.assignmentId, en?.trainerStatus]);
  const decision = rec ? (rec.decision === 'not-eligible' || rec.trainingEligibility === 'not-eligible' ? 'not-eligible' : rec.trainingEligibility === 'conditional' ? 'conditional' : 'eligible') : null;
  const sugLevel = sug ? suggestedLevel(sug) : 0;
  const level = f.level || INTENSITY_LEVELS[sugLevel];
  const phase = f.phase || sug?.phase || PHASES[0];
  const weeks = Number(f.weeks);
  const startD = isoToD(f.start);
  const endD = en?.expiresAt || (validDate(startD) && Number.isInteger(weeks) ? addDays(startD, weeks * 7 - 1) : '');
  const total = weekdays.length * (Number.isInteger(weeks) ? weeks : 0);
  const remain = en && en.sessionsTotal > 0 ? en.sessionsTotal - en.sessionsDone : (sug?.sessionCount || 0);

  const set = (k: keyof typeof f) => (v: string) => { setF(p => ({ ...p, [k]: v })); setErrs(p => ({ ...p, [k]: '' })); };

  const validate = (): boolean => {
    const x: Record<string, string> = {};
    if (step === 0) {
      if (!sug && horse) x.horse = 'Chưa có phác đồ hợp lệ từ BE. Kiểm tra thông báo lỗi bên dưới.';
      if (!horse) x.horse = 'Vui lòng chọn ngựa.';
      else { const b = trainerPlanBlockReason(horse, state.enrollments, me.id); if (b) x.horse = `Không thể chọn "${horse.name}": ${b}.`; }
    }
    if (step === 1) {
      if (!sug) x.health = 'Chưa tải được đề xuất BE. Kiểm tra phác đồ đã được bác sĩ phê duyệt.';
      if (!rec) x.health = 'Ngựa chưa có hồ sơ khám — cần Thú y khám trước khi lập lộ trình.';
      else if (decision === 'not-eligible') x.health = 'Kết luận khám gần nhất: KHÔNG đủ điều kiện huấn luyện. Không thể lập lộ trình.';
    }
    if (step === 2) {
      const g = f.goal.trim();
      if (g.length < 10 || g.length > 300) x.goal = 'Mục tiêu phải từ 10 đến 300 ký tự.';
      if (!Number.isInteger(weeks) || weeks < 1 || weeks > 12) x.weeks = 'Số tuần từ 1 đến 12.';
      if (!validDate(startD)) x.start = 'Chọn ngày bắt đầu.'; else if (diffDays(TODAY, startD) < 0) x.start = 'Ngày bắt đầu không được ở quá khứ.';
      if (INTENSITY_LEVELS.indexOf(level as typeof INTENSITY_LEVELS[number]) > sugLevel) x.level = `Cường độ vượt mức đề xuất (tối đa "${INTENSITY_LEVELS[sugLevel]}") theo tình trạng hiện tại của ngựa.`;
      if (en && validDate(startD) && diffDays(startD, en.expiresAt) < 0) x.start = `Ngày bắt đầu sau ngày hết hạn gói (${en.expiresAt}).`;
    }
    if (step === 3) {
      if (weekdays.length < 1 || weekdays.length > 6) x.weekdays = 'Chọn từ 1 đến 6 ngày trong tuần.';
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) x.time = 'Giờ không hợp lệ.';
    }
    setErrs(x);
    return Object.keys(x).length === 0;
  };
  const next = () => { if (validate()) setStep(s => s + 1); };

  const submit = async () => {
    if (!horse || !sug || busy) return;
    setBusy(true);
    const r = await onCreatePlan({ horseId: horse.id, phase, startDate: startD, endDate: endD, distance: f.distance, workload: WORKLOAD_OF[level], surface: 'Cỏ', goals: f.goal.trim(), suggestion: sug, weekdays, time });
    setBusy(false);
    if (!r.ok) { setSubmitErr(r.message); return; }
    onDone(r.data, { weekdays, time, weeks });
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-start justify-between"><div><h2 className="font-serif text-xl font-bold text-[#0f1729]">Lập lộ trình huấn luyện</h2><p className="text-sm text-gray-500">Tạo lộ trình từ tình trạng sức khỏe mới nhất của ngựa</p></div><Btn variant="ghost" onClick={onCancel}>Hủy</Btn></div>
      <Card className="p-5"><Progress step={step} labels={WIZ_STEPS} /></Card>

      {step === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Chọn ngựa <span className="text-red-500">*</span> · Chỉ ngựa đang được phân công cho bạn, đã xác nhận và không bị khóa</p>
          {mine.length === 0 && <Card className="p-8 text-center text-sm text-gray-500">Bạn chưa được phân công ngựa nào.</Card>}
          {mine.map(h => {
            const b = trainerPlanBlockReason(h, state.enrollments, me.id);
            return (
              <button key={h.id} disabled={!!b} onClick={() => { setHorseId(h.id); setErrs({}); }} className={`flex w-full items-center gap-4 rounded-xl border-2 bg-white p-4 text-left ${b ? 'cursor-not-allowed border-gray-200 opacity-50' : horseId === h.id ? 'border-[#c9973b] shadow-md' : 'border-gray-200 hover:border-[#c9973b]/60'}`}>
                {h.imageUrl ? <img src={h.imageUrl || undefined} alt="" className="h-12 w-12 rounded-lg bg-gray-200 object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">🐎</div>}
                <div className="flex-1"><div className="font-semibold">{h.name}</div><div className="text-xs text-gray-500">{h.breed} · {h.age} tuổi</div></div>
                {b ? <span className="rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs text-gray-600">{b}</span> : <span className={`h-5 w-5 rounded-full border-2 ${horseId === h.id ? 'border-[#c9973b] bg-[#c9973b]' : 'border-gray-300'}`} />}
              </button>
            );
          })}
        </div>
      )}

      {step === 1 && horse && sug && (
        <Card className="space-y-4 p-6">
          <h3 className="font-serif text-lg font-bold">Tình trạng của {horse.name}</h3>
          {rec ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-4 text-sm">
                <div className="mb-1 text-xs font-semibold uppercase text-gray-400">Hồ sơ khám gần nhất · {rec.date}</div>
                <div className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${decision === 'not-eligible' ? 'bg-red-100 text-red-700' : decision === 'conditional' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{decision === 'not-eligible' ? 'Không đủ điều kiện' : decision === 'conditional' ? 'Đủ điều kiện có điều kiện' : 'Đủ điều kiện huấn luyện'}</div>
                <p className="text-gray-700">{rec.conclusion || rec.result || rec.notes || 'Không có kết luận'}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4 text-sm">
                <div className="mb-1 text-xs font-semibold uppercase text-gray-400">Chỉ số sinh tồn gần nhất</div>
                {rec.vitals ? <ul className="space-y-0.5 text-gray-700"><li>Nhịp tim: <strong>{rec.vitals.heartRate} bpm</strong></li><li>Nhiệt độ: <strong>{rec.vitals.temperature}°C</strong></li><li>Cân nặng: <strong>{rec.vitals.weight} kg</strong></li><li>Nhịp thở: <strong>{rec.vitals.respRate}</strong></li></ul> : <p className="text-gray-400">Chưa ghi sinh hiệu</p>}
              </div>
            </div>
          ) : <ErrorBox text="Ngựa chưa có hồ sơ khám." />}
          <div className="rounded-xl border border-[#c9973b]/30 bg-[#c9973b]/5 p-4 text-sm">
            <div className="font-semibold text-[#8a6420]">Đề xuất cường độ: {INTENSITY_LEVELS[sugLevel]} · giai đoạn {sug.phase} · phác đồ đã được BE chọn</div>
            <div className="mt-1 text-gray-600">{sug.sessionsPerWeek} buổi/tuần · {sug.restDaysPerWeek} ngày nghỉ</div>
            {sug.warnings.map(w => <div key={w} className="mt-1 text-xs text-amber-700">⚠ {w}</div>)}
          </div>
          {errs.health && <ErrorBox text={errs.health} />}
        </Card>
      )}

      {step === 2 && horse && sug && (
        <Card className="space-y-4 p-6">
          <h3 className="font-serif text-lg font-bold">Đặt mục tiêu</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Select label="Giai đoạn" required value={phase} onChange={set('phase')} options={[...new Set([phase, ...PHASES])].map(v => ({ value: v, label: v }))} hint={`Đề xuất: ${sug.phase}`} />
            <Select label="Cự ly chính" required value={f.distance} onChange={set('distance')} options={DISTANCES.map(v => ({ value: v, label: v }))} />
            <Input label="Số tuần" required type="number" value={f.weeks} onChange={set('weeks')} hint="Từ 1 đến 12 tuần" error={errs.weeks} />
            <Input label="Ngày bắt đầu" required type="date" value={f.start} min={dToIso(TODAY)} onChange={set('start')} hint="Từ hôm nay trở đi" error={errs.start} />
            <Select label="Cường độ" required value={level} onChange={set('level')} options={INTENSITY_LEVELS.map(v => ({ value: v, label: v }))} hint={`Tối đa theo đề xuất: ${INTENSITY_LEVELS[sugLevel]}`} error={errs.level} />
          </div>
          <div>
            <Textarea label="Mục tiêu" required value={f.goal} onChange={set('goal')} rows={3} placeholder="VD: Cải thiện tốc độ nước rút cho giải 1200m" hint={`10–300 ký tự · ${f.goal.length}/300`} />
            {errs.goal && <p className="text-xs text-red-600">{errs.goal}</p>}
          </div>
        </Card>
      )}

      {step === 3 && sug && (
        <Card className="space-y-4 p-6">
          <h3 className="font-serif text-lg font-bold">Chọn lịch tập</h3>
          <WeekdayPicker value={weekdays} max={6} onChange={v => { setWeekdays(v); setErrs(p => ({ ...p, weekdays: '' })); }} error={errs.weekdays} />
          <div className="max-w-xs"><Input label="Giờ tập" required type="time" value={time} onChange={v => { setTime(v); setErrs(p => ({ ...p, time: '' })); }} error={errs.time} /></div>
          {weekdays.length > sug.sessionsPerWeek && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Bạn chọn {weekdays.length} buổi/tuần, cao hơn mức đề xuất {sug.sessionsPerWeek} buổi/tuần cho tình trạng hiện tại.</div>}
        </Card>
      )}

      {step === 4 && horse && sug && (
        <Card className="space-y-4 p-6">
          <h3 className="font-serif text-lg font-bold">Xem trước lộ trình</h3>
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <div>Ngựa: <strong>{horse.name}</strong></div><div>Giai đoạn: <strong>{phase}</strong></div>
            <div>Thời gian: <strong>{startD} – {endD}</strong> ({weeks} tuần)</div><div>Cường độ: <strong>{level}</strong> · {f.distance}</div>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm"><thead className="bg-gray-50 text-left text-xs text-gray-500"><tr><th className="px-3 py-2">Thứ</th><th className="px-3 py-2">Giờ</th><th className="px-3 py-2">Nội dung</th><th className="px-3 py-2">Cự ly</th></tr></thead>
              <tbody>{DAY_ORDER.filter(d => weekdays.includes(d)).map(d => { const c = contentFor(sug, d); return <tr key={d} className="border-t border-gray-100"><td className="px-3 py-2 font-medium">{WEEKDAYS[d]}</td><td className="px-3 py-2">{time}</td><td className="px-3 py-2">{c.type}</td><td className="px-3 py-2">{c.distance}</td></tr>; })}</tbody></table>
          </div>
          <div className="text-sm text-gray-600">Dự kiến <strong>{total}</strong> buổi tập{en ? ` · gói còn ${remain} buổi` : ''}.</div>
          {en && total > remain && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Số buổi dự kiến vượt số buổi còn lại của gói — lúc sinh buổi tập bạn cần xóa bớt.</div>}
        </Card>
      )}

      {step === 5 && horse && (
        <Card className="space-y-4 p-6">
          <h3 className="font-serif text-lg font-bold">Xác nhận tạo lộ trình</h3>
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 text-sm">
            {([['Ngựa', horse.name], ['Giai đoạn', phase], ['Mục tiêu', f.goal.trim()], ['Thời gian', `${startD} – ${endD}`], ['Lịch tập', `${DAY_ORDER.filter(d => weekdays.includes(d)).map(d => WEEKDAYS[d]).join(', ')} lúc ${time}`], ['Cường độ', `${level} (${WORKLOAD_LABEL[WORKLOAD_OF[level]]})`]] as [string, string][]).map(([k, v]) => <div key={k} className="flex justify-between gap-4 px-4 py-2.5"><span className="text-gray-500">{k}</span><span className="text-right font-medium">{v}</span></div>)}
          </div>
          <div className="rounded-lg bg-sky-50 p-3 text-sm text-sky-800">Lộ trình mới sẽ thay thế lộ trình đang hoạt động của ngựa (nếu có). Sau khi tạo, bạn sẽ chuyển sang bước sinh buổi tập.</div>
          {submitErr && <ErrorBox text={submitErr} />}
        </Card>
      )}

      {submitErr && step !== 5 && <ErrorBox text={submitErr} />}{errs.horse && <ErrorBox text={errs.horse} />}

      <div className="flex justify-between">
        <Btn variant="secondary" disabled={step === 0} onClick={() => { setErrs({}); setSubmitErr(''); setStep(s => s - 1); }}>← Quay lại</Btn>
        {step < 5 ? <Btn variant="gold" onClick={next}>Tiếp tục →</Btn> : <Btn variant="gold" disabled={busy} onClick={submit}>Tạo lộ trình</Btn>}
      </div>
    </div>
  );
}
