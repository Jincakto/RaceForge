import { type AppState, type Page } from "../../../app/appTypes";
import { TODAY } from "../../../shared/data/today";
import { dailyTasks, isLow, needsTreatment, fmtQty } from "./HorseCarePages";
import { StatCard } from "../../../shared/ui/StatCard";
import { Card } from "../../../shared/ui/ui";

export function GroomDashboard({
  state,
  navigate,
}: {
  state: AppState;
  navigate: (p: Page) => void;
}) {
  const clubId = state.user!.clubId;
  const horses = state.horses.filter(
    (h) => h.clubId === clubId && h.approvalStatus === "approved",
  );
  const done = state.careRecords.filter(
    (r) => r.clubId === clubId && r.date === TODAY,
  ).length;
  const total = horses.reduce((n, h) => n + dailyTasks(h).length, 0);
  const low = state.inventory.filter((i) => i.clubId === clubId && isLow(i));
  const treating = horses.filter(needsTreatment);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-serif font-bold text-[#0f1729]">
          Groom dashboard
        </h2>
        <p className="text-sm text-gray-500">Today {TODAY}</p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Assigned horses" value={horses.length} color="navy" />
        <StatCard
          label="Completed tasks"
          value={`${done}/${total}`}
          color="green"
        />
        <StatCard label="Under treatment" value={treating.length} color="red" />
        <StatCard label="Low-stock items" value={low.length} color="gold" />
      </div>
      {low.length > 0 && (
        <Card
          className="p-4 border-l-4 border-amber-400 bg-amber-50"
          onClick={() => navigate("inventory")}
        >
          <div className="text-sm text-amber-800">
            📦 <strong>Running low:</strong>{" "}
            {low
              .map((i) => `${i.name} (${fmtQty(i.qty)} ${i.unit})`)
              .join(", ")}
          </div>
        </Card>
      )}
      {treating.map((h) => (
        <Card
          key={h.id}
          className="p-4 border-l-4 border-red-400"
          onClick={() => navigate("care-hub")}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🩹</span>
            <div className="flex-1">
              <div className="font-semibold">
                {h.name} — treatment care required
              </div>
              <div className="text-sm text-gray-500">
                {h.stable}, Stall {h.stall}

              </div>
            </div>
            <span className="text-sm text-[#c9973b] font-medium">
              View instructions →
            </span>
          </div>
        </Card>
      ))}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5" onClick={() => navigate("care-hub")}>
          <div className="text-2xl mb-1">🌿</div>
          <div className="font-semibold">Care &amp; feeding</div>
          <div className="text-sm text-gray-500">
            Stable map, rations, tasks and incident reporting
          </div>
        </Card>
        <Card className="p-5" onClick={() => navigate("inventory")}>
          <div className="text-2xl mb-1">📦</div>
          <div className="font-semibold">My inventory</div>
          <div className="text-sm text-gray-500">
            Receive supplies, check stock and monitor inventory
          </div>
        </Card>
      </div>
    </div>
  );
}
