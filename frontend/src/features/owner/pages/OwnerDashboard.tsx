import { type AppState, type Page } from "../../../app/appTypes";
import { getLifecycle } from "../../../shared/data/data";
import { Card, Btn } from "../../../shared/ui/ui";
import { StatCard } from "../../../shared/ui/StatCard";
import { LifecycleBadge } from "../../horses/components/HorseProfileWidgets";

export function OwnerDashboard({
  state,
  navigate,
}: {
  state: AppState;
  navigate: (p: Page) => void;
}) {
  const myHorses = state.horses.filter(
    (h) => h.ownerId === state.user!.id && h.clubId === state.user!.clubId,
  );
  const totalWins = myHorses.reduce((s, h) => s + h.wins, 0);
  const totalRaces = myHorses.reduce((s, h) => s + h.totalRaces, 0);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-serif font-bold text-[#0f1729]">
          Horse owner overview
        </h2>
      </div>
      {myHorses.filter(
        (h) =>
          getLifecycle(h) === "ready" &&
          !state.enrollments.some(
            (e) => e.horseId === h.id && e.status !== "completed",
          ),
      ).length > 0 && (
        <Card
          className="p-4 border-l-4 border-emerald-500 bg-emerald-50"
          onClick={() => navigate("training-register")}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🎯</span>
            <div className="flex-1">
              <div className="font-semibold text-emerald-800">
                A horse is ready for training
              </div>
              <div className="text-sm text-emerald-600">
                Choose a training package to get started
              </div>
            </div>
            <span className="text-emerald-600 text-sm font-medium">
              Register →
            </span>
          </div>
        </Card>
      )}
      {myHorses
        .filter((h) => h.lock)
        .map((h) => (
          <Card key={h.id} className="p-4 border-l-4 border-red-500 bg-red-50">
            <div className="flex items-center gap-3">
              <span className="text-xl">🔒</span>
              <div className="flex-1">
                <div className="font-semibold text-red-800">
                  {h.name} — training package paused
                </div>
                <div className="text-sm text-red-600">
                  Status: {h.lock!.reason}

                </div>
              </div>
            </div>
          </Card>
        ))}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Horses in the club"
          value={myHorses.length}
          color="navy"
        />
        <StatCard
          label="Wins"
          value={totalWins}
          sub={`/${totalRaces} races`}
          color="gold"
        />
        <StatCard
          label="Win rate"
          value={
            totalRaces > 0
              ? `${Math.round((totalWins / totalRaces) * 100)}%`
              : "—"
          }
          color="green"
        />
        <StatCard
          label="Eligible horses"
          value={myHorses.filter((h) => h.healthStatus === "Eligible").length}
          color="navy"
        />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">My horses</h3>
            <Btn variant="ghost" onClick={() => navigate("my-horses")}>
              View all →
            </Btn>
          </div>
          {myHorses.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-3">🐎</div>
              <div className="text-sm mb-3">No horses in the center yet</div>
              <Btn variant="gold" onClick={() => navigate("horse-create")}>
                Register a new horse
              </Btn>
            </div>
          ) : (
            myHorses.map((h) => (
              <div
                key={h.id}
                onClick={() => navigate("horse-detail")}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-[#c9973b] transition-all mb-2"
              >
                <img
                  src={h.imageUrl || undefined}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">{h.name}</div>
                  <div className="text-xs text-gray-500">
                    {h.wins}T / {h.totalRaces}R
                  </div>
                </div>
                <LifecycleBadge horse={h} />
              </div>
            ))
          )}
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent race results</h3>
          </div>
          {myHorses
            .flatMap((h) => h.raceHistory.slice(0, 2))
            .slice(0, 4)
            .map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 mb-2"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${r.position === 1 ? "bg-[#c9973b] text-white" : r.position <= 3 ? "bg-gray-400 text-white" : "bg-gray-200 text-gray-600"}`}
                >
                  #{r.position}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{r.raceName}</div>
                  <div className="text-xs text-gray-500">
                    {r.date} · {r.distance}
                  </div>
                </div>
                {r.prize !== "0 VND" && (
                  <div className="text-xs font-medium text-emerald-600">
                    {r.prize}
                  </div>
                )}
              </div>
            ))}
        </Card>
      </div>
    </div>
  );
}
