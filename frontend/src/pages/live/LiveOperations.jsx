import { useEffect, useState } from 'react';
import { useApp } from '../../hooks/useApp.js';
import { horseService } from '../../services/horseService.ts';
import { trainingService } from '../../services/trainingService.ts';
import { plansService } from '../../services/planService.ts';
import { sessionService } from '../../services/sessionService.ts';
import { raceService } from '../../services/raceService.ts';

// Each form submits the corresponding main DTO; backend enforces business permissions.
function ActionForm({ title, fields, initial = {}, busy, submit }) {
  return <form className="border rounded bg-white p-4 space-y-3" onSubmit={async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form), body = {};
    fields.forEach(([key, , type]) => {
      const value = data.get(key);
      if (value !== '') body[key] = type === 'number' ? Number(value) : value;
    });
    if (await submit(body)) form.reset();
  }}><h2 className="font-bold">{title}</h2><fieldset disabled={busy} className="grid md:grid-cols-2 gap-3">{fields.map(([key, label, type = 'text', required = false, options]) => <label key={key}>{label}{options ? <select name={key} defaultValue={initial[key]} className="block border rounded p-2 w-full">{options.map(x => <option key={x}>{x}</option>)}</select> : <input name={key} type={type} required={required} defaultValue={initial[key]} step={type === 'number' ? 'any' : undefined} min={type === 'number' ? 0 : undefined} className="block border rounded p-2 w-full"/>}</label>)}<button className="border rounded px-3 py-2">Lưu</button></fieldset></form>;
}
const resultFields = [['heartRate', 'Nhịp tim (bpm)', 'number', true], ['avgSpeed', 'Tốc độ trung bình (km/h)', 'number', true], ['maxSpeed', 'Tốc độ tối đa (km/h)', 'number', true], ['performanceNotes', 'Đánh giá']];
const packageFields = [['packageName', 'Tên gói', 'text', true], ['packageType', 'Loại gói', 'text', true, ['BASIC', 'RACING', 'PERFORMANCE', 'RECOVERY']], ['durationDays', 'Số ngày', 'number', true], ['price', 'Giá', 'number', true], ['description', 'Mô tả']];
const raceFields = [['raceName', 'Tên giải', 'text', true], ['raceDate', 'Ngày đua', 'date'], ['distance', 'Cự ly (m)', 'number'], ['finishPosition', 'Thứ hạng', 'number'], ['completionTime', 'Thời gian hoàn thành'], ['racecourse', 'Trường đua'], ['jockeyName', 'Nài ngựa'], ['prize', 'Giải thưởng', 'number']];

