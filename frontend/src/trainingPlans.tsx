import { useTrainingNow } from './useTrainingNow';
import { futureSchedule, scheduleWarning, trainingStart } from './trainingSchedule';
import { PackageRoadmapPreview, RoadmapTable, StagesEditor, SavedRoadmapPreview } from './roadmapView';
import { validateRoadmap } from './packageRoadmap';
import { selectedStages, scheduleRows, normalizeStages, clock, seconds, validateSessionWindow, isoDay, type RoadmapStage } from './trainingSchedule';
import { trainingTimestamp } from './trainingTimestamp';
import { RecoveryReview } from './RecoveryReview';
import { packageRoadmapFor, recommendationView } from './recommendations';
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
  type TrainingSlice, type PlanDraft, type SessionDraft, type SessionWriteOptions,
} from './trainingLogic';

interface HubState extends TrainingSlice { healthRecords: HealthRecord[] }
type ResultT = NonNullable<TrainingSession['result']>;

interface HubProps {
  state: HubState;
  navigate: (p: string) => void;
  onCreatePlan: (d: PlanDraft) => Promise<Res<TrainingPlan>>;
  onGenerate: (horseId: string, planId: string, drafts: SessionDraft[], options?: SessionWriteOptions) => Promise<Res<TrainingSession[]>>;
  onCheckIn: (id: string, present: boolean, note: string) => Promise<Res<null>>;
  onRespond: (enrId: string, accept: boolean, reason: string) => Promise<Res<null>>;
  onStopSession: (id: string) => Promise<Res<null>>;
  onStartSession: (id: string) => string | null | Promise<string | null>;
  onCompleteSession: (id: string, r: ResultT) => string | null | Promise<string | null>;
  onConfirmSchedule: (horseId: string, note: string, restoreIds: string[]) => string | null | Promise<string | null>;
}

