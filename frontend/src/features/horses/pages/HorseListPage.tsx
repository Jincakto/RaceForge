import { type Page } from "../../../app/appTypes";
import { type Horse, type Role } from "../../../shared/data/data";
import { useState } from "react";
import { admittedClubHorses } from "../../../app/remote";
import { GENDER_LABEL, IdChip } from "../../admin/admin";
import { Card, Badge, Btn } from "../../../shared/ui/ui";
import { LifecycleBadge } from "../components/HorseProfileWidgets";

export function HorseListPage({
  navigate,
  horses,
  role,
  clubId,
  onSelectHorse,
}: {
  navigate: (p: Page) => void;
  horses: Horse[];
  role: Role;
  clubId: string | null;
  onSelectHorse: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [gender, setGender] = useState("All");
  const [pageNo, setPageNo] = useState(1);
  const PER = 6;
  const q = search.trim().toLowerCase();
  const list = (
    role === 'manager' ? admittedClubHorses(horses, clubId) : clubId ? horses.filter((h) => h.clubId === clubId) : horses
  ).filter((h) => {
    const ms =
      !q ||
      h.name.toLowerCase().includes(q) ||
      h.id.toLowerCase().includes(q) ||
      (h.microchip || "").toLowerCase().includes(q);
    const mf =
      filter === "All" ||
      h.healthStatus === filter ||
      h.trainingStatus === filter;
    const mg =
      gender === "All" || (GENDER_LABEL[h.gender] || h.gender) === gender;
    return ms && mf && mg;
  });
  const pages = Math.max(1, Math.ceil(list.length / PER));
  const cur = Math.min(pageNo, pages);
  const rows = list.slice((cur - 1) * PER, cur * PER);
  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${active ? "bg-[#1a2844] text-white border-[#1a2844]" : "bg-white text-gray-600 border-gray-200 hover:border-[#c9973b]"}`;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#0f1729]">
            Horses in the club
          </h2>
          <p className="text-sm text-gray-500">{list.length} horses</p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="relative max-w-sm">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPageNo(1);
            }}
            placeholder="Search by name, horse ID or UELN…"
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b] bg-white"
          />
          <span className="absolute left-2.5 top-2.5 text-gray-400 text-sm">
            🔍
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 w-20">Status</span>
          {[
            ["All", "All"],
            ["Eligible", "Eligible"],
            ["Monitor", "Needs monitoring"],
            ["Injured", "Injured"],
            ["Active", "Training"],
            ["Resting", "Resting"],
            ["Inactive", "Not started"],
          ].map(([f, l]) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setPageNo(1);
              }}
              className={chip(filter === f)}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 w-20">Gender</span>
          {["All", "Stallion", "Mare", "Gelding"].map((f) => (
            <button
              key={f}
              onClick={() => {
                setGender(f);
                setPageNo(1);
              }}
              className={chip(gender === f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {[
                "Horses",
                "ID",
                "Gender",
                "Trainer",
                "Health",
                "Training",
                "Status",
                "T/R",
                "",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((h, i) => (
              <tr
                key={h.id}
                onClick={() => {
                  onSelectHorse(h.id);
                  navigate("horse-detail");
                }}
                className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={h.imageUrl || undefined}
                      className="w-9 h-9 rounded-lg object-cover bg-gray-200"
                    />
                    <div>
                      <div className="font-semibold text-[#0f1729]">
                        {h.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {h.breed} · {h.age}t
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <IdChip kind="HRS" id={h.id} />
                </td>
                <td className="px-5 py-3 text-xs text-gray-600">
                  {GENDER_LABEL[h.gender] || h.gender}
                </td>
                <td className="px-5 py-3 text-gray-600 text-xs">
                  {(h.trainerHistory || [])
                    .filter((t) => !t.to)
                    .map((t) => t.name)
                    .join(", ") || "—"}
                </td>
                <td className="px-5 py-3">
                  <Badge status={h.healthStatus} />
                </td>
                <td className="px-5 py-3">
                  <Badge status={h.trainingStatus} />
                </td>
                <td className="px-5 py-3">
                  <LifecycleBadge horse={h} />
                </td>
                <td className="px-5 py-3 font-mono text-xs">
                  {h.wins}/{h.totalRaces}
                </td>
                <td className="px-5 py-3">
                  <span className="text-[#c9973b] text-xs font-medium">
                    View →
                  </span>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-5 py-12 text-center text-gray-400"
                >
                  <div className="text-3xl mb-2">🐎</div>No horses match the
                  filters.
                  <div>
                    <button
                      className="mt-2 text-[#c9973b] text-sm hover:underline"
                      onClick={() => {
                        setSearch("");
                        setFilter("All");
                        setGender("All");
                      }}
                    >
                      Clear filters
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
          <span>
            Trang {cur}/{pages}
          </span>
          <div className="flex gap-2">
            <Btn
              size="sm"
              variant="secondary"
              disabled={cur <= 1}
              onClick={() => setPageNo(cur - 1)}
            >
              ← Previous
            </Btn>
            <Btn
              size="sm"
              variant="secondary"
              disabled={cur >= pages}
              onClick={() => setPageNo(cur + 1)}
            >
              Sau →
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}
