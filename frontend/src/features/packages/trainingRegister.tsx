import { PackageLifecycleButton } from '../training/PackageLifecycleButton';
import { canCancelRegistration, unfinishedPackageSession, registrationStatus, type PackageLifecycleResult } from '../training/packageLifecycle';
import type { TrainingSession } from '../../shared/data/data';
import { usePackageSuggestions, sortSuggestions, suggestionReason } from '../training/trainingSuggestions';
import { PackageRoadmapPreview } from '../training/roadmapView';
import { useEffect, useRef, useState } from 'react';
import type { AppUser, Horse, Enrollment, TrainingPackage, Res, HealthRecord } from '../../shared/data/data';
import { Badge, Btn, Card } from '../../shared/ui/ui';
import { IdChip, Modal } from '../admin/admin';
import { TrainerStatusPill } from './packages';
import { money, enrollmentTerm, isCurrent, EXPIRY_WARN_DAYS, TODAY } from '../training/trainingLogic';

interface Props {
  state: { user: AppUser | null; horses: Horse[]; enrollments: Enrollment[]; packages: TrainingPackage[]; healthRecords: HealthRecord[]; trainingSessions?: TrainingSession[] };
  navigate: (p: string) => void;
  onStartPayment: (horseId: string, packageId: string) => Promise<Res<{ enrollmentId: string; url: string; orderCode: number }>>;
  onCancelRegistration?: (id: string) => Promise<PackageLifecycleResult>;
  onSyncPayment: (horseId: string, enrollmentId: string) => Promise<Res<Enrollment>>;
}

const STEPS = ["Choose horse", "Suggestions", "Review", "Payment", "Receipt"];

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center" role="list" aria-label="Registration progress">
      {STEPS.map((l, i) => (
        <div key={l} role="listitem" className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i < step ? 'bg-emerald-600 text-white' : i === step ? 'bg-[#c9973b] text-white ring-4 ring-[#c9973b]/20' : 'bg-gray-200 text-gray-500'}`}>{i < step ? '✓' : i + 1}</div>
            <span className={`whitespace-nowrap text-[11px] font-medium ${i === step ? 'text-[#c9973b]' : 'text-gray-500'}`}>{l}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`mx-2 mb-5 h-0.5 flex-1 ${i < step ? 'bg-emerald-500' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  );
}

export function ReceiptView({ e, horseName }: { e: Enrollment; horseName: string }) {
  const rows: [string, React.ReactNode][] = [
    ["Registration ID", <IdChip kind="ENR" id={e.id} />],
    ["Training package", e.packageName],
    ["Horses", horseName],
    ["Horse Owner", e.ownerName],
    ["Validity", `${e.startedAt} – ${e.expiresAt}`],
    ["Amount", <span className="font-serif text-lg font-bold text-[#c9973b]">{money(e.amount)}</span>],
    ["Payment time", e.paidAt],
    ["Method", e.paymentMethod],
  ];
  return (
    <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"><span className="text-gray-500">{k}</span><span className="text-right font-medium text-[#0f1729]">{v}</span></div>
      ))}
    </div>
  );
}

// PayOS rejects iframe/overlay checkout for this merchant/origin ("Thông tin truyền lên không hợp lệ").
// Set to true only after the site domain is allowed in the PayOS dashboard.
const EMBED_PAYOS = false;
const PAYOS_SCRIPT = 'https://cdn.payos.vn/payos-checkout/v1/stable/payos-initialize.js';
let payOsScript: Promise<void> | undefined;
function loadPayOsScript(): Promise<void> {
  if ((window as any).PayOSCheckout) return Promise.resolve();
  payOsScript ??= new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = PAYOS_SCRIPT; el.async = true;
    el.onload = () => resolve();
    el.onerror = () => { payOsScript = undefined; el.remove(); reject(new Error('PayOS script failed to load')); };
    document.head.appendChild(el);
  });
  return payOsScript;
}

