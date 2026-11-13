import { type InjuryDetail, type HealthRecord } from "../../../shared/data/data";

type TEStatus = "incomplete" | "eligible" | "conditional" | "not-eligible";

interface NutritionSuggestion {
  category: string;
  items: string[];
  note: string;
}

interface TrainingEligResult {
  status: TEStatus;
  reasons: string[];
  adjustments: string[];
  trainingNote: string;
  nutritionSuggestions: NutritionSuggestion[];
}

function deriveTrainingEligibility(params: {
  hasMinVitals: boolean;
  hasFail: boolean;
  hrVal: number | null;
  tempVal: number | null;
  rrVal: number | null;
  hrSt: string;
  tempSt: string;
  rrSt: string;
  clinical: Record<string, string>;
  injuryDetails: Record<string, InjuryDetail>;
}): TrainingEligResult {
  const {
    hasMinVitals,
    hasFail,
    hrVal,
    tempVal,
    rrVal,
    hrSt,
    tempSt,
    rrSt,
    clinical,
    injuryDetails,
  } = params;

  if (!hasMinVitals)
    return {
      status: "incomplete",
      reasons: [],
      adjustments: [],
      trainingNote: "",
      nutritionSuggestions: [],
    };

  const severeInjuries = Object.entries(injuryDetails).filter(
    ([, detail]) => detail.severity === "severe",
  );

  // CASE 3: Any vital exceeds ±10% or a severe injury is recorded → not eligible
  if (hasFail || severeInjuries.length > 0) {
    const reasons: string[] = [];
    if (hrSt === "fail" && hrVal !== null)
      reasons.push(
        `Heart rate: ${hrVal} bpm (normal: 28–44) — outside the ±10% tolerance`,
      );
    if (tempSt === "fail" && tempVal !== null)
      reasons.push(
        `Temperature: ${tempVal}°C (normal: 37.2–38.3°C) — outside the ±10% tolerance`,
      );
    if (rrSt === "fail" && rrVal !== null)
      reasons.push(
        `Respiratory rate: ${rrVal} breaths/min (normal: 8–16) — outside the ±10% tolerance`,
      );
    severeInjuries.forEach(([, detail]) =>
      reasons.push(`Severe injury: ${detail.issue}`),
    );
    const adjustments = [
      "Suspend training immediately.",
      "Monitor the horse closely.",
      "Re-examine before allowing training to resume.",
    ];
    const trainingNote = `Reason:
${reasons.map((r) => `- ${r}`).join("\n")}

Recommendations:
${adjustments.map((a) => `- ${a}`).join("\n")}`;
    return {
      status: "not-eligible",
      reasons,
      adjustments,
      trainingNote,
      nutritionSuggestions: [],
    };
  }

  // CASE 2: watch — analyse causes
  const reasons: string[] = [];
  const adjustments: string[] = [];
  const nutritionSuggestions: NutritionSuggestion[] = [];
  let hasHighVital = false;
  let hasLowVital = false;

  if (hrSt === "watch" && hrVal !== null) {
    if (hrVal > 44) {
      hasHighVital = true;
      reasons.push(
        `Heart rate above reference range: ${hrVal} bpm (normal: 28–44)`,
      );
    } else {
      hasLowVital = true;
      reasons.push(
        `Heart rate below reference range: ${hrVal} bpm (normal: 28–44)`,
      );
    }
  }
  if (tempSt === "watch" && tempVal !== null) {
    if (tempVal > 38.3) {
      hasHighVital = true;
      reasons.push(
        `Temperature above reference range: ${tempVal}°C (normal: 37.2–38.3°C)`,
      );
    } else {
      hasLowVital = true;
      reasons.push(
        `Temperature below reference range: ${tempVal}°C (normal: 37.2–38.3°C)`,
      );
    }
  }
  if (rrSt === "watch" && rrVal !== null) {
    if (rrVal > 16) {
      hasHighVital = true;
      reasons.push(
        `Respiratory rate above reference range: ${rrVal} breaths/min (normal: 8–16)`,
      );
    } else {
      hasLowVital = true;
      reasons.push(
        `Respiratory rate below reference range: ${rrVal} breaths/min (normal: 8–16)`,
      );
    }
  }

  const clinicalLabels: Record<string, string> = {
    eyes: "Eyes",
    nose: "Nose",
    mouth: "Mouth / gums",
    movement: "Movement",
    eating: "Appetite",
    waste: "Manure and urine",
    skin: "Skin and coat",
    behavior: "Behavior",
  };
  const clinicalAbn: string[] = [];
  Object.entries(clinical).forEach(([k, v]) => {
    if (v === "abnormal") {
      clinicalAbn.push(k);
      const detail = injuryDetails[k];
      const severityLabel =
        detail?.severity === "moderate"
          ? "moderate"
          : detail?.severity === "severe"
            ? "severe"
            : "mild";
      reasons.push(
        `${clinicalLabels[k] || k}: ${detail?.issue || "Abnormal"} (${severityLabel})`,
      );
    }
  });

  // CASE 1: No issues → eligible
  if (reasons.length === 0) {
    return {
      status: "eligible",
      reasons: [],
      adjustments: ["Train normally according to the current plan."],
      trainingNote: "",
      nutritionSuggestions: [],
    };
  }

  // Build adjustments for conditional
  if (hasHighVital) {
    adjustments.push(
      "Reduce training intensity.",
      "Monitor the horse's response during training.",
      "Reassess after the session.",
    );
  } else if (hasLowVital && clinicalAbn.length === 0) {
    adjustments.push(
      "Intensity may be increased gradually if other findings are normal.",
      "Monitor the horse's response.",
      "Do not increase intensity abruptly.",
    );
  }
  if (clinicalAbn.length > 0) {
    if (!hasHighVital && !hasLowVital)
      adjustments.push("Continue monitoring during sessions.");
    adjustments.push(
      "Assess the ration.",
      "Consult the veterinarian about appropriate nutritional support.",
    );
    if (clinicalAbn.includes("skin")) {
      nutritionSuggestions.push({
        category: "Skin / Coat",
        items: ["Balanced diet", "Omega-3", "Zinc", "Copper"],
        note: "Zinc and copper support skin, hooves and connective tissue. Supplementation should be based on the actual diet and nutritional assessment.",
      });
    }
    if (clinicalAbn.includes("movement")) {
      nutritionSuggestions.push({
        category: "Joints / Movement",
        items: [
          "Assess diet and musculoskeletal condition",
          "Nutritional joint support (as directed by the veterinarian)",
        ],
        note: "This does not establish a diagnosis of arthritis. Movement problems require a clinical examination and gait assessment.",
      });
    }
    if (clinicalAbn.includes("eating") || clinicalAbn.includes("behavior")) {
      nutritionSuggestions.push({
        category: "Muscles / Recovery",
        items: [
          "Assess dietary energy and protein",
          "Ensure adequate water intake",
          "Electrolytes (as assessed by the veterinarian when dehydration is present)",
        ],
        note: "Do not automatically prescribe electrolytes or specific products without veterinary direction.",
      });
    }
    if (clinicalAbn.includes("nose") || clinicalAbn.includes("waste")) {
      adjustments.push("Check drinking water and stable hygiene.");
    }
  }

  const trainingNote = `Reason:
${reasons.map((r) => `- ${r}`).join("\n")}

Recommendations:
${adjustments.map((a) => `- ${a}`).join("\n")}`;
  return {
    status: "conditional",
    reasons,
    adjustments,
    trainingNote,
    nutritionSuggestions,
  };
}

