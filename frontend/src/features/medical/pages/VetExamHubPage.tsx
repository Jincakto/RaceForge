import { type AppState, type Page } from "../../../app/appTypes";
import { type HealthRecord, getLifecycle, type Horse } from "../../../shared/data/data";
import { useState } from "react";
import { VetHealthFormPage } from "./vetForm";
import { TODAY } from "../../../shared/data/today";
import { Card, Btn, Select, Textarea } from "../../../shared/ui/ui";
import { vetVisible } from "../../horses/intake";
import { LifecycleBadge } from "../../horses/components/HorseProfileWidgets";
import { IdChip } from "../../admin/admin";

export type ExamView = "new" | "locked" | "pending" | "awaiting" | "manual";

export function VetExamHubPage({
  state,
  navigate,
  onSave,
  onSaveRecord,
  onPostExam,
  onUnlockExam,
  onManualLock,
  unlockHorseId,
  onUnlock,
  onExamHorse,
  onConsumeExamHorse,
  canExam,
  canPost,
  initialView,
}: {
  state: AppState;
  navigate: (p: Page) => void;
  onSave: (msg: string) => void;
  onSaveRecord: (rec: HealthRecord) => Promise<HealthRecord>;
  unlockHorseId?: string;
  onUnlock: (horseId: string, reason: string) => Promise<string | null>;
  onExamHorse: (horseId: string) => void;
  onConsumeExamHorse: () => void;
  canExam: boolean;
  canPost: boolean;
  initialView: ExamView;
  onPostExam: (
    sessionId: string,
    rec: HealthRecord,
  ) => string | null | Promise<string | null>;
  onUnlockExam: (horseId: string) => void;
  onManualLock: (horseId: string, reason: string) => string | null;
}) {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ExamView>(
    initialView === "new" && canExam ? "new" : canPost ? "locked" : "new",
  );
  const [formKey, setFormKey] = useState(0);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [unlockErrors, setUnlockErrors] = useState<Record<string, string>>({});
  const user = state.user!;
  const allHorses = state.horses.filter(h => h.clubId === state.user!.clubId);
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const query = normalize(search.trim());
  const horses = allHorses.filter(h => normalize(`${h.name} ${h.id}`).includes(query));
  const totals = {
    locked: allHorses.filter(h => h.lock).length,
    pending: state.trainingSessions.filter(s => s.status === 'Completed' && !s.postExamDone && allHorses.some(h => h.id === s.horseId)).length,
    awaiting: allHorses.filter(h => getLifecycle(h) === 'awaiting_vet' && h.approvalStatus === 'approved').length,
    manual: allHorses.filter(h => !h.lock && getLifecycle(h) === 'training').length,
  };
  const awaiting = horses.filter(
    (h) =>
      getLifecycle(h) === "awaiting_vet" && h.approvalStatus === "approved",
  );
  const pending = state.trainingSessions.filter(
    (s) =>
      s.status === "Completed" &&
      !s.postExamDone &&
      horses.some((h) => h.id === s.horseId),
  );
  const locked = horses.filter((h) => h.lock);

  const [activeId, setActiveId] = useState<string | null>(null);
  const lockable = horses.filter(
    (h) => !h.lock && getLifecycle(h) === "training",
  );
  const [manualHorseId, setManualHorseId] = useState(lockable[0]?.id || "");
  const [manualReason, setManualReason] = useState("");
  const [manualError, setManualError] = useState("");
  const activeSession = state.trainingSessions.find((x) => x.id === activeId);

  // Opening a horse from a list pre-selects it in the examination form.
  const examine = (horseId: string) => {
    onExamHorse(horseId);
    setFormKey((k) => k + 1);
    setView("new");
  };
  const startUnlockExam = (horseId: string) => {
    onUnlockExam(horseId);
    setFormKey((k) => k + 1);
    setView("new");
  };
  // Same release as the button on the examination result screen, for a horse already examined and found fit.
  const releaseLock = async (h: Horse) => {
    if (releasingId) return;
    setReleasingId(h.id);
    setUnlockErrors((e) => ({ ...e, [h.id]: "" }));
    const latest = state.healthRecords
      .filter((r) => r.horseId === h.id && r.status === "confirmed")
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0];
    const reason = `${latest ? `Follow-up examination ${latest.id}: confirmed` : "Follow-up examination confirmed"} fit for training; lock released from the Training locks list.`;
    try {
      const err = await onUnlock(h.id, reason);
      if (err) setUnlockErrors((e) => ({ ...e, [h.id]: err }));
      else {
        onSave("Training lock released after a successful examination.");
        // A fresh form, so a stale "record saved / release the lock" screen does not linger.
        setFormKey((k) => k + 1);
      }
    } catch (e) {
      setUnlockErrors((m) => ({ ...m, [h.id]: (e as Error).message }));
    } finally {
      setReleasingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {activeSession && (
        <VetHealthFormPage
          key={activeSession.id}
          state={state}
          navigate={navigate}
          onSave={onSave}
          onSaveRecord={async (rec) => rec}
          today={TODAY}
          postSession={activeSession}
          onPostSubmit={onPostExam}
          onBack={() => setActiveId(null)}
        />
      )}
      {/* Hidden (not unmounted) while a post-training form is open, so in-progress data is kept. */}
      <div className={activeSession ? "hidden" : "space-y-6"}>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5" role="group" aria-label="Examination sections">
        {([
          ['new', 'New examination', 'Record a health examination', '📝'],
          ['locked', 'Training locks', 'Horses paused for recovery', '🔒'],
          ['pending', 'Post-training exams', 'Completed sessions to review', '🩺'],
          ['awaiting', 'Pre-training exams', 'Horses awaiting clearance', '🐎'],
          ['manual', 'Apply a lock', 'Stop training for examination', '＋'],
        ] as const).filter(([key]) => (key === 'new' ? canExam : canPost)).map(([key, title, subtitle, icon]) => (
          <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)} className={`rounded-2xl border p-4 text-left transition ${view === key ? 'border-[#1a2844] bg-[#1a2844] text-white shadow-md' : 'border-gray-200 bg-white text-[#1a2844] hover:border-[#c9973b]'}`}>
            <div className="flex items-center justify-between"><span className="text-xl">{icon}</span><span className="text-2xl font-bold">{key === 'new' ? '＋' : totals[key]}</span></div>
            <div className="mt-3 text-sm font-semibold">{title}</div><div className={`mt-1 text-xs ${view === key ? 'text-slate-300' : 'text-gray-500'}`}>{subtitle}</div>
          </button>
        ))}
      </div>
      {view !== "new" && (
      <Card className="!rounded-2xl !border-slate-200 !shadow-sm p-4 sm:p-5">
        <label htmlFor="post-exam-search" className="mb-2 block text-sm font-medium text-[#1a2844]">Find a horse</label>
        <div className="flex items-center gap-3">
          <input id="post-exam-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by horse name or ID (HOR-001)..." className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#c9973b] focus:ring-2 focus:ring-[#c9973b]/20" />
          {search && <Btn variant="ghost" onClick={() => setSearch('')}>Clear</Btn>}
        </div>
        <p role="status" className="mt-2 text-xs text-gray-500">{search ? `${horses.length} of ${allHorses.length} horses match your search` : 'Type a name or ID to filter the current list instantly.'}</p>
      </Card>
      )}

      {canExam && (
        <div className={view === "new" ? "" : "hidden"}>
          <VetHealthFormPage
            key={formKey}
            unlockHorseId={unlockHorseId}
            onUnlock={onUnlock}
            state={state}
            navigate={navigate}
            onSave={onSave}
            onSaveRecord={onSaveRecord}
            today={TODAY}
            onConsumeExamHorse={onConsumeExamHorse}
          />
        </div>
      )}
      {view === "awaiting" && <section className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          🩺 Awaiting pre-training examination{" "}
          <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">
            {awaiting.length}
          </span>
        </h3>
        {awaiting.length === 0 && (
          <Card className="p-5 text-sm text-gray-400 text-center">
            {search ? "No horses awaiting examination match your search." : "No horses are awaiting examination."}
          </Card>
        )}
        {awaiting.map((h) => {
          const mine = vetVisible(h, user);
          return (
          <Card key={h.id} className="p-4 flex items-center gap-3">
            <img
              src={h.imageUrl || undefined}
              className="w-12 h-12 rounded-lg object-cover bg-gray-200"
            />
            <div className="flex-1">
              <div className="font-semibold">{h.name}</div><div className="mt-0.5 font-mono text-xs text-gray-500">{h.id}</div>
              <div className="text-xs text-gray-500">
                Owner: {h.ownerName} · {h.breed} · {h.age} years old
              </div>
            </div>
            <LifecycleBadge horse={h} />
            {mine ? (
              <Btn
                variant="gold"
                size="sm"
                disabled={!canExam}
                onClick={() => examine(h.id)}
              >
                Examine and record →
              </Btn>
            ) : (
              <span className="max-w-[9rem] text-right text-xs text-gray-400">
                Assigned to another veterinarian
              </span>
            )}
          </Card>
          );
        })}
        <p className="text-xs text-gray-400">
          A "Fit for training" examination result marks the horse as medically
          ready and notifies the owner.
        </p>
      </section>}

      {view === "pending" && <section className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          🏇 Sessions awaiting re-examination{" "}
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            {pending.length}
          </span>
        </h3>
        {pending.length === 0 && (
          <Card className="p-5 text-sm text-gray-400 text-center">
            {search ? "No sessions match this horse name or ID." : "No completed sessions require examination."}
          </Card>
        )}
        {pending.map((s) => {
          const h = state.horses.find((x) => x.id === s.horseId)!;
          return (
            <Card key={s.id} className="p-4 flex items-center gap-3">
              <img
                src={h.imageUrl || undefined}
                className="w-11 h-11 rounded-lg object-cover bg-gray-200"
              />
              <div className="flex-1">
                <div className="font-semibold">
                  {h.name} · {s.type} {s.distance}
                </div>
                <div className="text-xs text-gray-500">
                  {s.date} · {s.time} · Trainer: {s.trainerName}
                </div>
              </div>
              <Btn variant="gold" size="sm" onClick={() => setActiveId(s.id)}>
                Detailed post-training examination →
              </Btn>
            </Card>
          );
        })}
        <p className="text-xs text-gray-400">
          Post-training examinations use the periodic examination form and
          standards (vitals, clinical findings and automated assessment). A "Not
          fit" result automatically applies a TRAINING LOCK.
        </p>
      </section>}

      {view === "manual" && <section className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          Manual training lock
        </h3>
        <Card className="p-5 border-l-4 border-orange-400">
          <p className="text-sm text-gray-600 mb-4">
            Use when a veterinarian needs to stop training immediately even
            without a severe automatic assessment.
          </p>
          {lockable.length === 0 ? (
            <p className="text-sm text-gray-400">
              No training horses are available to lock.
            </p>
          ) : (
            <div className="space-y-3">
              <Select
                label="Horses requiring a lock"
                value={lockable.some(h => h.id === manualHorseId) ? manualHorseId : lockable[0]?.id || ""}
                onChange={setManualHorseId}
                options={lockable.map((h) => ({ value: h.id, label: `${h.name} (${h.id})` }))}
              />
              <Textarea
                label="Veterinary reason / instructions"
                value={manualReason}
                onChange={setManualReason}
                rows={2}
                placeholder="e.g. Lameness worsens after exercise; stop training for diagnostic imaging"
              />
              {manualError && (
                <div className="text-sm text-red-600">{manualError}</div>
              )}
              <Btn
                variant="danger"
                onClick={() => {
                  const err = onManualLock(lockable.some(h => h.id === manualHorseId) ? manualHorseId : lockable[0]?.id || "", manualReason);
                  setManualError(err || "");
                  if (!err) setManualReason("");
                }}
              >
                Apply manual training lock
              </Btn>
            </div>
          )}
        </Card>
      </section>}

      {view === "locked" && <section className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          Horses with paused training{" "}
          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
            {locked.length}
          </span>
        </h3>
        {locked.length === 0 && (
          <Card className="p-5 text-sm text-gray-400 text-center">
            {search ? "No locked horses match this name or ID." : "No horses are currently under a training lock."}
          </Card>
        )}
        <div className="grid gap-4 xl:grid-cols-2">
        {locked.map((h) => (
          <Card key={h.id} className="overflow-hidden !rounded-2xl !border-slate-200 !shadow-sm">
            <div className="flex items-start gap-3 border-b border-slate-100 p-5">
              {h.imageUrl ? <img src={h.imageUrl} alt={h.name} className="h-14 w-14 shrink-0 rounded-xl bg-slate-100 object-cover"/> : <div aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">🐎</div>}
              <div className="min-w-0 flex-1"><h4 className="truncate text-lg font-semibold text-[#1a2844]">{h.name}</h4><div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500"><IdChip kind="HRS" id={h.id}/>{h.ownerName && <span>{h.ownerName}</span>}</div></div>
              <span className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">Training paused</span>
            </div>
            <div className="space-y-4 p-5">
              <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Reason for training lock</p><p className="mt-1.5 text-sm leading-6 text-slate-700">{h.lock!.reason}</p>{h.lock!.notes && <p className="mt-1 text-sm leading-6 text-slate-500">{h.lock!.notes}</p>}{(h.lock!.lockedAt || h.lock!.lockedByName) && <p className="mt-2 text-xs text-slate-400">{[h.lock!.lockedAt,h.lock!.lockedByName].filter(Boolean).join(' · ')}</p>}</div>
              <div className="rounded-xl bg-slate-50 p-3.5"><p className="text-xs font-semibold text-slate-500">Training status</p><p className="mt-1 text-sm text-[#1a2844]">Paused until veterinary clearance and trainer acceptance</p></div>
            </div>
            <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
              {unlockErrors[h.id] && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{unlockErrors[h.id]}</p>}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {h.healthStatus === "Eligible" ? (
                  <>
                    <p className="max-w-xs text-xs leading-5 text-emerald-700">The follow-up examination found this horse fit. Release the lock to notify the assigned trainer. The package stays paused until the trainer accepts.</p>
                    <Btn variant="gold" className="w-full shrink-0 !rounded-xl !border-emerald-600 !bg-emerald-600 !px-4 !py-2.5 !text-white hover:!bg-emerald-700 sm:w-auto" disabled={releasingId === h.id} onClick={() => releaseLock(h)}>{releasingId === h.id ? "Releasing lock..." : "Release training lock"}</Btn>
                  </>
                ) : (
                  <>
                    <p className="max-w-xs text-xs leading-5 text-slate-500">A follow-up examination is required before this horse can be cleared for training.</p>
                    <Btn variant="primary" className="w-full shrink-0 !rounded-xl !px-4 !py-2.5 sm:w-auto" onClick={()=>startUnlockExam(h.id)}>Start follow-up exam →</Btn>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
        </div>
      </section>}
      </div>
    </div>
  );
}
