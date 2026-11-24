import { type AppState, type Page } from "../../../app/appTypes";
import { Card, Btn, Badge } from "../../../shared/ui/ui";
import { StatCard } from "../../../shared/ui/StatCard";
import { LifecycleBadge } from "../../horses/components/HorseProfileWidgets";
import { useEffect, useMemo, useState } from 'react';
import { getOwnTrainerProfile, listTrainerSessions } from '../api/trainersApi';

type HistorySession = { session_id: string; horse_id: string; horse_name: string;
  horse_package_id?: string; status: string; actual_end?: string | null; scheduled_start?: string | null };

export function HeadTrainerDashboard({
  state,
  navigate,
}: {
  state: AppState;
  navigate: (p: Page) => void;
}) {
  // Only assignments still accepted and attached to paid active/paused packages.
  const currentIds = useMemo(() => new Set(state.enrollments
    .filter(e => e.trainerId === state.user!.id && e.trainerStatus === 'confirmed'
      && e.paymentStatus === 'PAID' && ['ACTIVE', 'PAUSED'].includes(e.apiStatus || ''))
    .map(e => e.horseId)), [state.enrollments, state.user]);
  const horses = state.horses.filter(h => h.clubId === state.user!.clubId && currentIds.has(h.id));
  const [history, setHistory] = useState<HistorySession[]>([]);
  const [historyError, setHistoryError] = useState('');
  useEffect(() => {
    let active = true;
    setHistoryError('');
    getOwnTrainerProfile().then(profile => profile?.trainer_id ? listTrainerSessions(profile.trainer_id) : [])
      .then(rows => { if (active) setHistory(rows as HistorySession[]); })
      .catch(err => { if (active) { setHistory([]); setHistoryError((err as Error).message); } });
    return () => { active = false; };
  }, [state.user?.id]);
  const historicalHorses = useMemo(() => {
    const grouped = new Map<string, { id: string; name: string; count: number; last: string }>();
    for (const row of history) {
      if (!row.horse_id || currentIds.has(row.horse_id)) continue;
      const old = grouped.get(row.horse_id);
      const date = row.actual_end || row.scheduled_start || '';
      if (old) { old.count++; if (date > old.last) old.last = date; }
      else grouped.set(row.horse_id, { id: row.horse_id, name: row.horse_name || row.horse_id, count: 1, last: date });
    }
    return [...grouped.values()].sort((a, b) => b.last.localeCompare(a.last));
  }, [history, currentIds]);
  const recordedSpeeds = state.trainingSessions.filter(s => s.status === 'Completed')
    .map(s => Number(s.result?.speed)).filter(n => Number.isFinite(n) && n > 0);
  const avgSpeed = recordedSpeeds.length ? `${(recordedSpeeds.reduce((sum,n) => sum + n, 0) / recordedSpeeds.length).toFixed(1)} km/h` : '—';
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
          label="Scheduled sessions"
          value={
            state.trainingSessions.filter((s) => s.status === "Scheduled")
              .length
          }
          color="green"
        />
        <StatCard label="Average recorded speed" value={avgSpeed} color="navy" />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Assigned horses</h3>
            <Btn variant="gold" onClick={() => navigate("training-hub")}>
              Open training →
            </Btn>
          </div>
          {horses.length === 0 && <p className="text-sm text-slate-500">No current accepted, paid training assignments.</p>}
          {horses.map((h) => (
            <div
              key={h.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 mb-1"
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
      <Card className="p-5">
        <h3 className="font-semibold">Formerly trained horses — session history</h3>
        <p className="mt-1 text-xs text-slate-500">Completed/missed session records are preserved after a trainer assignment ends. This is history, not renewed access to the horse profile.</p>
        {historyError && <p role="alert" className="mt-3 text-sm text-red-700">Cannot load session history: {historyError}</p>}
        {!historyError && historicalHorses.length === 0 && <p className="mt-3 text-sm text-slate-500">No former training history recorded.</p>}
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {historicalHorses.map(h => <div key={h.id} className="rounded-lg border border-slate-200 p-3">
            <div className="font-medium">{h.name} <span className="font-mono text-xs text-slate-500">{h.id}</span></div>
            <p className="text-xs text-slate-500">{h.count} recorded sessions · Last: {h.last ? h.last.slice(0, 10) : 'Unknown'}</p>
          </div>)}
        </div>
      </Card>
    </div>
  );
}
