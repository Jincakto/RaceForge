import { useState } from 'react';
import { LifecycleBadge } from '../../components/horse/LifecycleBadge';
import { RecoveryBadge } from '../../components/horse/RecoveryBadge';
import { Badge } from '../../components/ui/Badge';
import { Btn } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatCard } from '../../components/ui/StatCard';
import { Textarea } from '../../components/ui/Textarea';
import { LIFECYCLE_LABEL, TODAY } from '../../data/constants';
import { toDDMMYYYY } from '../../utils/date';
import { getLifecycle, isHeavySession } from '../../utils/horse';

export function TrainingHubPage({ state, navigate, onSave, onCreatePlan, onCreateSession, onStartSession, onCompleteSession, onConfirmSchedule }) {
  const [actionError, setActionError] = useState('');
  const [confirmNote, setConfirmNote] = useState({});
  const [skipRestore, setSkipRestore] = useState(new Set());
  const me = state.user;
  const isTrainer = me.role === 'head_trainer';
  const [tab, setTab] = useState('plans');
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [showNewSession, setShowNewSession] = useState(false);
  const [conflictWarning, setConflictWarning] = useState('');
  const [completing, setCompleting] = useState(null);
  const [sessionResult, setSessionResult] = useState({ time: '', speed: '', heartRate: '', notes: '', score: '85' });
  const [planError, setPlanError] = useState('');

  const clubHorses = state.horses.filter(h => h.clubId === me.clubId);
  const horses = isTrainer
    ? clubHorses.filter(h => h.headTrainerId === me.id || state.enrollments.some(e => e.horseId === h.id && e.trainerId === me.id))
    : clubHorses;
  const myEnrollments = state.enrollments.filter(e => horses.some(h => h.id === e.horseId));
  const mySessions = state.trainingSessions.filter(s => horses.some(h => h.id === s.horseId));
  const myPlans = state.trainingPlans.filter(p => horses.some(h => h.id === p.horseId));

  const pickIssue = (h) => {
    if (!h) return 'Vui lòng chọn ngựa.';
    if (h.lock) return `Không thể chọn "${h.name}": ngựa đang bị KHÓA HUẤN LUYỆN (${h.lock.reason}). Chỉ Thú y mới gỡ được khóa, sau đó cần xác nhận lại lịch tập.`;
    const lc = getLifecycle(h);
    if (lc !== 'training') return `Không thể chọn "${h.name}": ngựa đang ở trạng thái "${LIFECYCLE_LABEL[lc]}", chưa có gói huấn luyện đang hiệu lực.`;
    return '';
  };
  const firstPickable = horses.find(h => !pickIssue(h))?.id || horses[0]?.id || '';

  const [newPlan, setNewPlan] = useState({ horseId: firstPickable, phase: 'Competition Prep', startDate: '', endDate: '', distance: '1200m', workload: 'High', surface: 'Turf', goals: '' });
  const [newSession, setNewSession] = useState({ horseId: firstPickable, date: '', time: '09:00', type: 'Sprint', distance: '800m', targetTime: '48s', notes: '' });
  const planHorse = horses.find(h => h.id === newPlan.horseId);
  const sessionHorse = horses.find(h => h.id === newSession.horseId);
  const planIssue = pickIssue(planHorse);
  const sessionIssue = pickIssue(sessionHorse);

  const checkConflict = (date, time) => {
    const ex = state.trainingSessions.find(s => s.date === toDDMMYYYY(date) && s.time === time && s.status !== 'Cancelled');
    setConflictWarning(ex ? `⚠️ Xung đột: đã có buổi "${ex.type}" lúc ${time} ngày ${ex.date}` : '');
  };

  const doneSessions = mySessions.filter(s => s.result);
  const avgScore = doneSessions.length ? Math.round(doneSessions.reduce((a, s) => a + s.result.performanceScore, 0) / doneSessions.length) : 0;
  const speeds = doneSessions.map(s => parseFloat(s.result.speed)).filter(n => !isNaN(n));
  const avgSpeed = speeds.length ? (speeds.reduce((a, n) => a + n, 0) / speeds.length).toFixed(1) : '—';

  const [td, tm, ty] = TODAY.split('/').map(Number);
  const todayDate = new Date(ty, tm - 1, td);
  const monday = new Date(todayDate); monday.setDate(todayDate.getDate() - ((todayDate.getDay() + 6) % 7));
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    return { key, label: `${['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][i]} ${d.getDate()}`, isToday: key === TODAY };
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-serif font-bold">Huấn luyện & Giáo án</h2><p className="text-sm text-gray-500">{isTrainer ? 'Head Trainer' : 'Xem'} · {horses.length} ngựa phụ trách</p></div>
        <div className="flex gap-2">
          {isTrainer && tab === 'plans' && <Btn variant="gold" onClick={() => { setShowNewPlan(!showNewPlan); setPlanError(''); }}>+ Tạo giáo án</Btn>}
          {isTrainer && tab === 'sessions' && <Btn variant="gold" onClick={() => setShowNewSession(!showNewSession)}>+ Lên lịch buổi tập</Btn>}
        </div>
      </div>
      <div className="flex gap-0 border-b border-gray-200">
        {([['plans', '📋 Giáo án'], ['sessions', '🏇 Buổi tập'], ['schedule', '📅 Lịch tuần'], ['results', '📊 Kết quả']]).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} className={`px-5 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${tab === t ? 'border-[#c9973b] text-[#c9973b]' : 'border-transparent text-gray-500 hover:text-[#0f1729]'}`}>{l}</button>
        ))}
      </div>

      {tab === 'plans' && (
        <div className="space-y-4">
          {myEnrollments.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-[#0f1729]">Gói huấn luyện được phân công</h3>
              {myEnrollments.map(e => {
                const h = horses.find(x => x.id === e.horseId);
                const voided = state.trainingSessions.filter(x => x.horseId === e.horseId && x.voidedByLock && x.status === 'Not Performed');
                const needsConfirm = e.status === 'active' && !e.scheduleConfirmed;
                return (
                  <Card key={e.id} className={`p-4 ${e.status === 'paused' ? 'border-l-4 border-red-400' : needsConfirm ? 'border-l-4 border-amber-400' : ''}`}>
                    <div className="flex items-start gap-3">
                      <img src={h.imageUrl} className="w-11 h-11 rounded-lg object-cover bg-gray-200" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap"><span className="font-semibold">{h.name}</span><span className="text-xs text-gray-500">Gói {e.packageName}</span><Badge status={e.status === 'paused' ? 'Paused' : e.status === 'completed' ? 'Completed' : 'Active'} /><LifecycleBadge horse={h} /><RecoveryBadge horse={h} /></div>
                        <div className="mt-2"><div className="flex justify-between text-xs text-gray-500 mb-1"><span>Đã tập {e.sessionsDone}/{e.sessionsTotal} buổi</span><span>Còn lại {e.sessionsTotal - e.sessionsDone} buổi</span></div><div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-[#c9973b] h-2 rounded-full" style={{ width: `${Math.round(e.sessionsDone / e.sessionsTotal * 100)}%` }} /></div></div>
                        {e.status === 'paused' && <div className="text-xs text-red-600 mt-2">⏸ Tạm dừng từ {e.pausedAt}: {e.pauseReason}. Tiến độ và số buổi còn lại được giữ nguyên. Chờ Thú y gỡ khóa.</div>}
                        {needsConfirm && (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                            <div className="text-sm text-amber-800 font-medium">Thú y đã gỡ khóa. Lịch cũ chưa chạy lại — hãy điều chỉnh và xác nhận lịch tập.</div>
                            {voided.length > 0 && <div className="space-y-1">{voided.map(v => <label key={v.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!skipRestore.has(v.id)} onChange={() => setSkipRestore(p => { const n = new Set(p); n.has(v.id) ? n.delete(v.id) : n.add(v.id); return n; })} />Khôi phục: {v.type} · {v.distance} · {v.date}</label>)}</div>}
                            {isTrainer && <><Textarea label="Điều chỉnh giáo án (cường độ, cự ly, ghi chú)" value={confirmNote[e.horseId] || ''} onChange={v => setConfirmNote(p => ({ ...p, [e.horseId]: v }))} rows={2} placeholder="VD: Giảm 20% cường độ tuần đầu, tăng dần theo nhịp tim" />
                            <Btn variant="gold" onClick={() => { const err = onConfirmSchedule(e.horseId, confirmNote[e.horseId] || '', voided.filter(v => !skipRestore.has(v.id)).map(v => v.id)); setActionError(err || ''); }}>✓ Xác nhận lịch tập</Btn></>}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
          {showNewPlan && isTrainer && (
            <Card className="p-5 border-l-4 border-[#c9973b]">
              <h3 className="font-semibold mb-4">Tạo giáo án mới</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Select label="Ngựa" value={newPlan.horseId} onChange={v => { setNewPlan(p => ({ ...p, horseId: v })); setPlanError(''); }} options={horses.map(h => ({ value: h.id, label: `${h.name} (${h.id}) — ${h.lock ? '🔒 Đang khóa' : LIFECYCLE_LABEL[getLifecycle(h)]}` }))} />
                  {planIssue && <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex gap-2"><span>⛔</span><span>{planIssue}</span></div>}
                </div>
                <Select label="Giai đoạn" value={newPlan.phase} onChange={v => setNewPlan(p => ({ ...p, phase: v }))} options={['Foundation', 'Base Building', 'Intensity', 'Competition Prep', 'Recovery'].map(v => ({ value: v, label: v }))} />
                <Select label="Cự ly chính" value={newPlan.distance} onChange={v => setNewPlan(p => ({ ...p, distance: v }))} options={['800m', '1000m', '1200m', '1400m', '1600m', '2000m'].map(v => ({ value: v, label: v }))} />
                <Input label="Từ ngày" required value={newPlan.startDate} onChange={v => { setNewPlan(p => ({ ...p, startDate: v })); setPlanError(''); }} type="date" />
                <Input label="Đến ngày" required value={newPlan.endDate} onChange={v => { setNewPlan(p => ({ ...p, endDate: v })); setPlanError(''); }} type="date" />
                <Select label="Cường độ" value={newPlan.workload} onChange={v => setNewPlan(p => ({ ...p, workload: v }))} options={['Low', 'Moderate', 'High', 'Very High'].map(v => ({ value: v, label: v }))} />
                <div className="col-span-2"><Textarea label="Mục tiêu" value={newPlan.goals} onChange={v => setNewPlan(p => ({ ...p, goals: v }))} placeholder="Mô tả mục tiêu cụ thể..." /></div>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 mt-3">💡 Gợi ý: Xem tab "🤖 Giáo án AI" trong hồ sơ ngựa để nhận đề xuất dựa trên thuật toán</div>
              {planError && <div className="mt-3 text-sm text-red-600 font-medium">⚠ {planError}</div>}
              <div className="flex gap-2 mt-4">
                <Btn variant="gold" disabled={!!planIssue} onClick={() => {
                  if (!newPlan.startDate || !newPlan.endDate) { setPlanError('Bắt buộc nhập cả "Từ ngày" và "Đến ngày" của giáo án.'); return; }
                  if (newPlan.endDate < newPlan.startDate) { setPlanError('"Đến ngày" phải sau hoặc bằng "Từ ngày".'); return; }
                  const err = onCreatePlan({ id: `tp${Date.now()}`, horseId: newPlan.horseId, phase: newPlan.phase, startDate: toDDMMYYYY(newPlan.startDate), endDate: toDDMMYYYY(newPlan.endDate), distance: newPlan.distance, workload: newPlan.workload, surface: 'Turf', goals: newPlan.goals || 'Chưa nhập mục tiêu', status: 'Active', locked: false, createdBy: me.name, progress: 0 });
                  if (err) { setPlanError(err); return; }
                  setShowNewPlan(false); setPlanError(''); setNewPlan(p => ({ ...p, startDate: '', endDate: '', goals: '' }));
                }}>💾 Lưu giáo án</Btn>
                <Btn variant="secondary" onClick={() => { setShowNewPlan(false); setPlanError(''); }}>Huỷ</Btn>
              </div>
            </Card>
          )}
          {myPlans.length === 0 && <Card className="p-6 text-sm text-gray-400 text-center">Chưa có giáo án nào</Card>}
          {myPlans.map(p => (
            <Card key={p.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex gap-2 mb-2"><Badge status={p.phase} /><Badge status={p.status} /></div>
                  <div className="font-semibold">{p.phase} — {state.horses.find(h => h.id === p.horseId)?.name}</div>
                  <div className="text-sm text-gray-500">{p.startDate} → {p.endDate} · {p.distance} · {p.workload}</div>
                  <div className="text-sm text-gray-600">Mục tiêu: {p.goals}</div>
                  {p.algorithmRationale && <div className="text-xs text-[#c9973b] mt-1">🤖 {p.algorithmRationale}</div>}
                  {p.weeklyKm && <div className="text-xs text-gray-400 mt-1">{p.weeklyKm} km/tuần · {p.sessionsPerWeek} buổi · {p.restDaysPerWeek} ngày nghỉ · Score {p.intensityScore}</div>}
                  <div className="mt-2"><div className="flex justify-between text-xs text-gray-500 mb-1"><span>Tiến độ</span><span>{p.progress}%</span></div><div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-[#c9973b] h-2 rounded-full" style={{ width: `${p.progress}%` }} /></div></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'sessions' && (
        <div className="space-y-4">
          {actionError && <Card className="p-4 border-l-4 border-red-500 bg-red-50"><div className="flex items-start gap-3 text-sm text-red-700"><span>⛔</span><div className="flex-1"><strong>Hệ thống từ chối:</strong> {actionError}</div><button onClick={() => setActionError('')} className="text-red-400 hover:text-red-600">✕</button></div></Card>}
          {showNewSession && isTrainer && (
            <Card className="p-5 border-l-4 border-[#c9973b]">
              <h3 className="font-semibold mb-4">Lên lịch buổi tập</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Select label="Ngựa" value={newSession.horseId} onChange={v => { setNewSession(s => ({ ...s, horseId: v })); setActionError(''); }} options={horses.map(h => ({ value: h.id, label: `${h.name} — ${h.lock ? '🔒 Đang khóa' : LIFECYCLE_LABEL[getLifecycle(h)]}` }))} />
                  {sessionIssue && <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex gap-2"><span>⛔</span><span>{sessionIssue}</span></div>}
                </div>
                <Select label="Loại buổi tập" value={newSession.type} onChange={v => setNewSession(s => ({ ...s, type: v }))} options={['Sprint', 'Gallop', 'Recovery Trot', 'Interval', 'Race-Pace', 'Fartlek', 'Endurance'].map(v => ({ value: v, label: v }))} />
                <Select label="Cự ly" value={newSession.distance} onChange={v => setNewSession(s => ({ ...s, distance: v }))} options={['200m', '400m', '800m', '1000m', '1200m', '1600m', '2000m', '3000m'].map(v => ({ value: v, label: v }))} />
                <Input label="Ngày" required value={newSession.date} onChange={v => { setNewSession(s => ({ ...s, date: v })); checkConflict(v, newSession.time); }} type="date" />
                <Input label="Giờ" value={newSession.time} onChange={v => { setNewSession(s => ({ ...s, time: v })); checkConflict(newSession.date, v); }} type="time" />
                <Input label="Thời gian đích" value={newSession.targetTime} onChange={v => setNewSession(s => ({ ...s, targetTime: v }))} placeholder="VD: 48s" />
                <div className="col-span-2"><Textarea label="Ghi chú buổi tập" value={newSession.notes} onChange={v => setNewSession(s => ({ ...s, notes: v }))} placeholder="Mục tiêu cụ thể, lưu ý đặc biệt..." /></div>
              </div>
              {conflictWarning && <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm mt-2">{conflictWarning}</div>}
              <div className="flex gap-2 mt-4"><Btn variant="gold" disabled={!!sessionIssue} onClick={() => {
                if (!newSession.date) { setActionError('Bắt buộc chọn ngày tập.'); return; }
                const en = state.enrollments.find(x => x.horseId === newSession.horseId && x.status !== 'completed');
                const err = onCreateSession({ id: `ts${Date.now()}`, horseId: newSession.horseId, planId: state.trainingPlans.find(p => p.horseId === newSession.horseId && p.status === 'Active')?.id || '', date: toDDMMYYYY(newSession.date), time: newSession.time, type: newSession.type, trainerName: en?.trainerName || me.name, trainerId: en?.trainerId || me.id, assignedStaffIds: [], assignedStaffNames: sessionHorse?.groomName ? [sessionHorse.groomName] : [], status: 'Scheduled', distance: newSession.distance, targetTime: newSession.targetTime, notes: newSession.notes, conflictChecked: !conflictWarning });
                setActionError(err || '');
                if (!err) { setShowNewSession(false); setConflictWarning(''); setNewSession(x => ({ ...x, date: '', notes: '' })); }
              }}>💾 Lưu lịch</Btn><Btn variant="secondary" onClick={() => { setShowNewSession(false); setConflictWarning(''); }}>Huỷ</Btn></div>
            </Card>
          )}
          {mySessions.length === 0 && <Card className="p-6 text-sm text-gray-400 text-center">Chưa có buổi tập nào</Card>}
          {mySessions.map(s => (
            <Card key={s.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex gap-2 mb-1"><Badge status={s.status} />{isHeavySession(s.type) && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">Buổi nặng</span>}</div>
                  <div className="font-semibold">{s.type} — {state.horses.find(h => h.id === s.horseId)?.name} · {s.distance}</div>
                  <div className="text-sm text-gray-500">{s.date} · {s.time} · Đích: {s.targetTime}</div>
                  <div className="text-sm text-gray-600">{s.notes}</div>
                  <div className="text-xs text-gray-400 mt-1">Groom: {s.assignedStaffNames.join(', ') || '—'}</div>
                  {s.status === 'Not Performed' && <div className="text-xs text-red-600 mt-1">⛔ Không thực hiện — ngựa bị khóa huấn luyện. Cần HLV xác nhận lại lịch sau khi Thú y gỡ khóa.</div>}
                </div>
                {isTrainer && s.status === 'Scheduled' && <Btn variant="gold" onClick={() => { const err = onStartSession(s.id); setActionError(err || ''); }}>▶ Bắt đầu</Btn>}
                {isTrainer && s.status === 'In Progress' && completing !== s.id && <Btn variant="primary" onClick={() => { setCompleting(s.id); setActionError(''); }}>✓ Hoàn thành buổi tập</Btn>}
              </div>
              {completing === s.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="font-semibold text-sm mb-3">Ghi nhận kết quả buổi tập</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Thời gian thực tế" required value={sessionResult.time} onChange={v => setSessionResult(r => ({ ...r, time: v }))} placeholder="VD: 73.8s" />
                    <Input label="Tốc độ cao nhất (km/h)" value={sessionResult.speed} onChange={v => setSessionResult(r => ({ ...r, speed: v }))} placeholder="VD: 58.6" />
                    <Input label="Nhịp tim tối đa (bpm)" value={sessionResult.heartRate} onChange={v => setSessionResult(r => ({ ...r, heartRate: v }))} placeholder="VD: 188" />
                    <Select label="Performance score" value={sessionResult.score} onChange={v => setSessionResult(r => ({ ...r, score: v }))} options={['100', '95', '90', '85', '80', '75', '70', '65', '60', '50'].map(v => ({ value: v, label: `${v}/100` }))} />
                    <div className="col-span-2"><Textarea label="Nhận xét của Trainer" value={sessionResult.notes} onChange={v => setSessionResult(r => ({ ...r, notes: v }))} rows={2} placeholder="Nhận xét về phong độ, kỹ thuật, tiến bộ..." /></div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Btn variant="gold" onClick={() => {
                      if (!sessionResult.time.trim()) { setActionError('Vui lòng nhập thời gian thực tế của buổi tập.'); return; }
                      const err = onCompleteSession(s.id, { time: sessionResult.time, speed: sessionResult.speed || '0', heartRate: parseInt(sessionResult.heartRate) || 0, notes: sessionResult.notes, performanceScore: parseInt(sessionResult.score) });
                      setActionError(err || '');
                      if (!err) { setCompleting(null); setSessionResult({ time: '', speed: '', heartRate: '', notes: '', score: '85' }); }
                    }}>💾 Lưu kết quả & Hoàn thành</Btn>
                    <Btn variant="secondary" onClick={() => setCompleting(null)}>Huỷ</Btn>
                  </div>
                </div>
              )}
              {s.result && (
                <div className="mt-3 grid grid-cols-4 gap-3 pt-3 border-t border-gray-100">
                  {[['Thời gian', s.result.time], ['Tốc độ', s.result.speed + ' km/h'], ['Nhịp tim', s.result.heartRate + ' bpm'], ['Score', s.result.performanceScore + '/100']].map(([k, v]) => (
                    <div key={k} className="text-center p-2 bg-gray-50 rounded-lg"><div className="text-xs text-gray-500">{k}</div><div className="font-mono font-bold text-sm">{v}</div></div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {tab === 'schedule' && (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-200">
            {weekDays.map(d => (
              <div key={d.key} className={`px-2 py-3 text-center text-xs font-semibold ${d.isToday ? 'bg-[#c9973b]/10 text-[#c9973b]' : 'text-gray-500'}`}>{d.label}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 min-h-40 divide-x divide-gray-100">
            {weekDays.map(d => {
              const events = mySessions.filter(s => s.date === d.key && s.status !== 'Cancelled');
              const color = (st) => st === 'Completed' ? 'bg-emerald-700' : st === 'In Progress' ? 'bg-[#c9973b]' : st === 'Not Performed' ? 'bg-red-500' : 'bg-[#1a2844]';
              return (
                <div key={d.key} className={`p-2 space-y-1.5 ${d.isToday ? 'bg-[#c9973b]/5' : ''}`}>
                  {events.map(e => <div key={e.id} className={`p-2 rounded-lg ${color(e.status)} text-white text-xs`}><div className="font-semibold">{state.horses.find(h => h.id === e.horseId)?.name}</div><div className="opacity-75 text-[10px]">{e.time} · {e.type} {e.distance}</div></div>)}
                  {events.length === 0 && <div className="text-center text-gray-200 text-xs py-5">—</div>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {tab === 'results' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Buổi tập hoàn thành" value={mySessions.filter(s => s.status === 'Completed').length} color="navy" />
            <StatCard label="Tốc độ TB" value={avgSpeed === '—' ? '—' : `${avgSpeed} km/h`} color="gold" />
            <StatCard label="Score TB" value={doneSessions.length ? `${avgScore}/100` : '—'} color="green" />
          </div>
          {doneSessions.length === 0 && <Card className="p-6 text-sm text-gray-400 text-center">Chưa có kết quả. Hãy bắt đầu một buổi tập rồi bấm "Hoàn thành buổi tập" ở tab Buổi tập để ghi kết quả.</Card>}
          {doneSessions.map(s => (
            <Card key={s.id} className="p-5">
              <div className="font-semibold mb-1">{s.type} · {s.distance} · {s.date} — {state.horses.find(h => h.id === s.horseId)?.name}</div>
              <div className="grid grid-cols-4 gap-3 mt-3">
                {[['Thời gian', s.result.time], ['Tốc độ', s.result.speed + ' km/h'], ['Nhịp tim', s.result.heartRate + ' bpm'], ['Score', s.result.performanceScore + '/100']].map(([k, v]) => (
                  <div key={k} className="p-3 bg-gray-50 rounded-lg text-center"><div className="text-xs text-gray-500">{k}</div><div className="font-mono font-bold text-sm mt-0.5">{v}</div></div>
                ))}
              </div>
              {s.result.notes && <p className="text-sm text-gray-600 mt-3 italic">"{s.result.notes}"</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
