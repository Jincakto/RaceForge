import { type FoodKind, type InvCategory, type InvUnit, type Horse, type InvItem, RATIONS, type CareRecord, type InvLog } from "../../../shared/data/data";
import { Btn, Card, Select, Textarea, Input } from "../../../shared/ui/ui";
import { type Page, type AppState } from "../../../app/appTypes";
import { useState } from "react";
import { TODAY } from "../../../shared/data/today";
import { sortHealthRecords } from "../../medical/components/TrainingEligibilityCard";
import { StatCard } from "../../../shared/ui/StatCard";
import { ImageUpload } from "../components/HorseProfileWidgets";

export function toDDMMYYYY(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

type CareResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
      shortages: {
        itemId: string;
        name: string;
        have: number;
        need: number;
        unit: string;
      }[];
    };

type SupplyLine = { itemId: string; qty: number };

const CARE_LABELS: Record<string, string> = {
  "feed-Morning": "Morning feed",
  "feed-Noon": "Midday feed",
  "feed-Evening": "Evening feed",
  clean: "Clean stable",
  bath: "Bathing",
  ice: "Ice foot bath",
  treat: "Treatment support",
};

const FOOD_KIND_LABEL: Record<FoodKind, string> = {
  grain: "Grain",
  hay: "Grass",
  vitamin: "Vitamin",
  other: "Other",
};

const INV_CAT_LABEL: Record<InvCategory, string> = {
  food: "Feed",
  medical: "Medication and medical supplies",
  tool: "Equipment",
};

const INV_UNITS: InvUnit[] = ["kg", "liters", "packages", "items"];

export function needsTreatment(h: Horse): boolean {
  return !!h.lock || h.healthStatus === "Injured";
}

export function numOf(v: string): number {
  return v.trim() === "" ? NaN : Number(v.replace(",", "."));
}

function shiftDate(d: string, off: number): string {
  const [dd, mm, yy] = d.split("/").map(Number);
  const x = new Date(yy, mm - 1, dd + off);
  return `${String(x.getDate()).padStart(2, "0")}/${String(x.getMonth() + 1).padStart(2, "0")}/${x.getFullYear()}`;
}

export function toISO(d: string): string {
  const [dd, mm, yy] = d.split("/");
  return `${yy}-${mm}-${dd}`;
}

export function fmtQty(n: number): string {
  return String(Math.round(n * 100) / 100);
}

export function isLow(i: InvItem): boolean {
  return i.qty <= i.threshold;
}

export function dailyTasks(h: Horse) {
  const ration = RATIONS[h.id];
  const defTime = {
    Morning: "06:00",
    Noon: "12:00",
    Evening: "18:00",
  } as const;
  const meals = (["Morning", "Noon", "Evening"] as const).map((m) => {
    const r = ration?.meals.find((x) => x.meal === m);
    return {
      key: `feed-${m}`,
      icon: "🌾",
      label: CARE_LABELS[`feed-${m}`],
      time: r?.time || defTime[m],
      desc: r
        ? `${r.grain} kg grain · ${r.hay} kg forage${r.vitamin ? ` · ${r.vitamin} packages ${r.vitaminName}` : ""}`
        : "No approved ration",
    };
  });
  const chores = [
    {
      key: "clean",
      icon: "🧽",
      label: CARE_LABELS.clean,
      time: "08:00",
      desc: "Remove manure, replace bedding and disinfect the stable floor",
    },
    {
      key: "bath",
      icon: "🚿",
      label: CARE_LABELS.bath,
      time: "09:00",
      desc: "Wash, dry and groom",
    },
    {
      key: "ice",
      icon: "🧊",
      label: CARE_LABELS.ice,
      time: "10:00",
      desc: "Apply an ice foot bath for about 20 minutes and check for heat or swelling",
    },
  ];
  const treat = needsTreatment(h)
    ? [
        {
          key: "treat",
          icon: "🩹",
          label: CARE_LABELS.treat,
          time: "16:00",
          desc: "Follow the veterinarian's instructions",
        },
      ]
    : [];
  return [...meals, ...chores, ...treat].sort((a, b) =>
    a.time.localeCompare(b.time),
  );
}

function SupplyPicker({
  items,
  rows,
  setRows,
}: {
  items: InvItem[];
  rows: { itemId: string; qty: string }[];
  setRows: (r: { itemId: string; qty: string }[]) => void;
}) {
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex gap-2 items-center">
          <select
            value={r.itemId}
            onChange={(e) =>
              setRows(
                rows.map((x, j) =>
                  j === i ? { ...x, itemId: e.target.value } : x,
                ),
              )
            }
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="">— Select a supply —</option>
            {items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.name} (remaining {fmtQty(it.qty)} {it.unit})
              </option>
            ))}
          </select>
          <input
            value={r.qty}
            onChange={(e) =>
              setRows(
                rows.map((x, j) =>
                  j === i ? { ...x, qty: e.target.value } : x,
                ),
              )
            }
            placeholder="SL"
            inputMode="decimal"
            className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-xs text-gray-400 w-8">
            {items.find((it) => it.id === r.itemId)?.unit}
          </span>
          <button
            onClick={() => setRows(rows.filter((_, j) => j !== i))}
            className="text-gray-400 hover:text-red-500"
          >
            ✕
          </button>
        </div>
      ))}
      <Btn
        variant="ghost"
        size="sm"
        onClick={() => setRows([...rows, { itemId: "", qty: "" }])}
      >
        ＋ Add supplies used
      </Btn>
    </div>
  );
}

