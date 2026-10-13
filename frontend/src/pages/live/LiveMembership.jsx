import { useEffect, useState } from "react";
import { membershipService } from "../../services/membershipService.ts";
import { userService } from "../../services/userService.ts";
import { toAppUser } from "../../services/authService.ts";
import { useApp } from "../../hooks/useApp.js";
export const businessRoles = [
  { id: 2, name: "Head Trainer", code: "HEAD_TRAINER" },
  { id: 3, name: "Thú y", code: "VETERINARIAN" },
  { id: 4, name: "Groom", code: "GROOM" },
  { id: 5, name: "Chủ ngựa", code: "HORSE_OWNER" },
];
export function LiveMembership() {
  const { setState, navigate, handleLogout } = useApp();
  const [record, setRecord] = useState(null),
    [role, setRole] = useState(5),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  async function load() {
    setBusy(true);
    setError("");
    try {
      const u = await userService.me();
      setState((s) => ({ ...s, user: toAppUser(u) }));
      if (u.status === "ACTIVE" && u.role?.roleName !== "USER") {
        navigate("profile");
        return;
      }
      try {
        setRecord(await membershipService.mine());
      } catch (e) {
        if (e.status !== 404) throw e;
        setRecord(null);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Tham gia RaceForge</h1>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {record && (
        <div className="border rounded p-4">
          <p>
            Yêu cầu #{record.requestId} · {record.requestedRole.roleName}
          </p>
          <p>Trạng thái: {record.status}</p>
          {record.reviewNote && <p>{record.reviewNote}</p>}
        </div>
      )}

      {!record && !busy && <p>Chưa có yêu cầu vai trò. Hãy chọn vai trò khi đăng ký hoặc liên hệ quản lý.</p>}
      <button
        disabled={busy}
        onClick={load}
        className="border rounded px-4 py-2"
      >
        Kiểm tra trạng thái
      </button>
      <button disabled={busy} onClick={handleLogout} className="ml-4">
        Đăng xuất
      </button>
    </main>
  );
}