export function LiveOperations({ mode }) {
  const { state } = useApp(), user = state.user;
  const [horses, setHorses] = useState([]), [selected, setSelected] = useState(0);
  const [rows, setRows] = useState([]), [busy, setBusy] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    horseService.list().then(list => {
      if (!active) return;
      const visible = list.filter(h => (user.role !== 'owner' || h.ownerId === user.id) && (user.role !== 'head_trainer' || h.headTrainerId === user.id));
      setHorses(visible); setSelected(visible[0]?.horseId || 0);
    }).catch(e => active && setError(e.message)).finally(() => active && setBusy(false));
    return () => { active = false; };
  }, [user.id, user.role]);
  useEffect(() => {
    let active = true;
    setRows([]); setError(''); setBusy(true);
    const promise = mode === 'packages' ? trainingService.getPackages(true) : selected ? mode === 'races' ? raceService.byHorse(selected) : sessionService.byHorse(selected) : Promise.resolve([]);
    promise.then(data => active && setRows(data)).catch(e => active && setError(e.message)).finally(() => active && setBusy(false));
    return () => { active = false; };
  }, [mode, selected, revision]);
  async function act(action) {
    if (busy) return false;
    setBusy(true); setError(''); setNotice('');
    try { const result = await action(); setNotice(result?.warningMessage || (result?.planId ? `Đã tạo giáo án #${result.planId}. Dùng mã này để xếp lịch.` : 'Đã lưu thành công.')); setRevision(v => v + 1); return true; }
    catch (e) { setError(e.message); return false; }
    finally { setBusy(false); }
  }
  return <section className="space-y-4"><h1 className="text-2xl font-bold">{mode === 'packages' ? 'Quản lý gói huấn luyện' : mode === 'races' ? 'Kết quả đua' : 'Giáo án & lịch tập'}</h1>{mode !== 'packages' && <label>Ngựa<select className="border rounded p-2 ml-3" disabled={busy} value={selected} onChange={e => setSelected(Number(e.target.value))}><option value={0}>Chọn ngựa</option>{horses.map(h => <option key={h.horseId} value={h.horseId}>{h.horseName} · #{h.horseId}</option>)}</select></label>}<button className="border rounded p-2" disabled={busy} onClick={() => setRevision(v => v + 1)}>Tải lại</button>{busy && <p role="status">Đang xử lý...</p>}{error && <p role="alert" className="text-red-700">{error}</p>}{notice && <p role="status">{notice}</p>}
    {mode === 'packages' && <><ActionForm title="Tạo gói" fields={packageFields} busy={busy} submit={body => act(() => trainingService.createPackage(body))}/>{rows.map(p => <article key={p.packageId} className="border rounded p-3"><p>#{p.packageId} · {p.packageName} · {p.status}</p><button disabled={busy} onClick={() => act(() => trainingService.togglePackageStatus(p.packageId, p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'))}>{p.status === 'ACTIVE' ? 'Tắt gói' : 'Bật gói'}</button><details><summary>Sửa gói</summary><ActionForm title="Cập nhật gói" initial={p} fields={packageFields} busy={busy} submit={body => act(() => trainingService.updatePackage(p.packageId, body))}/></details></article>)}</>}
    {mode === 'races' && !!selected && <><ActionForm key={selected} title="Thêm kết quả đua" fields={raceFields} busy={busy} submit={body => act(() => raceService.create(selected, body))}/>{rows.map(r => <article key={r.raceHistoryId} className="border rounded p-3"><p>{r.raceName} · {r.raceDate} · Hạng {r.finishPosition ?? '—'}</p><details><summary>Sửa kết quả</summary><ActionForm title="Cập nhật kết quả" initial={r} fields={raceFields} busy={busy} submit={body => act(() => raceService.update(r.raceHistoryId, body))}/></details><button disabled={busy} onClick={() => { if (window.confirm('Xóa kết quả đua này?')) void act(() => raceService.remove(r.raceHistoryId)); }}>Xóa kết quả</button></article>)}</>}
    {mode === 'sessions' && !!selected && <>{user.role === 'head_trainer' && <><ActionForm key={'plan-' + selected} title="Tạo giáo án" fields={[[ 'planName', 'Tên giáo án', 'text', true], ['goal', 'Mục tiêu'], ['duration', 'Thời lượng', 'number'], ['startDate', 'Bắt đầu', 'date'], ['endDate', 'Kết thúc', 'date'], ['notes', 'Ghi chú']]} busy={busy} submit={body => act(() => plansService.createPlan(selected, body))}/><ActionForm title="Xếp một buổi tập" fields={[[ 'planId', 'Mã giáo án', 'number', true], ['scheduledTime', 'Thời điểm', 'datetime-local', true]]} busy={busy} submit={body => act(() => sessionService.schedule({ ...body, horseId: selected }))}/><ActionForm title="Xếp lịch lặp hàng tuần" fields={[[ 'planId', 'Mã giáo án', 'number', true], ['activityName', 'Hoạt động', 'text', true], ['startDate', 'Ngày bắt đầu', 'date', true], ['durationWeeks', 'Số tuần (1–52)', 'number', true], ['sessionTime', 'Giờ tập', 'time']]} busy={busy} submit={body => act(() => sessionService.recurring({ ...body, horseId: selected }))}/></>}{rows.map(s => <article key={s.sessionId} className="border rounded p-3 space-y-2"><p>Buổi #{s.sessionId} · Giáo án #{s.planId} · {s.scheduledStart} · {s.status}</p>{user.role === 'head_trainer' && <><button disabled={busy || ['COMPLETED', 'MISSED'].includes(s.status) || !!s.actualStart} onClick={() => act(() => sessionService.startSession(s.sessionId))}>Bắt đầu</button><details><summary>Hoàn thành & ghi chỉ số</summary><ActionForm title="Kết quả buổi tập" fields={resultFields} busy={busy} submit={body => act(() => sessionService.completeSession(s.sessionId, body))}/></details><details><summary>Điểm danh</summary><ActionForm title="Ghi nhận tham dự" fields={[[ 'status', 'Trạng thái', 'text', true, ['COMPLETED', 'MISSED']], ...resultFields.map(f => [f[0], f[1], f[2]]), ['absenceReason', 'Lý do vắng', 'text', false, ['', 'TRAINING_LOCK', 'HEALTH_ISSUE', 'INJURY', 'BAD_WEATHER', 'OTHER']], ['absenceNote', 'Ghi chú vắng']]} busy={busy} submit={body => act(() => sessionService.attendance(s.sessionId, body))}/></details></>}</article>)}</>}
    {!busy && !rows.length && <p>Chưa có dữ liệu.</p>}
  </section>;
}