// ── Small helpers ────────────────────────────────────────────────────────────

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_FULL: Record<number, string> = { 0: 'Sun', 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday" };
const DISTANCES = ['800m', '1000m', '1200m', '1400m', '1600m', '2000m'];
const WL_PILL: Record<string, string> = { Low: 'bg-teal-100 text-teal-800', Medium: 'bg-blue-100 text-blue-800', High: 'bg-orange-100 text-orange-800' };

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
      <div className="mb-2 flex justify-between text-xs text-gray-500"><span>Step {step + 1}/{labels.length}: <strong className="text-[#0f1729]">{labels[step]}</strong></span><span>{Math.round((step + 1) / labels.length * 100)}%</span></div>
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
      <label className="mb-1 block text-sm font-medium text-gray-700">Training days<span className="ml-0.5 text-red-500">*</span></label>
      <div className="flex flex-wrap gap-2">
        {DAY_ORDER.map(d => {
          const on = value.includes(d);
          return <button key={d} type="button" disabled={!on && value.length >= max} onClick={() => onChange(on ? value.filter(x => x !== d) : [...value, d])} aria-pressed={on} className={`h-10 w-12 rounded-lg border text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${on ? 'border-[#1a2844] bg-[#1a2844] text-white' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}>{WEEKDAYS[d]}</button>;
        })}
      </div>
      {error ? <p className="mt-0.5 text-xs text-red-600">{error}</p> : <p className="mt-0.5 text-xs text-gray-400">You may select up to {max} distinct training days per week.</p>}
    </div>
  );
}

/** Nội dung buổi tập theo thứ trong tuần dựa trên đề xuất. */
function contentFor(sug: TrainingSuggestion | null, dow: number): { type: string; distance: string; target: string } {
  const e = sug?.weeklySchedule.find(w => w.day === DAY_FULL[dow]);
  if (!e || /rest|nghỉ/i.test(e.intensity) || e.distance === '—') return { type: "Recovery jog", distance: '1500m', target: '—' };
  return { type: /rest|walk|nghỉ|đi bộ/i.test(e.type) && e.intensity === "Rest" ? "Recovery jog" : e.type, distance: e.distance, target: "According to the training plan" };
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
  const [editingStages,setEditingStages]=useState<TrainingPlan|null>(null);
  const [adjusting, setAdjusting] = useState<TrainingSession | null>(null);
  const [actionError, setActionError] = useState('');
  const [confirmNote, setConfirmNote] = useState<Record<string, string>>({});
  const [skipRestore, setSkipRestore] = useState<Set<string>>(new Set());
  const [decline, setDecline] = useState<Enrollment | null>(null);
  const [accepting, setAccepting] = useState<Enrollment | null>(null);
  const [absentFor, setAbsentFor] = useState<TrainingSession | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [weekAnchor, setWeekAnchor] = useState(TODAY);

  const horseIds = new Set(mine.map(h => h.id));
  const myEnr = state.enrollments.filter(e => horseIds.has(e.horseId));
  const pendingMine = isTrainer ? state.enrollments.filter(e => e.trainerId === me.id && e.trainerStatus === 'pending' && e.status !== 'completed') : [];
  const mySessions = state.trainingSessions.filter(s => horseIds.has(s.horseId)).sort((a, b) => sortDiff(b.date, a.date) || b.time.localeCompare(a.time));
  const myPlans = state.trainingPlans.filter(p => horseIds.has(p.horseId));
  const hn = (id: string) => state.horses.find(h => h.id === id)?.name || "Horses";

  const done = mySessions.filter(s => s.result);
  const avgScore = done.length ? Math.round(done.reduce((a, s) => a + s.result!.performanceScore, 0) / done.length) : 0;
  const speeds = done.map(s => parseFloat(s.result!.speed)).filter(n => !isNaN(n));
  const avgSpeed = speeds.length ? (speeds.reduce((a, n) => a + n, 0) / speeds.length).toFixed(1) : '—';

  if (view === 'wizard' && isTrainer) {
    return <TrainingPlanWizard state={state} onCancel={() => setView('hub')} onCreatePlan={props.onCreatePlan}
      onDone={(plan, init) => { setView('hub'); setTab('sessions'); setGen({ horseId: plan.horseId, planId: plan.id, init }); }} />;
  }

  const monday = (() => { const t = parseD(weekAnchor); t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return t; })();
  const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); const key = fmtD(d); return { key, label: `${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]} ${d.getDate()}`, isToday: key === TODAY }; });
  const weekEnd = fmtD(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6));
  const weekSessionCount = mySessions.filter(s => weekDays.some(d => d.key === s.date) && s.status !== 'Cancelled').length;

  const listed = mySessions.filter(s => statusFilter === 'all' || s.status === statusFilter);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="font-serif text-xl font-bold">Training &amp; plans</h2><p className="text-sm text-gray-500">{isTrainer ? "Trainer" : 'Xem'} · {mine.length}  assigned horses</p></div>
        <div className="flex gap-2">
          {isTrainer && tab === 'plans' && <Btn variant="gold" onClick={() => setView('wizard')}>+ Create plan</Btn>}
          {isTrainer && tab === 'sessions' && <>
            <Btn variant="secondary" onClick={() => setSingle(true)}>+ Add session</Btn>
            <Btn variant="gold" onClick={() => { const p = myPlans.find(x => x.status === 'Active'); if (!p) { setActionError("No active roadmap — create a roadmap before generating sessions."); return; } setGen({ horseId: p.horseId, planId: p.id }); }}>Generate sessions</Btn>
          </>}
        </div>
      </div>

      {pendingMine.length > 0 && (
        <div className="space-y-3">
          {pendingMine.map(e => (
            <Card key={e.id} className="border-l-4 border-sky-400 bg-sky-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-sky-900">The manager assigned you to train "{hn(e.horseId)}"</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-sky-800">Package {e.packageName}  · Horse Owner {e.ownerName} · {e.sessionsTotal} created sessions · expires {e.expiresAt} <IdChip kind="ENR" id={e.id} /></div>
                </div>
                <div className="flex gap-2"><Btn variant="gold" onClick={() => setAccepting(e)}>Confirm</Btn><Btn variant="danger" onClick={() => setDecline(e)}>Reject</Btn></div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ErrorBox text={actionError} onClose={() => setActionError('')} />

      <div className="flex gap-0 border-b border-gray-200">
        {([['plans', "📋 Plans"], ['sessions', "🏇 Training sessions"], ['schedule', "📅 Weekly schedule"], ['results', "📊 Results"]] as const).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} className={`-mb-px border-b-2 px-5 py-2.5 text-sm font-medium transition-all ${tab === t ? 'border-[#c9973b] text-[#c9973b]' : 'border-transparent text-gray-500 hover:text-[#0f1729]'}`}>{l}</button>
        ))}
      </div>

      {tab === 'plans' && (
        <div className="space-y-4">
          {myEnr.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-[#0f1729]">Assigned training packages</h3>
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
                        <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{h.name}</span><IdChip kind="ENR" id={e.id} /><span className="text-xs text-gray-500">Package {e.packageName}</span><Badge status={e.status === 'paused' ? 'Paused' : 'Active'} /><TrainerStatusPill status={e.trainerStatus} /></div>
                        <div className="mt-1 text-xs text-gray-500">Validity {t.text} · {t.expired ? "expired" : `remaining ${t.left} days`}{e.trainerName && e.trainerId !== me.id && isTrainer ? ` · HLV: ${e.trainerName}` : ''}</div>
                        <div className="mt-2"><div className="mb-1 flex justify-between text-xs text-gray-500"><span>Created {e.sessionsTotal} sessions / Completed {e.sessionsDone}</span><span>{e.sessionsTotal ? Math.round(e.sessionsDone / e.sessionsTotal * 100) : 0}% completed</span></div><div className="h-2 w-full rounded-full bg-gray-200"><div className="h-2 rounded-full bg-[#c9973b]" style={{ width: `${Math.round(e.sessionsDone / Math.max(1, e.sessionsTotal) * 100)}%` }} /></div></div>
                        <PackageRoadmapPreview packageId={e.packageId} />
                        {e.status === 'paused' && <div className="mt-2 text-xs text-red-600">⏸ Paused since {e.pausedAt}: {e.pauseReason}. Progress is retained while awaiting veterinary clearance.</div>}

                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
          {!isTrainer && <Card className="p-4 text-sm text-gray-600">Package curriculum templates are available below each registration. Detailed horse roadmaps can currently be viewed by the assigned trainer; saved sessions appear in the schedule tabs.</Card>}
          {isTrainer && myPlans.length === 0 && <Card className="p-8 text-center"><div className="mb-2 text-4xl">📋</div><div className="font-semibold text-gray-600">No roadmaps yet</div>{isTrainer && <div className="mt-3"><Btn variant="gold" onClick={() => setView('wizard')}>+ Create your first roadmap</Btn></div>}</Card>}
          {myPlans.map(p => {
            const n = state.trainingSessions.filter(s => s.planId === p.id).length;
            return (
              <Card key={p.id} className="p-5">
                <div className="flex gap-2"><IdChip kind="PLN" id={p.id} /><Badge status={p.phase} /><Badge status={p.status} /></div>
                <div className="mt-2 font-semibold">{p.phase} — {hn(p.horseId)}</div>
                {isTrainer && <SavedRoadmapPreview planId={p.id} title={p.phase} goal={p.goals} />}
                <div className="text-sm text-gray-500">{p.startDate} → {p.endDate} · {p.distance}  · Intensity {WORKLOAD_LABEL[p.workload] || p.workload} · {n}  sessions</div>
                <div className="text-sm text-gray-600">Goal: {p.goals}</div>
                {p.algorithmRationale && <div className="mt-1 text-xs text-[#c9973b]">🤖 {p.algorithmRationale}</div>}
                {p.weeklyKm && <div className="mt-1 text-xs text-gray-400">{p.weeklyKm}  km/week · {p.sessionsPerWeek}  sessions · {p.restDaysPerWeek}  rest days · Score {p.intensityScore}</div>}
                <div className="mt-2"><div className="mb-1 flex justify-between text-xs text-gray-500"><span>Progress</span><span>{p.progress}%</span></div><div className="h-2 w-full rounded-full bg-gray-200"><div className="h-2 rounded-full bg-[#c9973b]" style={{ width: `${p.progress}%` }} /></div></div>
                {isTrainer && p.status === 'Active' && <div className="mt-3 flex gap-2">{n===0&&!p.locked&&!state.horses.find(h=>h.id===p.horseId)?.lock&&isoDay(p.endDate)>=isoDay(trainingTimestamp().slice(0,10))&&<Btn size="sm" variant="secondary" onClick={()=>setEditingStages(p)}>Edit stages</Btn>}<Btn size="sm" variant="secondary" onClick={() => { setTab('sessions'); if(!state.trainingSessions.some(s=>s.planId===p.id))setGen({ horseId: p.horseId, planId: p.id }); }}>{n>0?'View sessions':'Generate sessions'}</Btn></div>}
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm"><span className="text-gray-500">Filter:</span>
            {[['all', "All"], ['Scheduled', "Scheduled"], ['In Progress', "In progress"], ['Completed', "Completed"], ['Not Performed', "Not performed"]].map(([k, l]) => <button key={k} onClick={() => setStatusFilter(k)} className={`rounded-full border px-3 py-1 text-xs font-medium ${statusFilter === k ? 'border-[#1a2844] bg-[#1a2844] text-white' : 'border-gray-300 bg-white text-gray-600'}`}>{l}</button>)}
          </div>
          {listed.length === 0 && <Card className="p-8 text-center text-sm text-gray-500">No sessions yet{statusFilter !== 'all' ? " matching this filter" : ''}.</Card>}
          {listed.map(s => {
            const canCheckIn = isTrainer && s.status === 'Scheduled' && !s.attendance && s.date === TODAY && s.trainerId === me.id;
            return (
              <Card key={s.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2"><IdChip kind="SES" id={s.id} /><Badge status={s.status} />{isHeavySession(s.type) && <span className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">Strenuous session</span>}
                      {s.attendance && <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${s.attendance.status === 'present' ? 'border-emerald-200 bg-emerald-100 text-emerald-800' : 'border-red-200 bg-red-100 text-red-700'}`}>{s.attendance.status === 'present' ? "Present" : "Absent"}</span>}</div>
                    <div className="font-semibold">{s.type} — {hn(s.horseId)} · {s.distance}</div>
                    <div className="text-sm text-gray-500">{dateLabel(s.date)} · {s.time}  · Target: {s.targetTime}</div>
                    {s.notes && <div className="text-sm text-gray-600">{s.notes}</div>}
                    <div className="mt-1 text-xs text-gray-400">Groom: {s.assignedStaffNames.join(', ') || '—'}</div>
                    {s.attendance?.note && <div className="mt-1 text-xs text-red-600">Absence reason: {s.attendance.note}</div>}
                    {s.status === 'Not Performed' && s.voidedByLock && <div className="mt-1 text-xs text-red-600">⛔ Not performed — training is locked. Confirm the schedule again after veterinary clearance.</div>}
                    {s.status === 'Scheduled' && isTrainer && s.date === TODAY && s.attendance?.status === 'present' && <div className="mt-1 text-xs text-emerald-700">Attendance recorded — the session can start.</div>}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    {canCheckIn && <><Btn size="sm" variant="primary" onClick={async () => { const r = await props.onCheckIn(s.id, true, ''); setActionError(r.ok ? '' : r.message); }}>Start session</Btn><Btn size="sm" variant="secondary" onClick={() => setAbsentFor(s)}>Absent</Btn></>}
                    {isTrainer && s.status === 'Scheduled' && new Date(dToIso(s.date)+'T'+s.time)>new Date() && <Btn size="sm" variant="secondary" onClick={()=>setAdjusting(s)}>Adjust time</Btn>}
                    {isTrainer && s.status === 'Scheduled' && s.canStart && <Btn size="sm" variant="gold" onClick={async () => setActionError(await props.onStartSession(s.id) || '')}>▶ Start</Btn>}
                    {isTrainer && s.status === 'Scheduled' && !s.attendance && s.date !== TODAY && <span className="text-[11px] text-gray-400">Record attendance on the session date</span>}
                    {isTrainer && (s.canStop || s.canComplete) && completing !== s.id && <Btn size="sm" variant="primary" onClick={async () => { setActionError(''); if (s.canStop) { const stopped = await props.onStopSession(s.id); if (!stopped.ok) { setActionError(stopped.message); return; } } setCompleting(s.id); }}>{s.canStop ? 'Stop exercise & record recovery' : 'Record recovery results'}</Btn>}
                  </div>
                </div>
                {completing === s.id && <ResultForm onCancel={() => setCompleting(null)} onSubmit={async r => { const err = await props.onCompleteSession(s.id, r); setActionError(err || ''); if (!err) { setCompleting(null); setReviewing(s.id); } return err; }} />}
                {isTrainer && s.status === 'Completed' && reviewing !== s.id && <Btn size="sm" variant="secondary" onClick={() => setReviewing(s.id)}>View recovery review</Btn>}
                {isTrainer && reviewing === s.id && <RecoveryReview sessionId={s.id} onReview={() => { setTab('sessions'); setStatusFilter('Scheduled'); setReviewing(null); }} />}
                {s.result && <div className="mt-3 grid grid-cols-4 gap-3 border-t border-gray-100 pt-3">{[["Time (seconds)", s.result.time], ["Speed", `${s.result.speed} km/h`], ["Heart rate", `${s.result.heartRate} bpm`], ["Two-minute recovery heart rate", `${s.result.performanceScore} bpm`]].map(([k, v]) => <div key={k} className="rounded-lg bg-gray-50 p-2 text-center"><div className="text-xs text-gray-500">{k}</div><div className="font-mono text-sm font-bold">{v}</div></div>)}</div>}
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'schedule' && (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4">
            <div><div className="font-semibold text-[#0f1729]">Week {fmtD(monday)} – {weekEnd}</div><div className="text-xs text-gray-500">{weekSessionCount}  sessions</div></div>
            <div className="flex flex-wrap items-center gap-2">
              <Btn size="sm" variant="secondary" onClick={() => setWeekAnchor(fmtD(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7)))}>‹</Btn>
              <Btn size="sm" variant="secondary" onClick={() => setWeekAnchor(TODAY)}>Today</Btn>
              <input type="date" aria-label="Select a date to jump to its week" value={dToIso(weekAnchor)} onChange={e => setWeekAnchor(isoToD(e.target.value))} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs" />
              <Btn size="sm" variant="secondary" onClick={() => setWeekAnchor(fmtD(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7)))}>›</Btn>
            </div>
          </div>
          {weekSessionCount === 0 && <div className="border-b border-gray-100 px-4 py-8 text-center text-sm text-gray-500">No sessions this week</div>}
          <div className="grid grid-cols-7 border-b border-gray-200">{weekDays.map(d => <div key={d.key} className={`px-2 py-3 text-center text-xs font-semibold ${d.isToday ? 'bg-[#c9973b]/10 text-[#c9973b]' : 'text-gray-500'}`}>{d.label}</div>)}</div>
          <div className="grid min-h-40 grid-cols-7 divide-x divide-gray-100">
            {weekDays.map(d => {
              const ev = mySessions.filter(s => s.date === d.key && s.status !== 'Cancelled').sort((a, b) => a.time.localeCompare(b.time));
              const color = (st: string) => st === 'Completed' ? 'bg-emerald-700' : st === 'In Progress' ? 'bg-[#c9973b]' : st === 'Not Performed' ? 'bg-red-500' : 'bg-[#1a2844]';
              return <div key={d.key} className={`space-y-1.5 p-2 ${d.isToday ? 'bg-[#c9973b]/5' : ''}`}>{ev.map(e => <div key={e.id} className={`rounded-lg p-2 text-xs text-white ${color(e.status)}`}><div className="font-semibold">{hn(e.horseId)}</div><div className="text-[10px] opacity-75">{e.time} · {e.type} {e.distance}</div>{e.status === 'Completed' && <div className="mt-1 text-[10px] font-medium">Completed</div>}{e.status === 'Not Performed' && <div className="mt-1 text-[10px] font-medium">{e.attendance?.status === 'absent' ? "Absent" : "Not performed"}</div>}</div>)}{ev.length === 0 && <div className="py-5 text-center text-xs text-gray-200">—</div>}</div>;
            })}
          </div>
        </Card>
      )}

      {tab === 'results' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4"><Stat label="Completed sessions" value={mySessions.filter(s => s.status === 'Completed').length} /><Stat label="Average speed" value={avgSpeed === '—' ? '—' : `${avgSpeed} km/h`} tone="gold" /><Stat label="Average recovery heart rate" value={done.length ? `${avgScore} bpm` : '—'} tone="green" /></div>
          {done.length === 0 && <Card className="p-8 text-center text-sm text-gray-500">No results yet. Record attendance, start a session and enter measurements in the Sessions tab.</Card>}
          {done.map(s => (
            <Card key={s.id} className="p-5">
              <div className="mb-1 flex items-center gap-2"><IdChip kind="SES" id={s.id} /><span className="font-semibold">{s.type} · {s.distance} · {s.date} — {hn(s.horseId)}</span></div>
              <div className="mt-3 grid grid-cols-4 gap-3">{[["Time (seconds)", s.result!.time], ["Speed", `${s.result!.speed} km/h`], ["Heart rate", `${s.result!.heartRate} bpm`], ["Two-minute recovery heart rate", `${s.result!.performanceScore} bpm`]].map(([k, v]) => <div key={k} className="rounded-lg bg-gray-50 p-3 text-center"><div className="text-xs text-gray-500">{k}</div><div className="mt-0.5 font-mono text-sm font-bold">{v}</div></div>)}</div>
              {s.result!.notes && <p className="mt-3 text-sm italic text-gray-600">"{s.result!.notes}"</p>}
            </Card>
          ))}
        </div>
      )}

      {accepting && (
        <Modal title="Accept this training assignment?" onClose={() => setAccepting(null)}>
          <p className="text-sm text-gray-600">You will be responsible for training <strong>{hn(accepting.horseId)}</strong>  under package {accepting.packageName}  to {accepting.expiresAt}.</p>
          <div className="mt-5 flex justify-end gap-2"><Btn variant="secondary" onClick={() => setAccepting(null)}>Cancel</Btn><Btn variant="gold" onClick={async () => { const r = await props.onRespond(accepting.id, true, ''); setActionError(r.ok ? '' : r.message); setAccepting(null); }}>Confirm</Btn></div>
        </Modal>
      )}
      {decline && <ReasonDialog title="Decline assignment" description={<>Decline training <strong>{hn(decline.horseId)}</strong>? The manager will be notified to assign a replacement.</>} confirmLabel="Decline assignment" danger onClose={() => setDecline(null)} onConfirm={async reason => { const r = await props.onRespond(decline.id, false, reason); setActionError(r.ok ? '' : r.message); setDecline(null); }} />}
      {absentFor && <ReasonDialog title="Record absence" description={<>Session <strong>{absentFor.type}</strong>  for {hn(absentFor.horseId)}  will be marked "Not Performed".</>} confirmLabel="Record absence" danger onClose={() => setAbsentFor(null)} onConfirm={async reason => { const r = await props.onCheckIn(absentFor.id, false, reason); setActionError(r.ok ? '' : r.message); setAbsentFor(null); }} />}
      {gen && <SessionGenerator state={state} horseId={gen.horseId} planId={gen.planId} init={gen.init} onClose={() => setGen(null)} onGenerate={props.onGenerate} onDone={() => { setGen(null); setTab('sessions'); }} />}
      {editingStages && <SavedStageEditor state={state} plan={editingStages} onClose={()=>setEditingStages(null)}/>}
      {adjusting && <SingleSessionForm state={state} session={adjusting} onClose={() => setAdjusting(null)} onGenerate={props.onGenerate} />}
      {single && <SingleSessionForm state={state} onClose={() => setSingle(false)} onGenerate={props.onGenerate} />}
    </div>
  );
}

