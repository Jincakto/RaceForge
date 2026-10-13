import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { horseService } from "../../services/horseService.ts";
import { useApp } from "../../hooks/useApp.js";
export function LiveHorses() {
  const { state } = useApp(),
    navigate = useNavigate();
  const [horses, setHorses] = useState([]),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [revision, setRevision] = useState(0);
  const owner = state.user.role === "owner";
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    horseService
      .list()
      .then((d) => active && setHorses(d))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setBusy(false));
    return () => {
      active = false;
    };
  }, [revision]);
  const visible = horses.filter(
    (h) =>
      (!owner || h.ownerId === state.user.id) &&
      (state.user.role !== "head_trainer" || h.headTrainerId === state.user.id) &&
      h.horseName.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">
        {owner
            ? "Ngựa của tôi"
            : "Danh sách ngựa"}
      </h1>
      <div className="flex gap-4">
        <input
          aria-label="Tìm ngựa"
          className="border rounded p-2"
          placeholder="Tên ngựa"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {owner && (
          <button onClick={() => navigate("/horses/new")}>Đăng ký ngựa</button>
        )}
        <button disabled={busy} onClick={() => setRevision((v) => v + 1)}>
          Tải lại
        </button>
      </div>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {busy && <p role="status">Đang xử lý...</p>}
      {visible.map((h) => (
        <article
          className="border bg-white rounded p-4 space-y-2"
          key={h.horseId}
        >
          <button
            className="font-bold text-lg"
            onClick={() => navigate("/horses/" + h.horseId)}
          >
            {h.horseName} · #{h.horseId}
          </button>
          <p>
            {h.breed} · {h.gender} · {h.status}
          </p>
          <p>
            Sức khỏe:{" "}
            {h.healthStatus || "Chưa khám"} · Trainer:{" "}
            {h.headTrainerId || "Chưa chọn"}
          </p>
          {state.user.role === "manager" && <button disabled={busy} onClick={async () => {setBusy(true);setError("");try {await (h.status === "ACTIVE" ? horseService.deactivate(h.horseId) : horseService.activate(h.horseId));setRevision(v => v + 1);} catch(e) {setError(e.message);} finally {setBusy(false);}}}>{h.status === "ACTIVE" ? "Ngừng hoạt động" : "Kích hoạt ngựa"}</button>}
        </article>
      ))}
      {!busy && !error && !visible.length && <p>Không có ngựa phù hợp.</p>}
    </div>
  );
}
