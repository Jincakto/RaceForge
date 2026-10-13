import { useEffect, useState } from "react";
import { useNavigate, useMatch } from "react-router-dom";
import { horseService } from "../../services/horseService.ts";
import { useApp } from "../../hooks/useApp.js";
const empty = {
  horseName: "",
  dateOfBirth: "",
  gender: "STALLION",
  breed: "",
  coatColor: "",
  sire: "",
  dam: "",
  damSire: "",
  weight: 500,
  height: 160,
  background: "",
  declaredMedicalHistory: "",
  imageUrl: "",
};
const fields = {
  horseName: "Tên ngựa",
  dateOfBirth: "Ngày sinh",
  gender: "Giới tính",
  breed: "Giống",
  coatColor: "Màu lông",
  sire: "Ngựa cha",
  dam: "Ngựa mẹ",
  damSire: "Ông ngoại",
  weight: "Cân nặng (kg)",
  height: "Chiều cao (cm)",
  background: "Lý lịch",
  declaredMedicalHistory: "Tiền sử y tế",
  imageUrl: "URL ảnh",
};
export function LiveHorseEditor() {
  const horseId = useMatch("/horses/:horseId/edit")?.params.horseId,
    navigate = useNavigate(),
    { state } = useApp();
  const id = horseId ? Number(horseId) : null;
  const [form, setForm] = useState(empty),
    [busy, setBusy] = useState(!!id),
    [loaded, setLoaded] = useState(!id),
    [error, setError] = useState("");
  useEffect(() => {
    if (!id) return;
    let active = true;
    setBusy(true);
    horseService
      .get(id)
      .then((h) => {
        if (active) {
          if (h.ownerId !== state.user.id)
            throw new Error("Bạn chỉ được sửa ngựa của mình.");
          setForm(
            Object.fromEntries(
              Object.keys(empty).map((k) => [k, h[k] ?? empty[k]]),
            ),
          );
          setLoaded(true);
        }
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setBusy(false));
    return () => {
      active = false;
    };
  }, [id, state.user.id]);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const h = id
        ? await horseService.update(id, form)
        : await horseService.create(state.user.id, form);
      navigate("/horses/" + h.horseId);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">
        {id ? "Cập nhật ngựa" : "Đăng ký ngựa"}
      </h1>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <fieldset
        disabled={busy || !loaded}
        className="grid md:grid-cols-2 gap-4"
      >
        {Object.keys(empty).map((k) => (
          <label key={k}>
            {fields[k]}
            {k === "gender" ? (
              <select
                className="block w-full border rounded p-2"
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              >
                {["STALLION", "MARE", "GELDING"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            ) : (
              <input
                className="block w-full border rounded p-2"
                required={[
                  "horseName",
                  "dateOfBirth",
                  "breed",
                  "coatColor",
                  "weight",
                  "height",
                ].includes(k)}
                type={
                  k === "dateOfBirth"
                    ? "date"
                    : ["weight", "height"].includes(k)
                      ? "number"
                      : k === "imageUrl"
                        ? "url"
                        : "text"
                }
                min={["weight", "height"].includes(k) ? 1 : undefined}
                step={["weight", "height"].includes(k) ? "0.01" : undefined}
                max={
                  k === "dateOfBirth"
                    ? new Date().toLocaleDateString("en-CA")
                    : undefined
                }
                maxLength={
                  ["horseName", "breed", "sire", "dam", "damSire"].includes(k)
                    ? 100
                    : k === "coatColor"
                      ? 50
                      : 500
                }
                value={form[k]}
                onChange={(e) =>
                  setForm({
                    ...form,
                    [k]: ["weight", "height"].includes(k)
                      ? Number(e.target.value)
                      : e.target.value,
                  })
                }
              />
            )}
          </label>
        ))}
      </fieldset>
      <button
        disabled={busy || !loaded}
        className="bg-amber-600 text-white rounded px-4 py-2"
      >
        {busy ? "Đang lưu..." : "Lưu ngựa"}
      </button>
      <button
        type="button"
        className="ml-4"
        onClick={() => navigate(id ? "/horses/" + id : "/my-horses")}
      >
        Hủy
      </button>
    </form>
  );
}