// ── Result form ──────────────────────────────────────────────────────────────

function ResultForm({ onSubmit, onCancel }: { onSubmit: (r: ResultT) => string | null | Promise<string | null>; onCancel: () => void }) {
  const [f, setF] = useState({ time: '', speed: '', hr: '', score: '', notes: '' });
  const [saving,setSaving]=useState(false);
  const [measuredAt,setMeasuredAt]=useState('');
  const [e, setE] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (v: string) => { setF(p => ({ ...p, [k]: v })); setE(p => ({ ...p, [k]: '' })); };
  const submit = async () => {
    if (saving || !measuredAt) return;
    const x: Record<string, string> = {};
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(f.time.trim())) x.time = "Enter the actual distance in km, with up to 2 decimal places.";
    if (Number(f.time.replace(',', '.')) > 999999.99) x.time = "Actual distance cannot exceed 999999.99 km.";
    const sp = Number(f.speed);
    if (f.speed.trim() === '' || isNaN(sp) || sp < 0 || sp > 100) x.speed = "Speed must be between 0 and 100 km/h.";
    const hr = Number(f.hr);
    if (f.hr.trim() === '' || !Number.isInteger(hr) || hr < 20 || hr > 250) x.hr = "Heart rate must be an integer between 20 and 250 bpm.";
    const sc = Number(f.score);
    if (f.score.trim() === '' || !Number.isInteger(sc) || sc < 20 || sc > 250) x.score = "Recovery heart rate must be between 20 and 250 bpm.";
    if (f.notes.length > 300) x.notes = "Comments cannot exceed 300 characters.";
    setE(x);
    if (Object.keys(x).length) return;
    setErr(''); setSaving(true);try { const r = await onSubmit({ time: f.time.trim(), speed: String(sp), heartRate: hr, notes: f.notes.trim(), performanceScore: sc, recoveryMeasuredAt: measuredAt || undefined }); if (r) setErr(r); } catch (error) { setErr(error instanceof Error ? error.message : 'Unable to complete the session. Please try again.'); } finally { setSaving(false); }
  };
  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <h4 className="mb-3 text-sm font-semibold">Record session measurements</h4>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Actual distance (km)" required value={f.time} onChange={set('time')} placeholder="VD: 1.2" hint="Completed distance, up to 2 decimal places" error={e.time} />
        <Input label="Average speed (km/h)" required type="number" value={f.speed} onChange={set('speed')} placeholder="VD: 58.6" hint="0–100" error={e.speed} />
        <Input label="End-of-exercise heart rate (bpm)" required type="number" value={f.hr} onChange={set('hr')} placeholder="VD: 188" hint="20–250" error={e.hr} />
        <Input label="Heart rate after two-minute recovery (bpm)" required type="number" value={f.score} onChange={value => { set('score')(value); setMeasuredAt(trainingTimestamp()); }} placeholder="VD: 85" hint="Enter the two-minute recovery reading; 20–250 bpm" error={e.score} />
        <div className="col-span-2"><Textarea label="Comments" value={f.notes} onChange={set('notes')} rows={2} placeholder="Condition, technique, progress..." hint={`${f.notes.length}/300`} />{e.notes && <p className="text-xs text-red-600">{e.notes}</p>}</div>
      </div>
      {err && <div className="mt-3"><ErrorBox text={err} /></div>}
      <div className="mt-4 flex gap-2"><Btn variant="gold" disabled={saving || !measuredAt} onClick={submit}>{saving ? "Saving…" : "💾 Save and complete"}</Btn><Btn variant="secondary" onClick={onCancel}>Cancel</Btn></div>
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