export function TrainingRegisterPage({ state, navigate, onStartPayment, onSyncPayment, onCancelRegistration }: Props) {
  const user = state.user!;
  const myHorses = state.horses.filter(h => h.ownerId === user.id);
  const myEnr = state.enrollments.filter(e => myHorses.some(h => h.id === e.horseId)).slice().reverse();
  const horseName = (id: string) => state.horses.find(h => h.id === id)?.name || "Horses";

  const [mode, setMode] = useState<'list' | 'wizard'>('list');
  const [step, setStep] = useState(0);
  const [pkgId, setPkgId] = useState('');
  const [horseId, setHorseId] = useState('');
  const [goal, setGoal] = useState('');
  const [resumeEnr, setResumeEnr] = useState<Enrollment | null>(null);
  const suggestions = usePackageSuggestions(horseId, mode === 'wizard' && !resumeEnr);
  const selectedSuggestion = suggestions.data?.horseId === horseId ? suggestions.data.packages.find(p => p.packageId === pkgId) : undefined;
  const canContinue = !!selectedSuggestion?.canRegister && !suggestions.loading && !suggestions.error;
  useEffect(() => { setPkgId(''); }, [horseId]);
  const [renewOf, setRenewOf] = useState<Enrollment | null>(null);
  const [checkout, setCheckout] = useState<{ enrollmentId: string; url: string; orderCode: number } | null>(null);
  const checking = useRef(false);
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState<{ kind: 'fail' | 'cancel' | 'error'; text: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [receipt, setReceipt] = useState<Enrollment | null>(null);
  const [viewReceipt, setViewReceipt] = useState<Enrollment | null>(null);
  const [fieldError, setFieldError] = useState('');
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const pkg = resumeEnr ? { id: resumeEnr.packageId, name: resumeEnr.packageName, price: resumeEnr.amount, durationDays: 0 } : selectedSuggestion ? { id: selectedSuggestion.packageId, name: selectedSuggestion.packageName, price: selectedSuggestion.price, durationDays: selectedSuggestion.durationDays } : undefined;
  const horse = myHorses.find(h => h.id === horseId);
  const latestExam = horse ? state.healthRecords.filter(r => r.horseId === horse.id).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0] : undefined;
  const followUp = latestExam?.decision === 'conditional' || latestExam?.trainingEligibility === 'conditional' ? latestExam.followUpNote || latestExam.trainingNote || latestExam.conclusion : '';

  const start = (renew?: Enrollment) => {
    setResumeEnr(null); setRenewOf(renew || null);
    setPkgId(''); setGoal('');
    setHorseId(renew ? renew.horseId : '');
    setStep(0); setCheckout(null); setPayMsg(null); setReceipt(null); setFieldError(''); setPaying(false);
    setMode('wizard');
  };
  const resume = (e: Enrollment) => {
    setResumeEnr(e); setRenewOf(null); setGoal('');
    setHorseId(e.horseId); setPkgId(e.packageId);
    setCheckout(null); setPayMsg(null); setReceipt(null); setFieldError(''); setPaying(false);
    setStep(3); setMode('wizard');
  };
  const leave = () => { setMode('list'); setResumeEnr(null); setRenewOf(null); setPayMsg(null); setConfirmOpen(false); };

  const next = () => {
    setFieldError('');
    if (step === 0 && !horse) { setFieldError('Select a horse.'); return; }
    if (step === 1 && (!pkg || !canContinue)) { setFieldError('Select an available package after suggestions have loaded.'); return; }
    setStep(s => s + 1);
  };

  const pay = async () => {
    if (paying) return;
    if (!horse || !pkg || (!resumeEnr && !selectedSuggestion?.canRegister)) { setPayMsg({ kind: 'error', text: 'Select an eligible package.' }); return; }
    setPayMsg(null); setPaying(true);
    const r = await onStartPayment(horseId, resumeEnr ? resumeEnr.packageId : pkgId);
    setPaying(false);
    if (!r.ok) { setPayMsg({ kind: 'error', text: r.message }); return; }
    setCheckout(r.data);
  };

  const check = async (silent = false) => {
    if (!checkout || checking.current) return;
    checking.current = true;
    if (!silent) { setPayMsg(null); setPaying(true); }
    const r = await onSyncPayment(horseId, checkout.enrollmentId);
    checking.current = false;
    if (!silent) setPaying(false);
    if (!r.ok) { if (!silent) setPayMsg({ kind: 'error', text: r.message }); return; }
    if (r.data.paymentStatus === 'PAID') { setReceipt(r.data); setCheckout(null); setStep(4); return; }
    if (!silent) setPayMsg({ kind: 'fail', text: "Payment is not confirmed yet. If you have just paid, wait a few seconds and check again." });
  };

  useEffect(() => {
    if (!checkout || step !== 3) return;
    const id = window.setInterval(() => { void check(true); }, 5000);
    return () => window.clearInterval(id);
  }, [checkout, step]);

  // Show the PayOS checkout (VietQR) as an overlay inside this page. The embedded
  // layout is rejected by PayOS for this merchant, so the standard overlay is used.
  const [embedError, setEmbedError] = useState('');
  const payosApi = useRef<{ open: () => void; exit: () => void } | null>(null);
  useEffect(() => {
    if (!EMBED_PAYOS || !checkout || step !== 3) return;
    setEmbedError('');
    let cancelled = false;
    loadPayOsScript().then(() => {
      if (cancelled) return;
      const api = (window as any).PayOSCheckout?.usePayOS({
        RETURN_URL: window.location.origin + '/',
        ELEMENT_ID: 'payos-embed',
        CHECKOUT_URL: checkout.url,
        embedded: false,
        onSuccess: () => { void check(true); },
        onCancel: () => { setCheckout(null); setPayMsg({ kind: 'cancel', text: "Payment cancelled. You may create a new payment link at any time." }); },
        onExit: () => {},
      });
      if (!api) { setEmbedError("The PayOS checkout could not be started."); return; }
      payosApi.current = api; api.open();
    }).catch(() => { if (!cancelled) setEmbedError("The PayOS checkout could not be loaded. Use “Open payment page” instead."); });
    return () => { cancelled = true; try { payosApi.current?.exit(); } catch { /* ignore */ } payosApi.current = null; };
  }, [checkout?.url, step]);

  // ── Danh sách ──
  if (mode === 'list') {
    return (
      <div className="max-w-5xl space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="font-serif text-xl font-bold text-[#0f1729]">My training packages</h2><p className="text-sm text-gray-500">Choose horse / suggestions / review / pay</p></div>
          <Btn variant="gold" onClick={() => start()}>+ Register a new package</Btn>
        </div>
        {myEnr.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="mb-2 text-4xl">🎯</div>
            <div className="mb-3 font-semibold text-gray-600">{myHorses.length === 0 ? "You have no horses yet" : "You have not registered for any training packages"}</div>
            {myHorses.length === 0 ? <Btn variant="gold" onClick={() => navigate('horse-create')}>+ Register a new horse</Btn> : <Btn variant="gold" onClick={() => start()}>Register for your first package</Btn>}
          </Card>
        ) : myEnr.map(e => {
          const t = enrollmentTerm(e);
          const pct = Math.round(e.sessionsDone / Math.max(1, e.sessionsTotal) * 100);
          const unpaid = e.paymentStatus === 'PENDING';
          const live = !unpaid && isCurrent(e);
          return (
            <Card key={e.id} className={`p-5 ${live && (t.warn || t.expired) ? 'border-l-4 border-amber-400' : ''}`}>
              <div className="flex flex-wrap items-center gap-2">
                <IdChip kind="ENR" id={e.id} />
                <span className="font-semibold text-[#0f1729]">Package {e.packageName}</span>
                <span className="text-sm text-gray-500">· {horseName(e.horseId)}</span>
                {unpaid ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">Awaiting payment</span> : <Badge status={registrationStatus(e)} />}
                {live && <TrainerStatusPill status={e.trainerStatus} />}
              </div>
              <div className="mt-2 grid gap-1 text-sm text-gray-600 sm:grid-cols-2">
                <div>Term: <strong>{unpaid ? 'Starts after payment' : t.text}</strong></div>
                <div>{unpaid ? 'Not paid yet' : live ? (t.expired ? <span className="font-medium text-red-600">Expired</span> : <>Remaining <strong className={t.warn ? 'text-amber-700' : ''}>{t.left}  days</strong></>) : "Ended"}</div>
                <div>Trainer: {e.trainerName ? e.trainerName : <span className="italic text-gray-400">not assigned</span>}</div>
                <div>Amount: {money(e.amount)}</div>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-gray-500"><span>Created {e.sessionsTotal} sessions / Completed {e.sessionsDone}</span><span>{pct}%</span></div>
                <div className="h-2 w-full rounded-full bg-gray-200"><div className="h-2 rounded-full bg-[#c9973b]" style={{ width: `${pct}%` }} /></div>
              </div>
              {live && e.trainerStatus === 'unassigned' && <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Awaiting trainer assignment by the manager. You will be notified once assigned.</div>}
              {live && e.trainerStatus === 'pending' && <div className="mt-3 rounded-lg bg-sky-50 p-3 text-xs text-sky-800">Assigned {e.trainerName}  — awaiting trainer confirmation.</div>}
              {live && (t.warn || t.expired) && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <span className="text-sm text-amber-800">{t.expired ? "Package expired." : `Package expires soon — remaining ${t.left} days (alert when remaining ≤ ${EXPIRY_WARN_DAYS} days).`}  Renew to continue training.</span>
                  <Btn size="sm" variant="gold" onClick={() => start(e)}>Renew</Btn>
                </div>
              )}
              <PackageRoadmapPreview packageId={e.packageId} />
              {onCancelRegistration && canCancelRegistration(e,user,myHorses.find(h=>h.id===e.horseId)?.ownerId) && <PackageLifecycleButton enrollment={e} action="cancel" onAction={onCancelRegistration} blockedReason={unfinishedPackageSession(e,state.trainingSessions || []) ? 'Finish the started session and its results before cancelling this registration.' : null} />}
              {unpaid && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">This registration has not been paid. Continue to get a new PayOS payment link.</div>}
              <div className="mt-3 flex gap-2">{unpaid ? <Btn size="sm" variant="gold" onClick={() => resume(e)}>Continue payment</Btn> : <Btn size="sm" variant="secondary" onClick={() => setViewReceipt(e)}>View receipt</Btn>}</div>
            </Card>
          );
        })}
        {viewReceipt && (
          <Modal title="Payment receipt" onClose={() => setViewReceipt(null)}>
            <ReceiptView e={viewReceipt} horseName={horseName(viewReceipt.horseId)} />
            <div className="mt-4 text-right"><Btn variant="secondary" onClick={() => setViewReceipt(null)}>Close</Btn></div>
          </Modal>
        )}
      </div>
    );
  }

  // ── Wizard ──
  const horsesToShow = renewOf ? myHorses.filter(h => h.id === renewOf.horseId) : myHorses;
  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div><h2 className="font-serif text-xl font-bold text-[#0f1729]">{renewOf ? `Renew package ${renewOf.packageName}` : "Training package registration"}</h2><p className="text-sm text-gray-500">Step {step + 1}/{STEPS.length}: {STEPS[step]}</p></div>
        {step < 4 && !paying && <Btn variant="ghost" onClick={leave}>Cancel</Btn>}
      </div>
      <Card className="px-6 py-5"><StepBar step={step} /></Card>

      {step === 0 && <div className="space-y-3">
        <p className="text-sm text-gray-500">Choose your horse to view eligibility and automatic package suggestions.</p>
        {horsesToShow.length === 0 && <Card className="p-6">You have no horses yet.</Card>}
        {horsesToShow.map(h => <button key={h.id} onClick={() => { setHorseId(h.id); setPkgId(''); setFieldError(''); }} className={`flex w-full items-center gap-4 rounded-xl border-2 bg-white p-4 text-left ${horseId === h.id ? 'border-[#c9973b] shadow-sm' : 'border-gray-200 hover:border-[#c9973b]/60'}`}>
          {h.imageUrl && <img src={h.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />}
          <div><strong>{h.name}</strong><p className="text-sm text-gray-500">{h.breed} | {h.age} years old</p></div>
        </button>)}
      </div>}
      {step === 1 && <div className="space-y-4">
        <Card className="space-y-3 p-5">
          <h3 className="font-serif text-lg font-bold">Automatic suggestions for {horse?.name}</h3>
          <label className="block text-sm">Training goal (optional)
            <select className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2" value={goal} onChange={e => setGoal(e.target.value)}>
              <option value="">All goals</option><option value="FOUNDATION">Foundation</option><option value="IMPROVE_PERFORMANCE">Improve performance</option><option value="PREPARE_FOR_RACING">Prepare for racing</option>
            </select>
          </label>
          {suggestions.data && <p className="text-sm text-gray-600">{suggestions.data.readiness.completedSessions} completed sessions in the last 30 days | Recorded sustained intensity: {suggestions.data.readiness.observedStableIntensity}. Last completed: {suggestions.data.readiness.lastCompletedAt?.replace('T', ' ').slice(0, 16) || 'Not recorded'} (Bangkok).</p>}
          <p className="text-xs text-gray-500">Recorded completion is training history, not certification of fitness. Trainer personalizes the plan after assignment.</p>
        </Card>
        {suggestions.loading && <Card className="p-5"><span role="status">Loading suggestions...</span></Card>}
        {suggestions.error && <Card className="space-y-3 p-5"><p role="alert" className="text-red-700">{suggestions.error}</p><Btn onClick={suggestions.retry}>Retry</Btn></Card>}
        {suggestions.data && !suggestions.loading && <>
          {!suggestions.data.packages.some(p => p.recommendationStatus === 'RECOMMENDED') && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">There is not enough matching evidence to identify a preferred package. Review-required packages can still be selected when registration is allowed.</div>}
          {sortSuggestions(suggestions.data.packages, goal).map(p => <Card key={p.packageId} className={`space-y-3 border-2 p-5 ${pkgId === p.packageId ? 'border-[#c9973b]' : 'border-gray-200'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><IdChip kind="PKG" id={p.packageId} /><h3 className="mt-2 font-serif text-lg font-bold">{p.packageName}</h3><p className="text-sm text-gray-500">{p.packageType} | {p.durationDays} days | {money(p.price)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-medium ${p.recommendationStatus === 'RECOMMENDED' ? 'bg-emerald-50 text-emerald-800' : p.recommendationStatus === 'NOT_ELIGIBLE' ? 'bg-red-50 text-red-800' : p.recommendationStatus === 'REVIEW_REQUIRED' ? 'bg-amber-50 text-amber-800' : 'bg-sky-50 text-sky-800'}`}>{p.recommendationStatus.replaceAll('_', ' ')}</span></div>
            {p.goal && <p className="text-sm">{p.goal}</p>}
            {p.workload && <p className="text-sm text-gray-600">Entry {p.workload.entryIntensity} | Peak {p.workload.peakIntensity} | First 7 days: {p.workload.firstWeekSessionsMin}-{p.workload.firstWeekSessionsMax} sessions, {p.workload.firstWeekMinutesMin}-{p.workload.firstWeekMinutesMax} minutes (depends on start weekday).</p>}
            <ul className="space-y-1 text-sm text-gray-600">{p.blockReasons.map(r => <li key={r.code} className="text-red-700">{r.message}</li>)}{p.reasonCodes.filter(c => !p.blockReasons.some(r => r.code === c)).map(c => <li key={c}>{suggestionReason(c)}</li>)}</ul>
            {p.workload && <PackageRoadmapPreview packageId={p.packageId} />}
            <Btn variant="gold" disabled={!p.canRegister} onClick={() => { setPkgId(p.packageId); setFieldError(''); setStep(2); }}>{!p.canRegister ? 'Registration unavailable' : 'Select package'}</Btn>
          </Card>)}
          {suggestions.data.packages.length === 0 && <Card className="p-5">No active packages are available. Contact the club manager.</Card>}
          <p className="text-xs text-gray-500">Rule {suggestions.data.ruleVersion} | Evaluated {suggestions.data.evaluatedAt.replace('T', ' ').slice(0,16)} Bangkok time.</p>
        </>}
      </div>}

      {step === 2 && pkg && horse && (
        <Card className="space-y-4 p-6">
          <h3 className="font-serif text-lg font-bold">Review registration</h3>
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
            {([["Package", pkg.name], ["Horses", horse.name], ["Horse Owner", user.name], ["Validity", `${TODAY} – ${addDaysLabel(TODAY, pkg.durationDays)} (${pkg.durationDays} days)`], ["Total payment", money(pkg.price)]] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-500">{k}</span><span className="font-medium">{v}</span></div>
            ))}
          </div>
          {followUp && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><b>Needs monitoring:</b> {followUp}<br /><span className="text-xs">Recommendation: reduce intensity and monitor the response during initial sessions.</span></div>}
          {renewOf ? <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">A new registration is subject to the current package and medical requirements. Trainer assignment is managed separately.</div>
            : <div className="rounded-lg bg-sky-50 p-3 text-sm text-sky-800">After payment, the manager assigns a trainer, who must accept the assignment.</div>}
        </Card>
      )}

      {step === 3 && pkg && horse && (
        <Card className="space-y-4 p-6">
          <div className="flex items-center justify-between"><h3 className="font-serif text-lg font-bold">Payment</h3><span className="font-serif text-xl font-bold text-[#c9973b]">{money(pkg.price)}</span></div>
          {!checkout ? (
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">You will receive a PayOS payment link with a QR code for this registration. The package is activated only after PayOS confirms the payment.</div>
          ) : (
            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="inline-block rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">PAYOS</span>
                  <h4 className="mt-1 font-semibold text-[#0f1729]">{pkg.name}</h4>
                  <p className="text-sm text-gray-600">Horse: {horse.name} | Order code: {checkout.orderCode}</p>
                </div>
                <a href={checkout.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#c9973b] underline">Open payment page</a>
              </div>
              <style>{`#payos-embed iframe { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; border: 0 !important; z-index: 2000 !important; background: #fff; }`}</style>
              <div id="payos-embed" />
              <div className="flex flex-wrap items-center gap-3">
                <Btn variant="gold" onClick={() => { window.open(checkout.url, '_blank', 'noopener,noreferrer'); }}>Open PayOS payment page (VietQR)</Btn>
                {EMBED_PAYOS && <Btn size="sm" variant="secondary" onClick={() => { try { payosApi.current?.open(); } catch { /* ignore */ } }}>Show VietQR</Btn>}
                {embedError && <span className="text-sm text-red-700">{embedError}</span>}
              </div>
              <p className="text-xs text-gray-500">Open the payment page, scan the VietQR code with your banking app and transfer the exact amount. Keep this page open: the status is checked automatically every few seconds and you will move to the receipt once PayOS confirms the payment.</p>
            </div>
          )}
          {payMsg && (
            <div className={`rounded-lg border p-3 text-sm ${payMsg.kind === 'cancel' ? 'border-gray-200 bg-gray-50 text-gray-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {payMsg.text}
              <div className="mt-2 flex gap-2"><Btn size="sm" variant="gold" onClick={() => (checkout ? check() : pay())}>{checkout ? "Check again" : "Retry"}</Btn></div>
            </div>
          )}
          {!payMsg && !checkout && <Btn variant="gold" disabled={paying} onClick={pay}>{paying ? "Creating payment link..." : "Create payment link"}</Btn>}
          {!payMsg && checkout && <Btn variant="gold" disabled={paying} onClick={() => check()}>{paying ? "Checking..." : "I have paid — check status"}</Btn>}
        </Card>
      )}

      {step === 4 && receipt && (
        <Card className="space-y-4 p-6">
          <div className="text-center"><div className="mb-1 text-4xl">✅</div><h3 className="font-serif text-xl font-bold text-emerald-700">Payment successful</h3><p className="text-sm text-gray-500">{receipt.trainerStatus === 'confirmed' ? "The new package is active and the trainer has been retained." : "The manager will assign a trainer to your horse."}</p></div>
          <ReceiptView e={receipt} horseName={horseName(receipt.horseId)} />
          <div className="flex justify-center"><Btn variant="primary" onClick={leave}>Back to packages</Btn></div>
        </Card>
      )}

      {fieldError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{fieldError}</div>}

      {step < 3 && (
        <div className="flex justify-between">
          <Btn variant="secondary" disabled={step === 0} onClick={() => { setFieldError(''); setStep(s => s - 1); }}>← Back</Btn>
          {step === 2 ? <Btn variant="gold" onClick={() => setConfirmOpen(true)}>Continue to payment</Btn> : <Btn variant="gold" disabled={(step === 0 && !horse) || (step === 1 && !canContinue)} onClick={next}>Continue →</Btn>}
        </div>
      )}
      {step === 3 && !paying && !payMsg && <div><Btn variant="secondary" onClick={() => (resumeEnr ? leave() : setStep(2))}>← Back</Btn></div>}

      {confirmOpen && pkg && horse && (
        <Modal title="Confirm package registration?" onClose={() => setConfirmOpen(false)}>
          <p className="text-sm text-gray-600">Package <strong>{pkg.name}</strong>  for horse <strong>{horse.name}</strong> — <strong>{money(pkg.price)}</strong>. You will proceed to payment.</p>
          <div className="mt-5 flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setConfirmOpen(false)}>Back</Btn>
            <Btn variant="gold" onClick={() => { setConfirmOpen(false); setPayMsg(null); setStep(3); }}>Confirm</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function addDaysLabel(d: string, n: number): string {
  const [dd, mm, yy] = d.split('/').map(Number);
  const dt = new Date(yy, mm - 1, dd + n);
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
}
