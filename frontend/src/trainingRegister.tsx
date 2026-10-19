import { useEffect, useRef, useState } from 'react';
import type { AppUser, Horse, Enrollment, TrainingPackage, Res, HealthRecord } from './data';
import { Badge, Btn, Card } from './ui';
import { IdChip, Modal } from './admin';
import { TrainerStatusPill } from './packages';
import { money, purchaseBlockReason, enrollmentTerm, isCurrent, EXPIRY_WARN_DAYS, TODAY } from './trainingLogic';

interface Props {
  state: { user: AppUser | null; horses: Horse[]; enrollments: Enrollment[]; packages: TrainingPackage[]; healthRecords: HealthRecord[] };
  navigate: (p: string) => void;
  onPurchase: (horseId: string, packageId: string, renewOfId?: string) => Res<Enrollment>;
}

const STEPS = ['Chọn gói', 'Chọn ngựa', 'Xem lại', 'Thanh toán', 'Biên lai'];
type Scenario = 'success' | 'fail' | 'cancel';

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center" role="list" aria-label="Tiến trình đăng ký">
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
    ['Mã đăng ký', <IdChip kind="ENR" id={e.id} />],
    ['Gói huấn luyện', `${e.packageName} · ${e.sessionsTotal} buổi`],
    ['Ngựa', horseName],
    ['Chủ ngựa', e.ownerName],
    ['Hiệu lực', `${e.startedAt} – ${e.expiresAt}`],
    ['Số tiền', <span className="font-serif text-lg font-bold text-[#c9973b]">{money(e.amount)}</span>],
    ['Thời gian thanh toán', e.paidAt],
    ['Phương thức', e.paymentMethod],
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
  const horseName = (id: string) => state.horses.find(h => h.id === id)?.name || 'Ngựa';

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
  const latestExam = horse ? state.healthRecords.filter(r => r.horseId === horse.id).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0] : undefined;
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
    if (step === 0 && !pkg) { setFieldError('Vui lòng chọn một gói huấn luyện.'); return; }
    if (step === 1) {
      if (!horse) { setFieldError('Vui lòng chọn ngựa.'); return; }
      const r = purchaseBlockReason(horse, state.enrollments, state.healthRecords, !!renewOf);
      if (r) { setFieldError(`Ngựa "${horse.name}" không thể đăng ký: ${r}.`); return; }
    }
    setStep(s => s + 1);
  };

  const pay = () => {
    if (paying) return;
    setPayMsg(null); setPaying(true);
    timer.current = window.setTimeout(() => {
      setPaying(false);
      if (scenario === 'fail') { setPayMsg({ kind: 'fail', text: 'Thanh toán thất bại: ngân hàng từ chối giao dịch mô phỏng. Chưa có khoản tiền nào bị trừ và chưa tạo đăng ký.' }); return; }
      if (scenario === 'cancel') { setPayMsg({ kind: 'cancel', text: 'Bạn đã hủy thanh toán. Chưa tạo đăng ký — bạn có thể thử lại bất cứ lúc nào.' }); return; }
      const r = onPurchase(horseId, pkgId, renewOf?.id);
      if (!r.ok) { setPayMsg({ kind: 'error', text: r.message }); return; }
      setReceipt(r.data); setStep(4);
    }, 1200);
  };

  // ── Danh sách ──
  if (mode === 'list') {
    const hasEligible = myHorses.some(h => !purchaseBlockReason(h, state.enrollments, state.healthRecords));
    return (
      <div className="max-w-5xl space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="font-serif text-xl font-bold text-[#0f1729]">Gói huấn luyện của tôi</h2><p className="text-sm text-gray-500">Chọn gói → chọn ngựa → xem lại → thanh toán · Chấp nhận kết luận đủ điều kiện hoặc cần theo dõi</p></div>
          <Btn variant="gold" onClick={() => start()}>+ Đăng ký gói mới</Btn>
        </div>
        {myHorses.length > 0 && !hasEligible && <Card className="border-l-4 border-amber-400 bg-amber-50 p-4 text-sm text-amber-800">Hiện chưa có ngựa nào có thể đăng ký gói mới. Xem lý do ở bước chọn ngựa.</Card>}
        {myEnr.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="mb-2 text-4xl">🎯</div>
            <div className="mb-3 font-semibold text-gray-600">{myHorses.length === 0 ? 'Bạn chưa có ngựa nào' : 'Bạn chưa đăng ký gói huấn luyện nào'}</div>
            {myHorses.length === 0 ? <Btn variant="gold" onClick={() => navigate('horse-create')}>+ Đăng ký ngựa mới</Btn> : <Btn variant="gold" onClick={() => start()}>Đăng ký gói đầu tiên</Btn>}
          </Card>
        ) : myEnr.map(e => {
          const t = enrollmentTerm(e);
          const pct = Math.round(e.sessionsDone / Math.max(1, e.sessionsTotal) * 100);
          const live = isCurrent(e);
          return (
            <Card key={e.id} className={`p-5 ${live && (t.warn || t.expired) ? 'border-l-4 border-amber-400' : ''}`}>
              <div className="flex flex-wrap items-center gap-2">
                <IdChip kind="ENR" id={e.id} />
                <span className="font-semibold text-[#0f1729]">Gói {e.packageName}</span>
                <span className="text-sm text-gray-500">· {horseName(e.horseId)}</span>
                <Badge status={e.status === 'paused' ? 'Paused' : e.status === 'completed' ? 'Completed' : 'Active'} />
                {live && <TrainerStatusPill status={e.trainerStatus} />}
              </div>
              <div className="mt-2 grid gap-1 text-sm text-gray-600 sm:grid-cols-2">
                <div>Thời hạn: <strong>{t.text}</strong></div>
                <div>{live ? (t.expired ? <span className="font-medium text-red-600">Đã hết hạn</span> : <>Còn <strong className={t.warn ? 'text-amber-700' : ''}>{t.left} ngày</strong></>) : 'Đã kết thúc'}</div>
                <div>Huấn luyện viên: {e.trainerName ? e.trainerName : <span className="italic text-gray-400">chưa phân công</span>}</div>
                <div>Số tiền: {money(e.amount)}</div>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-gray-500"><span>Đã tập {e.sessionsDone}/{e.sessionsTotal} buổi</span><span>{pct}%</span></div>
                <div className="h-2 w-full rounded-full bg-gray-200"><div className="h-2 rounded-full bg-[#c9973b]" style={{ width: `${pct}%` }} /></div>
              </div>
              {live && e.trainerStatus === 'unassigned' && <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Đang chờ Quản lý phân công huấn luyện viên. Bạn sẽ nhận thông báo khi có kết quả.</div>}
              {live && e.trainerStatus === 'pending' && <div className="mt-3 rounded-lg bg-sky-50 p-3 text-xs text-sky-800">Đã phân công {e.trainerName} — đang chờ huấn luyện viên xác nhận.</div>}
              {live && (t.warn || t.expired) && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <span className="text-sm text-amber-800">{t.expired ? 'Gói đã hết hạn.' : `Gói sắp hết hạn — còn ${t.left} ngày (cảnh báo khi còn ≤ ${EXPIRY_WARN_DAYS} ngày).`} Gia hạn để tiếp tục huấn luyện.</span>
                  <Btn size="sm" variant="gold" onClick={() => start(e)}>Gia hạn</Btn>
                </div>
              )}
              <div className="mt-3 flex gap-2"><Btn size="sm" variant="secondary" onClick={() => setViewReceipt(e)}>Xem biên lai</Btn></div>
            </Card>
          );
        })}
        {viewReceipt && (
          <Modal title="Biên lai thanh toán" onClose={() => setViewReceipt(null)}>
            <ReceiptView e={viewReceipt} horseName={horseName(viewReceipt.horseId)} />
            <div className="mt-4 text-right"><Btn variant="secondary" onClick={() => setViewReceipt(null)}>Đóng</Btn></div>
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
        <div><h2 className="font-serif text-xl font-bold text-[#0f1729]">{renewOf ? `Gia hạn gói ${renewOf.packageName}` : 'Đăng ký gói huấn luyện'}</h2><p className="text-sm text-gray-500">Bước {step + 1}/{STEPS.length}: {STEPS[step]}</p></div>
        {step < 4 && !paying && <Btn variant="ghost" onClick={leave}>Hủy</Btn>}
      </div>
      <Card className="px-6 py-5"><StepBar step={step} /></Card>

      {step === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Chọn gói huấn luyện <span className="text-red-500">*</span></p>
          {activePkgs.length === 0 ? <Card className="p-8 text-center text-sm text-gray-500">Hiện chưa có gói nào đang áp dụng. Vui lòng liên hệ Quản lý CLB.</Card> : (
            <div className="grid gap-4 md:grid-cols-3">
              {activePkgs.map(p => (
                <button key={p.id} onClick={() => { setPkgId(p.id); setFieldError(''); }} className={`rounded-xl border-2 bg-white p-5 text-left transition-all ${pkgId === p.id ? 'border-[#c9973b] shadow-md' : 'border-gray-200 hover:border-[#c9973b]/60'}`}>
                  <div className="mb-1 flex items-center gap-2"><IdChip kind="PKG" id={p.id} />{p.popular && <span className="rounded-full bg-[#c9973b]/15 px-2 py-0.5 text-[10px] font-medium text-[#8a6420]">Phổ biến</span>}</div>
                  <div className="font-serif text-lg font-bold text-[#0f1729]">{p.name}</div>
                  <div className="mt-1 font-serif text-xl font-bold text-[#c9973b]">{money(p.price)}</div>
                  <div className="mt-2 text-sm text-gray-600">{p.sessions} buổi · {p.durationDays} ngày</div>
                  <p className="mt-2 text-xs text-gray-500">{p.description}</p>
                  {p.focus && <ul className="mt-2 space-y-0.5 text-xs text-gray-600">{p.focus.map(f => <li key={f}>✓ {f}</li>)}</ul>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Chọn ngựa <span className="text-red-500">*</span> · Ngựa cần theo dõi vẫn có thể đăng ký với cường độ phù hợp</p>
          {horsesToShow.length === 0 && <Card className="p-8 text-center text-sm text-gray-500">Bạn chưa có ngựa nào.</Card>}
          {horsesToShow.map(h => {
            const reason = purchaseBlockReason(h, state.enrollments, state.healthRecords, !!renewOf);
            const sel = horseId === h.id;
            const exam = state.healthRecords.filter(r => r.horseId === h.id).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0];
            const watch = exam?.decision === 'conditional' || exam?.trainingEligibility === 'conditional';
            return (
              <button key={h.id} disabled={!!reason} onClick={() => { setHorseId(h.id); setFieldError(''); }} className={`flex w-full items-center gap-4 rounded-xl border-2 bg-white p-4 text-left ${reason ? 'cursor-not-allowed border-gray-200 opacity-50' : sel ? 'border-[#c9973b] shadow-md' : 'border-gray-200 hover:border-[#c9973b]/60'}`}>
                {h.imageUrl ? <img src={h.imageUrl} alt="" className="h-12 w-12 rounded-lg bg-gray-200 object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-xl">🐎</div>}
                <div className="flex-1"><div className="font-semibold text-[#0f1729]">{h.name}</div><div className="text-xs text-gray-500">{h.breed} · {h.age} tuổi</div>{watch && !reason && <div className="mt-1 text-xs font-medium text-amber-700">Cần theo dõi: {exam?.followUpNote || exam?.trainingNote || 'Giảm cường độ và theo dõi phản ứng.'}</div>}</div>
                {reason ? <span className="rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">{reason}</span> : <span className={`h-5 w-5 rounded-full border-2 ${sel ? 'border-[#c9973b] bg-[#c9973b]' : 'border-gray-300'}`} />}
              </button>
            );
          })}
        </div>
      )}

      {step === 2 && pkg && horse && (
        <Card className="space-y-4 p-6">
          <h3 className="font-serif text-lg font-bold">Xem lại đăng ký</h3>
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
            {([['Gói', `${pkg.name} · ${pkg.sessions} buổi`], ['Ngựa', horse.name], ['Chủ ngựa', user.name], ['Hiệu lực', `${TODAY} – ${addDaysLabel(TODAY, pkg.durationDays)} (${pkg.durationDays} ngày)`], ['Tổng thanh toán', money(pkg.price)]] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-500">{k}</span><span className="font-medium">{v}</span></div>
            ))}
          </div>
          {followUp && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><b>Cần theo dõi:</b> {followUp}<br /><span className="text-xs">Gợi ý: giảm cường độ và theo dõi phản ứng trong các buổi đầu.</span></div>}
          {renewOf ? <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Gia hạn tạo một gói mới (mã ENR mới). Gói cũ {renewOf.id} sẽ kết thúc; {Math.max(0, renewOf.sessionsTotal - renewOf.sessionsDone)} buổi chưa dùng của gói cũ không được chuyển sang. Huấn luyện viên hiện tại được giữ nguyên.</div>
            : <div className="rounded-lg bg-sky-50 p-3 text-sm text-sky-800">Sau khi thanh toán, Quản lý sẽ phân công huấn luyện viên và huấn luyện viên cần xác nhận.</div>}
        </Card>
      )}

      {step === 3 && pkg && horse && (
        <Card className="space-y-4 p-6">
          <div className="flex items-center justify-between"><h3 className="font-serif text-lg font-bold">Thanh toán mô phỏng</h3><span className="font-serif text-xl font-bold text-[#c9973b]">{money(pkg.price)}</span></div>
          <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">Đây là cổng thanh toán giả lập. Chọn kết quả muốn thử để kiểm tra các tình huống.</div>
          <div className="grid gap-2 sm:grid-cols-3">
            {([['success', 'Thành công'], ['fail', 'Thất bại'], ['cancel', 'Hủy thanh toán']] as [Scenario, string][]).map(([k, l]) => (
              <label key={k} className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium ${scenario === k ? 'border-[#c9973b] bg-[#c9973b]/5' : 'border-gray-200'}`}>
                <input type="radio" name="scenario" checked={scenario === k} disabled={paying} onChange={() => { setScenario(k); setPayMsg(null); }} />{l}
              </label>
            ))}
          </div>
          {payMsg && (
            <div className={`rounded-lg border p-3 text-sm ${payMsg.kind === 'cancel' ? 'border-gray-200 bg-gray-50 text-gray-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {payMsg.text}
              <div className="mt-2 flex gap-2"><Btn size="sm" variant="gold" onClick={pay}>Thử lại</Btn><Btn size="sm" variant="secondary" onClick={() => { setPayMsg(null); setStep(2); }}>Quay lại xem lại</Btn></div>
            </div>
          )}
          {!payMsg && <Btn variant="gold" disabled={paying} onClick={pay}>{paying ? 'Đang xử lý thanh toán...' : `Thanh toán ${money(pkg.price)}`}</Btn>}
        </Card>
      )}

      {step === 4 && receipt && (
        <Card className="space-y-4 p-6">
          <div className="text-center"><div className="mb-1 text-4xl">✅</div><h3 className="font-serif text-xl font-bold text-emerald-700">Thanh toán thành công</h3><p className="text-sm text-gray-500">{receipt.trainerStatus === 'confirmed' ? 'Gói mới đã được kích hoạt, huấn luyện viên được giữ nguyên.' : 'Quản lý sẽ phân công huấn luyện viên cho ngựa của bạn.'}</p></div>
          <ReceiptView e={receipt} horseName={horseName(receipt.horseId)} />
          <div className="flex justify-center"><Btn variant="primary" onClick={leave}>Về danh sách gói</Btn></div>
        </Card>
      )}

      {fieldError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{fieldError}</div>}

      {step < 3 && (
        <div className="flex justify-between">
          <Btn variant="secondary" disabled={step === 0} onClick={() => { setFieldError(''); setStep(s => s - 1); }}>← Quay lại</Btn>
          {step === 2 ? <Btn variant="gold" onClick={() => setConfirmOpen(true)}>Tiếp tục thanh toán</Btn> : <Btn variant="gold" onClick={next}>Tiếp tục →</Btn>}
        </div>
      )}
      {step === 3 && !paying && !payMsg && <div><Btn variant="secondary" onClick={() => setStep(2)}>← Quay lại</Btn></div>}

      {confirmOpen && pkg && horse && (
        <Modal title="Bạn có chắc muốn đăng ký gói?" onClose={() => setConfirmOpen(false)}>
          <p className="text-sm text-gray-600">Gói <strong>{pkg.name}</strong> cho ngựa <strong>{horse.name}</strong> — <strong>{money(pkg.price)}</strong>. Bạn sẽ chuyển sang bước thanh toán.</p>
          <div className="mt-5 flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setConfirmOpen(false)}>Quay lại</Btn>
            <Btn variant="gold" onClick={() => { setConfirmOpen(false); setPayMsg(null); setStep(3); }}>Xác nhận</Btn>
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
