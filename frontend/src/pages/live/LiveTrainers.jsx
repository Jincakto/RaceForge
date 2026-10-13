import { useEffect, useState } from "react";
import { trainerService } from "../../services/trainerService.ts";
import { horseService } from "../../services/horseService.ts";
export function LiveTrainers({ horseId, onAssigned }) {
  const [data, setData] = useState(null),
    [page, setPage] = useState(0),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [detail, setDetail] = useState(null);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    setData(null);
    trainerService
      .list(page)
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setBusy(false));
    return () => {
      active = false;
    };
  }, [page]);
  async function run(action) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">Trainer đang hoạt động</h2>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {busy && <p role="status">Đang xử lý...</p>}
      {detail && (
        <div className="border rounded p-3">
          <h3>{detail.fullName}</h3>
          <p>Mã trainer: {detail.userId}</p>
          <button onClick={() => setDetail(null)}>Đóng hồ sơ</button>
        </div>
      )}
      {data?.content.map((t) => (
        <article
          className="bg-white border rounded p-3 flex justify-between gap-3"
          key={t.userId}
        >
          <span>
            {t.fullName} · #{t.userId}
          </span>
          <button
            disabled={busy}
            onClick={() =>
              run(async () => setDetail(await trainerService.get(t.userId)))
            }
          >
            Xem hồ sơ
          </button>
          {horseId && (
            <button
              disabled={busy}
              onClick={() =>
                run(async () =>
                  onAssigned(await horseService.assign(horseId, t.userId)),
                )
              }
            >
              Chọn trainer
            </button>
          )}
        </article>
      ))}
      {data && !data.content.length && <p>Chưa có trainer đang hoạt động.</p>}
      <div className="flex gap-4">
        <button disabled={busy || page === 0} onClick={() => setPage(page - 1)}>
          Trước
        </button>
        <span>Trang {page + 1}</span>
        <button
          disabled={busy || !data || page + 1 >= data.totalPages}
          onClick={() => setPage(page + 1)}
        >
          Sau
        </button>
      </div>
    </section>
  );
}