function CareTaskRow({
  horse,
  task,
  date,
  isToday,
  record,
  inventory,
  onComplete,
  onUndo,
  onReceive,
  navigate,
  defaultOpen = false,
}: {
  horse: Horse;
  task: ReturnType<typeof dailyTasks>[number];
  date: string;
  isToday: boolean;
  record?: CareRecord;
  inventory: InvItem[];
  onComplete: (
    horseId: string,
    key: string,
    supplies: SupplyLine[],
  ) => CareResult;
  onUndo: (id: string) => string | null;
  onReceive: (itemId: string, qty: number, dateISO: string) => string | null;
  navigate: (p: Page) => void;
  defaultOpen?: boolean;
}) {
  const isFeed = task.key.startsWith("feed-");
  const [rows, setRows] = useState<{ itemId: string; qty: string }[]>([]);
  const [open, setOpen] = useState(defaultOpen);
  const [fail, setFail] = useState<Extract<CareResult, { ok: false }> | null>(
    null,
  );
  const [recvQty, setRecvQty] = useState<Record<string, string>>({});
  const [askRecv, setAskRecv] = useState(false);
  const [err, setErr] = useState("");

  const run = () => {
    setErr("");
    const supplies: SupplyLine[] = [];
    if (!isFeed) {
      for (const r of rows) {
        if (!r.itemId && !r.qty) continue;
        const q = numOf(r.qty);
        if (!r.itemId || !(q > 0)) {
          setErr(
            "Select a supply and enter a quantity greater than 0 on each row.",
          );
          return;
        }
        supplies.push({ itemId: r.itemId, qty: q });
      }
    }
    const res = onComplete(horse.id, task.key, supplies);
    if (res.ok) {
      setFail(null);
      setAskRecv(false);
      setRows([]);
      setOpen(false);
    } else {
      setFail(res);
      setAskRecv(false);
      setRecvQty({});
    }
  };

  return (
    <Card className={`p-4 ${record ? "border-l-4 border-emerald-500" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#1a2844]/10 flex items-center justify-center text-xl flex-shrink-0">
          {task.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`font-semibold ${record ? "line-through text-gray-400" : ""}`}
            >
              {task.label}
            </span>
            <span className="font-mono text-xs text-[#c9973b]">
              {task.time}
            </span>
          </div>
          <div className="text-sm text-gray-500 mt-0.5">{task.desc}</div>
          {record && (
            <div className="mt-2 text-xs text-emerald-700">
              ✓ Completed at {record.doneAt.split(" ")[1]} · {record.byName}
              {record.deductions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {record.deductions.map((d, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700"
                    >
                      −{fmtQty(d.qty)} {d.unit} {d.itemName}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {record ? (
          isToday && (
            <Btn
              variant="secondary"
              size="sm"
              onClick={() => {
                if (
                  window.confirm(
                    "Undo completion? Used supplies will be returned to inventory.",
                  )
                ) {
                  const e = onUndo(record.id);
                  if (e) setErr(e);
                }
              }}
            >
              ↩ Undo completion
            </Btn>
          )
        ) : isToday ? (
          <div className="flex flex-col gap-2 items-end">
            <Btn variant="gold" size="sm" onClick={run}>
              {isFeed ? "✓ Fed" : "Xong ✓"}
            </Btn>
            {!isFeed && (
              <button
                onClick={() => setOpen(!open)}
                className="text-xs text-[#c9973b] hover:underline"
              >
                {open ? "Hide supplies" : "＋ Supplies used"}
              </button>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400">Not done</span>
        )}
      </div>
      {!record && isToday && !isFeed && open && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs font-medium text-gray-600 mb-2">
            Supplies used (automatically deducted from stock)
          </div>
          <SupplyPicker items={inventory} rows={rows} setRows={setRows} />
        </div>
      )}
      {err && <div className="mt-3 text-sm text-red-600">⚠ {err}</div>}
      {fail && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 space-y-2">
          <div>⛔ {fail.message}</div>
          {fail.shortages.length > 0 && !askRecv && (
            <div className="flex items-center gap-2">
              <span>Would you like to restock?</span>
              <Btn
                size="sm"
                variant="gold"
                onClick={() => {
                  setAskRecv(true);
                  setRecvQty(
                    Object.fromEntries(
                      fail.shortages.map((s) => [
                        s.itemId,
                        fmtQty(Math.ceil((s.need - s.have) * 100) / 100),
                      ]),
                    ),
                  );
                }}
              >
                Restock
              </Btn>
              <Btn size="sm" variant="secondary" onClick={() => setFail(null)}>
                Skip
              </Btn>
            </div>
          )}
          {fail.shortages.length === 0 && (
            <div className="flex gap-2">
              <Btn
                size="sm"
                variant="gold"
                onClick={() => navigate("inventory")}
              >
                Go to my inventory
              </Btn>
              <Btn size="sm" variant="secondary" onClick={() => setFail(null)}>
                Close
              </Btn>
            </div>
          )}
          {askRecv && (
            <div className="space-y-2">
              {fail.shortages.map((s) => (
                <div
                  key={s.itemId}
                  className="flex items-center gap-2 text-gray-700"
                >
                  <span className="flex-1">{s.name}: restocked</span>
                  <input
                    value={recvQty[s.itemId] || ""}
                    onChange={(e) =>
                      setRecvQty((p) => ({ ...p, [s.itemId]: e.target.value }))
                    }
                    inputMode="decimal"
                    className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-sm bg-white"
                  />
                  <span>{s.unit}</span>
                </div>
              ))}
              <div className="flex gap-2">
                <Btn
                  size="sm"
                  variant="gold"
                  onClick={() => {
                    for (const s of fail.shortages) {
                      const q = numOf(recvQty[s.itemId] || "");
                      if (!(q > 0)) {
                        setErr("Enter a restock quantity greater than 0.");
                        return;
                      }
                    }
                    for (const s of fail.shortages) {
                      const e = onReceive(
                        s.itemId,
                        numOf(recvQty[s.itemId]),
                        toISO(date),
                      );
                      if (e) {
                        setErr(e);
                        return;
                      }
                    }
                    setFail(null);
                    setAskRecv(false);
                    setErr("");
                  }}
                >
                  Add to inventory
                </Btn>
                <Btn
                  size="sm"
                  variant="secondary"
                  onClick={() => setAskRecv(false)}
                >
                  Cancel
                </Btn>
              </div>
              <div className="text-xs text-gray-500">
                After restocking, click Complete again.
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export function CareHubPage({
  state,
  navigate,
  onComplete,
  onUndo,
  onReceive,
  onReport,
}: {
  state: AppState;
  navigate: (p: Page) => void;
  onComplete: (
    horseId: string,
    key: string,
    supplies: SupplyLine[],
  ) => CareResult;
  onUndo: (id: string) => string | null;
  onReceive: (itemId: string, qty: number, dateISO: string) => string | null;
  onReport: (i: {
    horseId: string;
    type: string;
    description: string;
    imageUrl: string;
  }) => string | null;
}) {
  const me = state.user!;
  const horses = state.horses.filter(
    (h) => h.clubId === me.clubId && h.approvalStatus === "approved",
  );
  const inventory = state.inventory.filter((i) => i.clubId === me.clubId);
  const [tab, setTab] = useState<
    "map" | "ration" | "tasks" | "treat" | "incident"
  >("map");
  const [horseId, setHorseId] = useState(horses[0]?.id || "");
  const [dayOffset, setDayOffset] = useState(0);
  const date = shiftDate(TODAY, dayOffset);
  const isToday = dayOffset === 0;
  const horse = horses.find((h) => h.id === horseId) || horses[0];
  const recFor = (hId: string, key: string) =>
    state.careRecords.find(
      (r) => r.horseId === hId && r.date === date && r.taskKey === key,
    );
  const doneCount = (h: Horse) =>
    dailyTasks(h).filter((t) => recFor(h.id, t.key)).length;
  const lowItems = inventory.filter(isLow);

  const [inc, setInc] = useState({
    horseId: horse?.id || "",
    type: "Loss of appetite",
    description: "",
    imageUrl: "",
  });
  const [incErr, setIncErr] = useState("");
  const incidents = state.incidents.filter((i) => i.clubId === me.clubId);

  const stables = Array.from(new Set(horses.map((h) => h.stable))).sort();
  const treatHorses = horses.filter(needsTreatment);
  const guide = (h: Horse) => {
    const recs = state.healthRecords.filter(
      (r) =>
        r.horseId === h.id &&
        (r.diagnosis || r.recommendations || r.medications),
    );
    return sortHealthRecords(recs)[0];
  };

  const tabs = [
    ["map", "🗺 Map and schedule"],
    ["ration", "🌾 Rations"],
    ["tasks", "✅ Tasks"],
    ["treat", "🩹 Treatment"],
    ["incident", "🚨 Report incident"],
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-serif font-bold">Care and stables</h2>
          <p className="text-sm text-gray-500">
            Groom · {horses.length} horses in this area
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border rounded-xl px-2 py-1.5 text-sm">
          <button
            onClick={() => setDayOffset((d) => Math.max(-30, d - 1))}
            className="w-7 h-7 rounded-lg hover:bg-gray-100"
          >
            ‹
          </button>
          <span className="font-mono min-w-24 text-center">
            {date}
            {isToday ? " · Today" : ""}
          </span>
          <button
            onClick={() => setDayOffset((d) => Math.min(0, d + 1))}
            disabled={isToday}
            className="w-7 h-7 rounded-lg hover:bg-gray-100 disabled:opacity-30"
          >
            ›
          </button>
        </div>
      </div>
      {!isToday && (
        <Card className="p-3 bg-gray-50 text-sm text-gray-600">
          Viewing schedule for {date} (read only). Tasks can only be completed
          for today.
        </Card>
      )}
      {lowItems.length > 0 && (
        <Card
          className="p-3 border-l-4 border-amber-400 bg-amber-50"
          onClick={() => navigate("inventory")}
        >
          <div className="text-sm text-amber-800">
            📦 <strong>Running low:</strong>{" "}
            {lowItems
              .map((i) => `${i.name} (${fmtQty(i.qty)} ${i.unit})`)
              .join(", ")}{" "}
            — click to open inventory
          </div>
        </Card>
      )}

      <div className="flex gap-0 border-b border-gray-200 overflow-x-auto">
        {tabs.map(([t, l]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${tab === t ? "border-[#c9973b] text-[#c9973b]" : "border-transparent text-gray-500 hover:text-[#0f1729]"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab !== "treat" && horses.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {horses.map((h) => (
            <button
              key={h.id}
              onClick={() => {
                setHorseId(h.id);
                setInc((i) => ({ ...i, horseId: h.id }));
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm ${horse?.id === h.id ? "bg-[#1a2844] text-white border-[#1a2844]" : "bg-white text-gray-600 border-gray-200 hover:border-[#c9973b]"}`}
            >
              <img
                src={h.imageUrl || undefined}
                className="w-6 h-6 rounded-full object-cover bg-gray-200"
              />
              {h.name}
            </button>
          ))}
        </div>
      )}
      {horses.length === 0 && (
        <Card className="p-8 text-center text-sm text-gray-400">
          No horses in the center yet
        </Card>
      )}

      {horse && tab === "map" && (
        <div className="space-y-4">
          {stables.map((st) => (
            <Card key={st} className="p-5">
              <h3 className="font-semibold mb-3">🏠 {st}</h3>
              <div className="grid grid-cols-4 gap-3">
                {horses
                  .filter((h) => h.stable === st)
                  .sort((a, b) => a.stall.localeCompare(b.stall))
                  .map((h) => {
                    const total = dailyTasks(h).length;
                    const done = doneCount(h);
                    return (
                      <button
                        key={h.id}
                        onClick={() => setHorseId(h.id)}
                        className={`text-left p-3 rounded-xl border-2 transition-all ${horse.id === h.id ? "border-[#c9973b] bg-[#c9973b]/5" : "border-gray-200 hover:border-[#c9973b]"}`}
                      >
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="font-mono font-bold text-[#1a2844]">
                            Stall {h.stall}
                          </span>
                          {needsTreatment(h) && (
                            <span className="text-red-600">🩹</span>
                          )}
                        </div>
                        <img
                          src={h.imageUrl || undefined}
                          className="w-full h-20 object-cover rounded-lg bg-gray-200 mb-2"
                        />
                        <div className="font-medium text-sm truncate">
                          {h.name}
                        </div>
                        <div className="mt-1.5 w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{
                              width: `${Math.round((done / total) * 100)}%`,
                            }}
                          />
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1">
                          {done}/{total} tasks
                        </div>
                      </button>
                    );
                  })}
              </div>
            </Card>
          ))}
          <Card className="p-5">
            <h3 className="font-semibold mb-1">
              Daily schedule — {horse.name}{" "}
              <span className="text-xs text-gray-400 font-normal">
                · {horse.stable}, Stall {horse.stall} · {date}
              </span>
            </h3>
            <div className="mt-3 space-y-2">
              {dailyTasks(horse).map((t) => {
                const r = recFor(horse.id, t.key);
                return (
                  <div
                    key={t.key}
                    className="flex items-center gap-3 text-sm py-1.5 border-b border-gray-50 last:border-0"
                  >
                    <span className="font-mono text-xs text-[#c9973b] w-12">
                      {t.time}
                    </span>
                    <span>{t.icon}</span>
                    <span
                      className={`flex-1 ${r ? "line-through text-gray-400" : ""}`}
                    >
                      {t.label}
                    </span>
                    {r ? (
                      <span className="text-xs text-emerald-600">
                        ✓ {r.doneAt.split(" ")[1]}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Pending</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {horse &&
        tab === "ration" &&
        (() => {
          const ration = RATIONS[horse.id];
          if (!ration)
            return (
              <Card className="p-8 text-center text-sm text-gray-500">
                🌾 <strong>{horse.name}</strong> has no approved ration. A
                veterinarian must approve the ration before feeding.
              </Card>
            );
          const kinds = {
            grain: inventory.find((i) => i.foodKind === "grain"),
            hay: inventory.find((i) => i.foodKind === "hay"),
            vitamin: inventory.find((i) => i.foodKind === "vitamin"),
          };
          return (
            <div className="space-y-4">
              <div className="text-sm text-gray-500">
                Ration approved by {ration.approvedBy} · {ration.approvedAt}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <StatCard
                  label="Grain / day"
                  value={`${ration.meals.reduce((a, m) => a + m.grain, 0)} kg`}
                  color="gold"
                />
                <StatCard
                  label="Forage / day"
                  value={`${ration.meals.reduce((a, m) => a + m.hay, 0)} kg`}
                  color="green"
                />
                <StatCard
                  label="Vitamins / day"
                  value={`${ration.meals.reduce((a, m) => a + m.vitamin, 0)} packages`}
                  color="navy"
                />
              </div>
              {ration.meals.map((m) => (
                <Card key={m.meal} className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-mono text-sm text-[#c9973b] font-bold">
                      {m.time}
                    </span>
                    <span className="font-semibold">
                      Meal {m.meal.toLowerCase()}
                    </span>
                    {recFor(horse.id, `feed-${m.meal}`) && (
                      <span className="text-xs text-emerald-600">✓ Fed</span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    {[
                      ["Grain", `${m.grain} kg`, kinds.grain?.name],
                      ["Grass", `${m.hay} kg`, kinds.hay?.name],
                      [
                        "Vitamin",
                        m.vitamin ? `${m.vitamin} packages` : "—",
                        m.vitamin
                          ? m.vitaminName || kinds.vitamin?.name
                          : undefined,
                      ],
                      ["Water", `${m.water} liters`, undefined],
                    ].map(([k, v, sub]) => (
                      <div
                        key={k as string}
                        className="p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="text-xs text-gray-500">
                          {k as string}
                        </div>
                        <div className="font-bold">{v as string}</div>
                        {sub && (
                          <div className="text-[11px] text-gray-400 truncate">
                            {sub as string}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          );
        })()}

      {horse && tab === "tasks" && (
        <div className="space-y-3">
          <div className="text-sm text-gray-500">
            {horse.name} · {horse.stable}, Stall {horse.stall} · completed{" "}
            {doneCount(horse)}/{dailyTasks(horse).length} tasks
          </div>
          {dailyTasks(horse)
            .filter((t) => t.key !== "treat")
            .map((t) => (
              <CareTaskRow
                key={`${horse.id}-${date}-${t.key}`}
                horse={horse}
                task={t}
                date={date}
                isToday={isToday}
                record={recFor(horse.id, t.key)}
                inventory={inventory}
                onComplete={onComplete}
                onUndo={onUndo}
                onReceive={onReceive}
                navigate={navigate}
              />
            ))}
          {needsTreatment(horse) && (
            <Card className="p-3 bg-red-50 border border-red-200 text-sm text-red-700">
              🩹 {horse.name} is under treatment — see the "Treatment" tab for
              the veterinarian's instructions.
            </Card>
          )}
        </div>
      )}

      {tab === "treat" && (
        <div className="space-y-4">
          {treatHorses.length === 0 && (
            <Card className="p-8 text-center text-sm text-gray-400">
              No horses are under treatment or recovery
            </Card>
          )}
          {treatHorses.map((h) => {
            const g = guide(h);
            const task = dailyTasks(h).find((t) => t.key === "treat")!;
            return (
              <div key={h.id} className="space-y-2">
                <Card className="p-5 border-l-4 border-red-400">
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={h.imageUrl || undefined}
                      className="w-12 h-12 rounded-lg object-cover bg-gray-200"
                    />
                    <div className="flex-1">
                      <div className="font-semibold">{h.name}</div>
                      <div className="text-xs text-gray-500">
                        {h.stable}, Stall {h.stall}

                      </div>
                    </div>
                  </div>
                  {h.lock && (
                    <div className="text-sm text-red-700 mb-2">
                      <strong>Current diagnosis:</strong> {h.lock.reason}
                    </div>
                  )}
                  {g ? (
                    <div className="space-y-2 text-sm">
                      <div className="text-xs text-gray-400">
                        Veterinarian {g.vet} recorded on {g.date}
                      </div>
                      {g.diagnosis && (
                        <div>
                          <strong>Diagnosis:</strong> {g.diagnosis}
                        </div>
                      )}
                      {g.medications && g.medications !== "None" && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <strong>Medication / treatment:</strong>{" "}
                          {g.medications}
                        </div>
                      )}
                      {g.recommendations && (
                        <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg">
                          <strong>Care instructions:</strong>{" "}
                          {g.recommendations}
                        </div>
                      )}
                      {g.notes && (
                        <div className="text-gray-500">Notes: {g.notes}</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">
                      No veterinary care instructions have been recorded for
                      this horse.
                    </div>
                  )}
                </Card>
                <CareTaskRow
                  key={`${h.id}-${date}-treat`}
                  horse={h}
                  task={task}
                  date={date}
                  isToday={isToday}
                  record={recFor(h.id, "treat")}
                  inventory={inventory}
                  onComplete={onComplete}
                  onUndo={onUndo}
                  onReceive={onReceive}
                  navigate={navigate}
                  defaultOpen
                />
              </div>
            );
          })}
        </div>
      )}

      {tab === "incident" && (
        <div className="space-y-4">
          <Card className="p-5 border-l-4 border-red-400">
            <h3 className="font-semibold mb-4">
              🚨 Report an unexpected incident
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Horses"
                value={inc.horseId}
                onChange={(v) => setInc((i) => ({ ...i, horseId: v }))}
                options={horses.map((h) => ({
                  value: h.id,
                  label: `${h.name} (${h.stable}, Stall ${h.stall})`,
                }))}
              />
              <Select
                label="Incident type"
                value={inc.type}
                onChange={(v) => setInc((i) => ({ ...i, type: v }))}
                options={[
                  "Loss of appetite",
                  "Signs of colic",
                  "Fever",
                  "Hoof abrasion",
                  "Other",
                ].map((v) => ({ value: v, label: v }))}
              />
              <div className="col-span-2">
                <Textarea
                  label="Description *"
                  value={inc.description}
                  onChange={(v) => setInc((i) => ({ ...i, description: v }))}
                  placeholder="What did you observe, when did it start and how severe is it?"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image
                </label>
                <ImageUpload
                  value={inc.imageUrl}
                  onChange={(u) => setInc((i) => ({ ...i, imageUrl: u }))}
                  onRemove={() => setInc((i) => ({ ...i, imageUrl: "" }))}
                />
              </div>
            </div>
            {incErr && (
              <div className="mt-3 text-sm text-red-600">⚠ {incErr}</div>
            )}
            <Btn
              variant="danger"
              className="mt-4"
              onClick={() => {
                const e = onReport(inc);
                setIncErr(e || "");
                if (!e)
                  setInc((i) => ({ ...i, description: "", imageUrl: "" }));
              }}
            >
              Send report to veterinarian and manager
            </Btn>
          </Card>
          <h3 className="font-semibold">Submitted reports</h3>
          {incidents.length === 0 && (
            <Card className="p-5 text-sm text-gray-400 text-center">
              No reports yet
            </Card>
          )}
          {incidents.map((i) => (
            <Card key={i.id} className="p-4 flex gap-3">
              {i.imageUrl && (
                <img
                  src={i.imageUrl}
                  className="w-20 h-20 rounded-lg object-cover bg-gray-200"
                />
              )}
              <div className="flex-1 text-sm">
                <div className="font-semibold">
                  {i.horseName} · {i.type}
                </div>
                <div className="text-gray-600 mt-0.5">{i.description}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {i.at} · {i.reportedByName}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function InventoryPage({
  state,
  navigate,
  onAdd,
  onReceive,
  onEdit,
  onAdjust,
  onDelete,
}: {
  state: AppState;
  navigate: (p: Page) => void;
  onAdd: (f: {
    name: string;
    category: InvCategory;
    foodKind: FoodKind;
    unit: InvUnit;
    qty: number;
    threshold: number;
  }) => string | null;
  onReceive: (itemId: string, qty: number, dateISO: string) => string | null;
  onEdit: (
    itemId: string,
    f: {
      name: string;
      category: InvCategory;
      foodKind: FoodKind;
      unit: InvUnit;
      threshold: number;
    },
  ) => string | null;
  onAdjust: (itemId: string, qty: number, reason: string) => string | null;
  onDelete: (itemId: string) => string | null;
}) {
  const clubId = state.user!.clubId;
  const items = state.inventory.filter((i) => i.clubId === clubId);
  const [panel, setPanel] = useState<{
    mode: "add" | "receive" | "adjust" | "edit";
    itemId?: string;
  } | null>(null);
  const [f, setF] = useState({
    name: "",
    category: "food" as InvCategory,
    foodKind: "grain" as FoodKind,
    unit: "kg" as InvUnit,
    qty: "",
    threshold: "",
    date: toISO(TODAY),
    reason: "",
  });
  const [err, setErr] = useState("");
  const target = items.find((i) => i.id === panel?.itemId);
  const open = (mode: "add" | "receive" | "adjust" | "edit", it?: InvItem) => {
    setErr("");
    setPanel({ mode, itemId: it?.id });
    setF((p) => ({
      ...p,
      name: it?.name || "",
      category: it?.category || "food",
      foodKind: it?.foodKind || "other",
      unit: it?.unit || "kg",
      qty: mode === "adjust" && it ? fmtQty(it.qty) : "",
      threshold: it ? fmtQty(it.threshold) : "",
      date: toISO(TODAY),
      reason: "",
    }));
  };
  const submit = () => {
    let e: string | null = null;
    if (panel?.mode === "add")
      e = onAdd({
        name: f.name,
        category: f.category,
        foodKind: f.foodKind,
        unit: f.unit,
        qty: numOf(f.qty || "0"),
        threshold: numOf(f.threshold || "0"),
      });
    if (panel?.mode === "receive" && target)
      e = onReceive(target.id, numOf(f.qty), f.date);
    if (panel?.mode === "adjust" && target)
      e = onAdjust(target.id, numOf(f.qty), f.reason);
    if (panel?.mode === "edit" && target)
      e = onEdit(target.id, {
        name: f.name,
        category: f.category,
        foodKind: f.foodKind,
        unit: f.unit,
        threshold: numOf(f.threshold || "0"),
      });
    if (e) setErr(e);
    else {
      setPanel(null);
      setErr("");
    }
  };
  const catSelect = (
    <Select
      label="Category"
      value={f.category}
      onChange={(v) => setF((p) => ({ ...p, category: v as InvCategory }))}
      options={(Object.keys(INV_CAT_LABEL) as InvCategory[]).map((k) => ({
        value: k,
        label: INV_CAT_LABEL[k],
      }))}
    />
  );
  const kindSelect = f.category === "food" && (
    <Select
      label="Feed type (for rations)"
      value={f.foodKind}
      onChange={(v) => setF((p) => ({ ...p, foodKind: v as FoodKind }))}
      options={(Object.keys(FOOD_KIND_LABEL) as FoodKind[]).map((k) => ({
        value: k,
        label: FOOD_KIND_LABEL[k],
      }))}
    />
  );
  const unitSelect = (
    <Select
      label="Unit"
      value={f.unit}
      onChange={(v) => setF((p) => ({ ...p, unit: v as InvUnit }))}
      options={INV_UNITS.map((u) => ({ value: u, label: u }))}
    />
  );

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-serif font-bold">My inventory</h2>
          <p className="text-sm text-gray-500">
            Managed by the groom · {items.length} supplies ·{" "}
            {items.filter(isLow).length} running low
          </p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={() => navigate("inventory-log")}>
            📜 Inventory history
          </Btn>
          <Btn variant="gold" onClick={() => open("add")}>
            ＋ Add supply
          </Btn>
        </div>
      </div>

      {panel && (
        <Card className="p-5 border-l-4 border-[#c9973b]">
          <h3 className="font-semibold mb-4">
            {panel.mode === "add"
              ? "Add inventory item"
              : panel.mode === "receive"
                ? `Restock — ${target?.name}`
                : panel.mode === "adjust"
                  ? `Stocktake / adjust balance — ${target?.name}`
                  : `Edit supply — ${target?.name}`}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {(panel.mode === "add" || panel.mode === "edit") && (
              <>
                <div className="col-span-2">
                  <Input
                    label="Item name"
                    required
                    value={f.name}
                    onChange={(v) => setF((p) => ({ ...p, name: v }))}
                  />
                </div>
                {catSelect}
                {unitSelect}
                {kindSelect}
              </>
            )}
            {panel.mode === "add" && (
              <Input
                label="Initial quantity"
                type="number"
                value={f.qty}
                onChange={(v) => setF((p) => ({ ...p, qty: v }))}
              />
            )}
            {(panel.mode === "add" || panel.mode === "edit") && (
              <Input
                label="Low-stock alert threshold"
                type="number"
                value={f.threshold}
                onChange={(v) => setF((p) => ({ ...p, threshold: v }))}
              />
            )}
            {panel.mode === "receive" && (
              <>
                <Input
                  label={`Restock quantity (${target?.unit})`}
                  required
                  type="number"
                  value={f.qty}
                  onChange={(v) => setF((p) => ({ ...p, qty: v }))}
                />
                <Input
                  label="Received date"
                  required
                  type="date"
                  value={f.date}
                  onChange={(v) => setF((p) => ({ ...p, date: v }))}
                />
                <div className="col-span-2 text-sm text-gray-500">
                  Current stock {fmtQty(target?.qty || 0)} {target?.unit} →
                  after restocking{" "}
                  {fmtQty((target?.qty || 0) + (numOf(f.qty) || 0))}{" "}
                  {target?.unit}
                </div>
              </>
            )}
            {panel.mode === "adjust" && (
              <>
                <Input
                  label={`Actual balance after stocktake (${target?.unit})`}
                  required
                  type="number"
                  value={f.qty}
                  onChange={(v) => setF((p) => ({ ...p, qty: v }))}
                />
                <Input
                  label="Adjustment reason"
                  required
                  value={f.reason}
                  onChange={(v) => setF((p) => ({ ...p, reason: v }))}
                  placeholder="e.g. Weekly stocktake, wastage"
                />
              </>
            )}
          </div>
          {err && <div className="mt-3 text-sm text-red-600">⚠ {err}</div>}
          <div className="flex gap-2 mt-4">
            <Btn variant="gold" onClick={submit}>
              💾 Save
            </Btn>
            <Btn variant="secondary" onClick={() => setPanel(null)}>
              Cancel
            </Btn>
          </div>
        </Card>
      )}

      {(Object.keys(INV_CAT_LABEL) as InvCategory[]).map((cat) => {
        const list = items.filter((i) => i.category === cat);
        return (
          <section key={cat} className="space-y-2">
            <h3 className="font-semibold text-[#0f1729]">
              {cat === "food" ? "🌾" : cat === "medical" ? "💊" : "🧰"}{" "}
              {INV_CAT_LABEL[cat]}{" "}
              <span className="text-xs text-gray-400 font-normal">
                ({list.length})
              </span>
            </h3>
            {list.length === 0 && (
              <Card className="p-4 text-sm text-gray-400 text-center">
                No supplies in this category
              </Card>
            )}
            {list.map((i) => (
              <Card
                key={i.id}
                className={`p-4 ${isLow(i) ? "border-l-4 border-amber-400" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{i.name}</span>
                      {i.foodKind && i.foodKind !== "other" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          {FOOD_KIND_LABEL[i.foodKind]}
                        </span>
                      )}
                      {isLow(i) && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-medium">
                          Running low
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Alert threshold: {fmtQty(i.threshold)} {i.unit}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-2xl font-bold font-mono ${isLow(i) ? "text-amber-600" : "text-[#1a2844]"}`}
                    >
                      {fmtQty(i.qty)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {i.unit} in stock
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap justify-end w-64">
                    <Btn
                      size="sm"
                      variant="gold"
                      onClick={() => open("receive", i)}
                    >
                      ＋ Restock
                    </Btn>
                    <Btn
                      size="sm"
                      variant="secondary"
                      onClick={() => open("adjust", i)}
                    >
                      Stocktake
                    </Btn>
                    <Btn
                      size="sm"
                      variant="secondary"
                      onClick={() => open("edit", i)}
                    >
                      Edit
                    </Btn>
                    <Btn
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete supply "${i.name}"? Inventory history will be retained.`,
                          )
                        ) {
                          const e = onDelete(i.id);
                          if (e) setErr(e);
                        }
                      }}
                    >
                      🗑
                    </Btn>
                  </div>
                </div>
              </Card>
            ))}
          </section>
        );
      })}
    </div>
  );
}

const LOG_KIND: Record<InvLog["kind"], { label: string; cls: string }> = {
  in: { label: "Receive stock", cls: "bg-emerald-100 text-emerald-700" },
  out: { label: "Issue stock", cls: "bg-red-100 text-red-700" },
  refund: { label: "Return to stock", cls: "bg-sky-100 text-sky-700" },
  adjust: { label: "Stocktake", cls: "bg-amber-100 text-amber-700" },
  edit: { label: "Edit / Delete", cls: "bg-gray-100 text-gray-600" },
};

export function InventoryLogPage({
  state,
  navigate,
}: {
  state: AppState;
  navigate: (p: Page) => void;
}) {
  const clubId = state.user!.clubId;
  const all = state.invLogs
    .filter((l) => l.clubId === clubId)
    .sort((a, b) => b.ts - a.ts);
  const [fItem, setFItem] = useState("");
  const [fHorse, setFHorse] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dir, setDir] = useState<"all" | "in" | "out">("all");
  const itemOpts = Array.from(
    new Map(all.map((l) => [l.itemId, l.itemName])).entries(),
  );
  const horseOpts = Array.from(
    new Map(
      all
        .filter((l) => l.horseId)
        .map((l) => [l.horseId!, l.horseName || l.horseId!]),
    ).entries(),
  );
  const logs = all.filter(
    (l) =>
      (!fItem || l.itemId === fItem) &&
      (!fHorse || l.horseId === fHorse) &&
      (!from || toISO(l.date) >= from) &&
      (!to || toISO(l.date) <= to) &&
      (dir === "all" || (dir === "in" ? l.delta > 0 : l.delta < 0)),
  );
  const byHorse = new Map<
    string,
    {
      name: string;
      items: Map<string, { name: string; unit: string; qty: number }>;
    }
  >();
  logs
    .filter((l) => l.horseId && (l.kind === "out" || l.kind === "refund"))
    .forEach((l) => {
      const h = byHorse.get(l.horseId!) || {
        name: l.horseName || l.horseId!,
        items: new Map(),
      };
      const it = h.items.get(l.itemId) || {
        name: l.itemName,
        unit: l.unit,
        qty: 0,
      };
      it.qty += -l.delta;
      h.items.set(l.itemId, it);
      byHorse.set(l.horseId!, h);
    });
  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-serif font-bold">Inventory history</h2>
          <p className="text-sm text-gray-500">
            {logs.length} entries · Received (+) and Used (−)
          </p>
        </div>
        <Btn variant="secondary" onClick={() => navigate("inventory")}>
          ← My inventory
        </Btn>
      </div>
      <Card className="p-4">
        <div className="grid grid-cols-5 gap-3">
          <Select
            label="Supplies"
            value={fItem}
            onChange={setFItem}
            options={[
              { value: "", label: "All" },
              ...itemOpts.map(([v, l]) => ({ value: v, label: l })),
            ]}
          />
          <Select
            label="Horses"
            value={fHorse}
            onChange={setFHorse}
            options={[
              { value: "", label: "All" },
              ...horseOpts.map(([v, l]) => ({ value: v, label: l })),
            ]}
          />
          <Input
            label="From date"
            type="date"
            value={from}
            onChange={setFrom}
          />
          <Input label="To date" type="date" value={to} onChange={setTo} />
          <Select
            label="Entry type"
            value={dir}
            onChange={(v) => setDir(v as "all" | "in" | "out")}
            options={[
              { value: "all", label: "All" },
              { value: "in", label: "Received (+)" },
              { value: "out", label: "Used (−)" },
            ]}
          />
        </div>
      </Card>
      <section className="space-y-2">
        <h3 className="font-semibold">Usage by horse</h3>
        {byHorse.size === 0 && (
          <Card className="p-4 text-sm text-gray-400 text-center">
            No usage matches the filters
          </Card>
        )}
        <div className="grid grid-cols-2 gap-3">
          {Array.from(byHorse.entries()).map(([hid, h]) => (
            <Card key={hid} className="p-4">
              <div className="font-semibold mb-2">
                {h.name}{" "}
                <span className="text-xs text-gray-400 font-mono">{hid}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(h.items.values()).map((it) => (
                  <span
                    key={it.name}
                    className="text-xs px-2 py-1 rounded-full bg-red-50 border border-red-200 text-red-700"
                  >
                    {it.name}: {fmtQty(it.qty)} {it.unit}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2.5">Time</th>
              <th className="px-3">Type</th>
              <th className="px-3">Supplies</th>
              <th className="px-3 text-right">Change</th>
              <th className="px-3 text-right">Balance after</th>
              <th className="px-3">Horses</th>
              <th className="px-3">Task / reason</th>
              <th className="px-3">Performed by</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No entries
                </td>
              </tr>
            )}
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-gray-100">
                <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">
                  {l.at}
                </td>
                <td className="px-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${LOG_KIND[l.kind].cls}`}
                  >
                    {LOG_KIND[l.kind].label}
                  </span>
                </td>
                <td className="px-3">{l.itemName}</td>
                <td
                  className={`px-3 text-right font-mono font-bold ${l.delta > 0 ? "text-emerald-600" : l.delta < 0 ? "text-red-600" : "text-gray-400"}`}
                >
                  {l.delta > 0 ? "+" : ""}
                  {fmtQty(l.delta)} {l.unit}
                </td>
                <td className="px-3 text-right font-mono">
                  {fmtQty(l.balance)}
                </td>
                <td className="px-3">{l.horseName || "—"}</td>
                <td className="px-3 text-gray-500">
                  {[l.task, l.reason].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-3 text-gray-500 whitespace-nowrap">
                  {l.byName}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
