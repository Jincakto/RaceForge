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
      {error ? <p className="mt-0.5 text-xs text-red-600">{error}</p> : <p className="mt-0.5 text-xs text-gray-400">You may select up to {max} training sessions per week.</p>}
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
            <Btn variant="secondary" onClick={() => setSingle(true)}>+ Single session</Btn>
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
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-sky-800">Package {e.packageName}  · Horse Owner {e.ownerName} · {e.sessionsTotal}  sessions · expires {e.expiresAt} <IdChip kind="ENR" id={e.id} /></div>
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
                        <div className="mt-2"><div className="mb-1 flex justify-between text-xs text-gray-500"><span>Completed {e.sessionsDone}/{e.sessionsTotal}  sessions</span><span>Remaining {e.sessionsTotal - e.sessionsDone}  sessions</span></div><div className="h-2 w-full rounded-full bg-gray-200"><div className="h-2 rounded-full bg-[#c9973b]" style={{ width: `${Math.round(e.sessionsDone / Math.max(1, e.sessionsTotal) * 100)}%` }} /></div></div>
                        {e.status === 'paused' && <div className="mt-2 text-xs text-red-600">⏸ Paused since {e.pausedAt}: {e.pauseReason}. Progress is retained while awaiting veterinary clearance.</div>}
                        {needsConfirm && (
                          <div className="mt-3 space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                            <div className="text-sm font-medium text-amber-800">The veterinarian released the lock. The previous schedule has not resumed — adjust and confirm the schedule.</div>
                            {voided.length > 0 && <div className="space-y-1">{voided.map(v => <label key={v.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!skipRestore.has(v.id)} onChange={() => setSkipRestore(p => { const n = new Set(p); if (n.has(v.id)) n.delete(v.id); else n.add(v.id); return n; })} />Resume: {v.type} · {v.distance} · {v.date}</label>)}</div>}
                            {isTrainer && <><Textarea label="Adjust roadmap (intensity, distance, notes)" value={confirmNote[e.horseId] || ''} onChange={v => setConfirmNote(p => ({ ...p, [e.horseId]: v }))} rows={2} placeholder="e.g. Reduce intensity by 20% in week one, then increase gradually based on heart rate" />
                              <Btn variant="gold" onClick={async () => setActionError(await props.onConfirmSchedule(e.horseId, confirmNote[e.horseId] || '', voided.filter(v => !skipRestore.has(v.id)).map(v => v.id)) || '')}>✓ Confirm schedule</Btn></>}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
          {myPlans.length === 0 && <Card className="p-8 text-center"><div className="mb-2 text-4xl">📋</div><div className="font-semibold text-gray-600">No roadmaps yet</div>{isTrainer && <div className="mt-3"><Btn variant="gold" onClick={() => setView('wizard')}>+ Create your first roadmap</Btn></div>}</Card>}
          {myPlans.map(p => {
            const n = state.trainingSessions.filter(s => s.planId === p.id).length;
            return (
              <Card key={p.id} className="p-5">
                <div className="flex gap-2"><IdChip kind="PLN" id={p.id} /><Badge status={p.phase} /><Badge status={p.status} /></div>
                <div className="mt-2 font-semibold">{p.phase} — {hn(p.horseId)}</div>
                <div className="text-sm text-gray-500">{p.startDate} → {p.endDate} · {p.distance}  · Intensity {WORKLOAD_LABEL[p.workload] || p.workload} · {n}  sessions</div>
                <div className="text-sm text-gray-600">Goal: {p.goals}</div>
                {p.algorithmRationale && <div className="mt-1 text-xs text-[#c9973b]">🤖 {p.algorithmRationale}</div>}
                {p.weeklyKm && <div className="mt-1 text-xs text-gray-400">{p.weeklyKm}  km/week · {p.sessionsPerWeek}  sessions · {p.restDaysPerWeek}  rest days · Score {p.intensityScore}</div>}
                <div className="mt-2"><div className="mb-1 flex justify-between text-xs text-gray-500"><span>Progress</span><span>{p.progress}%</span></div><div className="h-2 w-full rounded-full bg-gray-200"><div className="h-2 rounded-full bg-[#c9973b]" style={{ width: `${p.progress}%` }} /></div></div>
                {isTrainer && p.status === 'Active' && <div className="mt-3"><Btn size="sm" variant="secondary" onClick={() => { setTab('sessions'); setGen({ horseId: p.horseId, planId: p.id }); }}>Generate sessions</Btn></div>}
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
                    {isTrainer && s.status === 'Scheduled' && s.canStart && <Btn size="sm" variant="gold" onClick={async () => setActionError(await props.onStartSession(s.id) || '')}>▶ Start</Btn>}
                    {isTrainer && s.status === 'Scheduled' && !s.attendance && s.date !== TODAY && <span className="text-[11px] text-gray-400">Record attendance on the session date</span>}
                    {isTrainer && (s.canStop || s.canComplete) && completing !== s.id && <Btn size="sm" variant="primary" onClick={async () => { setActionError(''); if (s.canStop) { const stopped = await props.onStopSession(s.id); if (!stopped.ok) { setActionError(stopped.message); return; } } setCompleting(s.id); }}>{s.canStop ? 'Stop exercise & record recovery' : 'Record recovery results'}</Btn>}
                  </div>
                </div>
                {completing === s.id && <ResultForm onCancel={() => setCompleting(null)} onSubmit={async r => { const err = await props.onCompleteSession(s.id, r); setActionError(err || ''); if (!err) setCompleting(null); return err; }} />}
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
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(f.time.trim())) x.time = "Enter the actual distance in km, with up to 2 decimal places.";
    const sp = Number(f.speed);
    if (f.speed.trim() === '' || isNaN(sp) || sp < 0 || sp > 100) x.speed = "Speed must be between 0 and 100 km/h.";
    const hr = Number(f.hr);
    if (f.hr.trim() === '' || !Number.isInteger(hr) || hr < 20 || hr > 250) x.hr = "Heart rate must be an integer between 20 and 250 bpm.";
    const sc = Number(f.score);
    if (f.score.trim() === '' || !Number.isInteger(sc) || sc < 20 || sc > 250) x.score = "Recovery heart rate must be between 20 and 250 bpm.";
    if (f.notes.length > 300) x.notes = "Comments cannot exceed 300 characters.";
    setE(x);
    if (Object.keys(x).length) return;
    const r = await onSubmit({ time: f.time.trim(), speed: String(sp), heartRate: hr, notes: f.notes.trim(), performanceScore: sc });
    if (r) setErr(r);
  };
  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <h4 className="mb-3 text-sm font-semibold">Record session measurements</h4>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Actual distance (km)" required value={f.time} onChange={set('time')} placeholder="VD: 1.2" hint="Completed distance, up to 2 decimal places" error={e.time} />
        <Input label="Average speed (km/h)" required type="number" value={f.speed} onChange={set('speed')} placeholder="VD: 58.6" hint="0–100" error={e.speed} />
        <Input label="End-of-exercise heart rate (bpm)" required type="number" value={f.hr} onChange={set('hr')} placeholder="VD: 188" hint="20–250" error={e.hr} />
        <Input label="Heart rate after two-minute recovery (bpm)" required type="number" value={f.score} onChange={set('score')} placeholder="VD: 85" hint="Measure at least 2 minutes after exercise stops; 20–250 bpm" error={e.score} />
        <div className="col-span-2"><Textarea label="Comments" value={f.notes} onChange={set('notes')} rows={2} placeholder="Condition, technique, progress..." hint={`${f.notes.length}/300`} />{e.notes && <p className="text-xs text-red-600">{e.notes}</p>}</div>
      </div>
      {err && <div className="mt-3"><ErrorBox text={err} /></div>}
      <div className="mt-4 flex gap-2"><Btn variant="gold" onClick={submit}>💾 Save and complete</Btn><Btn variant="secondary" onClick={onCancel}>Cancel</Btn></div>
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
          if (days.includes(dayKeys[parseD(date).getDay()])) output.push({ date, time: String(stage.session_time || stage.sessionTime).slice(0,5), type: stage.activity_name || stage.activityName, distance: "As prescribed in the protocol", targetTime: '', notes: stage.objective || '' });
        }
      }
      setRows(output);
    } catch (e) { setServerErr((e as Error).message); }
  };

  const chk = rows ? checkSessionDrafts({ sessions: state.trainingSessions, enrollments: state.enrollments, horseId, trainerId: me.id }, rows) : null;
  const rowErr = rows?.map((r, i) => chk!.rows[i] || (validDate(r.date) && (diffDays(plan.startDate, r.date) < 0 || diffDays(r.date, plan.endDate) < 0) ? `Outside the roadmap period (${plan.startDate} – ${plan.endDate})` : '')) || [];
  const hasErr = !!rows && (rowErr.some(Boolean) || !!chk?.global || rows.length === 0);
  const upd = (i: number, p: Partial<SessionDraft>) => setRows(rs => rs!.map((r, j) => j === i ? { ...r, ...p } : r));

  return (
    <Modal title="Generate sessions" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm"><strong>{horse.name}</strong><IdChip kind="PLN" id={plan.id} /><span className="text-gray-500">{plan.phase} · {plan.startDate} – {plan.endDate}</span>{en && <span className="text-gray-500">· remaining {en.sessionsTotal - en.sessionsDone}  sessions in package</span>}</div>
        <WeekdayPicker value={weekdays} max={plan.sessionsPerWeek || 6} onChange={v => { setWeekdays(v); setFormErr(p => ({ ...p, weekdays: '' })); }} error={formErr.weekdays} />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Training time" required type="time" value={time} onChange={setTime} error={formErr.time} />
          <Input label="Number of weeks" required type="number" value={weeks} onChange={setWeeks} hint="1–12 weeks" error={formErr.weeks} />
          <Input label="From date" required type="date" value={start} min={dToIso(TODAY)} onChange={setStart} error={formErr.start} />
        </div>
        <Btn variant="secondary" onClick={build}>{rows ? "Regenerate preview" : "Generate preview"}</Btn>

        {rows && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm"><strong>Preview: {rows.length}  sessions</strong><span className="text-xs text-gray-400">Each row can be edited or removed</span></div>
            <Btn size="sm" variant="secondary" onClick={() => setRows(rs => {
              const base = rs?.[rs.length - 1];
              const date = base && validDate(base.date) ? addDays(base.date, 1) : TODAY;
              const c = contentFor(sug, parseD(date).getDay());
              return [...(rs || []), { date, time, type: c.type, distance: c.distance, targetTime: c.target, notes: `Replacement session for ${plan.phase}` }];
            })}>+ Add replacement date</Btn>
            {rows.length === 0 && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">No sessions — select weekdays or add more weeks.</div>}
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
                    <input value={r.distance} onChange={e => upd(i, { distance: e.target.value })} className="w-20 rounded border border-gray-300 px-2 py-1 text-xs" aria-label="Distance" />
                    <button onClick={() => setRows(rs => rs!.filter((_, j) => j !== i))} aria-label="Remove row" className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">Delete</button>
                  </div>
                  {rowErr[i] && <div className="mt-1 text-xs text-red-600">{rowErr[i]}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
        {serverErr && <ErrorBox text={serverErr} />}
        <div className="flex justify-end gap-2"><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn variant="gold" disabled={!rows || hasErr} onClick={() => setConfirm(true)}>Create {rows?.length || 0}  sessions</Btn></div>
      </div>
      {confirm && rows && (
        <Modal title="Confirm session generation?" onClose={() => setConfirm(false)}>
          <p className="text-sm text-gray-600">Create <strong>{rows.length}</strong>  sessions for <strong>{horse.name}</strong>  from {rows[0].date}  to {rows[rows.length - 1].date}.</p>
          <div className="mt-5 flex justify-end gap-2"><Btn variant="secondary" onClick={() => setConfirm(false)}>Back</Btn><Btn variant="gold" onClick={async () => { const r = await onGenerate(horseId, planId, rows); setConfirm(false); if (!r.ok) setServerErr(r.message); else onDone(); }}>Confirm creation</Btn></div>
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
    if (!f.horseId) x.horseId = "No eligible horses for session scheduling.";
    const d = isoToD(f.date);
    if (!validDate(d)) x.date = "A session date is required."; else if (diffDays(TODAY, d) < 0) x.date = "Session date cannot be in the past.";
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(f.time)) x.time = "Invalid time.";
    if (!f.distance.trim()) x.distance = "Enter a distance.";
    if (f.notes.length > 300) x.notes = "Notes cannot exceed 300 characters.";
    if (!plan && f.horseId) x.horseId = "This horse has no active roadmap.";
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
    <Modal title="Schedule a single session" onClose={onClose} wide>
      <div className="space-y-4">
        {eligible.length === 0 && <ErrorBox text="No horses are eligible for scheduling (an accepted assignment and no training lock are required)." />}
        {blocked.length > 0 && <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">Cannot select: {blocked.map(h => `${h.name} (${trainerPlanBlockReason(h, state.enrollments, me.id)})`).join('; ')}</div>}
        <Select label="Horses" required value={f.horseId} onChange={set('horseId')} options={eligible.map(h => ({ value: h.id, label: h.name }))} error={e.horseId} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date" required type="date" value={f.date} min={dToIso(TODAY)} onChange={set('date')} hint="Select today or a future date" error={e.date} />
          <Input label="Time" required type="time" value={f.time} onChange={set('time')} error={e.time} />
          <Select label="Session type" value={f.type} onChange={set('type')} options={SESSION_TYPES.map(v => ({ value: v, label: v }))} />
          <Select label="Distance" value={f.distance} onChange={set('distance')} options={['200m', '400m', '800m', '1000m', '1200m', '1600m', '2000m', '2400m', '3000m'].map(v => ({ value: v, label: v }))} error={e.distance} />
          <Input label="Target time" value={f.targetTime} onChange={set('targetTime')} placeholder="VD: 74s" />
        </div>
        <Textarea label="Notes" value={f.notes} onChange={set('notes')} rows={2} hint={`${f.notes.length}/300`} />
        {e.notes && <p className="text-xs text-red-600">{e.notes}</p>}
        {err && <ErrorBox text={err} />}
        <div className="flex justify-end gap-2"><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn variant="gold" disabled={eligible.length === 0} onClick={submit}>Save session</Btn></div>
      </div>
    </Modal>
  );
}

// ── Training plan wizard ─────────────────────────────────────────────────────

const WIZ_STEPS = ["Choose horse", "Condition", "Goals", "Choose schedule", "Preview", "Confirm"];

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
      if (!sug && horse) x.horse = "No valid protocol is available from the server. Check the error message below.";
      if (!horse) x.horse = "Select a horse.";
      else { const b = trainerPlanBlockReason(horse, state.enrollments, me.id); if (b) x.horse = `Cannot select "${horse.name}": ${b}.`; }
    }
    if (step === 1) {
      if (!sug) x.health = "Cannot load the recommendation. Check that a suitable veterinarian-approved protocol exists.";
      if (!rec) x.health = "This horse has no examination record — a veterinarian must examine it before a roadmap can be created.";
      else if (decision === 'not-eligible') x.health = "Latest examination conclusion: NOT FIT for training. A roadmap cannot be created.";
    }
    if (step === 2) {
      const g = f.goal.trim();
      if (g.length < 10 || g.length > 300) x.goal = "Goal must contain 10–300 characters.";
      if (!Number.isInteger(weeks) || weeks < 1 || weeks > 12) x.weeks = "Number of weeks must be between 1 and 12.";
      if (!validDate(startD)) x.start = "Select a start date."; else if (diffDays(TODAY, startD) < 0) x.start = "Start date cannot be in the past.";
      if (INTENSITY_LEVELS.indexOf(level as typeof INTENSITY_LEVELS[number]) > sugLevel) x.level = `Intensity exceeds the recommended limit (maximum "${INTENSITY_LEVELS[sugLevel]} ") for the horse's current condition.`;
      if (en && validDate(startD) && diffDays(startD, en.expiresAt) < 0) x.start = `Start date is after the package expiry date (${en.expiresAt}).`;
    }
    if (step === 3) {
      if (weekdays.length < 1 || weekdays.length > 6) x.weekdays = "Select 1–6 weekdays.";
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) x.time = "Invalid time.";
    }
    setErrs(x);
    return Object.keys(x).length === 0;
  };
  const next = () => { if (validate()) setStep(s => s + 1); };

  const submit = async () => {
    if (!horse || !sug || busy) return;
    setBusy(true);
    const r = await onCreatePlan({ horseId: horse.id, phase, startDate: startD, endDate: endD, distance: f.distance, workload: WORKLOAD_OF[level], surface: "Grass", goals: f.goal.trim(), suggestion: sug, weekdays, time });
    setBusy(false);
    if (!r.ok) { setSubmitErr(r.message); return; }
    onDone(r.data, { weekdays, time, weeks });
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-start justify-between"><div><h2 className="font-serif text-xl font-bold text-[#0f1729]">Create training roadmap</h2><p className="text-sm text-gray-500">Create a roadmap based on the horse's latest health status</p></div><Btn variant="ghost" onClick={onCancel}>Cancel</Btn></div>
      <Card className="p-5"><Progress step={step} labels={WIZ_STEPS} /></Card>

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
            <div className="font-semibold text-[#8a6420]">Recommended intensity: {INTENSITY_LEVELS[sugLevel]}  · phase {sug.phase}  · protocol selected by the server</div>
            <div className="mt-1 text-gray-600">{sug.sessionsPerWeek}  sessions/week · {sug.restDaysPerWeek}  rest days</div>
            {sug.warnings.map(w => <div key={w} className="mt-1 text-xs text-amber-700">⚠ {w}</div>)}
          </div>
          {errs.health && <ErrorBox text={errs.health} />}
        </Card>
      )}

      {step === 2 && horse && sug && (
        <Card className="space-y-4 p-6">
          <h3 className="font-serif text-lg font-bold">Set goals</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Select label="Phase" required value={phase} onChange={set('phase')} options={[...new Set([phase, ...PHASES])].map(v => ({ value: v, label: v }))} hint={`Recommendation: ${sug.phase}`} />
            <Select label="Main distance" required value={f.distance} onChange={set('distance')} options={DISTANCES.map(v => ({ value: v, label: v }))} />
            <Input label="Number of weeks" required type="number" value={f.weeks} onChange={set('weeks')} hint="1–12 weeks" error={errs.weeks} />
            <Input label="Start date" required type="date" value={f.start} min={dToIso(TODAY)} onChange={set('start')} hint="Today or later" error={errs.start} />
            <Select label="Intensity" required value={level} onChange={set('level')} options={INTENSITY_LEVELS.map(v => ({ value: v, label: v }))} hint={`Recommended maximum: ${INTENSITY_LEVELS[sugLevel]}`} error={errs.level} />
          </div>
          <div>
            <Textarea label="Goals" required value={f.goal} onChange={set('goal')} rows={3} placeholder="e.g. Improve sprint speed for a 1200 m race" hint={`10–300 characters · ${f.goal.length}/300`} />
            {errs.goal && <p className="text-xs text-red-600">{errs.goal}</p>}
          </div>
        </Card>
      )}

      {step === 3 && sug && (
        <Card className="space-y-4 p-6">
          <h3 className="font-serif text-lg font-bold">Choose schedule</h3>
          <WeekdayPicker value={weekdays} max={6} onChange={v => { setWeekdays(v); setErrs(p => ({ ...p, weekdays: '' })); }} error={errs.weekdays} />
          <div className="max-w-xs"><Input label="Training time" required type="time" value={time} onChange={v => { setTime(v); setErrs(p => ({ ...p, time: '' })); }} error={errs.time} /></div>
          {weekdays.length > sug.sessionsPerWeek && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">You selected {weekdays.length}  sessions/week, above the recommended {sug.sessionsPerWeek}  sessions/week for the current condition.</div>}
        </Card>
      )}

      {step === 4 && horse && sug && (
        <Card className="space-y-4 p-6">
          <h3 className="font-serif text-lg font-bold">Plan preview</h3>
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <div>Horse: <strong>{horse.name}</strong></div><div>Phase: <strong>{phase}</strong></div>
            <div>Time: <strong>{startD} – {endD}</strong> ({weeks}  weeks)</div><div>Intensity: <strong>{level}</strong> · {f.distance}</div>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm"><thead className="bg-gray-50 text-left text-xs text-gray-500"><tr><th className="px-3 py-2">Day</th><th className="px-3 py-2">Time</th><th className="px-3 py-2">Activity</th><th className="px-3 py-2">Distance</th></tr></thead>
              <tbody>{DAY_ORDER.filter(d => weekdays.includes(d)).map(d => { const c = contentFor(sug, d); return <tr key={d} className="border-t border-gray-100"><td className="px-3 py-2 font-medium">{WEEKDAYS[d]}</td><td className="px-3 py-2">{time}</td><td className="px-3 py-2">{c.type}</td><td className="px-3 py-2">{c.distance}</td></tr>; })}</tbody></table>
          </div>
          <div className="text-sm text-gray-600">Estimated <strong>{total}</strong>  sessions{en ? ` · remaining in package ${remain} sessions` : ''}.</div>
          {en && total > remain && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Estimated sessions exceed the package balance — remove excess sessions during generation.</div>}
        </Card>
      )}

      {step === 5 && horse && (
        <Card className="space-y-4 p-6">
          <h3 className="font-serif text-lg font-bold">Confirm roadmap creation</h3>
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 text-sm">
            {([["Horses", horse.name], ["Phase", phase], ["Goals", f.goal.trim()], ["Time", `${startD} – ${endD}`], ["Training schedule", `${DAY_ORDER.filter(d => weekdays.includes(d)).map(d => WEEKDAYS[d]).join(', ')} at ${time}`], ["Intensity", `${level} (${WORKLOAD_LABEL[WORKLOAD_OF[level]]})`]] as [string, string][]).map(([k, v]) => <div key={k} className="flex justify-between gap-4 px-4 py-2.5"><span className="text-gray-500">{k}</span><span className="text-right font-medium">{v}</span></div>)}
          </div>
          <div className="rounded-lg bg-sky-50 p-3 text-sm text-sky-800">The new roadmap will replace the horse's active roadmap, if any. After creation, continue to session generation.</div>
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