function SessionGenerator({ state, horseId, planId, onClose, onDone, onGenerate }: GenProps) {
  const now=useTrainingNow();
  const plan=state.trainingPlans.find(p=>p.id===planId)!;
  const horse=state.horses.find(h=>h.id===horseId)!;
  const [rows,setRows]=useState<SessionDraft[]|null>(null);
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const existing=state.trainingSessions.some(s=>s.planId===planId);
  useEffect(()=>{let active=true;setRows(null);setError('');
    request<any[]>('/training-plans/'+encodeURIComponent(planId)+'/stages').then(stages=>{if(active)setRows(scheduleRows(stages,plan.startDate));}).catch(e=>{if(active)setError(e.message);});
    return ()=>{active=false;};
  },[planId,plan.startDate]);
  const future=rows?futureSchedule(rows,now):[];
  const check=future.map(row=>validateSessionWindow({date:row.date,time:row.time,endTime:row.endTime!,startDate:plan.startDate,endDate:plan.endDate,horseId,trainerId:state.user!.id},state.trainingSessions,now)).find(Boolean);
  const save=async()=>{if(!rows||busy||existing)return;const fresh=new Date();const eligible=futureSchedule(rows,fresh);if(!eligible.length){setError('No future sessions remain. You can adjust the stages before generating sessions.');return;}const invalid=eligible.map(row=>validateSessionWindow({date:row.date,time:row.time,endTime:row.endTime!,startDate:plan.startDate,endDate:plan.endDate,horseId,trainerId:state.user!.id},state.trainingSessions,fresh)).find(Boolean);if(invalid){setError(invalid);return;}setBusy(true);setError('');try{const result=await onGenerate(horseId,planId,eligible);if(result.ok)onDone();else setError('Plan is saved, but sessions were not generated: '+result.message);}catch(e){setError('Plan is saved, but sessions were not generated: '+(e as Error).message);}finally{setBusy(false);}};
  return <Modal title="Generate sessions" onClose={onClose} wide>
    <div className="space-y-5 text-[#1a2844]">
      <div className="flex items-center gap-4 rounded-2xl border border-[#c9973b]/20 bg-[#c9973b]/5 p-4">
        {horse.imageUrl && <img src={horse.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />}
        <div className="min-w-0 flex-1">
          <div className="font-serif text-lg font-bold">{horse.name}</div>
          <div className="mt-0.5 text-sm text-gray-600">{plan.phase}</div>
          <div className="mt-2 inline-flex flex-wrap items-center gap-2 text-xs font-medium text-[#8a6420]"><span>Package period</span><span className="rounded-md border border-[#c9973b]/20 bg-white px-2 py-1">{plan.startDate} - {plan.endDate}</span></div>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-gray-500">Plan saved. Confirm session generation. Times use Asia/Bangkok (UTC+7). Preview is indicative; the server checks eligibility again when generating.</p>{rows&&<p className="text-sm">Total planned: {rows.length} / Past - skipped: {rows.length-future.length} / Future: {future.length}</p>}{rows&&scheduleWarning(rows,now)&&<p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{scheduleWarning(rows,now)}</p>}
      {existing && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800"><span className="font-semibold">Schedule already generated.</span> Use Add session or Adjust time to make changes.</div>}
      {error && <ErrorBox text={error} />}
      {!existing && check && <ErrorBox text={check} />}
      {!rows && !error && <div className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">Loading saved schedule...</div>}
      {rows && <div className="overflow-hidden rounded-xl border border-gray-200">
        <div className="max-h-[min(42vh,24rem)] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-3 font-semibold">Date</th><th className="px-4 py-3 font-semibold">Time</th><th className="px-4 py-3 font-semibold">Activity / stage</th><th className="px-4 py-3 font-semibold">Status</th></tr></thead>
            <tbody className="divide-y divide-gray-100">{rows.map((r,i)=><tr key={i} className="bg-white transition-colors hover:bg-[#c9973b]/5"><td className="whitespace-nowrap px-4 py-3 font-medium">{r.date}</td><td className="whitespace-nowrap px-4 py-3 tabular-nums text-gray-600">{r.time} - {r.endTime}</td><td className="min-w-44 px-4 py-3 leading-relaxed text-gray-600">{r.type}{(r as any).title&&<div className="text-xs text-gray-400">{(r as any).title}</div>}</td><td className="whitespace-nowrap px-4 py-3 text-xs">{trainingStart(r.date,r.time)>now?'Future':'Past - skipped'}</td></tr>)}</tbody>
          </table>
          {rows.length===0 && <p className="p-6 text-center text-sm text-gray-500">No training dates match this plan.</p>}
        </div>
      </div>}
      <div className="flex justify-end gap-3 border-t border-gray-100 pt-4"><Btn variant="secondary" onClick={onClose}>{existing?'Close':'Cancel'}</Btn>{!existing && <Btn variant="gold" disabled={busy||!future.length||!!check} onClick={save}>{busy?'Creating...':'Confirm generation'}</Btn>}</div>
    </div>
  </Modal>;
}

function SavedStageEditor({state,plan,onClose}:{state:HubState;plan:TrainingPlan;onClose:()=>void}){
 const now=useTrainingNow();const [stages,setStages]=useState<RoadmapStage[]|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [saved,setSaved]=useState(false);const [attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;setStages(null);setError('');Promise.all([request<any[]>('/training-plans/'+encodeURIComponent(plan.id)+'/stages'),request<any[]>('/training-sessions/horse/'+encodeURIComponent(plan.horseId))]).then(([rows,sessions])=>{if(!active)return;if(sessions.some(s=>s.planId===plan.id))throw Error('This plan already has sessions. Adjust individual sessions instead.');setStages(normalizeStages(rows));}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[plan.id,attempt]);
 const enrollment=state.enrollments.find(e=>e.id===plan.horsePackageId);
 const end=enrollment&&isoDay(enrollment.expiresAt)<isoDay(plan.endDate)?enrollment.expiresAt:plan.endDate;
 const duration=diffDays(plan.startDate,end)+1;
 const validation=stages?validateRoadmap({title:plan.phase,goal:plan.goals||'Review saved stages',stages},duration,dToIso(plan.startDate)):'';
 let rows:ReturnType<typeof scheduleRows>=[];try{if(stages&&!validation)rows=scheduleRows(stages,plan.startDate);}catch{}
 const save=async()=>{if(!stages||busy||validation)return;setBusy(true);setError('');try{await request('/training-plans/'+encodeURIComponent(plan.id)+'/stages','PUT',{stages});setSaved(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 return <Modal title="Edit saved stages" onClose={onClose} wide><div className="space-y-4"><p>{plan.phase}: {plan.startDate} - {end}. Original stage anchor is unchanged. Times use UTC+7.</p>{saved?<p role="status" className="rounded-lg bg-green-50 p-3 text-green-800">Stages saved. Review the updated schedule before generating sessions.</p>:stages?<fieldset disabled={busy}><StagesEditor stages={stages} duration={duration} onChange={setStages}/>{validation&&<ErrorBox text={validation}/>} {scheduleWarning(rows,now)&&<p role="status" className="rounded-lg bg-amber-50 p-3 text-amber-800">{scheduleWarning(rows,now)}</p>}</fieldset>:!error&&<p>Loading saved stages...</p>}{error&&<ErrorBox text={error}/>}<div className="flex justify-end gap-2">{!stages&&error&&<Btn variant="secondary" onClick={()=>setAttempt(x=>x+1)}>Retry</Btn>}<Btn variant="secondary" onClick={onClose}>{saved?'Close':'Cancel'}</Btn>{!saved&&<Btn variant="gold" disabled={busy||!stages||!!validation} onClick={save}>{busy?'Saving...':'Save stages'}</Btn>}</div></div></Modal>;
}

function SingleSessionForm({state,onClose,onGenerate,session}:{state:HubState;onClose:()=>void;onGenerate:HubProps['onGenerate'];session?:TrainingSession}) {
 const now=useTrainingNow();
 const user=state.user!;
 const plans=state.trainingPlans.filter(p=>p.status==='Active'&&state.enrollments.some(e=>e.id===p.horsePackageId&&e.trainerId===user.id&&e.trainerStatus==='confirmed'&&e.status==='active')&&!state.horses.find(h=>h.id===p.horseId)?.lock);
 const [planId,setPlanId]=useState(session?.planId||plans[0]?.id||'');
 const plan=plans.find(p=>p.id===planId);
 const term=state.enrollments.find(e=>e.id===plan?.horsePackageId);
 const windowStart=plan&&term&&isoDay(term.startedAt)>isoDay(plan.startDate)?term.startedAt:plan?.startDate||'';
 const windowEnd=plan&&term&&isoDay(term.expiresAt)<isoDay(plan.endDate)?term.expiresAt:plan?.endDate||'';
 const today=trainingTimestamp(now).slice(0,10);
 const [date,setDate]=useState(session?dToIso(session.date):'');
 const [time,setTime]=useState(session?.time||'07:00');const [endTime,setEndTime]=useState(session?.endTime||'');
 const [intensity,setIntensity]=useState(session?.intensity||'LOW');const [reason,setReason]=useState('');
 const [stages,setStages]=useState<RoadmapStage[]>([]);const [loading,setLoading]=useState(false);const [loadError,setLoadError]=useState('');
 const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;setStages([]);setLoadError('');if(!planId)return;setLoading(true);
 request<any[]>('/training-plans/'+encodeURIComponent(planId)+'/stages').then(rows=>{if(active)setStages(normalizeStages(rows));}).catch(e=>{if(active)setLoadError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[planId]);
 const day=plan&&date?diffDays(plan.startDate,isoToD(date))+1:0;
 const matching=stages.filter(s=>day>=s.startDay&&day<=s.endDay);const stage=matching.length===1?matching[0]:undefined;
 const setStart=(value:string)=>{setTime(value);setError('');if(stage)try{setEndTime(clock(seconds(value)+seconds(stage.sessionEndTime)-seconds(stage.sessionTime)).slice(0,5));}catch(e){setEndTime('');setError((e as Error).message);}};
 useEffect(()=>{if(!stage)return;if(!session)setIntensity(stage.intensity);if(!session||!session.endTime)try{setEndTime(clock(seconds(time)+seconds(stage.sessionEndTime)-seconds(stage.sessionTime)).slice(0,5));}catch(e){setError((e as Error).message);}},[stage]);
 const validation=plan&&date&&endTime?validateSessionWindow({date:isoToD(date),time,endTime,startDate:windowStart,endDate:windowEnd,horseId:plan.horseId,trainerId:user.id,excludeId:session?.id},state.trainingSessions,now):'';
 const save=async()=>{
  if(busy)return;
  if(!plan||!date||!time||!endTime||!stage){setError('Choose a plan, a date within a saved stage, and start/end times.');return;}
  const freshError=validateSessionWindow({date:isoToD(date),time,endTime,startDate:plan.startDate,endDate:plan.endDate,horseId:plan.horseId,trainerId:user.id,excludeId:session?.id},state.trainingSessions,new Date());if(freshError){setError(freshError);return;}
  if(session&&(!reason.trim()||reason.trim().length>600)){setError('Enter an adjustment reason of 1-600 characters.');return;}
  setBusy(true);setError('');try{const result=await onGenerate(plan.horseId,plan.id,[{date:isoToD(date),time,endTime,type:stage.activityName,distance:'',targetTime:'',notes:''}],{mode:session?'adjust':'single',sessionId:session?.id,intensity,reason:reason.trim()});if(result.ok)onClose();else setError(result.message);}finally{setBusy(false);}
 };
 return <Modal title={session?'Adjust session':'Add session'} onClose={onClose} wide><div className="space-y-4">
 {session?<p>{state.horses.find(h=>h.id===session.horseId)?.name} - {plan?.phase}</p>:<Select label="Training plan / horse" value={planId} onChange={value=>{setPlanId(value);setDate('');setEndTime('');setError('');}} options={plans.map(p=>({value:p.id,label:(state.horses.find(h=>h.id===p.horseId)?.name||p.horseId)+' - '+p.phase+' - '+p.id}))}/>}
 {plan&&<p>Package period: {plan.startDate} - {plan.endDate} - {diffDays(plan.startDate,plan.endDate)+1} days</p>}
 <div className="grid grid-cols-3 gap-3"><Input label="Date" required type="date" value={date} min={windowStart&&isoDay(windowStart)>today?isoDay(windowStart):today} max={windowEnd?isoDay(windowEnd):undefined} onChange={value=>{setDate(value);setError('');}}/><Input label="Start time (UTC+7)" required type="time" value={time} onChange={setStart} error={date&&time&&trainingStart(date,time)<=now?'Start time must be in the future.':undefined}/><Input label="End time" required type="time" value={endTime} onChange={value=>{setEndTime(value);setError('');}}/></div>
 {stage&&<p className="text-sm">{stage.title} - {stage.activityName} - {stage.intensity}</p>}
 {date&&!loading&&!stage&&<ErrorBox text="Choose a date belonging to one saved roadmap stage."/>}
 {session&&<><Select label="Intensity" value={intensity} onChange={setIntensity} options={['LOW','MODERATE','HIGH'].map(v=>({value:v,label:v}))}/><Textarea label="Reason for adjustment" required value={reason} onChange={setReason} rows={2}/></>}
 <p className="text-xs text-gray-500">Multiple sessions per day are allowed without overlapping times. At most six distinct training days per week. Checks use the schedules currently loaded; the server validates the request.</p>
 {loading&&<p>Loading stages...</p>}{loadError&&<ErrorBox text={loadError}/>} {(error||validation)&&<ErrorBox text={error||validation}/>}
 <div className="flex justify-end gap-2"><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn variant="gold" disabled={busy||loading||!!loadError||!plan||!stage||!date||!endTime||!!validation} onClick={save}>{busy?'Saving...':'Save session'}</Btn></div>
 </div></Modal>;
}

// ── Training plan wizard ─────────────────────────────────────────────────────

const WIZ_STEPS = ["Choose horse", "Condition", "Goals", "Training schedule", "Preview", "Confirm"];

interface WizProps {
  state: HubState; onCancel: () => void;
  onCreatePlan: HubProps['onCreatePlan'];
  onDone: (plan: TrainingPlan, init: { weekdays: number[]; time: string; weeks: number }) => void;
}

export function TrainingPlanWizard({ state, onCancel, onCreatePlan, onDone }: WizProps) {
  const now=useTrainingNow();
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
  const [templateLoading,setTemplateLoading] = useState(false);
  const [templateVersion,setTemplateVersion] = useState(0);
  const en = horse ? currentEnrollment(state.enrollments, horse.id) : undefined;
  useEffect(() => {
    let active = true; setSug(null); setSubmitErr(''); setTemplateLoading(false);
    if (!en?.assignmentId || en.trainerStatus !== 'confirmed') return;
    setTemplateLoading(true);
    void packageRoadmapFor(en.id).then(value => {
      if (!active) return;
      setSug(recommendationView(value));
      setF(p => ({ ...p, phase: '', goal: value.goal || '', level: '', start: dToIso(en.startedAt), weeks: String(Math.ceil(diffDays(en.startedAt, en.expiresAt)/7)) }));
      setWeekdays([...new Set<number>((value.stages || []).flatMap((s: any) => s.daysOfWeek.map((day: string) => ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'].indexOf(day))))]);
      setTime(value.stages?.[0]?.sessionTime?.slice(0,5) || '07:30');
    }).catch(e => { if (active) setSubmitErr((e as Error).message); }).finally(()=>{if(active)setTemplateLoading(false);});
    return () => { active = false; };
  }, [en?.id, en?.assignmentId, en?.trainerStatus, templateVersion]);
  const decision = rec ? (rec.decision === 'not-eligible' || rec.trainingEligibility === 'not-eligible' ? 'not-eligible' : rec.trainingEligibility === 'conditional' ? 'conditional' : 'eligible') : null;
  const sugLevel = sug ? suggestedLevel(sug) : 0;
  const level = f.level || INTENSITY_LEVELS[sugLevel];
  const phase = f.phase || sug?.phase || PHASES[0];
  const weeks = Number(f.weeks);
  const startD = en?.startedAt || isoToD(f.start);
  const endD = en?.expiresAt || (validDate(startD) && Number.isInteger(weeks) ? addDays(startD, weeks * 7 - 1) : '');
  let previewRows: ReturnType<typeof scheduleRows> = [];
  let scheduleError = '';
  try { if (sug?.stages?.length && en) previewRows = scheduleRows(selectedStages(sug.stages), en.startedAt); } catch(e) { scheduleError=(e as Error).message; }

  const set = (k: keyof typeof f) => (v: string) => { setF(p => ({ ...p, [k]: v })); setErrs(p => ({ ...p, [k]: '' })); };

  const validate = (): boolean => {
    const x: Record<string, string> = {};
    if (step === 0) {
      if (!sug && horse) x.horse = "The package roadmap template could not be loaded.";
      if (!horse) x.horse = "Select a horse.";
      else { const b = trainerPlanBlockReason(horse, state.enrollments, me.id); if (b) x.horse = `Cannot select "${horse.name}": ${b}.`; }
    }
    if (step === 1) {
      if (!sug) x.health = "The package roadmap template could not be loaded.";
      if (!rec) x.health = "This horse has no examination record — a veterinarian must examine it before a roadmap can be created.";
      else if (decision === 'not-eligible') x.health = "Latest examination conclusion: NOT FIT for training. A roadmap cannot be created.";
    }
    if (step === 2) {
      const g = f.goal.trim();
      if (g.length < 10 || g.length > 300) x.goal = "Goal must contain 10–300 characters.";
    }
    if (step === 3 && sug && en) {
      const message = validateRoadmap({title: phase, goal: f.goal, stages: sug.stages || []}, diffDays(en.startedAt,en.expiresAt)+1, dToIso(en.startedAt));
      if (message) x.time = message;
      if (!previewRows.length && !message) x.time = 'The chosen stage dates and weekdays do not produce any training sessions.';
    }
    setErrs(x);
    return Object.keys(x).length === 0;
  };
  const next = () => { if (validate()) setStep(s => s + 1); };

  const submit = async () => {
    if (!horse || !sug || !en || busy) return;
    const message = validateRoadmap({title: phase, goal: f.goal, stages: sug.stages || []}, diffDays(startD,endD)+1, dToIso(startD));
    if (message) { setSubmitErr(message); return; }
    setBusy(true);
    const r = await onCreatePlan({ horseId: horse.id, phase, startDate: startD, endDate: endD, distance: f.distance, workload: '', surface: "Grass", goals: f.goal.trim(), suggestion: sug });
    setBusy(false);
    if (!r.ok) { setSubmitErr(r.message); return; }
    onDone(r.data, { weekdays, time, weeks });
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-start justify-between"><div><h2 className="font-serif text-xl font-bold text-[#0f1729]">Create training roadmap</h2><p className="text-sm text-gray-500">Create a roadmap based on the horse's latest health status</p></div><Btn variant="ghost" onClick={onCancel}>Cancel</Btn></div>
      <Card className="p-5"><Progress step={step} labels={WIZ_STEPS} /></Card>

      {templateLoading && <p role="status" className="text-sm text-gray-500">Loading package roadmap...</p>}
      {!templateLoading && !sug && submitErr && <Btn size="sm" variant="secondary" onClick={()=>setTemplateVersion(n=>n+1)}>Retry package roadmap</Btn>}
      {step === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Choose horse <span className="text-red-500">*</span>  · Only horses with an accepted assignment to you and no training lock</p>
          {mine.length === 0 && <Card className="p-8 text-center text-sm text-gray-500">No horses have been assigned to you.</Card>}
          {mine.map(h => {
            const b = trainerPlanBlockReason(h, state.enrollments, me.id);
            return (
              <button key={h.id} disabled={!!b} onClick={() => { setHorseId(h.id); setErrs({}); }} className={`flex w-full items-center gap-4 rounded-xl border-2 bg-white p-4 text-left ${b ? 'cursor-not-allowed border-gray-200 opacity-50' : horseId === h.id ? 'border-[#c9973b] shadow-md' : 'border-gray-200 hover:border-[#c9973b]/60'}`}>
                {h.imageUrl ? <img src={h.imageUrl || undefined} alt="" className="h-12 w-12 rounded-lg bg-gray-200 object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">🐎</div>}
                <div className="flex-1"><div className="font-semibold">{h.name}</div><div className="text-xs text-gray-500">{h.breed} · {h.age}  years old</div></div>
                {b ? <span className="rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs text-gray-600">{b}</span> : <span className={`h-5 w-5 rounded-full border-2 ${horseId === h.id ? 'border-[#c9973b] bg-[#c9973b]' : 'border-gray-300'}`} />}
              </button>
            );
          })}
        </div>
      )}

      {step === 1 && horse && sug && (
        <Card className="space-y-4 p-6">
          <h3 className="font-serif text-lg font-bold">Condition for {horse.name}</h3>
          {rec ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-4 text-sm">
                <div className="mb-1 text-xs font-semibold uppercase text-gray-400">Latest examination records · {rec.date}</div>
                <div className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${decision === 'not-eligible' ? 'bg-red-100 text-red-700' : decision === 'conditional' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{decision === 'not-eligible' ? "Not eligible" : decision === 'conditional' ? "Fit with monitoring" : "Eligible for training"}</div>
                <p className="text-gray-700">{rec.conclusion || rec.result || rec.notes || "No conclusion"}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4 text-sm">
                <div className="mb-1 text-xs font-semibold uppercase text-gray-400">Latest vital signs</div>
                {rec.vitals ? <ul className="space-y-0.5 text-gray-700"><li>Heart rate: <strong>{rec.vitals.heartRate} bpm</strong></li><li>Temperature: <strong>{rec.vitals.temperature}°C</strong></li><li>Weight: <strong>{rec.vitals.weight} kg</strong></li><li>Respiratory rate: <strong>{rec.vitals.respRate}</strong></li></ul> : <p className="text-gray-400">No vital signs recorded</p>}
              </div>
            </div>
          ) : <ErrorBox text="This horse has no examination record." />}
          <div className="rounded-xl border border-[#c9973b]/30 bg-[#c9973b]/5 p-4 text-sm">
            <div className="font-semibold text-[#8a6420]">{en?.packageName || sug.phase} - Package curriculum</div>
            {(sug.stages || []).map((stage, index) => (
              <div key={index} className="mt-1 text-gray-600">
                {stage.title}: {stage.objective}
              </div>
            ))}
            {!sug.stages?.length && <div className="mt-1 text-gray-600">Set the activity and duration in the schedule step.</div>}
            <div className="mt-1 text-xs text-gray-500">The package activities, duration, schedule and intensity are prefilled. Review each stage before confirming.</div>
          </div>
          {errs.health && <ErrorBox text={errs.health} />}
        </Card>
      )}

      {step === 2 && horse && sug && (
        <Card className="space-y-4 p-6">
          <h3 className="font-serif text-lg font-bold">Set goals</h3>
          {en && <p className="rounded-lg bg-sky-50 p-3 text-sm">Package period: <strong>{en.startedAt} - {en.expiresAt}</strong> - {diffDays(en.startedAt,en.expiresAt)+1} days. The roadmap uses this full period.</p>}
          <div className="grid gap-4 md:grid-cols-2">
            <Select label="Phase" required value={phase} onChange={set('phase')} options={[...new Set([sug.phase, phase, ...PHASES])].map(v => ({ value: v, label: v }))} hint={`Package curriculum: ${sug.phase}`} />
            <Select label="Main distance" required value={f.distance} onChange={set('distance')} options={DISTANCES.map(v => ({ value: v, label: v }))} />
            <p className="text-sm text-gray-500">Intensity is configured separately for each stage in the next step.</p>
          </div>
          <div>
            <Textarea label="Goals" required value={f.goal} onChange={set('goal')} rows={3} placeholder="e.g. Improve sprint speed for a 1200 m race" hint={`10–300 characters · ${f.goal.length}/300`} />
            {errs.goal && <p className="text-xs text-red-600">{errs.goal}</p>}
          </div>
        </Card>
      )}

      {step === 3 && sug && (
        <Card className="space-y-4 p-6">
          <h3 className="font-serif text-lg font-bold">Training schedule</h3>
          <p className="text-sm text-gray-500">Review the package template and adjust each stage for this horse.</p>
          <StagesEditor stages={sug.stages || []} duration={diffDays(startD,endD)+1} onChange={stages=>{setSug({...sug,stages});setErrs({});}}/>
          {previewRows.length>0&&scheduleWarning(previewRows,now)&&<p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{scheduleWarning(previewRows,now)} Times use Asia/Bangkok (UTC+7). The plan can still be saved.</p>}
          {errs.time && <ErrorBox text={errs.time}/>}
          {scheduleError && <ErrorBox text={scheduleError}/>}

        </Card>
      )}

      {step === 4 && horse && sug && (
        <Card className="space-y-4 p-6">
          <h3 className="font-serif text-lg font-bold">Plan preview</h3>
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <div>Horse: <strong>{horse.name}</strong></div><div>Phase: <strong>{phase}</strong></div>
            <div>Package period: <strong>{startD} - {endD}</strong> / {diffDays(startD,endD)+1} days</div><div>Intensity: <strong>Configured per stage</strong></div>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm"><thead className="bg-gray-50 text-left"><tr><th>Date / stage</th><th>Time</th><th>Activity</th><th>Intensity</th></tr></thead><tbody>{previewRows.map((r,i)=><tr key={i} className="border-t"><td className="p-2">{r.date} - {r.title}</td><td>{r.time} - {r.endTime}</td><td>{r.type}</td><td>{r.intensity}</td></tr>)}</tbody></table>
          </div>
        </Card>
      )}

      {step === 5 && horse && (
        <Card className="space-y-4 p-6">
          <h3 className="font-serif text-lg font-bold">Confirm roadmap creation</h3>
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 text-sm">
            {([["Horses", horse.name], ["Phase", phase], ["Goals", f.goal.trim()], ["Time", `${startD} – ${endD}`], ["Training schedule", "Configured per stage"], ["Intensity", "Configured per stage"]] as [string, string][]).map(([k, v]) => <div key={k} className="flex justify-between gap-4 px-4 py-2.5"><span className="text-gray-500">{k}</span><span className="text-right font-medium">{v}</span></div>)}
          </div>
          {sug && <RoadmapTable roadmap={{title:phase,goal:f.goal,stages:sug.stages || []}}/>}
          <div className="rounded-lg bg-sky-50 p-3 text-sm text-sky-800">Saving the plan does not generate sessions. Confirm generation separately; only future sessions will be created.</div>
          {submitErr && <ErrorBox text={submitErr} />}
        </Card>
      )}

      {submitErr && step !== 5 && <ErrorBox text={submitErr} />}{errs.horse && <ErrorBox text={errs.horse} />}

      <div className="flex justify-between">
        <Btn variant="secondary" disabled={step === 0} onClick={() => { setErrs({}); setSubmitErr(''); setStep(s => s - 1); }}>← Back</Btn>
        {step < 5 ? <Btn variant="gold" onClick={next}>Continue →</Btn> : <Btn variant="gold" disabled={busy} onClick={submit}>Create plan</Btn>}
      </div>
    </div>
  );
}
