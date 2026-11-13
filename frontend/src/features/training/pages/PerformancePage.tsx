import { type AppState } from "../../../app/appTypes";
import { StatCard } from "../../../shared/ui/StatCard";
import { Card } from "../../../shared/ui/ui";
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";

export function PerformancePage({ state }: { state: AppState }) {
  const horse = state.horses.find((h) => h.id === state.selectedHorseId);
  const sessions = state.trainingSessions.filter(
    (s) => s.horseId === horse?.id && s.result,
  );
  const performance = sessions.map((s) => ({
    month: s.date,
    speed: Number(s.result?.speed),
  }));
  const topSpeed = performance.length
    ? `${Math.max(...performance.map((s) => s.speed))} km/h`
    : "—";
  const radar: { subject: string; A: number }[] = [];
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-serif font-bold">
          Performance — {horse?.name || "No data available"}
        </h2>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Top speed" value={topSpeed} color="gold" />
        <StatCard
          label="Fitness"
          value="—"
          sub="Fitness metrics are not available from the server"
          color="green"
        />
        <StatCard
          label="AI score"
          value="—"
          sub="AI scores are not available from the server"
          color="navy"
        />
        <StatCard
          label="Win rate"
          value={
            horse?.totalRaces
              ? `${Math.round((horse.wins / horse.totalRaces) * 100)}%`
              : "—"
          }
          color="navy"
        />
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2">
          <Card className="p-5">
            <h3 className="font-semibold mb-4">Monthly speed and fitness</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={performance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="speed"
                  stroke="#c9973b"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  name="Speed (km/h)"
                />
                <Line
                  type="monotone"
                  dataKey="fitness"
                  stroke="#1a4a3a"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  name="Fitness %"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Overall performance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radar}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
              <Radar
                dataKey="A"
                stroke="#c9973b"
                fill="#c9973b"
                fillOpacity={0.25}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