function TrainingEligibilityCard({
  result,
  recordId,
  compact = false,
}: {
  result: TrainingEligResult;
  recordId?: string;
  compact?: boolean;
}) {
  if (result.status === "incomplete") {
    return (
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <span className="text-2xl">📋</span>
        <div className="text-sm text-gray-500">
          Enter vital signs (at least temperature and heart rate) to view
          training eligibility.
        </div>
      </div>
    );
  }

  const cfg = {
    eligible: {
      dot: "🟢",
      label: "FIT FOR TRAINING",
      banner: "bg-emerald-50 border-emerald-400",
      title: "text-emerald-800",
      pill: "bg-emerald-100 text-emerald-800 border-emerald-200",
      arrowIcon: "↑",
      arrowColor: "text-emerald-700",
    },
    conditional: {
      dot: "🟡",
      label: "FIT WITH MONITORING",
      banner: "bg-amber-50 border-amber-400",
      title: "text-amber-800",
      pill: "bg-amber-100 text-amber-800 border-amber-200",
      arrowIcon: "↕",
      arrowColor: "text-amber-700",
    },
    "not-eligible": {
      dot: "🔴",
      label: "NOT FIT FOR TRAINING",
      banner: "bg-red-50 border-red-500",
      title: "text-red-800",
      pill: "bg-red-100 text-red-800 border-red-200",
      arrowIcon: "⛔",
      arrowColor: "text-red-700",
    },
  } as const;
  const c = cfg[result.status as keyof typeof cfg];

  return (
    <div className="space-y-3">
      {/* Status banner */}
      <div
        className={`flex items-center gap-4 p-4 rounded-xl border-2 ${c.banner}`}
      >
        <span className="text-3xl leading-none">{c.dot}</span>
        <div>
          <div className={`font-bold text-lg tracking-wide ${c.title}`}>
            {c.label}
          </div>
          {result.status === "eligible" && (
            <div className="text-sm text-emerald-700 mt-0.5">
              May train according to the current plan.
            </div>
          )}
          {result.status === "not-eligible" && (
            <div className="text-sm text-red-700 mt-0.5">
              Training suspended — re-examination required.
            </div>
          )}
        </div>
      </div>

      {!compact && result.reasons.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Reason
          </div>
          <div className="space-y-1.5">
            {result.reasons.map((r, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 text-sm px-3 py-2 rounded-lg border ${result.status === "not-eligible" ? "bg-red-50 border-red-100 text-red-700" : "bg-amber-50 border-amber-100 text-amber-800"}`}
              >
                <span className="font-bold mt-0.5 flex-shrink-0">
                  {result.status === "not-eligible" ? "✕" : "⚠"}
                </span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!compact && result.adjustments.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Training adjustments
          </div>
          <div className="space-y-1.5">
            {result.adjustments.map((a, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-sm ${c.arrowColor} font-medium`}
              >
                <span>{c.arrowIcon}</span>
                <span>{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!compact && result.trainingNote && (
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3 font-semibold text-sm text-gray-700">
            <span>📝</span> Training Note
            <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              Automatically generated
            </span>
          </div>
          <pre className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed font-sans">
            {result.trainingNote}
          </pre>
        </div>
      )}

      {!compact && result.nutritionSuggestions.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Nutritional support suggestions
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-3 text-xs text-amber-700">
            ⚠️ <strong>Disclaimer:</strong> These suggestions do not replace
            veterinary diagnosis or treatment instructions.
          </div>
          <div className="space-y-2">
            {result.nutritionSuggestions.map((ns, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-4 border border-gray-200"
              >
                <div className="font-semibold text-sm text-gray-800 mb-2">
                  🌿 {ns.category}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {ns.items.map((item, j) => (
                    <span
                      key={j}
                      className="text-xs bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 rounded-full"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <div className="text-xs text-gray-500 italic">{ns.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recordId && (
        <div className="text-xs text-gray-400 pt-1">
          Source: Health Examination #{recordId}
        </div>
      )}
    </div>
  );
}

export function parseDDMMYYYY(d: string): number {
  const p = d.split("/");
  if (p.length !== 3) return 0;
  return new Date(+p[2], +p[1] - 1, +p[0]).getTime();
}

export function sortHealthRecords(records: HealthRecord[]): HealthRecord[] {
  return [...records].sort((a, b) => {
    const diff = parseDDMMYYYY(b.date) - parseDDMMYYYY(a.date);
    return diff !== 0 ? diff : (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });
}
