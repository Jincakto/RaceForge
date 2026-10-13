import { ReadableDetails } from "./LiveApiForms.jsx";
import { useEffect, useState } from "react";
import { staffService } from "../../services/staffService.ts";
import { businessRoles } from "./LiveMembership.jsx";
export function LiveStaff() {
  const [detail, setDetail] = useState(null);
  const [data, setData] = useState(null),
    [page, setPage] = useState(0),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [role, setRole] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    setData(null);
    staffService
      .list(page, query, status, role)
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setBusy(false));
    return () => {
      active = false;
    };
  }, [page, query, role, status, revision]);
  async function toggle(u) {
    setBusy(true);
    setError("");
    try {
      await staffService.status(
        u.userId,
        u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      );
      setRevision((v) => v + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4"><ReadableDetails data={detail}/>
      <h1 className="text-2xl font-bold">Người dùng & nhân viên</h1>
      <form
        className="flex flex-wrap gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(0);
          setQuery(search);
        }}
      >
        <input
          aria-label="Tìm người dùng"
          className="border rounded p-2"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button disabled={busy}>Tìm</button>
        <select
          aria-label="Vai trò"
          value={role}
          onChange={(e) => {
            setPage(0);
            setRole(e.target.value);
          }}
        >
          <option value="">Mọi vai trò</option>
          {businessRoles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Trạng thái tài khoản"
          value={status}
          onChange={(e) => {
            setPage(0);
            setStatus(e.target.value);
          }}
        >
          {["", "ACTIVE", "INACTIVE", "PENDING", "REJECTED"].map((s) => (
            <option key={s} value={s}>
              {s || "Mọi trạng thái"}
            </option>
          ))}
        </select>
      </form>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {busy && <p role="status">Đang xử lý...</p>}
      {data?.content.map((u) => (
        <article
          key={u.userId}
          className="bg-white border rounded p-4 flex flex-wrap justify-between gap-3"
        ><button disabled={busy} onClick={async()=>{setBusy(true);setError("");try{setDetail(await staffService.get(u.userId));}catch(e){setError(e.message);}finally{setBusy(false);}}}>Xem chi tiết</button>
          <div>
            <h2 className="font-bold">{u.fullName}</h2>
            <p>
              {u.email} · {u.phone}
            </p>
            <p>
              {u.role?.roleName} · {u.status}
            </p>
          </div>
          {u.role?.roleName !== "CLUB_MANAGER" &&
            ["ACTIVE", "INACTIVE"].includes(u.status) && (
              <button disabled={busy} onClick={() => toggle(u)}>
                {u.status === "ACTIVE" ? "Khóa tài khoản" : "Mở tài khoản"}
              </button>
            )}
        </article>
      ))}
      {data && !data.content.length && <p>Không có người dùng phù hợp.</p>}
      <div className="flex gap-4">
        <button disabled={busy || page === 0} onClick={() => setPage(page - 1)}>
          Trước
        </button>
        <span>
          Trang {page + 1} / {Math.max(1, data?.totalPages || 0)}
        </span>
        <button
          disabled={busy || !data || page + 1 >= data.totalPages}
          onClick={() => setPage(page + 1)}
        >
          Sau
        </button>
      </div>
    </div>
  );
}
