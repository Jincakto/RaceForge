import { type AppState, type Page } from "../../../app/appTypes";
import { Card, Btn, Badge } from "../../../shared/ui/ui";
import { StatCard } from "../../../shared/ui/StatCard";
import { LifecycleBadge } from "../../horses/components/HorseProfileWidgets";

export function HeadTrainerDashboard({
  state,
  navigate,
}: {
  state: AppState;
  navigate: (p: Page) => void;
}) {
  const horses = state.horses.filter((h) => h.clubId === state.user!.clubId);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-serif font-bold text-[#0f1729]">
          Training overview
        </h2>
      </div>
      {horses
        .filter((h) => h.lock)
        .map((h) => (
          <Card
            key={h.id}
            className="p-4 border-l-4 border-red-500 bg-red-50"
            onClick={() => navigate("training-hub")}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🔒</span>
              <div className="flex-1">
                <div className="font-semibold text-red-800">
                  {h.name} — TRAINING LOCKED
                </div>
                <div className="text-sm text-red-600">
                  {h.lock!.reason} · Package paused; strenuous sessions marked
                  "Not Performed"
                </div>
              </div>
              <span className="text-red-600 text-sm font-medium">View →</span>
            </div>
          </Card>
        ))}
      {state.enrollments
        .filter(
          (e) =>
            e.trainerId === state.user!.id && e.trainerStatus === "pending",
        )
        .map((e) => (
          <Card
            key={e.id}
            className="p-4 border-l-4 border-sky-400 bg-sky-50"
            onClick={() => navigate("training-hub")}
          >
            <div className="text-sm font-semibold text-sky-900">
              New assignment for horse "
              {state.horses.find((h) => h.id === e.horseId)?.name}" — awaiting
              your response
            </div>
          </Card>
        ))}
      {state.enrollments
        .filter(
          (e) =>
            e.trainerId === state.user!.id &&
            e.trainerStatus === "confirmed" &&
            e.status === "active" &&
            !e.scheduleConfirmed,
        )
        .map((e) => (
          <Card
            key={e.id}
            className="p-4 border-l-4 border-amber-400 bg-amber-50"
            onClick={() => navigate("training-hub")}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">📅</span>
              <div className="flex-1">
                <div className="font-semibold text-amber-800">
                  {horses.find((h) => h.id === e.horseId)?.name} — schedule
                  needs to be created or confirmed
                </div>
                <div className="text-sm text-amber-600">
                  Package {e.packageName} · expires {e.expiresAt}
                </div>
              </div>
              <span className="text-amber-600 text-sm font-medium">Open →</span>
            </div>
          </Card>
        ))}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Horses in training"
          value={horses.filter((h) => h.trainingStatus === "Active").length}
          color="navy"
        />
        <StatCard
          label="Active training plans"
          value={
            state.trainingPlans.filter((p) => p.status === "Active").length
          }
          color="gold"
        />
        <StatCard
          label="Sessions this week"
          value={
            state.trainingSessions.filter((s) => s.status === "Scheduled")
              .length
          }
          color="green"
        />
        <StatCard label="Average speed" value="58.6 km/h" color="navy" />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Assigned horses</h3>
            <Btn variant="gold" onClick={() => navigate("training-hub")}>
              Open training →
            </Btn>
          </div>
          {horses.map((h) => (
            <div
              key={h.id}
              onClick={() => navigate("horse-detail")}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-[#c9973b] transition-all mb-1"
            >
              <img
                src={h.imageUrl || undefined}
                className="w-10 h-10 rounded-lg object-cover"
              />
              <div className="flex-1">
                <div className="font-medium text-sm">{h.name}</div>
                <div className="text-xs text-gray-500">
                  Health: {h.healthStatus}
                </div>
              </div>
              <LifecycleBadge horse={h} />
            </div>
          ))}
        </Card>
        <Card className="p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Recent sessions</h3>
            <Btn variant="ghost" onClick={() => navigate("training-hub")}>
              View all →
            </Btn>
          </div>
          {state.trainingSessions.slice(0, 3).map((s) => (
            <div
              key={s.id}
              onClick={() => navigate("training-hub")}
              className="p-3 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer hover:border-[#c9973b] transition-all mb-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">
                  {s.type} — {s.distance}
                </span>
                <Badge status={s.status} />
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {s.date} · {s.time}
              </div>
              {s.result && (
                <div className="text-xs text-emerald-600 mt-0.5">
                  ✓ {s.result.time} · {s.result.speed} km/h · Score{" "}
                  {s.result.performanceScore}
                </div>
              )}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
