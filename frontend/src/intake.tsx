import { useState } from 'react';
import type { AppUser, Horse, HorseClubRequest, HealthRecord } from './data';
import { Btn, Card, Select } from './ui';
import { IdChip, ReasonDialog, Modal } from './admin';

export const INTAKE_STEPS = ['Profile created', 'Club assigns veterinarian', 'Veterinarian accepts case', 'Examination & decision', 'Club admission decision'];

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
    <ol className="flex items-start" aria-label="Horse intake progress">
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
            {!compact && <span className={`mt-1.5 px-1 text-[11px] leading-tight ${cur ? 'font-semibold text-[#0f1729]' : fail ? 'font-semibold text-red-600' : 'text-gray-500'}`}>{fail ? 'Rejected' : label}</span>}
          </li>
        );
      })}
    </ol>
  );
}

export function IdentityBadge({ verified }: { verified?: boolean }) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${verified ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{verified ? '✓ Verified' : 'Not verified'}</span>;
}

const VET_STATUS: Record<string, string> = { pending: 'Awaiting veterinarian', accepted: 'Accepted', declined: 'Veterinarian declined' };

export function AssignHistory({ horse, onClose }: { horse: Horse; onClose: () => void }) {
  return (
    <Modal title={`Assignment history — ${horse.name}`} onClose={onClose} wide>
      <div className="space-y-2">
        {(horse.vetAssign?.history || []).map((e, i) => (
          <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
            <div className="text-xs text-gray-400">{e.time}</div>
            <div>{e.from && e.from !== e.to ? <><b>{e.from}</b> → <b>{e.to}</b></> : e.from ? <b>{e.to}</b> : <>Assigned <b>{e.to}</b></>} <span className="text-gray-500">· by {e.by}</span></div>
            <div className="text-xs italic text-gray-500">Reason: {e.reason}</div>
          </div>
        ))}
        {!(horse.vetAssign?.history || []).length && <p className="py-6 text-center text-sm text-gray-400">No assignment history.</p>}
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
    if (!pick.vetId) { setPickErr('Please select a veterinarian.'); return; }
    if (pick.horse.vetId && pick.vetId === pick.horse.vetId && pick.horse.vetAssign?.status !== 'declined') { setPickErr('This veterinarian is already assigned to the horse.'); return; }
    if (pick.horse.vetId && pick.horse.vetAssign?.status !== 'declined') { setReplace(pick); setPick(null); setPickErr(''); return; }
    onAssign(pick.horse.id, pick.vetId, pick.horse.vetId ? 'Reassigned after the previous veterinarian declined' : 'Assigned for intake examination');
    setPick(null); setPickErr('');
  };

  const tryApprove = (r: HorseClubRequest, h?: Horse) => {
    if (!h?.identityVerified) { setWarn(w => ({ ...w, [r.id]: 'Verify the Identification Code before making an admission decision.' })); return; }
    setWarn(w => ({ ...w, [r.id]: '' })); setApproveFor(r);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-xl font-bold text-[#0f1729]">Horse intake</h2>
        <p className="text-sm text-gray-500">Profile creation → veterinarian assignment → examination → Club admission decision.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {[[0, 'All', open.length], [1, 'Needs assignment', count(1)], [2, 'Awaiting veterinarian', count(2)], [3, 'Awaiting examination', count(3)], [4, 'Awaiting my decision', count(4)]].map(([k, l, n]) => (
          <button key={k as number} onClick={() => setFilter(k as number)} className={`rounded-full border px-3 py-1 text-xs font-medium ${filter === k ? 'border-[#1a2844] bg-[#1a2844] text-white' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}>{l} ({n})</button>
        ))}
      </div>

      {shown.length === 0 && <Card className="p-12 text-center"><div className="mb-2 text-4xl">🐎</div><div className="font-semibold text-gray-600">No records in this section</div><div className="text-sm text-gray-400">New Horse Owner submissions will appear here.</div></Card>}

      {shown.map(({ r, h, st }) => {
        const exam = h?.intakeExamId ? records.find(x => x.id === h.intakeExamId) : undefined;
        const declined = h?.vetAssign?.status === 'declined';
        return (
          <Card key={r.id} className="p-5">
            <div className="flex flex-wrap items-start gap-4">
              {h?.imageUrl ? <img src={h.imageUrl || undefined} alt={h.name} className="h-16 w-16 rounded-xl bg-gray-200 object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-100 text-2xl">🐎</div>}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><button onClick={() => h && onOpenHorse(h.id)} className="font-serif text-lg font-bold text-[#0f1729] hover:text-[#c9973b]">{r.horseName}</button>{h && <IdChip kind="HRS" id={h.id} />}<IdentityBadge verified={h?.identityVerified} /></div>
                <div className="text-sm text-gray-500">{r.horseBreed} · {h?.age} years old · {h?.gender} · Horse Owner: <b className="text-gray-700">{r.ownerName}</b> · Submitted {r.submittedAt}</div>
                <div className="mt-0.5 text-xs text-gray-400">Identification Code: {h?.microchip || 'Not provided'}</div>
              </div>
            </div>
            <div className="mt-5"><IntakeProgress stage={st} /></div>

            <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm">
              {st === 1 && <span>{declined ? <>Veterinarian <b>{h?.vetName}</b> declined — assign another veterinarian.</> : 'No veterinarian has been assigned.'}</span>}
              {st === 2 && <span>Assigned to <b>{h?.vetName}</b> — awaiting acceptance.</span>}
              {st === 3 && <span><b>{h?.vetName}</b> accepted — awaiting examination and decision.</span>}
              {st === 4 && exam && (
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2"><IdChip kind="MED" id={exam.id} /><span className="text-xs text-gray-500">Examined {exam.date} · {exam.vet}</span><span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${exam.decision === 'eligible' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : exam.decision === 'conditional' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{exam.decision === 'eligible' ? 'Eligible for training' : exam.decision === 'conditional' ? 'Eligible, but needs monitoring' : 'Not eligible — training locked'}</span></div>
                  <p className="text-gray-700">“{exam.conclusion || exam.diagnosis}”</p>
                </div>
              )}
            </div>
            {warn[r.id] && <p className="mt-2 text-xs text-red-600">{warn[r.id]}</p>}

            <div className="mt-4 flex flex-wrap gap-2">
              {h && !h.identityVerified && <Btn size="sm" variant="secondary" onClick={() => onVerify(h.id, true)}>Verify identification</Btn>}
              {h && st === 1 && <Btn size="sm" onClick={() => { setPickErr(''); setPick({ horse: h, vetId: '' }); }}>Assign veterinarian</Btn>}
              {h && (st === 2 || st === 3) && <Btn size="sm" variant="secondary" onClick={() => { setPickErr(''); setPick({ horse: h, vetId: '' }); }}>Reassign</Btn>}
              {st === 4 && <><Btn size="sm" variant="gold" onClick={() => tryApprove(r, h)}>Admit to club</Btn><Btn size="sm" variant="danger" onClick={() => setRejectFor(r)}>Reject</Btn></>}
              {h && (h.vetAssign?.history.length || 0) > 0 && <Btn size="sm" variant="ghost" onClick={() => setHistory(h)}>Assignment history</Btn>}
              {h && <Btn size="sm" variant="ghost" onClick={() => onOpenHorse(h.id)}>View horse profile</Btn>}
            </div>
          </Card>
        );
      })}

      {done.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold text-[#0f1729]">Processed</h3>
          <Card className="divide-y divide-gray-100">
            {done.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <div className="flex-1"><b>{r.horseName}</b> <span className="text-gray-500">· Owner: {r.ownerName} · {r.submittedAt}</span>{r.reviewNote && <div className="text-xs italic text-gray-400">Reason: {r.reviewNote}</div>}</div>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${r.status === 'approved' ? 'border-emerald-200 bg-emerald-100 text-emerald-800' : 'border-red-200 bg-red-100 text-red-700'}`}>{r.status === 'approved' ? 'Admitted' : 'Rejected'}</span>
              </div>
            ))}
          </Card>
        </div>
      )}

      {pick && (
        <Modal title={pick.horse.vetId ? 'Reassign veterinarian' : 'Assign veterinarian'} onClose={() => setPick(null)}>
          <p className="mb-3 text-sm text-gray-600">Horse: <b>{pick.horse.name}</b>{pick.horse.vetName && <> · currently assigned to <b>{pick.horse.vetName}</b></>}</p>
          <Select label="Veterinarian" value={pick.vetId} error={pickErr} onChange={v => { setPick({ ...pick, vetId: v }); setPickErr(''); }} options={[{ value: '', label: '— Select a veterinarian —' }, ...vets.map(v => ({ value: v.id, label: v.name }))]} />
          <div className="mt-5 flex justify-end gap-2"><Btn variant="secondary" onClick={() => setPick(null)}>Cancel</Btn><Btn onClick={choose}>{pick.horse.vetId && pick.horse.vetAssign?.status !== 'declined' ? 'Continue' : 'Assign'}</Btn></div>
        </Modal>
      )}
      {replace && (
        <ReasonDialog title="Reassignment reason" confirmLabel="Confirm reassignment" onClose={() => setReplace(null)}
          description={<p>Replace <b>{replace.horse.vetName}</b> with <b>{vets.find(v => v.id === replace.vetId)?.name}</b> for <b>{replace.horse.name}</b>. The assignment history will be retained.</p>}
          onConfirm={reason => { onAssign(replace.horse.id, replace.vetId, reason); setReplace(null); }} />
      )}
      {rejectFor && (
        <ReasonDialog title="Reject horse admission" danger confirmLabel="Reject" onClose={() => setRejectFor(null)}
          description={<p>Reject <b>{rejectFor.horseName}</b>, owned by <b>{rejectFor.ownerName}</b>. The reason will be sent to the Horse Owner.</p>}
          onConfirm={reason => { onReject(rejectFor.id, reason); setRejectFor(null); }} />
      )}
      {approveFor && (
        <Modal title="Confirm club admission" onClose={() => setApproveFor(null)}>
          <p className="text-sm text-gray-600">Admit <b>{approveFor.horseName}</b> to the club? The horse will appear in the Horse List and its core profile fields will be locked.</p>
          <div className="mt-5 flex justify-end gap-2"><Btn variant="secondary" onClick={() => setApproveFor(null)}>Cancel</Btn><Btn variant="gold" onClick={() => { onApprove(approveFor.id); setApproveFor(null); }}>Admit</Btn></div>
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
        <h2 className="font-serif text-xl font-bold text-[#0f1729]">Assigned horses</h2>
        <p className="text-sm text-gray-500">Horses assigned to you by the Club Manager. Accept or decline each case before examination.</p>
      </div>
      {mine.length === 0 && <Card className="p-12 text-center"><div className="mb-2 text-4xl">🩺</div><div className="font-semibold text-gray-600">No horses are assigned to you</div></Card>}
      {mine.map(h => {
        const rq = reqOf(h);
        const st = rq ? intakeStage(h, rq) : 5;
        const status = h.vetAssign!.status;
        return (
          <Card key={h.id} className="p-5">
            <div className="flex flex-wrap items-center gap-4">
              {h.imageUrl ? <img src={h.imageUrl || undefined} alt={h.name} className="h-14 w-14 rounded-xl bg-gray-200 object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-xl">🐎</div>}
              <div className="flex-1">
                <div className="flex items-center gap-2"><span className="font-serif text-lg font-bold">{h.name}</span><IdChip kind="HRS" id={h.id} /></div>
                <div className="text-sm text-gray-500">{h.breed} · {h.age} years old · {h.gender} · Horse Owner: {h.ownerName}</div>
                <div className="mt-1 text-xs"><span className={`rounded-full border px-2 py-0.5 font-medium ${status === 'pending' ? 'border-sky-200 bg-sky-50 text-sky-700' : status === 'accepted' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{VET_STATUS[status]}</span></div>
              </div>
              <div className="flex flex-wrap gap-2">
                {status === 'pending' && <><Btn size="sm" onClick={() => setRespond({ horse: h, accept: true })}>Accept</Btn><Btn size="sm" variant="danger" onClick={() => setRespond({ horse: h, accept: false })}>Decline</Btn></>}
                {status === 'accepted' && st === 3 && <Btn size="sm" variant="gold" onClick={() => onExam(h.id)}>Examine now</Btn>}
                <Btn size="sm" variant="ghost" onClick={() => onOpenHorse(h.id)}>Profile</Btn>
                <Btn size="sm" variant="ghost" onClick={() => setHistory(h)}>History</Btn>
              </div>
            </div>
            {rq && rq.status === 'pending' && <div className="mt-4"><IntakeProgress stage={st} compact /></div>}
          </Card>
        );
      })}
      {respond && (
        <ReasonDialog title={respond.accept ? 'Accept examination' : 'Decline examination'} danger={!respond.accept} confirmLabel={respond.accept ? 'Accept' : 'Decline'} onClose={() => setRespond(null)}
          description={<p>{respond.accept ? 'You will be responsible for the intake examination of' : 'The Club Manager must assign another veterinarian. You are declining'} <b>{respond.horse.name}</b>.</p>}
          onConfirm={reason => { onRespond(respond.horse.id, respond.accept, reason); setRespond(null); }} />
      )}
      {history && <AssignHistory horse={history} onClose={() => setHistory(null)} />}
    </div>
  );
}
