import { request } from "./api";
import { useEffect, useMemo, useState } from "react";
import type {
  AppUser,
  Club,
  Horse,
  HorseClubRequest,
  HealthRecord,
  TrainingSession,
} from "./data";
import { getLifecycle } from "./data";
import { Btn, Card, Input, Select, Textarea } from "./ui";
import { IdChip, Modal, GENDER_LABEL, dispId } from "./admin";
import { vetVisible } from "./intake";

// ── Ngưỡng mẫu & tiện ích dùng chung (form khám + lịch sử khám) ─────────────────

export const THRESHOLD_SOURCE =
  "Reference: University of Arizona Cooperative Extension, Knowing What is Normal for Your Horse (2022), https://extension.arizona.edu/sites/default/files/2024-08/AZ1986-2022.pdf. Ranges apply to adult horses at rest and do not determine eligibility by themselves. Saved-record suggestions follow the existing server rules (37.5–38.5°C; heart rate 28–44 bpm; respiratory rate 10–20 breaths/min), which may differ from the reference.";

export type VitalKey = "temperature" | "heartRate" | "respRate";
export interface VitalDef {
  key: VitalKey;
  label: string;
  unit: string;
  lo: number;
  hi: number;
  hardLo: number;
  hardHi: number;
  icon: string;
  reason: string;
  example: string;
}
export const VITAL_DEFS: VitalDef[] = [
  {
    key: "temperature",
    label: "Body temperature",
    unit: "°C",
    lo: 37.5,
    hi: 38.5,
    hardLo: 30,
    hardHi: 44,
    icon: "🌡️",
    example: "EX: 38,0",
    reason:
      "Detect fever or infection early; high temperature also increases the risk of exhaustion during exercise.",
  },
  {
    key: "heartRate",
    label: "Resting heart rate",
    unit: "per minute",
    lo: 32,
    hi: 44,
    hardLo: 10,
    hardHi: 150,
    icon: "❤️",
    example: "EX: 34",
    reason:
      "Assess cardiovascular status, pain and stress; an abnormally high resting rate is a warning sign.",
  },
  {
    key: "respRate",
    label: "Resting respiratory rate",
    unit: "per minute",
    lo: 8,
    hi: 16,
    hardLo: 2,
    hardHi: 80,
    icon: "🫁",
    example: "EX: 12",
    reason:
      "Detect respiratory illness or fever; an elevated resting respiratory rate indicates the horse may not be ready for exercise.",
  },
];

export const fmtNum = (n: number) =>
  String(Math.round(n * 100) / 100).replace(".", ",");
export const rangeText = (d: VitalDef) =>
  `${fmtNum(d.lo)}–${fmtNum(d.hi)} ${d.unit}`;

export type VKind =
  | "empty"
  | "invalid"
  | "impossible"
  | "normal"
  | "mild"
  | "severe";
export interface VStatus {
  kind: VKind;
  n: number;
  error: string;
}

export function evalVital(def: VitalDef, raw: string): VStatus {
  const t = (raw ?? "").trim();
  if (!t) return { kind: "empty", n: NaN, error: "" };
  if (!/^\d+([.,]\d+)?$/.test(t))
    return {
      kind: "invalid",
      n: NaN,
      error: "Enter numbers only, e.g. 38.2 (no letters or minus sign).",
    };
  const n = Number(t.replace(",", "."));
  if (def.key !== "temperature" && !Number.isInteger(n))
    return {
      kind: "invalid",
      n,
      error: "Heart rate and respiratory rate must be integers.",
    };
  if (n < def.hardLo || n > def.hardHi)
    return {
      kind: "impossible",
      n,
      error: `Value is outside the input validation limits (${fmtNum(def.hardLo)}–${fmtNum(def.hardHi)} ${def.unit}). Check the measurement again; input limits are not diagnostic thresholds.`,
    };
  if (n >= def.lo && n <= def.hi) return { kind: "normal", n, error: "" };
  if (n >= def.lo * 0.9 && n <= def.hi * 1.1)
    return { kind: "mild", n, error: "" };
  return { kind: "severe", n, error: "" };
}
export const vitalOk = (s: VStatus) =>
  s.kind === "normal" || s.kind === "mild" || s.kind === "severe";

export function evalWeight(raw: string): {
  ok: boolean;
  empty: boolean;
  error: string;
} {
  const t = (raw ?? "").trim();
  if (!t) return { ok: true, empty: true, error: "" };
  if (!/^\d+([.,]\d+)?$/.test(t))
    return { ok: false, empty: false, error: "Enter numbers only, e.g. 505." };
  const n = Number(t.replace(",", "."));
  if (n < 100 || n > 1200)
    return {
      ok: false,
      empty: false,
      error: "Weight must be between 100 and 1200 kg.",
    };
  return { ok: true, empty: false, error: "" };
}

export interface RegionDef {
  key: string;
  label: string;
  icon: string;
  hint: string;
  reason: string;
  legacy: string;
}
export const REGION_DEFS: RegionDef[] = [
  {
    key: "eyes",
    legacy: "eyes",
    label: "Eyes",
    icon: "👀",
    hint: "Normal: bright and alert, without redness or discharge.",
    reason: "Detect inflammation, corneal injury or signs of systemic illness.",
  },
  {
    key: "nose",
    legacy: "nose",
    label: "Nose",
    icon: "👃",
    hint: "Normal: clean, without thick or discolored discharge.",
    reason:
      "Abnormal nasal discharge can be an early sign of respiratory disease.",
  },
  {
    key: "mouth",
    legacy: "mouth",
    label: "Mouth",
    icon: "🦷",
    hint: "Normal: pink, moist mucous membranes and no broken teeth.",
    reason:
      "Oral and dental injuries can cause pain during feeding and when wearing a bit.",
  },
  {
    key: "movement",
    legacy: "movement",
    label: "Movement / legs",
    icon: "🐎",
    hint: "Normal: even gait, no lameness and no limb heat or swelling.",
    reason:
      "Limbs and tendons are vulnerable to injury and affect whether the horse can train.",
  },
];

