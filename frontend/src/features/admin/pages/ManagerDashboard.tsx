import { type AppState, type Page } from "../../../app/appTypes";
import { useState } from "react";
import { Card, Btn, Select } from "../../../shared/ui/ui";
import { StatCard } from "../../../shared/ui/StatCard";
import { LifecycleBadge } from "../../horses/components/HorseProfileWidgets";
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from "recharts";

export function ManagerDashboard({
  state,
  navigate,
}: {
  state: AppState;
  navigate: (p: Page) => void;
}) {
  const clubId = state.user!.clubId;
  const myClub = state.clubs.find((c) => c.id === clubId);
  const horses = state.horses.filter((h) => !!clubId && h.clubId === clubId && h.approvalStatus === 'approved');
  const members = state.users.filter(u => !!clubId && u.clubId === clubId);
  const [performanceHorseId, setPerformanceHorseId] = useState('');
  const performanceHorse = horses.find(h => h.id === performanceHorseId) || horses[0];
  const performanceData = state.trainingSessions
    .filter(s => s.horseId === performanceHorse?.id && s.result && Number.isFinite(Number(s.result.speed)))
    .map(s => ({ date: s.date, speed: Number(s.result!.speed), sortKey: s.date.split('/').reverse().join('-') + s.time }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  const pendingHorses = myClub
    ? state.horseClubRequests.filter(
        (r) => r.clubId === myClub.id && r.status === "pending",
      )
    : [];
  const unassigned = state.enrollments.filter(
    (e) =>
      e.status === "active" &&
      e.trainerStatus === "unassigned" &&
      horses.some((h) => h.id === e.horseId),
  );
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-serif font-bold text-[#0f1729]">
          {myClub?.name || "Club"} — Overview
        </h2>
      </div>
      {unassigned.length > 0 && (
        <Card
          className="p-4 border-l-4 border-amber-400 bg-amber-50"
          onClick={() => navigate("trainer-assign")}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">!</span>
            <div className="flex-1">
              <div className="font-semibold text-amber-800">
                {unassigned.length} horse{unassigned.length === 1 ? "" : "s"}{" "}
                awaiting trainer assignment
              </div>
              <div className="text-sm text-amber-600">
                {unassigned
                  .map((e) => horses.find((h) => h.id === e.horseId)?.name)
                  .filter(Boolean)
                  .join(", ")}
              </div>
            </div>
            <span className="text-amber-600 text-sm font-medium">Assign →</span>
          </div>
        </Card>
      )}
      {pendingHorses.length > 0 && (
        <Card
          className="p-4 border-l-4 border-sky-400 bg-sky-50"
          onClick={() => navigate("center-requests")}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🐎</span>
            <div className="flex-1">
              <div className="font-semibold text-sky-800">
                {pendingHorses.length} horse intake case
                {pendingHorses.length === 1 ? "" : "s"} pending
              </div>
              <div className="text-sm text-sky-600">
                Automatically closes after 7 days
              </div>
            </div>
            <span className="text-sky-600 text-sm font-medium">Review →</span>
          </div>
        </Card>
      )}
      {horses
        .filter((h) => h.lock)
        .map((h) => (
          <Card
            key={h.id}
            className="p-4 border-l-4 border-red-500 bg-red-50"
            onClick={() => navigate("horse-list")}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🔒</span>
              <div className="flex-1">
                <div className="font-semibold text-red-800">
                  {h.name} has a training lock - veterinary clearance is required
                </div>
                <div className="text-sm text-red-600">
                  Diagnosis: {h.lock!.reason}
                </div>
              </div>
              <span className="text-red-600 text-sm font-medium">
                View horses
              </span>
            </div>
          </Card>
        ))}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Horses in the club"
          value={horses.length}
          color="navy"
        />
        <StatCard
          label="Eligible"
          value={horses.filter((h) => h.healthStatus === "Eligible").length}
          color="green"
        />
        <StatCard
          label="Injured"
          value={horses.filter((h) => h.healthStatus === "Injured").length}
          color="red"
        />
        <StatCard
          label="Members"
          value={members.length}
          color="navy"
        />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Horses in the club</h3>
            <Btn variant="ghost" onClick={() => navigate("horse-list")}>
              View all →
            </Btn>
          </div>
          {horses.length === 0 && <p className="py-8 text-center text-sm text-gray-500">No admitted horses in the club yet.</p>}
          {horses.map((h) => (
            <div
              key={h.id}
              onClick={() => navigate("horse-detail")}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-[#c9973b] transition-all mb-1"
            >
              <img
                src={h.imageUrl || undefined}
                alt={h.name}
                className="w-10 h-10 rounded-lg object-cover bg-gray-200"
              />
              <div className="flex-1">
                <div className="font-medium text-sm">{h.name}</div>
                <div className="text-xs text-gray-500">
                  {h.breed} · {h.age}t
                </div>
              </div>
              <LifecycleBadge horse={h} />
            </div>
          ))}
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Performance{performanceHorse ? ` — ${performanceHorse.name}` : ''}</h3>
          {horses.length > 0 && <div className="mb-4"><Select label="Horse" value={performanceHorse?.id || ''} onChange={setPerformanceHorseId} options={horses.map(h => ({ value: h.id, label: `${h.name} (${h.id})` }))} /></div>}
          {performanceData.length === 0 ? <p className="py-8 text-center text-sm text-gray-500">No training performance results available for this horse.</p> : <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={performanceData}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="speed"
                stroke="#c9973b"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Speed km/h"
              />
            </LineChart>
          </ResponsiveContainer>}
        </Card>
      </div>
    </div>
  );
}
