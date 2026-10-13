import { permissionService } from "../../services/permissionService.ts";
import { ReadableDetails } from "./LiveApiForms.jsx";
import { useEffect, useState } from "react";
import { staffService } from "../../services/staffService.ts";
import { businessRoles } from "./LiveMembership.jsx";
export function LivePermissions() {
  const [role, setRole] = useState("HEAD_TRAINER"),
    [catalog, setCatalog] = useState([]),
    [audit, setAudit] = useState([]),
    [granted, setGranted] = useState([]),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setLoaded(false);
    setError("");
    Promise.all([staffService.catalog(), staffService.permissions(role), permissionService.audit(role)])
      .then(([c, g, a]) => {
        if (active) {
          setCatalog(c);
          setAudit(a);
          setGranted(g);
          setLoaded(true);
        }
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setBusy(false));
    return () => {
      active = false;
    };
  }, [role, revision]);
  async function change(code, checked) {
    setBusy(true);
    setError("");
    try {
      if (checked) await staffService.grant(role, code);
      else await staffService.revoke(role, code);
      setRevision((v) => v + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Quyền theo vai trò</h1>
      <p>Thay đổi áp dụng cho toàn bộ người dùng thuộc vai trò đã chọn.</p>
      <select
        aria-label="Vai trò phân quyền"
        disabled={busy}
        value={role}
        onChange={(e) => setRole(e.target.value)}
      >
        {[{ code: "CLUB_MANAGER", name: "Manager" }, ...businessRoles].map(
          (r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ),
        )}
      </select>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {busy && <p role="status">Đang xử lý...</p>}
      {loaded &&
        catalog.map((p) => (
          <label
            key={p.permissionName}
            className="block bg-white border rounded p-3"
          >
            <input
              type="checkbox"
              disabled={busy || p.permissionName === "MANAGE_PERMISSION"}
              checked={granted.includes(p.permissionName)}
              onChange={(e) => change(p.permissionName, e.target.checked)}
            />
            <span className="ml-3">
              {p.permissionName} — {p.description}
            </span>
          </label>
        ))}
      <h2 className="font-bold">Lịch sử cấp và thu hồi quyền</h2>{audit.length===0 && <p>Chưa có thay đổi.</p>}{audit.map((entry,i)=><ReadableDetails key={entry.auditId||i} data={entry}/>)}
    </div>
  );
}