export type Decision = "eligible" | "conditional" | "not-eligible";
export const DECISION_LABEL: Record<Decision, string> = {
  eligible: "Eligible for training",
  conditional: "Eligible, but needs monitoring",
  "not-eligible": "Not eligible — training locked",
};

export function recordDecision(r: HealthRecord): Decision | undefined {
  if (r.decision) return r.decision;
  if (r.trainingEligibility === "not-eligible") return "not-eligible";
  if (r.trainingEligibility === "conditional" || r.result === "Monitor")
    return "conditional";
  if (r.trainingEligibility === "eligible") return "eligible";
  if (r.vetClearanceGranted || r.result === "Eligible") return "eligible";
  if (r.result === "Injured") return "not-eligible";
  return undefined;
}

export function DecisionPill({
  d,
  small = false,
}: {
  d?: Decision;
  small?: boolean;
}) {
  const sz = small ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  if (!d)
    return (
      <span
        className={`inline-flex items-center rounded-full border border-gray-200 bg-gray-50 font-medium text-gray-500 ${sz}`}
      >
        No conclusion
      </span>
    );
  if (d === "eligible")
    return (
      <span
        className={`inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 font-medium text-emerald-800 ${sz}`}
      >
        ✓ {DECISION_LABEL[d]}
      </span>
    );
  if (d === "conditional")
    return (
      <span
        className={`inline-flex items-center rounded-full border border-amber-200 bg-amber-50 font-medium text-amber-800 ${sz}`}
      >
        ! {DECISION_LABEL[d]}
      </span>
    );
  return (
    <span
      className={`inline-flex items-center rounded-full border border-red-200 bg-red-50 font-medium text-red-700 ${sz}`}
    >
      ✕ {DECISION_LABEL[d]}
    </span>
  );
}

/** Mã hồ sơ tuần tự MED-000001… : lớn nhất hiện có + 1. */
export function nextMedId(records: HealthRecord[]): string {
  let max = 0;
  for (const r of records) {
    const m = /^MED-(\d{1,9})$/.exec(r.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `MED-${String(max + 1).padStart(6, "0")}`;
}

export function VitalStatusPill({ s }: { s: VStatus }) {
  if (s.kind === "normal")
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
        ✓ Normal
      </span>
    );
  if (s.kind === "mild" || s.kind === "severe")
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        ⚠ Abnormal
      </span>
    );
  return null;
}

// ── Form khám ───────────────────────────────────────────────────────────────

type FormState = {
  user: AppUser | null;
  users: AppUser[];
  clubs: Club[];
  horses: Horse[];
  healthRecords: HealthRecord[];
  horseClubRequests: HorseClubRequest[];
  examHorseId: string | null;
};

type Level = "pass" | "watch" | "fail";
interface Finding {
  label: string;
  text: string;
  level: "watch" | "fail";
}

const STEPS = [
  "Choose horse",
  "Vital signs",
  "Clinical examination",
  "Decision",
];

function ageText(h: Horse) {
  return `${h.age} years old`;
}

