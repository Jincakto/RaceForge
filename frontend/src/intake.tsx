import { useState } from 'react';
import type { AppUser, Horse, HorseClubRequest, HealthRecord } from './data';
import { Btn, Card, Select } from './ui';
import { IdChip, ReasonDialog, Modal } from './admin';

export const INTAKE_STEPS = ['Nộp hồ sơ & định danh', 'Quản lý phân công thú y', 'Thú y chấp nhận khám', 'Thú y khám & kết luận', 'Quản lý duyệt nhận vào CLB'];

export function vetVisible(h: Horse, user: AppUser): boolean {
  if (user.role !== 'veterinarian') return true;
  return h.vetId === user.id && (h.vetAssign?.status ?? 'accepted') === 'accepted';
}

export function intakeStage(h: Horse | undefined, req: HorseClubRequest): number {
  if (req.status === 'approved') return 5;
  if (req.status === 'rejected') return -1;
  if (!h) return 1;
  if (h.intakeExamId) return 4;
  if (h.vetId && h.vetAssign?.status === 'accepted') return 3;
  if (h.vetId && h.vetAssign?.status === 'pending') return 2;
  return 1;
}

export function IntakeProgress({ stage, compact = false }: { stage: number; compact?: boolean }) {
  const rejected = stage === -1;
  return (
    <ol className="flex items-start" aria-label="Tiến trình tiếp nhận ngựa">
      {INTAKE_STEPS.map((label, i) => {
        const done = !rejected && stage > i;
        const cur = !rejected && stage === i;
        const fail = rejected && i === 4;
        return (
          <li key={label} className="flex flex-1 flex-col items-center text-center">
            <div className="flex w-full items-center">
              <div className={`h-0.5 flex-1 ${i === 0 ? 'opacity-0' : done || cur ? 'bg-emerald-400' : 'bg-gray-200'}`} />
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${fail ? 'bg-red-600 text-white' : done ? 'bg-emerald-500 text-white' : cur ? 'bg-[#c9973b] text-white ring-4 ring-[#c9973b]/20' : 'bg-gray-100 text-gray-400'}`}>{fail ? '✕' : done ? '✓' : i + 1}</span>
              <div className={`h-0.5 flex-1 ${i === INTAKE_STEPS.length - 1 ? 'opacity-0' : done ? 'bg-emerald-400' : 'bg-gray-200'}`} />
            </div>
            {!compact && <span className={`mt-1.5 px-1 text-[11px] leading-tight ${cur ? 'font-semibold text-[#0f1729]' : fail ? 'font-semibold text-red-600' : 'text-gray-500'}`}>{fail ? 'Bị từ chối' : label}</span>}
          </li>
        );
      })}
    </ol>
  );
}

export function IdentityBadge({ verified }: { verified?: boolean }) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${verified ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{verified ? '✓ Đã xác thực' : 'Chưa xác thực'}</span>;
}

const VET_STATUS: Record<string, string> = { pending: 'Chờ bác sĩ nhận', accepted: 'Đã nhận', declined: 'Bác sĩ đã từ chối' };

export function AssignHistory({ horse, onClose }: { horse: Horse; onClose: () => void }) {
  return (
    <Modal title={`Lịch sử phân công — ${horse.name}`} onClose={onClose} wide>
      <div className="space-y-2">
        {(horse.vetAssign?.history || []).map((e, i) => (
          <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
            <div className="text-xs text-gray-400">{e.time}</div>
            <div>{e.from && e.from !== e.to ? <><b>{e.from}</b> → <b>{e.to}</b></> : e.from ? <b>{e.to}</b> : <>Phân công <b>{e.to}</b></>} <span className="text-gray-500">· bởi {e.by}</span></div>
            <div className="text-xs italic text-gray-500">Lý do: {e.reason}</div>
          </div>
        ))}
        {!(horse.vetAssign?.history || []).length && <p className="py-6 text-center text-sm text-gray-400">Chưa có lịch sử phân công.</p>}
      </div>
    </Modal>
  );
}

type Handlers = {
  onVerify: (horseId: string, verified: boolean) => void;
  onAssign: (horseId: string, vetId: string, reason: string) => void;
  onApprove: (reqId: string) => void;
  onReject: (reqId: string, reason: string) => void;
  onOpenHorse: (id: string) => void;
};

export function IntakeBoardPage({ user, horses, requests, records, users, onVerify, onAssign, onApprove, onReject, onOpenHorse }:
  { user: AppUser; horses: Horse[]; requests: HorseClubRequest[]; records: HealthRecord[]; users: AppUser[] } & Handlers) {
  const mine = requests.filter(r => r.clubId === user.clubId);
  const open = mine.filter(r => r.status === 'pending');
  const done = mine.filter(r => r.status !== 'pending');
  const vets = users.filter(u => u.role === 'veterinarian' && u.clubId === user.clubId && !u.locked);
  const [filter, setFilter] = useState(0);
  const [pick, setPick] = useState<{ horse: Horse; vetId: string } | null>(null);
  const [pickErr, setPickErr] = useState('');
  const [replace, setReplace] = useState<{ horse: Horse; vetId: string } | null>(null);
  const [rejectFor, setRejectFor] = useState<HorseClubRequest | null>(null);
  const [approveFor, setApproveFor] = useState<HorseClubRequest | null>(null);
  const [history, setHistory] = useState<Horse | null>(null);
  const [warn, setWarn] = useState<Record<string, string>>({});

  const rows = open.map(r => ({ r, h: horses.find(x => x.id === r.horseId), st: intakeStage(horses.find(x => x.id === r.horseId), r) }));
  const shown = rows.filter(x => filter === 0 || x.st === filter);
  const count = (n: number) => rows.filter(x => x.st === n).length;

  const choose = () => {
    if (!pick) return;
    if (!pick.vetId) { setPickErr('Vui lòng chọn bác sĩ thú y.'); return; }
    if (pick.horse.vetId && pick.vetId === pick.horse.vetId && pick.horse.vetAssign?.status !== 'declined') { setPickErr('Bác sĩ này đang được phân công cho ngựa.'); return; }
    if (pick.horse.vetId && pick.horse.vetAssign?.status !== 'declined') { setReplace(pick); setPick(null); setPickErr(''); return; }
    onAssign(pick.horse.id, pick.vetId, pick.horse.vetId ? 'Phân công lại sau khi bác sĩ từ chối' : 'Phân công khám tiếp nhận');
    setPick(null); setPickErr('');
  };

  const tryApprove = (r: HorseClubRequest, h?: Horse) => {
    if (!h?.identityVerified) { setWarn(w => ({ ...w, [r.id]: 'Cần xác thực số microchip trước khi duyệt.' })); return; }
    setWarn(w => ({ ...w, [r.id]: '' })); setApproveFor(r);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-xl font-bold text-[#0f1729]">Tiếp nhận ngựa vào câu lạc bộ</h2>
        <p className="text-sm text-gray-500">Một luồng duy nhất: nộp hồ sơ → phân công thú y → thú y nhận khám → khám & kết luận → Quản lý duyệt. Không có bước duyệt hồ sơ riêng trước khi khám.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {[[0, 'Tất cả', open.length], [1, 'Cần phân công', count(1)], [2, 'Chờ thú y nhận', count(2)], [3, 'Đang chờ khám', count(3)], [4, 'Chờ tôi duyệt', count(4)]].map(([k, l, n]) => (
          <button key={k as number} onClick={() => setFilter(k as number)} className={`rounded-full border px-3 py-1 text-xs font-medium ${filter === k ? 'border-[#1a2844] bg-[#1a2844] text-white' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}>{l} ({n})</button>
        ))}
      </div>

      {shown.length === 0 && <Card className="p-12 text-center"><div className="mb-2 text-4xl">🐎</div><div className="font-semibold text-gray-600">Không có hồ sơ nào ở mục này</div><div className="text-sm text-gray-400">Hồ sơ mới do chủ ngựa nộp sẽ xuất hiện tại đây.</div></Card>}

      {shown.map(({ r, h, st }) => {
        const exam = h?.intakeExamId ? records.find(x => x.id === h.intakeExamId) : undefined;
        const declined = h?.vetAssign?.status === 'declined';
        return (
          <Card key={r.id} className="p-5">
            <div className="flex flex-wrap items-start gap-4">
              {h?.imageUrl ? <img src={h.imageUrl} alt={h.name} className="h-16 w-16 rounded-xl bg-gray-200 object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-100 text-2xl">🐎</div>}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><button onClick={() => h && onOpenHorse(h.id)} className="font-serif text-lg font-bold text-[#0f1729] hover:text-[#c9973b]">{r.horseName}</button>{h && <IdChip kind="HRS" id={h.id} />}<IdentityBadge verified={h?.identityVerified} /></div>
                <div className="text-sm text-gray-500">{r.horseBreed} · {h?.age} tuổi · {h?.gender} · Chủ ngựa: <b className="text-gray-700">{r.ownerName}</b> · Nộp {r.submittedAt}</div>
                <div className="mt-0.5 text-xs text-gray-400">Microchip: {h?.microchip || 'chưa khai báo'}</div>
              </div>
            </div>
            <div className="mt-5"><IntakeProgress stage={st} /></div>

            <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm">
              {st === 1 && <span>{declined ? <>Bác sĩ <b>{h?.vetName}</b> đã từ chối — cần phân công bác sĩ khác.</> : 'Chưa phân công thú y khám tiếp nhận.'}</span>}
              {st === 2 && <span>Đã giao cho <b>{h?.vetName}</b> — đang chờ bác sĩ chấp nhận.</span>}
              {st === 3 && <span><b>{h?.vetName}</b> đã nhận — đang chờ khám và kết luận.</span>}
              {st === 4 && exam && (
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2"><IdChip kind="MED" id={exam.id} /><span className="text-xs text-gray-500">Khám ngày {exam.date} · {exam.vet}</span><span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${exam.decision === 'eligible' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : exam.decision === 'conditional' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{exam.decision === 'eligible' ? 'Đủ điều kiện huấn luyện' : exam.decision === 'conditional' ? 'Đủ điều kiện nhưng cần theo dõi' : 'Không đủ điều kiện, khóa tập luyện'}</span></div>
                  <p className="text-gray-700">“{exam.conclusion || exam.diagnosis}”</p>
                </div>
              )}
            </div>
            {warn[r.id] && <p className="mt-2 text-xs text-red-600">{warn[r.id]}</p>}

            <div className="mt-4 flex flex-wrap gap-2">
              {h && !h.identityVerified && <Btn size="sm" variant="secondary" onClick={() => onVerify(h.id, true)}>Xác thực định danh</Btn>}
              {h && st === 1 && <Btn size="sm" onClick={() => { setPickErr(''); setPick({ horse: h, vetId: '' }); }}>Phân công thú y</Btn>}
              {h && (st === 2 || st === 3) && <Btn size="sm" variant="secondary" onClick={() => { setPickErr(''); setPick({ horse: h, vetId: '' }); }}>Thay người</Btn>}
              {st === 4 && <><Btn size="sm" variant="gold" onClick={() => tryApprove(r, h)}>Duyệt nhận vào CLB</Btn><Btn size="sm" variant="danger" onClick={() => setRejectFor(r)}>Từ chối</Btn></>}
              {h && (h.vetAssign?.history.length || 0) > 0 && <Btn size="sm" variant="ghost" onClick={() => setHistory(h)}>Lịch sử phân công</Btn>}
              {h && <Btn size="sm" variant="ghost" onClick={() => onOpenHorse(h.id)}>Xem hồ sơ ngựa</Btn>}
            </div>
          </Card>
        );
      })}

      {done.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold text-[#0f1729]">Đã xử lý</h3>
          <Card className="divide-y divide-gray-100">
            {done.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <div className="flex-1"><b>{r.horseName}</b> <span className="text-gray-500">· Chủ: {r.ownerName} · {r.submittedAt}</span>{r.reviewNote && <div className="text-xs italic text-gray-400">Lý do: {r.reviewNote}</div>}</div>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${r.status === 'approved' ? 'border-emerald-200 bg-emerald-100 text-emerald-800' : 'border-red-200 bg-red-100 text-red-700'}`}>{r.status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}</span>
              </div>
            ))}
          </Card>
        </div>
      )}

      {pick && (
        <Modal title={pick.horse.vetId ? 'Thay / phân công lại thú y' : 'Phân công thú y'} onClose={() => setPick(null)}>
          <p className="mb-3 text-sm text-gray-600">Ngựa: <b>{pick.horse.name}</b>{pick.horse.vetName && <> · hiện giao cho <b>{pick.horse.vetName}</b></>}</p>
          <Select label="Bác sĩ thú y" value={pick.vetId} error={pickErr} onChange={v => { setPick({ ...pick, vetId: v }); setPickErr(''); }} options={[{ value: '', label: '— Chọn bác sĩ —' }, ...vets.map(v => ({ value: v.id, label: v.name }))]} />
          <div className="mt-5 flex justify-end gap-2"><Btn variant="secondary" onClick={() => setPick(null)}>Hủy</Btn><Btn onClick={choose}>{pick.horse.vetId && pick.horse.vetAssign?.status !== 'declined' ? 'Tiếp tục' : 'Phân công'}</Btn></div>
        </Modal>
      )}
      {replace && (
        <ReasonDialog title="Lý do thay người" confirmLabel="Xác nhận thay" onClose={() => setReplace(null)}
          description={<p>Thay <b>{replace.horse.vetName}</b> bằng <b>{vets.find(v => v.id === replace.vetId)?.name}</b> cho ngựa <b>{replace.horse.name}</b>. Lịch sử người cũ → người mới được lưu lại.</p>}
          onConfirm={reason => { onAssign(replace.horse.id, replace.vetId, reason); setReplace(null); }} />
      )}
      {rejectFor && (
        <ReasonDialog title="Từ chối nhận ngựa" danger confirmLabel="Từ chối" onClose={() => setRejectFor(null)}
          description={<p>Từ chối nhận ngựa <b>{rejectFor.horseName}</b> của chủ ngựa <b>{rejectFor.ownerName}</b>. Lý do sẽ được gửi cho chủ ngựa.</p>}
          onConfirm={reason => { onReject(rejectFor.id, reason); setRejectFor(null); }} />
      )}
      {approveFor && (
        <Modal title="Xác nhận duyệt nhận vào CLB" onClose={() => setApproveFor(null)}>
          <p className="text-sm text-gray-600">Bạn có chắc muốn nhận ngựa <b>{approveFor.horseName}</b> vào câu lạc bộ? Ngựa sẽ xuất hiện ngay trong Danh sách ngựa và hồ sơ được khóa các trường cơ bản.</p>
          <div className="mt-5 flex justify-end gap-2"><Btn variant="secondary" onClick={() => setApproveFor(null)}>Hủy</Btn><Btn variant="gold" onClick={() => { onApprove(approveFor.id); setApproveFor(null); }}>Duyệt</Btn></div>
        </Modal>
      )}
      {history && <AssignHistory horse={history} onClose={() => setHistory(null)} />}
    </div>
  );
}

export function VetAssignedPage({ user, horses, requests, onRespond, onExam, onOpenHorse }: {
  user: AppUser; horses: Horse[]; requests: HorseClubRequest[];
  onRespond: (horseId: string, accept: boolean, reason: string) => void; onExam: (horseId: string) => void; onOpenHorse: (id: string) => void;
}) {
  const mine = horses.filter(h => h.vetId === user.id && h.vetAssign);
  const [respond, setRespond] = useState<{ horse: Horse; accept: boolean } | null>(null);
  const [history, setHistory] = useState<Horse | null>(null);
  const reqOf = (h: Horse) => requests.find(r => r.horseId === h.id);
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-xl font-bold text-[#0f1729]">Ngựa được giao khám</h2>
        <p className="text-sm text-gray-500">Chỉ hiển thị ngựa Quản lý đã giao cho bạn. Chấp nhận hoặc từ chối (kèm lý do) trước khi khám.</p>
      </div>
      {mine.length === 0 && <Card className="p-12 text-center"><div className="mb-2 text-4xl">🩺</div><div className="font-semibold text-gray-600">Bạn chưa được giao ngựa nào</div></Card>}
      {mine.map(h => {
        const rq = reqOf(h);
        const st = rq ? intakeStage(h, rq) : 5;
        const status = h.vetAssign!.status;
        return (
          <Card key={h.id} className="p-5">
            <div className="flex flex-wrap items-center gap-4">
              <img src={h.imageUrl} alt={h.name} className="h-14 w-14 rounded-xl bg-gray-200 object-cover" />
              <div className="flex-1">
                <div className="flex items-center gap-2"><span className="font-serif text-lg font-bold">{h.name}</span><IdChip kind="HRS" id={h.id} /></div>
                <div className="text-sm text-gray-500">{h.breed} · {h.age} tuổi · {h.gender} · Chủ ngựa: {h.ownerName}</div>
                <div className="mt-1 text-xs"><span className={`rounded-full border px-2 py-0.5 font-medium ${status === 'pending' ? 'border-sky-200 bg-sky-50 text-sky-700' : status === 'accepted' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{VET_STATUS[status]}</span></div>
              </div>
              <div className="flex flex-wrap gap-2">
                {status === 'pending' && <><Btn size="sm" onClick={() => setRespond({ horse: h, accept: true })}>Chấp nhận</Btn><Btn size="sm" variant="danger" onClick={() => setRespond({ horse: h, accept: false })}>Từ chối</Btn></>}
                {status === 'accepted' && st === 3 && <Btn size="sm" variant="gold" onClick={() => onExam(h.id)}>Khám ngay</Btn>}
                <Btn size="sm" variant="ghost" onClick={() => onOpenHorse(h.id)}>Hồ sơ</Btn>
                <Btn size="sm" variant="ghost" onClick={() => setHistory(h)}>Lịch sử</Btn>
              </div>
            </div>
            {rq && rq.status === 'pending' && <div className="mt-4"><IntakeProgress stage={st} compact /></div>}
          </Card>
        );
      })}
      {respond && (
        <ReasonDialog title={respond.accept ? 'Chấp nhận khám' : 'Từ chối khám'} danger={!respond.accept} confirmLabel={respond.accept ? 'Chấp nhận' : 'Từ chối'} onClose={() => setRespond(null)}
          description={<p>{respond.accept ? 'Bạn sẽ chịu trách nhiệm khám tiếp nhận cho ngựa' : 'Quản lý sẽ phải phân công bác sĩ khác. Bạn từ chối khám ngựa'} <b>{respond.horse.name}</b>.</p>}
          onConfirm={reason => { onRespond(respond.horse.id, respond.accept, reason); setRespond(null); }} />
      )}
      {history && <AssignHistory horse={history} onClose={() => setHistory(null)} />}
    </div>
  );
}
