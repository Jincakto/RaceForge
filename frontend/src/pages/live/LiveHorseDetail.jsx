import { useEffect, useState } from "react";
import { useNavigate, useMatch } from "react-router-dom";
import { horseService } from "../../services/horseService.ts";
import { useApp } from "../../hooks/useApp.js";

export function LiveHorseDetail() {
  const horseId = useMatch("/horses/:horseId")?.params.horseId,
    navigate = useNavigate(),
    { state } = useApp();
  const [horse, setHorse] = useState(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setBusy(true);
    setHorse(null);
    setError("");
    horseService
      .get(Number(horseId))
      .then((h) => active && setHorse(h))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setBusy(false));
    return () => {
      active = false;
    };
  }, [horseId]);
  const own =
    horse && state.user.role === "owner" && horse.ownerId === state.user.id;
  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {busy && <p role="status">Đang xử lý...</p>}
      {horse && (
        <>
          <h1 className="text-2xl font-bold">
            {horse.horseName} · #{horse.horseId}
          </h1>
          <dl className="grid md:grid-cols-2 gap-3">
            {[
              ["Ngày sinh", horse.dateOfBirth],
              ["Giống", horse.breed],
              ["Giới tính", horse.gender],
              ["Màu lông", horse.coatColor],
              ["Cân nặng", horse.weight],
              ["Chiều cao", horse.height],
              ["Ngựa cha", horse.sire],
              ["Ngựa mẹ", horse.dam],
              ["Ông ngoại", horse.damSire],
              ["Sức khỏe", horse.healthStatus || "Chưa khám"],
              ["Trainer ID", horse.headTrainerId],
              ["Tiền sử y tế", horse.declaredMedicalHistory],
              ["Lý lịch", horse.background],
            ].map(([label, value]) => (
              <div className="border rounded p-3" key={label}>
                <dt className="font-bold">{label}</dt>
                <dd>{value ?? "—"}</dd>
              </div>
            ))}
          </dl>
          {own && (
            <div className="flex gap-4">
              <button
                disabled={busy}
                onClick={() => navigate("/horses/" + horse.horseId + "/edit")}
              >
                Sửa hồ sơ
              </button>

            </div>
          )}

        </>
      )}
    </div>
  );
}