export function VetHealthFormPage({
  state,
  navigate,
  onSave,
  onSaveRecord,
  today,
  postSession,
  onPostSubmit,
  onBack,
  onConsumeExamHorse,
}: {
  state: FormState;
  navigate: (p: "health-records" | "vet-assign") => void;
  onSave: (msg: string) => void;
  onSaveRecord: (r: HealthRecord) => Promise<HealthRecord>;
  today: string;
  postSession?: TrainingSession;
  onPostSubmit?: (
    sessionId: string,
    r: HealthRecord,
  ) => string | null | Promise<string | null>;
  onBack?: () => void;
  onConsumeExamHorse?: () => void;
}) {
  const user = state.user!;
  const visible = useMemo(
    () =>
      state.horses.filter((h) =>
        postSession ? h.id === postSession.horseId : vetVisible(h, user),
      ),
    [state.horses, user, postSession],
  );
  const [horseId, setHorseId] = useState(() => {
    if (postSession) return postSession.horseId;
    return state.examHorseId && visible.some((h) => h.id === state.examHorseId)
      ? state.examHorseId
      : "";
  });
  useEffect(() => {
    if (state.examHorseId) onConsumeExamHorse?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState(false);
  const [examType, setExamType] = useState("Routine examination");
  const [vit, setVit] = useState<Record<VitalKey, string>>({
    temperature: "",
    heartRate: "",
    respRate: "",
  });
  const [weight, setWeight] = useState("");
  const [regions, setRegions] = useState<Record<string, "" | "ok" | "bad">>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [decision, setDecision] = useState<Decision | "">("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [medications, setMedications] = useState("");
  const [tried, setTried] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [saved, setSaved] = useState<HealthRecord | null>(null);
  const [saveError, setSaveError] = useState("");
  const [previewFailed, setPreviewFailed] = useState(false);
  const [previewRetry, setPreviewRetry] = useState(0);

  const horse = visible.find((h) => h.id === horseId);
  const horseRecords = useMemo(
    () =>
      state.healthRecords
        .filter((r) => r.horseId === horseId)
        .sort(
          (a, b) =>
            (b.createdAt ?? 0) - (a.createdAt ?? 0) ||
            b.date
              .split("/")
              .reverse()
              .join("")
              .localeCompare(a.date.split("/").reverse().join("")),
        ),
    [state.healthRecords, horseId],
  );
  const prev = horseRecords.find((r) => r.vitals && r.status === "confirmed");

  const pendingReq = horse
    ? state.horseClubRequests.find(
        (r) => r.horseId === horse.id && r.status === "pending",
      )
    : undefined;
  const isIntake =
    !postSession &&
    !!horse &&
    !!pendingReq &&
    horse.vetAssign?.status === "accepted" &&
    !horse.intakeExamId;
  const club = state.clubs.find((c) => c.id === (horse?.clubId ?? ""));
  const willLock =
    !!horse &&
    decision === "not-eligible" &&
    getLifecycle(horse) === "training";

  // ── Đánh giá ──
  const vs = Object.fromEntries(
    VITAL_DEFS.map((d) => [d.key, evalVital(d, vit[d.key])]),
  ) as Record<VitalKey, VStatus>;
  const wt = evalWeight(weight);
  const vitalsDone = VITAL_DEFS.every((d) => vitalOk(vs[d.key])) && wt.ok;
  const regionsDone = REGION_DEFS.every(
    (r) =>
      regions[r.key] === "ok" ||
      (regions[r.key] === "bad" && (notes[r.key] || "").trim().length >= 3),
  );
  // The decision unlocks only when step 2 (vital signs) and step 3 (clinical exam) are complete and valid.
  const decisionLocked = !vitalsDone || !regionsDone;
  const lockMissing = [
    !vitalsDone && "step 2 (vital signs)",
    !regionsDone && "step 3 (clinical examination)",
  ].filter(Boolean) as string[];
  const findings: Finding[] = [];
  VITAL_DEFS.forEach((d) => {
    const s = vs[d.key];
    if (s.kind === "mild" || s.kind === "severe")
      findings.push({
        label: d.label,
        text: `${fmtNum(s.n)} ${d.unit} (normal ${rangeText(d)})`,
        level: s.kind === "severe" ? "fail" : "watch",
      });
  });
  REGION_DEFS.forEach((r) => {
    if (regions[r.key] === "bad")
      findings.push({
        label: r.label,
        text: (notes[r.key] || "").trim() || "Abnormal",
        level: "watch",
      });
  });
  const [preview, setPreview] = useState<{
    key: string;
    suggestedConclusion: string;
    level: string;
    systemNote: string;
  } | null>(null);
  const previewKey = JSON.stringify({
    horseId,
    vit,
    weight,
    regions,
    notes,
    examType,
    isIntake,
  });
  useEffect(() => {
    if (!horseId || !vitalsDone || !regionsDone) {
      setPreview(null);
      setPreviewFailed(false);
      return;
    }
    let active = true;
    setPreviewFailed(false);
    const timer = setTimeout(() => {
      const body = {
        examType: isIntake
          ? "INITIAL"
          : postSession || /Tái khám/i.test(examType)
            ? "FOLLOW_UP"
            : "PERIODIC",
        vitalSign: {
          bodyTemperature: vs.temperature.n,
          restingHeartRate: vs.heartRate.n,
          restingRespiratoryRate: vs.respRate.n,
          weight: weight.trim() ? Number(weight.replace(",", ".")) : null,
        },
        clinicalExams: REGION_DEFS.map((r) => ({
          examinationArea: (
            {
              eyes: "EYES",
              nose: "NOSE",
              mouth: "MOUTH",
              movement: "MOVEMENT_LEGS",
            } as Record<string, string>
          )[r.key],
          conditionStatus: regions[r.key] === "ok" ? "NORMAL" : "ABNORMAL",
          notes: notes[r.key] || "",
        })),
      };
      void request(
        `/medical/horses/${encodeURIComponent(horseId)}/evaluation`,
        "POST",
        body,
      )
        .then((value) => {
          if (active) {
            setPreview({ ...value, key: previewKey });
            setSaveError("");
          }
        })
        .catch((e) => {
          if (active) {
            setPreview(null);
            setPreviewFailed(true);
            setSaveError((e as Error).message);
          }
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [previewKey, previewRetry]);
  const currentPreview = preview?.key === previewKey ? preview : null;
  // No suggestion exists between an edit and the server's answer: show a waiting state instead of a locally computed one.
  const suggestionPending = !decisionLocked && !currentPreview && !previewFailed;
  const overall: Level =
    currentPreview?.level === "CRITICAL"
      ? "fail"
      : currentPreview?.level === "WARNING"
        ? "watch"
        : currentPreview?.level === "NORMAL"
          ? "pass"
          : findings.some((f) => f.level === "fail")
            ? "fail"
            : findings.length
              ? "watch"
              : "pass";
  const overallCfg = {
    pass: {
      label: "Normal",
      cls: "border-emerald-300 bg-emerald-50 text-emerald-800",
      icon: "🟢",
    },
    watch: {
      label: "Needs monitoring",
      cls: "border-amber-300 bg-amber-50 text-amber-800",
      icon: "🟡",
    },
    fail: {
      label: "Severe",
      cls: "border-red-300 bg-red-50 text-red-800",
      icon: "🔴",
    },
  }[overall];
  const suggestedDecision: Decision =
    currentPreview?.suggestedConclusion === "NOT_FIT"
      ? "not-eligible"
      : currentPreview?.suggestedConclusion === "FIT_WITH_MONITORING"
        ? "conditional"
        : "eligible";
  // The system, not the veterinarian, sets the decision: it always mirrors the server's assessment.
  useEffect(() => {
    setDecision(decisionLocked || !currentPreview ? "" : suggestedDecision);
  }, [decisionLocked, currentPreview, suggestedDecision]);
  const decisionDetailsDone =
    decision === "conditional"
      ? followUpNote.trim().length >= 10
      : decision === "not-eligible"
        ? decisionReason.trim().length >= 10
        : !!decision;
  const autoConclusion = (() => {
    if (!decision) return "";
    if (decision === "eligible")
      return `Horses ${horse?.name || ""} is fit for training.`;
    if (decision === "conditional")
      return `Horse ${horse?.name || ""} is eligible, but needs monitoring: ${followUpNote.trim() || "monitoring details not entered"}.`;
    return `Horses ${horse?.name || ""} is not fit for training and training is locked. Reason: ${decisionReason.trim() || "no reason provided"}.`;
  })();
  const concText = autoConclusion.trim();
  const conclusionDone =
    !!currentPreview &&
    currentPreview.level !== "INCOMPLETE" &&
    decisionDetailsDone &&
    concText.length >= 10;
  const done = [!!horse, vitalsDone, regionsDone, conclusionDone];
  const current = done.findIndex((d) => !d);
  const suggestionText = currentPreview?.systemNote ?? "";

  // ── Lỗi từng trường ──
  const vitalError = (d: VitalDef) => {
    const s = vs[d.key];
    if (s.error) return s.error;
    if (tried && s.kind === "empty") return `Enter ${d.label.toLowerCase()}.`;
    return "";
  };
  const regionError = (k: string) => {
    if (tried && !regions[k]) return 'Select "Normal" or "Abnormal".';
    return "";
  };
  const noteError = (k: string) =>
    regions[k] === "bad" &&
    (tried || (notes[k] ?? "") !== "") &&
    (notes[k] || "").trim().length < 3
      ? "Describe the abnormality (at least 3 characters)."
      : "";
  const conclusionError =
    tried && !decisionDetailsDone
      ? "Complete the required conclusion fields."
      : "";
  const missing = [
    !horse && "horse selection",
    !vitalsDone && "vital signs",
    !regionsDone && "clinical examination",
    !conclusionDone && "conclusion",
  ].filter(Boolean) as string[];

  const submitReview = () => {
    setTried(true);
    if (missing.length) return;
    setConfirm(true);
  };

  const buildRecord = (): HealthRecord => {
    const clinicalMap = Object.fromEntries(
      REGION_DEFS.map((r) => [
        r.legacy,
        regions[r.key] === "bad" ? "abnormal" : "normal",
      ]),
    ) as Record<string, string>;
    const regionData: Record<string, { ok: boolean; note: string }> = {};
    REGION_DEFS.forEach((r) => {
      regionData[r.key] = {
        ok: regions[r.key] === "ok",
        note: regions[r.key] === "bad" ? (notes[r.key] || "").trim() : "",
      };
    });
    const elig: "eligible" | "conditional" | "not-eligible" = decision as
      | "eligible"
      | "conditional"
      | "not-eligible";
    const result: HealthRecord["result"] =
      elig === "eligible"
        ? "Eligible"
        : elig === "conditional"
          ? "Monitor"
          : "Injured";
    const abnLines = findings.map((f) => `- ${f.label}: ${f.text}`);
    const type = postSession
      ? "Post-training examination"
      : isIntake
        ? "Intake examination"
        : examType;
    const adj =
      elig === "eligible"
        ? ["Train normally according to the current plan."]
        : elig === "conditional"
          ? [
              "Reduce training intensity and monitor the horse's response.",
              "Reassess after the session.",
            ]
          : [
              "Suspend training immediately.",
              "Re-examine before training resumes.",
            ];
    return {
      id: nextMedId(state.healthRecords),
      horseId: horse!.id,
      date: today,
      createdAt: Date.now(),
      type,
      vet: user.name,
      vetId: user.id,
      intake: isIntake || undefined,
      notes: abnLines.length
        ? abnLines.join("\n")
        : "All examination regions are normal.",
      result,
      medications: medications.trim() || "None",
      isPostTraining: !!postSession,
      vetClearanceGranted: elig === "eligible",
      vitals: {
        heartRate: String(vs.heartRate.n),
        temperature: String(vs.temperature.n),
        weight: wt.empty ? "" : String(Number(weight.replace(",", "."))),
        respRate: String(vs.respRate.n),
        bloodPressure: "",
      },
      clinical: clinicalMap as HealthRecord["clinical"],
      regions: regionData,
      decision: decision as Decision,
      conclusion: concText,
      status: "confirmed",
      followUpNote:
        decision === "conditional" ? followUpNote.trim() : undefined,
      decisionReason:
        decision === "not-eligible" ? decisionReason.trim() : undefined,
      autoEvaluation: overall,
      autoNote: abnLines.join("\n"),
      diagnosis: concText,
      recommendations: recommendations.trim(),
      ownerId: horse!.ownerId,
      headTrainerId: horse!.headTrainerId,
      managerId: club?.managerId,
      trainingEligibility: elig,
      trainingReasons: findings.map((f) => `${f.label}: ${f.text}`),
      trainingAdjustments: adj,
      trainingNote: concText,
      nutritionSuggestions: [],
    };
  };

  const [saving, setSaving] = useState(false);
  const [pendingRecord, setPendingRecord] = useState<HealthRecord | null>(null);
  const doSave = async () => {
    if (!horse || saving) return;
    const fresh = buildRecord();
    const rec = pendingRecord
      ? { ...fresh, id: pendingRecord.id, profileId: pendingRecord.profileId }
      : fresh;
    setPendingRecord(rec);
    setSaveError("");
    setSaving(true);
    try {
      if (postSession && onPostSubmit) {
        const err = await onPostSubmit(postSession.id, rec);
        if (err) {
          setSaveError(err);
          return;
        }
        setSaved(rec);
      } else {
        const saved = await onSaveRecord(rec);
        onSave(
          `Medical record saved ${saved.id} — ${DECISION_LABEL[saved.decision!]}`,
        );
        setSaved(saved);
      }
      setPendingRecord(null);
      setConfirm(false);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setPendingRecord(null);
    setHorseId("");
    setQuery("");
    setVit({ temperature: "", heartRate: "", respRate: "" });
    setWeight("");
    setRegions({});
    setNotes({});
    setDecision("");
    setFollowUpNote("");
    setDecisionReason("");
    setRecommendations("");
    setMedications("");
    setTried(false);
    setSaved(null);
    setSaveError("");
    setExamType("Routine examination");
  };
  const leave = () =>
    postSession && onBack ? onBack() : navigate("health-records");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visible
      .filter(
        (h) =>
          !q ||
          h.name.toLowerCase().includes(q) ||
          h.id.toLowerCase().includes(q) ||
          dispId("HRS", h.id).toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [visible, query]);

  // ── Trạng thái rỗng ──
  if (!postSession && visible.length === 0) {
    return (
      <div className="max-w-3xl space-y-5">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#0f1729]">
            Health examination
          </h2>
          <p className="text-sm text-gray-500">
            Record measurements, clinical findings and conclusions for assigned
            horses.
          </p>
        </div>
        <Card className="p-10 text-center">
          <div className="mb-3 text-5xl">🩺</div>
          <h3 className="font-serif text-lg font-bold text-[#0f1729]">
            No horses are available for examination
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
            Only horses assigned by the manager and accepted by you appear here.
            Open "Assigned examinations" to view and accept pending cases.
          </p>
          <Btn
            variant="gold"
            className="mt-5"
            onClick={() => navigate("vet-assign")}
          >
            Open "Assigned examinations" →
          </Btn>
        </Card>
      </div>
    );
  }

  // ── Thành công ──
  if (saved) {
    const ok = saved.decision !== "not-eligible";
    return (
      <div className="max-w-3xl space-y-5">
        <Card
          className={`border-l-4 p-6 ${ok ? "border-emerald-500 bg-emerald-50" : "border-red-500 bg-red-50"}`}
        >
          <div className="flex items-start gap-4">
            <span className="text-4xl">{ok ? "✅" : "🚫"}</span>
            <div className="flex-1">
              <div
                className={`font-serif text-lg font-bold ${ok ? "text-emerald-800" : "text-red-800"}`}
              >
                Medical record saved
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <IdChip kind="MED" id={saved.id} />
                <span>{saved.date}</span>
                <span>· {horse?.name}</span>
                <DecisionPill d={saved.decision} />
              </div>
              <p className="mt-3 rounded-lg border border-white/60 bg-white/70 p-3 text-sm text-gray-800">
                {saved.conclusion}
              </p>
              {isIntake && (
                <p className="mt-3 text-sm text-gray-600">
                  This is an initial examination — the conclusion has been sent
                  to the manager for admission review.
                </p>
              )}
              {saved.decision === "not-eligible" && !isIntake && (
                <p className="mt-3 text-sm text-red-700">
                  The horse is not fit for training. Releasing the lock later
                  requires a reason in "Post-training examinations and locks".
                </p>
              )}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {postSession ? (
              <Btn variant="primary" onClick={leave}>
                ← Back to list
              </Btn>
            ) : (
              <>
                <Btn variant="gold" onClick={reset}>
                  Examine another horse
                </Btn>
                <Btn
                  variant="secondary"
                  onClick={() => navigate("health-records")}
                >
                  View medical records
                </Btn>
              </>
            )}
          </div>
        </Card>
      </div>
    );
  }

  const SectionHead = ({
    n,
    title,
    sub,
  }: {
    n: number;
    title: string;
    sub: string;
  }) => (
    <div className="mb-4 flex items-start gap-3">
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#1a2844] text-xs font-bold text-white">
        {n}
      </span>
      <div>
        <h3 className="font-serif text-base font-bold text-[#0f1729]">
          {title}
        </h3>
        <p className="text-xs text-gray-500">{sub}</p>
      </div>
    </div>
  );

  const seg = (active: boolean, tone: "ok" | "bad") =>
    `flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${active ? (tone === "ok" ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-red-500 bg-red-50 text-red-700") : "border-gray-200 bg-white text-gray-500 hover:border-[#c9973b]"}`;

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#0f1729]">
            {postSession ? "Post-training examination" : "Health examination"}
          </h2>
          <p className="text-sm text-gray-500">
            {user.name} · {today}
            {postSession
              ? ` · Session ${postSession.type} ${postSession.distance}`
              : ""}
          </p>
        </div>
        <Btn variant="secondary" onClick={leave}>
          Cancel
        </Btn>
      </div>

      {/* Tiến trình */}
      <Card className="px-4 py-4">
        <ol className="flex items-start" aria-label="Examination progress">
          {STEPS.map((label, i) => {
            const isDone = done[i];
            const cur = current === i;
            return (
              <li
                key={label}
                className="flex flex-1 flex-col items-center text-center"
              >
                <div className="flex w-full items-center">
                  <div
                    className={`h-0.5 flex-1 ${i === 0 ? "opacity-0" : isDone || cur ? "bg-emerald-400" : "bg-gray-200"}`}
                  />
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isDone ? "bg-emerald-500 text-white" : cur ? "bg-[#c9973b] text-white ring-4 ring-[#c9973b]/20" : "bg-gray-100 text-gray-400"}`}
                  >
                    {isDone ? "✓" : i + 1}
                  </span>
                  <div
                    className={`h-0.5 flex-1 ${i === STEPS.length - 1 ? "opacity-0" : isDone ? "bg-emerald-400" : "bg-gray-200"}`}
                  />
                </div>
                <span
                  className={`mt-1.5 text-[11px] leading-tight ${cur ? "font-semibold text-[#0f1729]" : "text-gray-500"}`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </Card>

      {tried && missing.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          Missing or invalid: <b>{missing.join(", ")}</b>. Fields requiring
          correction are highlighted in red.
        </div>
      )}
      {saveError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {saveError}
        </div>
      )}

      {/* 1. Chọn ngựa */}
      <Card className="p-5">
        <SectionHead
          n={1}
          title="Choose horse"
          sub="Enter a horse name or ID (HRS-…) — only horses assigned to you are shown."
        />
        {postSession && horse ? null : !horse ? (
          <div className="relative">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Search horses<span className="ml-0.5 text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                🔍
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocus(true)}
                onBlur={() => setTimeout(() => setFocus(false), 150)}
                placeholder="e.g. Red Comet or HRS-000006"
                className={`w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b] ${tried ? "border-red-400 bg-red-50/40" : "border-gray-300"}`}
              />
            </div>
            {tried ? (
              <p className="mt-0.5 text-xs text-red-600">
                Select a horse to begin the examination.
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-gray-400">
                There are {visible.length} horses available for examination.
                Select one to display its profile below.
              </p>
            )}
            {(focus || query) && (
              <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                {matches.length === 0 && (
                  <li className="px-4 py-3 text-sm text-gray-400">
                    No horses match "{query}".
                  </li>
                )}
                {matches.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setHorseId(h.id);
                        setQuery("");
                        setFocus(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[#c9973b]/10"
                    >
                      {h.imageUrl ? (
                        <img
                          src={h.imageUrl || undefined}
                          alt=""
                          className="h-9 w-9 rounded-lg bg-gray-200 object-cover"
                        />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                          🐎
                        </span>
                      )}
                      <span className="flex-1">
                        <span className="block text-sm font-semibold text-[#0f1729]">
                          {h.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {dispId("HRS", h.id)} · {h.breed} · {ageText(h)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {horse && (
          <div className={postSession ? "" : "mt-0"}>
            <div className="flex flex-wrap items-start gap-4">
              {horse.imageUrl ? (
                <img
                  src={horse.imageUrl || undefined}
                  alt={horse.name}
                  className="h-24 w-24 rounded-xl bg-gray-200 object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-gray-100 text-3xl">
                  🐎
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-serif text-lg font-bold text-[#0f1729]">
                    {horse.name}
                  </span>
                  <IdChip kind="HRS" id={horse.id} />
                  {isIntake && (
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                      Intake examination
                    </span>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                  {[
                    ["Age", ageText(horse)],
                    ["Gender", GENDER_LABEL[horse.gender] || horse.gender],
                    ["Declared weight", `${horse.weight} kg`],
                    ["Breed", horse.breed],
                    ["Coat colour", horse.color],
                    ["Height", `${horse.height} cm`],
                    ["Horse Owner", horse.ownerName],
                    ["Identification code", horse.microchip || "—"],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div className="text-[11px] uppercase tracking-wide text-gray-400">
                        {k}
                      </div>
                      <div className="truncate font-medium text-gray-800">
                        {v}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {!postSession && (
                <Btn
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setHorseId("");
                  }}
                >
                  Change horse
                </Btn>
              )}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Owner-declared medical history
                </div>
                <p className="text-sm text-gray-700">
                  {horse.medicalHistory?.trim() ||
                    "The owner has not provided a medical history."}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Previous examinations ({horseRecords.length})
                </div>
                {horseRecords.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    This is the horse's first examination.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {horseRecords.slice(0, 3).map((r) => (
                      <li key={r.id} className="text-xs text-gray-600">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <IdChip kind="MED" id={r.id} />
                          <span>{r.date}</span>
                          <DecisionPill d={recordDecision(r)} small />
                        </div>
                        <div className="mt-0.5 line-clamp-2 text-gray-500">
                          {r.conclusion || r.diagnosis || r.notes}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            {!postSession && !isIntake && (
              <div className="mt-4 max-w-xs">
                <Select
                  label="Examination type"
                  required
                  value={examType}
                  onChange={setExamType}
                  hint="Used to classify records when reviewing history."
                  options={[
                    {
                      value: "Routine examination",
                      label: "Routine examination",
                    },
                    {
                      value: "Pre-training examination",
                      label: "Pre-training examination",
                    },
                    {
                      value: "Injury examination",
                      label: "Injury examination",
                    },
                  ]}
                />
              </div>
            )}
          </div>
        )}
      </Card>

      {horse && (
        <>
          {/* 2. Chỉ số sinh tồn */}
          <Card className="p-5">
            <SectionHead
              n={2}
              title="Vital signs"
              sub="Measure with the horse at rest and calm for at least 10 minutes. All three measurements are required."
            />
            <div className="grid gap-4 md:grid-cols-3">
              {VITAL_DEFS.map((d) => {
                const s = vs[d.key];
                const err = vitalError(d);
                const border = err
                  ? "border-red-400 bg-red-50/40"
                  : s.kind === "normal"
                    ? "border-emerald-400 bg-emerald-50"
                    : s.kind === "mild" || s.kind === "severe"
                      ? "border-red-400 bg-red-50"
                      : "border-gray-300";
                const pv = prev?.vitals?.[d.key];
                return (
                  <div
                    key={d.key}
                    className="rounded-xl border border-gray-200 p-3"
                  >
                    <label className="mb-0.5 block text-sm font-semibold text-gray-800">
                      {d.icon} {d.label}
                      <span className="ml-0.5 text-red-500">*</span>
                    </label>
                    <p className="mb-2 text-[11px] leading-snug text-gray-500">
                      Why measure: {d.reason}
                    </p>
                    <div className="relative">
                      <input
                        inputMode="decimal"
                        value={vit[d.key]}
                        onChange={(e) =>
                          setVit((p) => ({ ...p, [d.key]: e.target.value }))
                        }
                        placeholder={d.example}
                        aria-invalid={!!err}
                        className={`w-full rounded-lg border-2 py-2 pl-3 pr-20 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#c9973b] ${border}`}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        {d.unit}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-[#1a2844]/5 px-1.5 py-0.5 text-[11px] font-medium text-[#1a2844]">
                        Normal: {rangeText(d)}
                      </span>
                      <VitalStatusPill s={s} />
                    </div>
                    {err ? (
                      <p className="mt-1 text-xs text-red-600">{err}</p>
                    ) : s.kind === "severe" ? (
                      <p className="mt-1 text-xs text-red-600">
                        Significantly outside the reference range — repeat the
                        measurement to confirm.
                      </p>
                    ) : pv ? (
                      <p className="mt-1 text-xs text-gray-400">
                        Previous: {fmtNum(Number(pv))} {d.unit}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 max-w-xs">
              <Input
                label="Measured weight (kg)"
                value={weight}
                onChange={setWeight}
                placeholder="VD: 505"
                hint="Optional. Used for nutritional monitoring and medication dosing."
                error={wt.error}
              />
            </div>
            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Reference ranges
              </div>
              <table className="w-full text-xs text-gray-700">
                <tbody>
                  {VITAL_DEFS.map((d) => (
                    <tr
                      key={d.key}
                      className="border-t border-gray-100 first:border-0"
                    >
                      <td className="py-1 pr-3">{d.label}</td>
                      <td className="py-1 font-medium">{rangeText(d)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[11px] italic leading-snug text-amber-700">
                {THRESHOLD_SOURCE}
              </p>
            </div>
          </Card>

          {/* 3. Khám lâm sàng */}
          <Card className="p-5">
            <SectionHead
              n={3}
              title="Regional clinical examination"
              sub="Select Normal or Abnormal for each region. Abnormal findings require descriptive notes."
            />
            <div className="space-y-3">
              {REGION_DEFS.map((r) => {
                const v = regions[r.key] || "";
                const e = regionError(r.key);
                return (
                  <div
                    key={r.key}
                    className={`rounded-xl border p-3 ${e ? "border-red-300 bg-red-50/30" : v === "bad" ? "border-red-200 bg-red-50/30" : "border-gray-200"}`}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-gray-800">
                          {r.icon} {r.label}
                          <span className="ml-0.5 text-red-500">*</span>
                        </div>
                        <div className="text-[11px] leading-snug text-gray-500">
                          {r.hint}
                        </div>
                        <div className="text-[11px] leading-snug text-gray-400">
                          Why examine: {r.reason}
                        </div>
                      </div>
                      <div className="flex w-full gap-2 sm:w-72">
                        <button
                          type="button"
                          className={seg(v === "ok", "ok")}
                          onClick={() =>
                            setRegions((p) => ({ ...p, [r.key]: "ok" }))
                          }
                        >
                          Normal
                        </button>
                        <button
                          type="button"
                          className={seg(v === "bad", "bad")}
                          onClick={() =>
                            setRegions((p) => ({ ...p, [r.key]: "bad" }))
                          }
                        >
                          Abnormal
                        </button>
                      </div>
                    </div>
                    {e && <p className="mt-1 text-xs text-red-600">{e}</p>}
                    {v === "bad" && (
                      <div className="mt-2">
                        <Input
                          label="Abnormal finding description"
                          required
                          value={notes[r.key] || ""}
                          onChange={(x) =>
                            setNotes((p) => ({ ...p, [r.key]: x }))
                          }
                          maxLength={200}
                          placeholder="e.g. Mild swelling of the right fetlock with pain on palpation"
                          hint="Record the location and observed findings (up to 200 characters)."
                          error={noteError(r.key)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 4. Kết luận */}
          <Card className="p-5">
            <SectionHead
              n={4}
              title="Training decision"
              sub="The system sets the decision from the entered data; it cannot be changed manually."
            />
            {decisionLocked ? (
              <div
                role="status"
                className="mb-4 flex items-start gap-3 rounded-xl border border-dashed border-slate-400 bg-slate-100 p-4 text-slate-700"
              >
                <span aria-hidden="true" className="text-lg leading-none">
                  🔒
                </span>
                <div>
                  <p className="text-sm font-semibold">
                    Complete steps 2 and 3 so the system can set the decision.
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Missing or invalid: {lockMissing.join(", ")}.
                  </p>
                </div>
              </div>
            ) : previewFailed ? (
              <div
                role="alert"
                className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
              >
                <p className="flex-1 text-sm font-semibold">
                  Could not get the system's assessment from the server.
                </p>
                <Btn
                  size="sm"
                  variant="secondary"
                  onClick={() => setPreviewRetry((n) => n + 1)}
                >
                  Try again
                </Btn>
              </div>
            ) : suggestionPending ? (
              <div
                role="status"
                aria-live="polite"
                className="mb-4 flex items-center gap-3 rounded-xl border border-slate-300 bg-slate-50 p-4 text-slate-600"
              >
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"
                />
                <p className="text-sm font-medium">
                  Calculating the system's assessment…
                </p>
              </div>
            ) : (
              <div className={`mb-4 rounded-xl border p-4 ${overallCfg.cls}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span>{overallCfg.icon}</span>
                  <span className="text-sm font-bold">
                    Overall condition: {overallCfg.label}
                  </span>
                  <span className="text-xs opacity-75">
                    (derived from the most severe finding)
                  </span>
                </div>
                <>
                  <p className="mt-1 text-sm">
                    <b>System assessment:</b> {suggestionText}
                  </p>
                  {findings.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-xs">
                      {findings.map((f, i) => (
                        <li key={i}>
                          {f.level === "fail" ? "✕" : "⚠"} <b>{f.label}:</b>{" "}
                          {f.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              </div>
            )}

            <div className="mt-4">
              <div className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                Decision
                <span aria-hidden="true" title="Set by the system">
                  🔒
                </span>
              </div>
              <div
                role="radiogroup"
                aria-label="Decision set automatically by the system"
                className="grid gap-2 md:grid-cols-3"
              >
                {(
                  [
                    ["eligible", "✓ Eligible for training", "border-emerald-500 bg-emerald-50 text-emerald-800"],
                    ["conditional", "! Eligible, but needs monitoring", "border-amber-500 bg-amber-50 text-amber-800"],
                    ["not-eligible", "✕ Not fit; lock training", "border-red-500 bg-red-50 text-red-700"],
                  ] as const
                ).map(([value, label, activeCls]) => (
                  <div
                    key={value}
                    role="radio"
                    aria-checked={decision === value}
                    aria-disabled="true"
                    className={`cursor-not-allowed select-none rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold ${decision === value ? activeCls : "border-slate-200 bg-slate-50 text-slate-400"}`}
                  >
                    {label}
                  </div>
                ))}
              </div>
              {decisionLocked ? (
                <p className="mt-0.5 text-xs text-slate-500">
                  The system sets the decision once steps 2 and 3 are complete.
                </p>
              ) : decision ? (
                <p className="mt-0.5 text-xs text-gray-500">
                  Set automatically from the examination data and cannot be
                  changed manually. When the system sets "Not fit", training is
                  paused for a horse currently in training.
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-slate-500">
                  Waiting for the system's assessment…
                </p>
              )}
              {decision === "conditional" && (
                <div className="mt-4">
                  <Textarea
                    label="Monitoring instructions"
                    required
                    rows={2}
                    value={followUpNote}
                    onChange={setFollowUpNote}
                    placeholder="Example: Monitor heart rate and reduce intensity by 20% for 7 days"
                    hint="At least 10 characters."
                  />
                </div>
              )}
              {decision === "not-eligible" && (
                <div className="mt-4">
                  <Textarea
                    label="Reason for training lock"
                    required
                    rows={2}
                    value={decisionReason}
                    onChange={setDecisionReason}
                    placeholder="Describe the findings or risks preventing the horse from training"
                    hint="At least 10 characters."
                  />
                </div>
              )}
              {conclusionError && (
                <p className="mt-2 text-xs text-red-600">{conclusionError}</p>
              )}
            </div>

            {decision && (
              <div className="mt-4 rounded-xl border-l-4 border-[#c9973b] bg-[#c9973b]/10 p-4">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#8a6620]">
                  The generated conclusion will appear in the record
                </div>
                <p className="text-sm text-gray-800">{autoConclusion}</p>
              </div>
            )}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Textarea
                label="Recommendations (optional)"
                rows={2}
                value={recommendations}
                onChange={setRecommendations}
                placeholder="e.g. Rest for 3 days, cold therapy, re-examine after 1 week"
                hint="Instructions for trainers and grooms."
              />
              <Textarea
                label="Medication / instructions (optional)"
                rows={2}
                value={medications}
                onChange={setMedications}
                placeholder="e.g. Vitamin E 500 IU/day"
                hint="Record the medication name and dose, if prescribed."
              />
            </div>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3 pb-6">
            <p className="text-xs text-gray-500">
              You can review all details before saving.
            </p>
            <div className="flex gap-2">
              <Btn variant="secondary" onClick={leave}>
                Cancel
              </Btn>
              <Btn
                variant={willLock ? "danger" : "gold"}
                onClick={submitReview}
              >
                {willLock
                  ? "Review and save (will lock training)"
                  : "Review and save"}
              </Btn>
            </div>
          </div>
        </>
      )}

      {confirm && horse && (
        <Modal
          title="Confirm examination record"
          onClose={() => setConfirm(false)}
          wide
        >
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              {horse.imageUrl ? (
                <img
                  src={horse.imageUrl || undefined}
                  alt=""
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                  🐎
                </div>
              )}
              <div>
                <div className="font-semibold text-[#0f1729]">{horse.name}</div>
                <div className="text-xs text-gray-500">
                  {dispId("HRS", horse.id)} · {today} ·{" "}
                  {postSession
                    ? "Post-training examination"
                    : isIntake
                      ? "Intake examination"
                      : examType}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {VITAL_DEFS.map((d) => (
                <div
                  key={d.key}
                  className={`rounded-lg border p-2 text-center ${vs[d.key].kind === "normal" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}
                >
                  <div className="text-[11px] text-gray-500">{d.label}</div>
                  <div className="font-semibold">
                    {fmtNum(vs[d.key].n)} {d.unit}
                  </div>
                  <div className="text-[11px]">
                    {vs[d.key].kind === "normal" ? "Normal" : "Abnormal"}
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Abnormal examination regions
              </div>
              {REGION_DEFS.filter((r) => regions[r.key] === "bad").length ===
              0 ? (
                <p className="text-gray-600">All 8 regions are normal.</p>
              ) : (
                <ul className="space-y-0.5">
                  {REGION_DEFS.filter((r) => regions[r.key] === "bad").map(
                    (r) => (
                      <li key={r.key}>
                        ⚠ <b>{r.label}:</b> {notes[r.key]}
                      </li>
                    ),
                  )}
                </ul>
              )}
            </div>
            <div className={`rounded-lg border px-3 py-2 ${overallCfg.cls}`}>
              Overall condition: <b>{overallCfg.label}</b>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Decision
                </span>
                <DecisionPill d={decision || undefined} small />
              </div>
              <p className="text-gray-800">{concText}</p>
            </div>
            {isIntake && (
              <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
                This is an initial examination. After saving, the manager will
                be notified to review the horse's admission.
              </p>
            )}
            {willLock && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                The horse's training will be LOCKED, the package paused and
                strenuous sessions cancelled.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Btn variant="secondary" onClick={() => setConfirm(false)}>
                Back to edit
              </Btn>
              <Btn variant={willLock ? "danger" : "gold"} onClick={doSave}>
                Confirm and save record
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
