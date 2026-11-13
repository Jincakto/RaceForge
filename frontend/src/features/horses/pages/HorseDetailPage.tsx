import { type AppState, type Page } from "../../../app/appTypes";
import { type Horse, type RaceHistoryEntry, LIFECYCLE_ORDER, getLifecycle } from "../../../shared/data/data";
import { useState, useRef } from "react";
import { intakeStage, IntakeProgress, IdentityBadge } from "../intake";
import { numOf, toDDMMYYYY, toISO } from "./HorseCarePages";
import { logChange, TrainerHistoryTab, PhotosTab } from "../horseExtras";
import { type RaceImportRow, parseRaceRows, readRows, SAMPLE_CSV } from "../raceImport";
import { TODAY } from "../../../shared/data/today";
import { sortHealthRecords, parseDDMMYYYY } from "../../medical/components/TrainingEligibilityCard";
import { LifecycleBadge, LifecycleStepper, PedigreeBlock } from "../components/HorseProfileWidgets";
import { Badge, Btn, Card, Input, Select, Textarea } from "../../../shared/ui/ui";
import { IdChip, GENDER_LABEL } from "../../admin/admin";
import { PackageRoadmapPreview } from "../../training/roadmapView";

export function HorseDetailPage({
  onUnlockExam,
  state,
  navigate,
  onUpdateHorse,
  onActivateHorse,
  onShowSuccess,
  onAudit,
  intakeActions,
}: {
  onUnlockExam: (horseId: string) => void;
  state: AppState;
  navigate: (p: Page) => void;
  onUpdateHorse: (h: Horse) => Promise<unknown>;
  onActivateHorse: (id: string) => Promise<unknown>;
  onShowSuccess: (m: string) => void;
  onAudit: (a: string, t: string, r?: string) => void;
  intakeActions?: React.ReactNode;
}) {
  const user = state.user!;
  const horse =
    state.horses.find((h) => h.id === state.selectedHorseId) || state.horses[0];
  const [activating, setActivating] = useState(false);
  const activationFlight = useRef(false);
  const [activationError, setActivationError] = useState("");
  const [tab, setTab] = useState("overview");
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: horse.name,
    height: String(horse.height),
    stable: horse.stable,
    stall: horse.stall,
    microchip: horse.microchip || "",
    evidenceUrl: horse.identityEvidence?.url || "",
    evidenceFileUrl: horse.identityEvidence?.fileUrl || "",
    evidenceNote: horse.identityEvidence?.note || "",
  });
  const [newAch, setNewAch] = useState({
    title: "",
    date: "",
    description: "",
    prize: "",
    position: "1",
    doc: "",
  });
  const [showAchForm, setShowAchForm] = useState(false);
  const isOwner = user.role === "owner" && horse.ownerId === user.id;
  const intakeRequest = state.horseClubRequests.find(
    (r) => r.horseId === horse.id && r.status === "pending",
  );
  const ownerCanEdit =
    isOwner &&
    horse.approvalStatus !== "approved" &&
    (!intakeRequest || intakeStage(horse, intakeRequest) < 3);

  const [editErr, setEditErr] = useState<Record<string, string>>({});
  const saveEdit = async () => {
    const e: Record<string, string> = {};
    const hh = numOf(editForm.height);
    if (editForm.name.trim().length < 2 || editForm.name.length > 40)
      e.name = "Horse name must contain 2–40 characters.";
    if (isNaN(hh) || hh < 100 || hh > 200)
      e.height = "Height must be between 100 and 200 cm.";
    if (!editForm.microchip)
      e.microchip = "Enter the horse identification number.";
    else if (!/^[0-9]{3}[a-zA-Z0-9]{12}$/.test(editForm.microchip))
      e.microchip =
        "UELN must contain 3 digits followed by 12 letters or digits.";
    else if (
      state.horses.some(
        (x) => x.id !== horse.id && x.microchip === editForm.microchip,
      )
    )
      e.microchip = "This identification number is already registered.";
    if (
      editForm.evidenceUrl.trim() &&
      !/^https?:\/\/\S+\.\S+/.test(editForm.evidenceUrl.trim())
    )
      e.evidenceUrl = "Image URL must start with http:// or https://.";
    if (
      editForm.evidenceFileUrl.trim() &&
      !/^https?:\/\/\S+/.test(editForm.evidenceFileUrl.trim())
    )
      e.evidenceFileUrl = "File URL must begin with http:// or https://.";
    setEditErr(e);
    if (Object.keys(e).length) return;
    const diffs: string[] = [];
    if (hh !== horse.height) diffs.push(`height ${horse.height}→${hh} cm`);
    if (editForm.name !== horse.name)
      diffs.push(`name "${horse.name}"→"${editForm.name}"`);
    const next: Horse = {
      ...horse,
      name: editForm.name.trim(),
      height: hh,
      stable: editForm.stable,
      stall: editForm.stall,
      microchip: editForm.microchip,
      identityVerified:
        editForm.microchip === horse.microchip ? horse.identityVerified : false,
      identityEvidence: {
        url: editForm.evidenceUrl.trim(),
        fileUrl: editForm.evidenceFileUrl.trim(),
        note: editForm.evidenceNote.trim(),
      },
    };
    try {
      await onUpdateHorse(
        diffs.length
          ? {
              ...next,
              changeLog: logChange(
                horse,
                user.name,
                `updated ${diffs.join(", ")}`,
              ),
            }
          : next,
      );
      setEditMode(false);
    } catch (err) {
      setEditErr({ name: (err as Error).message });
    }
  };

  const [achErr, setAchErr] = useState<Record<string, string>>({});
  const [editAchId, setEditAchId] = useState<string | null>(null);
  const addAchievement = () => {
    const e: Record<string, string> = {};
    if (!newAch.title.trim()) e.title = "Enter an award name.";
    else if (newAch.title.length > 80) e.title = "Maximum 80 characters.";
    if (!newAch.date) e.date = "Select a date.";
    else if (newAch.date > "2026-09-25")
      e.date = "Award date cannot be in the future.";
    if (newAch.description.length > 300)
      e.description = "Description cannot exceed 300 characters.";
    setAchErr(e);
    if (Object.keys(e).length) return;
    const item = {
      id: editAchId || `a${Date.now()}`,
      title: newAch.title.trim(),
      date: toDDMMYYYY(newAch.date),
      description: newAch.description,
      prize: newAch.prize,
      position: Number(newAch.position),
      doc: newAch.doc || undefined,
    };
    const list = editAchId
      ? horse.achievements.map((a) => (a.id === editAchId ? item : a))
      : [...horse.achievements, item];
    void onUpdateHorse({ ...horse, achievements: list }).catch(() => {});
  };
  const [raceFormOpen, setRaceFormOpen] = useState(false);
  const [editRaceId, setEditRaceId] = useState<string | null>(null);
  const [raceF, setRaceF] = useState({
    date: "",
    raceName: "",
    distance: "1200m",
    position: "1",
    totalHorses: "10",
    time: "",
    venue: "",
    jockey: "",
    prize: "",
  });
  const [raceE, setRaceE] = useState<Record<string, string>>({});
  const [imp, setImp] = useState<RaceImportRow[] | null>(null);
  const [impErr, setImpErr] = useState("");
  const [impBusy, setImpBusy] = useState(false);
  const onPickFile = async (f?: File) => {
    if (!f) return;
    setImpErr("");
    setImp(null);
    try {
      const [bd, bm, by] = (horse.birthDate || "").split("/");
      setImp(
        parseRaceRows(await readRows(f), {
          birthIso: by ? `${by}-${bm}-${bd}` : undefined,
          todayIso: toISO(TODAY),
        }),
      );
    } catch (err) {
      setImpErr((err as Error).message);
    }
  };
  const confirmImport = async () => {
    const items = (imp || []).flatMap((r) => (r.entry ? [r.entry] : []));
    if (!items.length) return;
    setImpBusy(true);
    try {
      const list = [...items, ...horse.raceHistory];
      await onUpdateHorse({
        ...horse,
        raceHistory: list,
        totalRaces: list.length,
        wins: list.filter((r) => r.position === 1).length,
      });
      setImp(null);
    } catch (err) {
      setImpErr((err as Error).message);
    } finally {
      setImpBusy(false);
    }
  };
  const downloadSample = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([SAMPLE_CSV], { type: "text/csv" }));
    a.download = "race-history-sample.csv";
    a.click();
  };
  const saveRace = async () => {
    const e: Record<string, string> = {};
    if (!raceF.raceName.trim()) e.raceName = "Enter a race name.";
    if (!raceF.date) e.date = "Select a race date.";
    else if (raceF.date > toISO(TODAY))
      e.date = "Race date cannot be in the future.";
    const tot = Number(raceF.totalHorses);
    if (!Number.isInteger(tot) || tot < 2 || tot > 20)
      e.totalHorses = "Number of runners must be between 2 and 20.";
    else if (Number(raceF.position) > tot)
      e.position = "Position cannot exceed the number of runners.";
    if (raceF.time && !/^\d:\d{2}\.\d{2}$/.test(raceF.time))
      e.time = "Time format: 1:11.24";
    setRaceE(e);
    if (Object.keys(e).length) return;
    const item: RaceHistoryEntry = {
      id: editRaceId || `rh${Date.now()}`,
      ...raceF,
      date: toDDMMYYYY(raceF.date),
      position: Number(raceF.position),
      totalHorses: tot,
      prize: raceF.prize || "0 VND",
    };
    const list = editRaceId
      ? horse.raceHistory.map((r) => (r.id === editRaceId ? item : r))
      : [item, ...horse.raceHistory];
    try {
      await onUpdateHorse({
        ...horse,
        raceHistory: list,
        totalRaces: list.length,
        wins: list.filter((r) => r.position === 1).length,
      });
      setRaceFormOpen(false);
      setEditRaceId(null);
    } catch (err) {
      setRaceE({ raceName: (err as Error).message });
    }
  };

  const horseHealthRecords = sortHealthRecords(
    state.healthRecords.filter((r) => r.horseId === horse.id),
  );
  const latestHealth = horseHealthRecords[0];

  const isVetRole = user.role === "veterinarian";
  const horseEnrollments = state.enrollments.filter(
    (e) => e.horseId === horse.id,
  );
  const horseSessions = state.trainingSessions
    .filter((s) => s.horseId === horse.id)
    .sort((x, y) => parseDDMMYYYY(y.date) - parseDDMMYYYY(x.date));
  const isApproved = horse.approvalStatus === "approved";
  const tabs = [
    ["overview", "Basic information"],
    ["updates", "Updates"],
    ["health", "Examinations"],
    ...(isVetRole
      ? []
      : [
          ["training", "Training"],
          ["packages", "Package"],
        ]),
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button
          onClick={() => navigate("horse-list")}
          className="hover:text-[#c9973b]"
        >
          Horses
        </button>
        <span>/</span>
        <span className="text-[#0f1729] font-medium">{horse.name}</span>
      </div>
      <div className="relative rounded-xl overflow-hidden h-44">
        <img
          src={horse.imageUrl || undefined}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f1729]/80 to-transparent" />
        <div className="absolute inset-0 flex items-end p-6">
          <div className="flex items-end gap-4 flex-1">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <LifecycleBadge horse={horse} />
                <Badge status={horse.healthStatus} />
                <Badge status={horse.trainingStatus} />
                {horse.vetClearance && (
                  <span className="bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full">
                    ✓ Confirmed by veterinarian
                  </span>
                )}
              </div>
              <h2 className="text-white font-serif text-3xl font-bold">
                {horse.name}
              </h2>
              <p className="text-gray-300 text-sm flex items-center gap-2 flex-wrap">
                <IdChip
                  kind="HRS"
                  id={horse.id}
                  className="!bg-white/10 !text-white !border-white/20"
                />{" "}
                {horse.breed} · {GENDER_LABEL[horse.gender] || horse.gender} ·{" "}
                {horse.age} years old · {horse.color}
              </p>
            </div>
            <div className="flex-1" />
            {ownerCanEdit && (
              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <Btn variant="gold" onClick={saveEdit}>
                      💾 Save
                    </Btn>
                    <Btn variant="secondary" onClick={() => setEditMode(false)}>
                      Cancel
                    </Btn>
                  </>
                ) : (
                  <Btn variant="gold" onClick={() => setEditMode(true)}>
                    ✏ Edit
                  </Btn>
                )}
              </div>
            )}
            {user.role === "manager" &&
              isApproved &&
              horse.trainingStatus !== "Active" && (
                <Btn
                  variant="gold"
                  disabled={activating}
                  onClick={async () => {
                    if (activationFlight.current) return;
                    activationFlight.current = true;
                    setActivating(true);
                    setActivationError("");
                    try {
                      await onActivateHorse(horse.id);
                    } catch (e) {
                      setActivationError((e as Error).message);
                    } finally {
                      activationFlight.current = false;
                      setActivating(false);
                    }
                  }}
                >
                  {activating ? "Activating..." : "Activate horse"}
                </Btn>
              )}
            {user.role === "veterinarian" && (
              <Btn variant="gold" onClick={() => navigate("vet-health-form")}>
                🏥 Record examination
              </Btn>
            )}
            {user.role === "head_trainer" && (
              <Btn variant="gold" onClick={() => navigate("training-hub")}>
                📋 Training plan
              </Btn>
            )}
          </div>
        </div>
      </div>
      {activationError && (
        <p role="alert" className="text-sm text-red-600">
          {activationError}
        </p>
      )}
      {isOwner && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Horse information cannot be changed after Step 3
        </p>
      )}
      {horse.approvalStatus === "approved" && (
        <Card className="p-3">
          <LifecycleStepper horse={horse} />
        </Card>
      )}
      {horse.lock && (
        <Card className="p-4 border-l-4 border-red-500 bg-red-50">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔒</span>
            <div className="flex-1 text-sm">
              <div className="font-semibold text-red-800">
                TRAINING LOCKED — training package paused (not cancelled)
              </div>
              <div className="text-red-700 mt-1">
                Diagnosis: {horse.lock.reason}
                {horse.lock.notes ? ` · ${horse.lock.notes}` : ""}
              </div>
              <div className="text-xs text-red-500 mt-1">
                Locked by {horse.lock.lockedByName} · {horse.lock.lockedAt}
                Awaiting veterinary clearance and trainer acceptance
              </div>
              <div className="text-xs text-red-500">
                {user.role === "veterinarian"
                  ? 'Complete a follow-up examination with all checks normal before releasing the lock.'
                  : "Only a veterinarian can release the training lock."}
              </div>
            </div>
            {user.role === "veterinarian" && (
              <Btn variant="gold" onClick={() => onUnlockExam(horse.id)}>
                Examine to unlock
              </Btn>
            )}
          </div>
        </Card>
      )}
      <div className="flex gap-0 border-b border-gray-200 overflow-x-auto">
        {tabs.map(([t, l]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap ${tab === t ? "border-[#c9973b] text-[#c9973b]" : "border-transparent text-gray-500 hover:text-[#0f1729]"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "overview" &&
        !isApproved &&
        (() => {
          const rq = state.horseClubRequests.find(
            (r) => r.horseId === horse.id && r.status !== "expired",
          );
          return rq ? (
            <Card className="p-5">
              <div className="mb-3 text-sm font-semibold text-[#0f1729]">
                Club intake progress
              </div>
              <IntakeProgress stage={intakeStage(horse, rq)} />
              {rq.status === "rejected" && rq.reviewNote && (
                <p className="mt-3 text-sm text-red-600">
                  Rejection reason: {rq.reviewNote}
                </p>
              )}
            </Card>
          ) : null;
        })()}
      {tab === "overview" && LIFECYCLE_ORDER.indexOf(getLifecycle(horse)) < 3 && intakeActions}
      {tab === "overview" && (
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2">
            <Card className="p-5">
              <h3 className="font-semibold mb-4">Horse information</h3>
              <div className="mb-4 flex items-center gap-3 text-sm">
                <span className="text-gray-500">Profile status</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${isApproved ? "bg-slate-100 text-slate-700" : "bg-amber-100 text-amber-800"}`}>
                  {isApproved ? "Locked" : "Unlocked"}
                </span>
              </div>
              {editMode ? (
                <div className="space-y-3">
                  <Input
                    label="Horse name"
                    value={editForm.name}
                    maxLength={40}
                    error={editErr.name}
                    onChange={(v) => setEditForm((f) => ({ ...f, name: v }))}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Height (cm)"
                      value={editForm.height}
                      error={editErr.height}
                      onChange={(v) =>
                        setEditForm((f) => ({ ...f, height: v }))
                      }
                      type="number"
                    />
                    <Input
                      label="Stable"
                      value={editForm.stable}
                      onChange={(v) =>
                        setEditForm((f) => ({ ...f, stable: v }))
                      }
                    />
                    <Input
                      label="Stall"
                      value={editForm.stall}
                      onChange={(v) => setEditForm((f) => ({ ...f, stall: v }))}
                    />
                  </div>
                  <Input
                    label="UELN"
                    value={editForm.microchip}
                    maxLength={15}
                    error={editErr.microchip}
                    hint="Changing the identification code resets verification status."
                    onChange={(v) =>
                      setEditForm((f) => ({
                        ...f,
                        microchip: v.replace(/[^a-zA-Z0-9]/g, ""),
                      }))
                    }
                  />
                  <Input
                    label="Evidence image URL"
                    value={editForm.evidenceUrl}
                    error={editErr.evidenceUrl}
                    onChange={(v) =>
                      setEditForm((f) => ({ ...f, evidenceUrl: v }))
                    }
                  />
                  <Input
                    label="Evidence file URL"
                    value={editForm.evidenceFileUrl}
                    error={editErr.evidenceFileUrl}
                    onChange={(v) =>
                      setEditForm((f) => ({ ...f, evidenceFileUrl: v }))
                    }
                  />

                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-4">
                    {[
                      ["Breed", horse.breed],
                      ["Gender", GENDER_LABEL[horse.gender] || horse.gender],
                      ["Date of birth", horse.birthDate || "—"],
                      ["Identification code", horse.microchip || "Not provided"],
                      ["Age", `${horse.age} years old`],
                      ["Coat colour", horse.color],
                      ["Weight", `${horse.weight} kg`],
                      ["Height", `${horse.height} cm`],
                      ["Stable", horse.stable],
                      ["Stall", horse.stall],
                    ].map(([k, v]) => (
                      <div key={k as string} className="flex gap-2">
                        <span className="text-sm text-gray-500 w-24">
                          {k as string}
                        </span>
                        <span className="text-sm font-medium">
                          {v as string}
                        </span>
                      </div>
                    ))}
                  </div>
                  {horse.biography && (
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 italic">
                      "{horse.biography}"
                    </p>
                  )}
                  <div className="mt-3">
                    <PedigreeBlock horse={horse} />
                  </div>
                </>
              )}
            </Card>
          </div>
          <div className="space-y-4">
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Identification</h3>
                <IdentityBadge verified={horse.identityVerified} />
              </div>
              <div className="text-xs text-gray-500">Identification Code</div>
              <div className="font-mono text-sm">
                {horse.microchip || "Not provided"}
              </div>
              {horse.identityEvidence?.url && (
                <img
                  src={horse.identityEvidence.url}
                  alt="Identification evidence"
                  className="mt-3 h-28 w-full rounded-lg border border-gray-200 bg-gray-50 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              {horse.identityEvidence?.fileUrl && (
                <Btn
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() =>
                    window.open(
                      horse.identityEvidence?.fileUrl,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                >
                  Open evidence file
                </Btn>
              )}
              <div className="mt-2 text-xs italic text-gray-500">
                {horse.identityEvidence?.note || "No evidence notes provided."}
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold mb-4">Assigned staff</h3>
              {[
                [
                  "🏇",
                  "Current trainer",
                  (horse.trainerHistory || [])
                    .filter((t) => !t.to)
                    .map((t) => t.name)
                    .join(", ") || "—",
                ],
                ["🩺", "Assigned veterinarian", horse.vetName || "—"],
                ["🧹", "Groom", horse.groomName || "—"],
                ["👤", "Horse Owner", horse.ownerName],
              ].map(([ic, r, n]) => (
                <div key={r as string} className="flex items-center gap-3 mb-3">
                  <span className="text-base">{ic}</span>
                  <div>
                    <div className="text-xs text-gray-500">{r as string}</div>
                    <div className="text-sm font-medium">{n as string}</div>
                  </div>
                </div>
              ))}
            </Card>
            <Card className="p-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  ["Races", horse.totalRaces, "text-[#0f1729]"],
                  ["Wins", horse.wins, "text-emerald-700"],
                  [
                    `${horse.totalRaces > 0 ? Math.round((horse.wins / horse.totalRaces) * 100) : 0}%`,
                    "Win rate",
                    "text-[#c9973b]",
                  ],
                ].map(([v, l, c]) => (
                  <div key={l as string} className="p-2 bg-gray-50 rounded-lg">
                    <div className={`text-xl font-serif font-bold ${c}`}>
                      {v}
                    </div>
                    <div className="text-xs text-gray-500">{l as string}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === "health" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="font-semibold">Health history</h3>
            <div className="flex gap-2">
              <Btn
                variant="secondary"
                onClick={() => navigate("health-records")}
              >
                View details →
              </Btn>
              {user.role === "veterinarian" && (
                <Btn variant="gold" onClick={() => navigate("vet-health-form")}>
                  + Add examination
                </Btn>
              )}
            </div>
          </div>
          {latestHealth && (
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-1">
              Latest examination
            </div>
          )}
          {horseHealthRecords.map((r, idx) => (
            <Card
              key={r.id}
              className={`p-4 ${idx === 0 ? "border-[#c9973b] border-2" : ""}`}
            >
              {idx === 0 && (
                <div className="text-xs font-semibold text-[#c9973b] mb-2 flex items-center gap-1">
                  🩺 Latest examination
                </div>
              )}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <IdChip kind="MED" id={r.id} />
                    <div className="font-medium">{r.type}</div>
                    {r.isPostTraining && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Post-training
                      </span>
                    )}
                    {r.autoEvaluation === "pass" && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                        ✓ Within reference range
                      </span>
                    )}
                    {r.autoEvaluation === "watch" && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        ⚠ Monitoring required
                      </span>
                    )}
                    {r.autoEvaluation === "fail" && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        ✕ Not eligible
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {r.date} · {r.vet}
                  </div>
                  {r.trainingEligibility && (
                    <div className="mt-1 text-xs">
                      {r.trainingEligibility === "eligible" && (
                        <span className="text-emerald-700">
                          🟢 Fit for training
                        </span>
                      )}
                      {r.trainingEligibility === "conditional" && (
                        <span className="text-amber-700">
                          🟡 Fit with monitoring
                        </span>
                      )}
                      {r.trainingEligibility === "not-eligible" && (
                        <span className="text-red-700">
                          🔴 Not fit for training
                        </span>
                      )}
                    </div>
                  )}
                  {r.vitals && (
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      {[
                        ["Heart rate", r.vitals.heartRate + " bpm"],
                        ["Temperature", r.vitals.temperature + "°C"],
                        ["Respiratory rate", r.vitals.respRate + "/p"],
                      ].map(([k, v]) =>
                        v.trim() !== "bpm" &&
                        v.trim() !== "°C" &&
                        v.trim() !== "/p" ? (
                          <div
                            key={k as string}
                            className="bg-gray-50 p-1.5 rounded text-center"
                          >
                            <div className="text-gray-400">{k as string}</div>
                            <div className="font-medium">{v as string}</div>
                          </div>
                        ) : null,
                      )}
                    </div>
                  )}
                  {r.conclusion ? (
                    <div className="mt-1 text-sm text-gray-700">
                      Conclusion: “{r.conclusion}”
                    </div>
                  ) : (
                    r.notes && (
                      <div className="text-sm text-gray-600 mt-1">
                        {r.notes}
                      </div>
                    )
                  )}
                </div>
                <Badge status={r.result} />
              </div>
            </Card>
          ))}
          {horseHealthRecords.length === 0 && (
            <Card className="p-8 text-center">
              <div className="text-gray-400 text-sm mb-2">
                No medical records yet
              </div>
              {user.role === "veterinarian" && (
                <Btn variant="gold" onClick={() => navigate("vet-health-form")}>
                  Record first examination
                </Btn>
              )}
            </Card>
          )}
        </div>
      )}

      {tab === "training" && !isVetRole && (
        <div className="space-y-6">
          <TrainerHistoryTab
            horse={horse}
            trainers={state.users.filter((u) => u.role === "head_trainer")}
            canEdit={false}
            today={TODAY}
            onChange={async () => {}}
          />
          {user.role === "manager" && (
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold">
                Assign trainers through a paid package
              </h3>
              <p className="text-sm text-gray-600">
                Select the horse's active, paid package, then choose a trainer.
                The trainer must accept before creating a training plan or
                sessions.
              </p>
              {state.enrollments
                .filter(
                  (e) =>
                    e.horseId === horse.id &&
                    e.apiStatus === "ACTIVE" &&
                    e.paymentStatus === "PAID",
                )
                .map((e) => (
                  <div
                    key={e.id}
                    className="rounded-lg border border-gray-200 p-3 text-sm"
                  >
                    <strong>{e.packageName}</strong>
                    <div>
                      {e.startedAt} – {e.expiresAt}
                    </div>
                  </div>
                ))}
              <Btn variant="gold" onClick={() => navigate("trainer-assign")}>
                Open package trainer assignments
              </Btn>
            </Card>
          )}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Training roadmap</h3>
              {(user.role === "head_trainer" || user.role === "manager") && (
                <Btn
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate("training-hub")}
                >
                  Open training page →
                </Btn>
              )}
            </div>
            {(user.role === 'manager' || user.role === 'owner') && <div className="space-y-3">
              <p className="text-sm text-gray-500">The detailed horse roadmap is currently available to the assigned trainer. You can preview each package curriculum below and view saved sessions in the training schedule.</p>
              {state.enrollments.filter(e=>e.horseId===horse.id).map(e=><div key={e.id}><p className="text-sm font-medium">{e.packageName}</p><PackageRoadmapPreview packageId={e.packageId}/></div>)}
            </div>}
            {state.trainingPlans
              .filter((p) => p.horseId === horse.id)
              .map((p) => (
                <Card key={p.id} className="p-5">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <IdChip kind="PLN" id={p.id} />
                    <Badge status={p.phase} />
                    <Badge status={p.status} />
                  </div>
                  <div className="text-sm text-gray-500">
                    {p.startDate} → {p.endDate} · {p.distance} · Workload:{" "}
                    {p.workload === "High"
                      ? "High"
                      : p.workload === "Medium"
                        ? "Medium"
                        : p.workload === "Low"
                          ? "Low"
                          : p.workload}
                  </div>
                  <div className="text-sm text-gray-600">Goal: {p.goals}</div>
                  {p.algorithmRationale && (
                    <div className="mt-1 text-xs text-[#c9973b]">
                      Recommendation rationale: {p.algorithmRationale}
                    </div>
                  )}
                  <div className="mt-2">
                    <div className="mb-1 flex justify-between text-xs text-gray-500">
                      <span>Progress</span>
                      <span>{p.progress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-[#c9973b]"
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            {user.role !== "manager" && user.role !== "owner" && state.trainingPlans.filter((p) => p.horseId === horse.id)
              .length === 0 && (
              <Card className="p-8 text-center text-sm text-gray-400">
                No training roadmap yet.
              </Card>
            )}
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold">Training schedule and results</h3>
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {[
                      "Session ID",
                      "Date and time",
                      "Activity",
                      "Trainer",
                      "Status",
                      "Results",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {horseSessions.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-4 py-3">
                        <IdChip kind="SES" id={s.id} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {s.date} {s.time}
                      </td>
                      <td className="px-4 py-3">
                        {s.type}
                        <div className="text-xs text-gray-400">
                          {s.distance}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {s.trainerName}
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={s.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {s.result
                          ? `${s.result.time} · ${s.result.speed} km/h · ${s.result.performanceScore} points`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                  {horseSessions.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-gray-400"
                      >
                        No sessions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      )}

      {tab === "packages" && !isVetRole && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              Training packages for {horse.name}
            </h3>
            {isOwner && isApproved && (
              <Btn
                variant="gold"
                size="sm"
                onClick={() => navigate("training-register")}
              >
                Register for a package →
              </Btn>
            )}
          </div>
          {horseEnrollments.map((e) => {
            const pct = Math.round(
              (e.sessionsDone / Math.max(1, e.sessionsTotal)) * 100,
            );
            return (
              <Card key={e.id} className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <IdChip kind="ENR" id={e.id} />
                  <span className="font-semibold">{e.packageName}</span>
                  <Badge
                    status={
                      e.status === "active"
                        ? "Active"
                        : e.status === "paused"
                          ? "Paused"
                          : "Completed"
                    }
                  />
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  Start {e.startedAt} · Trainer:{" "}
                  {e.trainerName || "not assigned"}
                </div>
                <div className="mt-2">
                  <div className="mb-1 flex justify-between text-xs text-gray-500">
                    <span>Completed sessions</span>
                    <span>
                      {e.sessionsDone}/{e.sessionsTotal}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-[#c9973b]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
          {horseEnrollments.length === 0 && (
            <Card className="p-10 text-center">
              <div className="mb-2 text-4xl">📦</div>
              <div className="font-semibold text-gray-600">
                No training package registered for this horse
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === "updates" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Achievements for {horse.name}</h3>
            {isOwner && (
              <Btn variant="gold" onClick={() => setShowAchForm(!showAchForm)}>
                + Add achievement
              </Btn>
            )}
          </div>
          {showAchForm && isOwner && (
            <Card className="p-5 border-l-4 border-[#c9973b]">
              <h4 className="font-semibold mb-3">Add achievement</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Input
                    label="Race / event name"
                    value={newAch.title}
                    onChange={(v) => setNewAch((a) => ({ ...a, title: v }))}
                    placeholder="Example: RaceForce Sprint Cup"
                    required
                    maxLength={80}
                    error={achErr.title}
                  />
                </div>
                <Input
                  label="Date"
                  value={newAch.date}
                  type="date"
                  max="2026-09-25"
                  required
                  error={achErr.date}
                  onChange={(v) => setNewAch((a) => ({ ...a, date: v }))}
                />
                <Select
                  label="Finishing position"
                  value={newAch.position}
                  onChange={(v) => setNewAch((a) => ({ ...a, position: v }))}
                  options={["1", "2", "3", "4", "5"].map((v) => ({
                    value: v,
                    label: `Position ${v}`,
                  }))}
                />
                <Input
                  label="Prize"
                  value={newAch.prize}
                  onChange={(v) => setNewAch((a) => ({ ...a, prize: v }))}
                  placeholder="VD: 50,000,000 VND"
                />
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supporting document
                  </label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) =>
                      setNewAch((a) => ({
                        ...a,
                        doc: e.target.files?.[0]?.name || a.doc,
                      }))
                    }
                    className="text-xs"
                  />
                  {newAch.doc && (
                    <div className="text-xs text-blue-600 mt-1">
                      📎 {newAch.doc}
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <Textarea
                    label="Description"
                    value={newAch.description}
                    onChange={(v) =>
                      setNewAch((a) => ({ ...a, description: v }))
                    }
                    placeholder="Describe the achievement..."
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Btn variant="gold" onClick={addAchievement}>
                  ✓ Save
                </Btn>
                <Btn variant="secondary" onClick={() => setShowAchForm(false)}>
                  Cancel
                </Btn>
              </div>
            </Card>
          )}
          {horse.achievements.length === 0 && (
            <Card className="p-10 text-center">
              <div className="text-4xl mb-3">🏆</div>
              <div className="text-gray-500 font-semibold">
                No achievements yet
              </div>
              {isOwner && (
                <div className="text-sm text-gray-400 mt-1">
                  Click "+ Add achievement" to record an achievement
                </div>
              )}
            </Card>
          )}
          {horse.achievements.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 ${a.position === 1 ? "bg-[#c9973b] text-white" : a.position === 2 ? "bg-gray-400 text-white" : "bg-amber-700 text-white"}`}
                >
                  #{a.position}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{a.title}</div>
                  <div className="text-sm text-gray-500">{a.date}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {a.description}
                  </div>
                  {a.prize && (
                    <div className="text-emerald-600 text-sm font-medium mt-1">
                      🏆 {a.prize}
                    </div>
                  )}
                  {a.doc && (
                    <div className="text-xs text-blue-600 mt-1">📎 {a.doc}</div>
                  )}
                </div>
                {isOwner && (
                  <div className="flex gap-1.5">
                    <Btn
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const [d, m, y] = a.date.split("/");
                        setNewAch({
                          title: a.title,
                          date: `${y}-${m}-${d}`,
                          description: a.description,
                          prize: a.prize || "",
                          position: String(a.position || 1),
                          doc: a.doc || "",
                        });
                        setEditAchId(a.id);
                        setShowAchForm(true);
                      }}
                    >
                      Edit
                    </Btn>
                    <Btn
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        if (window.confirm(`Delete achievement "${a.title}"?`))
                          void onUpdateHorse({
                            ...horse,
                            achievements: horse.achievements.filter(
                              (x) => x.id !== a.id,
                            ),
                          }).catch(() => {});
                      }}
                    >
                      Delete
                    </Btn>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "updates" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Race history</h3>
              <div className="text-sm text-gray-500">
                {horse.totalRaces} races · {horse.wins} wins
              </div>
            </div>
            {isOwner && (
              <div className="flex gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  className="hidden"
                  onChange={(e) => {
                    void onPickFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <span className="inline-block px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white hover:bg-gray-50">
                  Import Excel
                </span>
              </label>
              <Btn
                variant="gold"
                onClick={() => {
                  setEditRaceId(null);
                  setRaceE({});
                  setRaceF({
                    date: "",
                    raceName: "",
                    distance: "1200m",
                    position: "1",
                    totalHorses: "10",
                    time: "",
                    venue: "",
                    jockey: "",
                    prize: "",
                  });
                  setRaceFormOpen(true);
                }}
              >
                + Add result
              </Btn>
              </div>
            )}
          </div>
          {(imp || impErr) && isOwner && (
            <Card className="p-5 border-l-4 border-[#c9973b]">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold">Import from Excel</h4>
                <button className="text-sm text-gray-500 underline" onClick={downloadSample}>
                  Download sample (.csv)
                </button>
              </div>
              {impErr && (
                <div className="text-sm text-red-600 bg-red-50 rounded p-2 mb-2">{impErr}</div>
              )}
              {imp && (
                <>
                  <div className="text-sm text-gray-600 mb-2">
                    {imp.filter((r) => r.entry).length} valid · {imp.filter((r) => !r.entry).length} with errors (skipped)
                  </div>
                  <div className="max-h-64 overflow-auto text-sm divide-y">
                    {imp.map((r) => (
                      <div key={r.line} className="py-1.5">
                        {r.entry ? (
                          <span>
                            Row {r.line}: {r.entry.raceName} · {r.entry.date} · {r.entry.distance} · #{r.entry.position}
                          </span>
                        ) : (
                          <span className="text-red-600">
                            Row {r.line}: {r.errors.join(" ")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Btn
                      variant="gold"
                      onClick={confirmImport}
                      disabled={impBusy || !imp.some((r) => r.entry)}
                    >
                      {impBusy ? "Importing…" : "Import valid rows"}
                    </Btn>
                    <Btn variant="secondary" onClick={() => { setImp(null); setImpErr(""); }}>
                      Cancel
                    </Btn>
                  </div>
                </>
              )}
              {!imp && (
                <Btn variant="secondary" onClick={() => setImpErr("")}>
                  Close
                </Btn>
              )}
            </Card>
          )}
          {raceFormOpen && isOwner && (
            <Card className="p-5 border-l-4 border-[#c9973b]">
              <h4 className="font-semibold mb-3">
                {editRaceId ? "Edit race result" : "Add race result"}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Race name"
                  value={raceF.raceName}
                  maxLength={60}
                  required
                  error={raceE.raceName}
                  onChange={(v) => setRaceF((r) => ({ ...r, raceName: v }))}
                />
                <Input
                  label="Race date"
                  type="date"
                  max="2026-09-25"
                  value={raceF.date}
                  required
                  error={raceE.date}
                  onChange={(v) => setRaceF((r) => ({ ...r, date: v }))}
                />
                <Select
                  label="Distance"
                  value={raceF.distance}
                  onChange={(v) => setRaceF((r) => ({ ...r, distance: v }))}
                  options={[
                    "800m",
                    "1000m",
                    "1200m",
                    "1400m",
                    "1600m",
                    "2000m",
                  ].map((v) => ({ value: v, label: v }))}
                />
                <Select
                  label="Position"
                  value={raceF.position}
                  error={raceE.position}
                  onChange={(v) => setRaceF((r) => ({ ...r, position: v }))}
                  options={Array.from({ length: 20 }, (_, i) => ({
                    value: String(i + 1),
                    label: `Position ${i + 1}`,
                  }))}
                />
                <Input
                  label="Number of horses"
                  type="number"
                  value={raceF.totalHorses}
                  error={raceE.totalHorses}
                  onChange={(v) => setRaceF((r) => ({ ...r, totalHorses: v }))}
                />
                <Input
                  label="Time"
                  value={raceF.time}
                  placeholder="1:11.24"
                  error={raceE.time}
                  onChange={(v) => setRaceF((r) => ({ ...r, time: v }))}
                />
                <Input
                  label="Racecourse"
                  value={raceF.venue}
                  maxLength={60}
                  onChange={(v) => setRaceF((r) => ({ ...r, venue: v }))}
                />
                <Input
                  label="Jockey"
                  value={raceF.jockey}
                  maxLength={40}
                  onChange={(v) => setRaceF((r) => ({ ...r, jockey: v }))}
                />
                <div className="col-span-2">
                  <Input
                    label="Prize"
                    value={raceF.prize}
                    placeholder="50,000,000 VND"
                    onChange={(v) => setRaceF((r) => ({ ...r, prize: v }))}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Btn variant="gold" onClick={saveRace}>
                  ✓ Save
                </Btn>
                <Btn variant="secondary" onClick={() => setRaceFormOpen(false)}>
                  Cancel
                </Btn>
              </div>
            </Card>
          )}
          {horse.raceHistory.length === 0 && (
            <Card className="p-10 text-center">
              <div className="text-4xl mb-3">🏁</div>
              <div className="text-gray-500">No race history yet</div>
            </Card>
          )}
          {horse.raceHistory.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${r.position === 1 ? "bg-[#c9973b] text-white" : r.position <= 3 ? "bg-gray-400 text-white" : "bg-gray-200 text-gray-600"}`}
                >
                  #{r.position}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{r.raceName}</div>
                  <div className="text-sm text-gray-500">
                    {r.date} · {r.venue || "—"} · {r.distance}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Jockey: {r.jockey || "—"} · {r.totalHorses} runners
                    {r.time && ` · TG: ${r.time}`}
                  </div>
                </div>
                <div className="text-right">
                  {r.prize !== "0 VND" && (
                    <div className="text-xs text-emerald-600">{r.prize}</div>
                  )}
                </div>
                {isOwner && (
                  <div className="flex gap-1.5">
                    <Btn
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const [d, m, y] = r.date.split("/");
                        setRaceF({
                          date: `${y}-${m}-${d}`,
                          raceName: r.raceName,
                          distance: r.distance,
                          position: String(r.position),
                          totalHorses: String(r.totalHorses),
                          time: r.time,
                          venue: r.venue,
                          jockey: r.jockey,
                          prize: r.prize,
                        });
                        setEditRaceId(r.id);
                        setRaceE({});
                        setRaceFormOpen(true);
                      }}
                    >
                      Edit
                    </Btn>
                    <Btn
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        if (window.confirm(`Delete result "${r.raceName}"?`)) {
                          const list = horse.raceHistory.filter(
                            (x) => x.id !== r.id,
                          );
                          void onUpdateHorse({
                            ...horse,
                            raceHistory: list,
                            totalRaces: list.length,
                            wins: list.filter((x) => x.position === 1).length,
                          }).catch(() => {});
                        }
                      }}
                    >
                      Delete
                    </Btn>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "updates" && (
        <PhotosTab
          horse={horse}
          canEdit={
            isOwner || (user.role === "manager" && horse.clubId === user.clubId)
          }
          onChange={(photos) =>
            void onUpdateHorse({
              ...horse,
              photos,
              changeLog: logChange(
                horse,
                user.name,
                `updated evidence images (${photos.length} images)`,
              ),
            }).catch(() => {})
          }
        />
      )}
    </div>
  );
}
