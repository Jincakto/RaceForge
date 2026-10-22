import { useEffect, useRef, useState } from 'react';
import type { AppUser, Horse, Enrollment, TrainingPackage, Res, HealthRecord } from './data';
import { Badge, Btn, Card } from './ui';
import { IdChip, Modal } from './admin';
import { TrainerStatusPill } from './packages';
import { money, latestHealthRecord, enrollmentLabel, purchaseBlockReason, enrollmentTerm, isCurrent, EXPIRY_WARN_DAYS, TODAY } from './trainingLogic';

interface Props {
  state: { user: AppUser | null; horses: Horse[]; enrollments: Enrollment[]; packages: TrainingPackage[]; healthRecords: HealthRecord[] };
  navigate: (p: string) => void;
  onPurchase: (horseId: string, packageId: string, renewOfId?: string, successful?: boolean) => Promise<Res<Enrollment>>;
}

const STEPS = ["Choose package", "Choose horse", "Review", "Payment", "Receipt"];
type Scenario = 'success' | 'fail' | 'cancel';

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

export function TrainingRegisterPage({ state, navigate, onPurchase }: Props) {
  const user = state.user!;
  const myHorses = state.horses.filter(h => h.ownerId === user.id);
  const myEnr = state.enrollments.filter(e => myHorses.some(h => h.id === e.horseId)).slice().reverse();
  const activePkgs = state.packages.filter(p => p.active);
  const horseName = (id: string) => state.horses.find(h => h.id === id)?.name || "Horses";

  const [mode, setMode] = useState<'list' | 'wizard'>('list');
  const [step, setStep] = useState(0);
  const [pkgId, setPkgId] = useState('');
  const [horseId, setHorseId] = useState('');
  const [renewOf, setRenewOf] = useState<Enrollment | null>(null);
  const [scenario, setScenario] = useState<Scenario>('success');
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState<{ kind: 'fail' | 'cancel' | 'error'; text: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [receipt, setReceipt] = useState<Enrollment | null>(null);
  const [viewReceipt, setViewReceipt] = useState<Enrollment | null>(null);
  const [fieldError, setFieldError] = useState('');
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const pkg = state.packages.find(p => p.id === pkgId);
  const horse = myHorses.find(h => h.id === horseId);
  const latestExam = horse ? latestHealthRecord(state.healthRecords, horse.id) : undefined;
  const followUp = latestExam?.decision === 'conditional' || latestExam?.trainingEligibility === 'conditional' ? latestExam.followUpNote || latestExam.trainingNote || latestExam.conclusion : '';

  const start = (renew?: Enrollment) => {
    setRenewOf(renew || null);
    setPkgId(renew && state.packages.find(p => p.id === renew.packageId)?.active ? renew.packageId : '');
    setHorseId(renew ? renew.horseId : '');
    setStep(0); setScenario('success'); setPayMsg(null); setReceipt(null); setFieldError(''); setPaying(false);
    setMode('wizard');
  };
  const leave = () => { setMode('list'); setRenewOf(null); setPayMsg(null); setConfirmOpen(false); };

  const next = () => {
    setFieldError('');
    if (step === 0 && !pkg) { setFieldError("Select a training package."); return; }
    if (step === 1) {
      if (!horse) { setFieldError("Select a horse."); return; }
      const r = state.enrollments.some(e=>e.horseId===horse.id&&e.packageId===pkgId&&e.paymentStatus==='PENDING') ? null : purchaseBlockReason(horse,state.enrollments,state.healthRecords,false,pkg?.packageType);
      if (r) { setFieldError(`Horse "${horse.name}" cannot register: ${r}.`); return; }
    }
    setStep(s => s + 1);
  };

  const pay = () => {
    if (paying) return;
    const blocked = horse ? state.enrollments.some(e=>e.horseId===horse.id&&e.packageId===pkgId&&e.paymentStatus==='PENDING') ? null : purchaseBlockReason(horse,state.enrollments,state.healthRecords,false,pkg?.packageType) : 'Select a horse.';
    if (blocked) { setPayMsg({ kind: 'error', text: blocked }); return; }
    setPayMsg(null); setPaying(true);
    timer.current = window.setTimeout(async () => {

      if (scenario === 'cancel') { setPaying(false); setPayMsg({ kind: 'cancel', text: "Payment cancelled. No registration was created — you may try again at any time." }); return; }
      const r = await onPurchase(horseId, pkgId, renewOf?.id, scenario === 'success');
      setPaying(false);
      if (!r.ok) { setPayMsg({ kind: 'error', text: r.message }); return; }
      if (r.data.paymentStatus !== 'PAID') { setPayMsg({ kind: 'fail', text: "Simulated payment failure recorded. The package has not been activated." }); return; }
      setReceipt(r.data); setStep(4);
    }, 1200);
  };

  // ── Danh sách ──
  if (mode === 'list') {
    const hasEligible = myHorses.some(h => activePkgs.some(p=>!purchaseBlockReason(h,state.enrollments,state.healthRecords,false,p.packageType)));
    return (
      <div className="max-w-5xl space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="font-serif text-xl font-bold text-[#0f1729]">My training packages</h2><p className="text-sm text-gray-500">Choose package → choose horse → review → pay · Eligibility is checked by the server for the selected package type</p></div>
          <Btn variant="gold" onClick={() => start()}>+ Register a new package</Btn>
        </div>
        {myHorses.length > 0 && !hasEligible && <Card className="border-l-4 border-amber-400 bg-amber-50 p-4 text-sm text-amber-800">No horses can currently register for a new package. See the reason in the horse selection step.</Card>}
        {myEnr.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="mb-2 text-4xl">🎯</div>
            <div className="mb-3 font-semibold text-gray-600">{myHorses.length === 0 ? "You have no horses yet" : "You have not registered for any training packages"}</div>
            {myHorses.length === 0 ? <Btn variant="gold" onClick={() => navigate('horse-create')}>+ Register a new horse</Btn> : <Btn variant="gold" onClick={() => start()}>Register for your first package</Btn>}
          </Card>
        ) : myEnr.map(e => {
          const t = enrollmentTerm(e);
          const live = isCurrent(e);
          return (
            <Card key={e.id} className={`p-5 ${live && (t.warn || t.expired) ? 'border-l-4 border-amber-400' : ''}`}>
              <div className="flex flex-wrap items-center gap-2">
                <IdChip kind="ENR" id={e.id} />
                <span className="font-semibold text-[#0f1729]">Package {e.packageName}</span>
                <span className="text-sm text-gray-500">· {horseName(e.horseId)}</span>
                <Badge status={enrollmentLabel(e)} />
                {live && <TrainerStatusPill status={e.trainerStatus} />}
              </div>
              <div className="mt-2 grid gap-1 text-sm text-gray-600 sm:grid-cols-2">
                <div>Term: <strong>{t.text}</strong></div>
                <div>{live ? (t.expired ? <span className="font-medium text-red-600">Expired</span> : <>Remaining <strong className={t.warn ? 'text-amber-700' : ''}>{t.left}  days</strong></>) : "Ended"}</div>
                <div>Trainer: {e.trainerName ? e.trainerName : <span className="italic text-gray-400">not assigned</span>}</div>
                <div>Amount: {money(e.amount)}</div>
              </div>
              <p className="mt-3 text-sm text-gray-600">Created: {e.sessionsTotal} · Completed: {e.sessionsDone} · Cancelled / missed: {e.sessionsCancelled || 0}</p>
              {e.status==='active' && e.trainerStatus === 'unassigned' && <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Awaiting trainer assignment by the manager. You will be notified once assigned.</div>}
              {live && e.trainerStatus === 'pending' && <div className="mt-3 rounded-lg bg-sky-50 p-3 text-xs text-sky-800">Assigned {e.trainerName}  — awaiting trainer confirmation.</div>}
              {live && t.warn && <p className="mt-3 text-sm text-amber-800">Package expires in {t.left} days. Registration again is available after this package ends, subject to server approval.</p>}
              {!live && <Btn size="sm" variant="gold" onClick={()=>start(e)}>Register again</Btn>}
              {e.paymentStatus==='PENDING' && <Btn size="sm" variant="gold" onClick={()=>{start(e);setStep(2);}}>Retry payment</Btn>}
              <div className="mt-3 flex gap-2"><Btn size="sm" variant="secondary" onClick={() => setViewReceipt(e)}>View receipt</Btn></div>
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
        <div><h2 className="font-serif text-xl font-bold text-[#0f1729]">{renewOf ? `Register package ${renewOf.packageName} again` : "Training package registration"}</h2><p className="text-sm text-gray-500">Step {step + 1}/{STEPS.length}: {STEPS[step]}</p></div>
        {step < 4 && !paying && <Btn variant="ghost" onClick={leave}>Cancel</Btn>}
      </div>
      <Card className="px-6 py-5"><StepBar step={step} /></Card>

      {step === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Choose training package <span className="text-red-500">*</span></p>
          {activePkgs.length === 0 ? <Card className="p-8 text-center text-sm text-gray-500">No packages are currently available. Contact the club manager.</Card> : (
            <div className="grid gap-4 md:grid-cols-3">
              {activePkgs.map(p => (
                <button key={p.id} onClick={() => { setPkgId(p.id); setFieldError(''); }} className={`rounded-xl border-2 bg-white p-5 text-left transition-all ${pkgId === p.id ? 'border-[#c9973b] shadow-md' : 'border-gray-200 hover:border-[#c9973b]/60'}`}>
                  <div className="mb-1 flex items-center gap-2"><IdChip kind="PKG" id={p.id} />{p.popular && <span className="rounded-full bg-[#c9973b]/15 px-2 py-0.5 text-[10px] font-medium text-[#8a6420]">Popular</span>}</div>
                  <div className="font-serif text-lg font-bold text-[#0f1729]">{p.name}</div>
                  <div className="mt-1 font-serif text-xl font-bold text-[#c9973b]">{money(p.price)}</div>
                  <div className="mt-2 text-sm text-gray-600">{p.packageType} · {p.durationDays} days</div>
                  <p className="mt-2 text-xs text-gray-500">{p.description}</p>
                  {p.focus && <ul className="mt-2 space-y-0.5 text-xs text-gray-600">{p.focus.map(f => <li key={f}>✓ {f}</li>)}</ul>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {pkg?.packageType==='RACING' && step<4 && <Card className="border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">RACING requires the latest confirmed examination to conclude FIT, allow training, include temperature, resting heart rate and respiratory rate, and contain exactly one NORMAL movement / legs examination. The server validates these conditions when registering and paying.</Card>}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Choose horse <span className="text-red-500">*</span>  · Horses requiring monitoring may register with an appropriate intensity</p>
          {horsesToShow.length === 0 && <Card className="p-8 text-center text-sm text-gray-500">You have no horses yet.</Card>}
          {horsesToShow.map(h => {
            const reason = purchaseBlockReason(h, state.enrollments, state.healthRecords, !!renewOf, pkg?.packageType);
            const sel = horseId === h.id;
            const exam = latestHealthRecord(state.healthRecords, h.id);
            const watch = exam?.decision === 'conditional' || exam?.trainingEligibility === 'conditional';
            return (
              <button key={h.id} disabled={!!reason} onClick={() => { setHorseId(h.id); setFieldError(''); }} className={`flex w-full items-center gap-4 rounded-xl border-2 bg-white p-4 text-left ${reason ? 'cursor-not-allowed border-gray-200 opacity-50' : sel ? 'border-[#c9973b] shadow-md' : 'border-gray-200 hover:border-[#c9973b]/60'}`}>
                {h.imageUrl ? <img src={h.imageUrl || undefined} alt="" className="h-12 w-12 rounded-lg bg-gray-200 object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-xl">🐎</div>}
                <div className="flex-1"><div className="font-semibold text-[#0f1729]">{h.name}</div><div className="text-xs text-gray-500">{h.breed} · {h.age}  years old</div>{watch && !reason && <div className="mt-1 text-xs font-medium text-amber-700">Needs monitoring: {exam?.followUpNote || exam?.trainingNote || "Reduce intensity and monitor the response."}</div>}</div>
                {reason ? <span className="rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">{reason}</span> : <span className={`h-5 w-5 rounded-full border-2 ${sel ? 'border-[#c9973b] bg-[#c9973b]' : 'border-gray-300'}`} />}
              </button>
            );
          })}
        </div>
      )}

      {step === 2 && pkg && horse && (
        <Card className="space-y-4 p-6">
          <h3 className="font-serif text-lg font-bold">Review registration</h3>
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
            {([["Package", pkg.name], ["Horses", horse.name], ["Horse Owner", user.name], ["Validity", `${TODAY} – ${addDaysLabel(TODAY, pkg.durationDays)} (${pkg.durationDays} days)`], ["Total payment", money(pkg.price)]] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-500">{k}</span><span className="font-medium">{v}</span></div>
            ))}
          </div>
          {followUp && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><b>Needs monitoring:</b> {followUp}<br /><span className="text-xs">Recommendation: reduce intensity and monitor the response during initial sessions.</span></div>}
          <div className="rounded-lg bg-sky-50 p-3 text-sm text-sky-800">Each registration has its own package term and trainer assignment. The server checks whether registration is allowed; no existing package is ended automatically.</div>
        </Card>
      )}

      {step === 3 && pkg && horse && (
        <Card className="space-y-4 p-6">
          <div className="flex items-center justify-between"><h3 className="font-serif text-lg font-bold">Simulated payment</h3><span className="font-serif text-xl font-bold text-[#c9973b]">{money(pkg.price)}</span></div>
          <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">This is a simulated payment gateway. Select an outcome to test a scenario.</div>
          <div className="grid gap-2 sm:grid-cols-3">
            {([['success', "Success"], ['fail', "Failure"], ['cancel', "Cancel payment"]] as [Scenario, string][]).map(([k, l]) => (
              <label key={k} className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium ${scenario === k ? 'border-[#c9973b] bg-[#c9973b]/5' : 'border-gray-200'}`}>
                <input type="radio" name="scenario" checked={scenario === k} disabled={paying} onChange={() => { setScenario(k); setPayMsg(null); }} />{l}
              </label>
            ))}
          </div>
          {payMsg && (
            <div className={`rounded-lg border p-3 text-sm ${payMsg.kind === 'cancel' ? 'border-gray-200 bg-gray-50 text-gray-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {payMsg.text}
              <div className="mt-2 flex gap-2"><Btn size="sm" variant="gold" onClick={pay}>Retry</Btn><Btn size="sm" variant="secondary" onClick={() => { setPayMsg(null); setStep(2); }}>Back to review</Btn></div>
            </div>
          )}
          {!payMsg && <Btn variant="gold" disabled={paying} onClick={pay}>{paying ? "Processing payment..." : `Payment ${money(pkg.price)}`}</Btn>}
        </Card>
      )}

      {step === 4 && receipt && (
        <Card className="space-y-4 p-6">
          <div className="text-center"><div className="mb-1 text-4xl">✅</div><h3 className="font-serif text-xl font-bold text-emerald-700">Payment successful</h3><p className="text-sm text-gray-500">The manager will assign a trainer to your horse.</p></div>
          <ReceiptView e={receipt} horseName={horseName(receipt.horseId)} />
          <div className="flex justify-center"><Btn variant="primary" onClick={leave}>Back to packages</Btn></div>
        </Card>
      )}

      {fieldError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{fieldError}</div>}

      {step < 3 && (
        <div className="flex justify-between">
          <Btn variant="secondary" disabled={step === 0} onClick={() => { setFieldError(''); setStep(s => s - 1); }}>← Back</Btn>
          {step === 2 ? <Btn variant="gold" onClick={() => setConfirmOpen(true)}>Continue to payment</Btn> : <Btn variant="gold" onClick={next}>Continue →</Btn>}
        </div>
      )}
      {step === 3 && !paying && !payMsg && <div><Btn variant="secondary" onClick={() => setStep(2)}>← Back</Btn></div>}

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
