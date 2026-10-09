import { useState } from 'react';
import { TrainingEligibilityCard } from '../../components/health/TrainingEligibilityCard';
import { Badge } from '../../components/ui/Badge';
import { Btn } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { deriveTrainingEligibility } from '../../utils/eligibility';
import { getLifecycle } from '../../utils/horse';

export function VetHealthFormPage({ state, navigate, onSave, onSaveRecord, postSession, onPostSubmit, onBack }) {
  const horses = state.horses.filter(h => postSession ? h.id === postSession.horseId : h.clubId === state.user.clubId);
  const [selectedHorse, setSelectedHorse] = useState(horses[0]?.id || '');
  const [examType, setExamType] = useState(postSession ? 'Kiểm tra sau tập' : 'Kiểm tra định kỳ');
  const [isPostTraining, setIsPostTraining] = useState(!!postSession);

  // Numeric vitals
  const [temperature, setTemperature] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [respRate, setRespRate] = useState('');

  // Qualitative clinical assessment
  const [clinical, setClinical] = useState({
    eyes: '', nose: '', mouth: '', movement: '', eating: '', waste: '', skin: '', behavior: '',
  });
  const [injuryDetails, setInjuryDetails] = useState({});
  const setClx = (k) => (v) => {
    setClinical(p => ({ ...p, [k]: v }));
    if (v === 'normal') setInjuryDetails(p => {
      const next = { ...p };
      delete next[k];
      return next;
    });
  };
  const setInjuryDetail = (key, patch) =>
    setInjuryDetails(p => ({ ...p, [key]: { issue: '', severity: 'mild', ...p[key], ...patch } }));

  // Notes & decision
  const [diagnosis, setDiagnosis] = useState('');
  const [medications, setMedications] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [lockApplied, setLockApplied] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null);

  const horse = horses.find(h => h.id === selectedHorse);

  // ── Linked person lookups (auto-sync when horse changes) ──────────────────
  const club    = state.clubs.find(c => c.id === (horse?.clubId ?? state.user.clubId));
  const owner   = horse ? state.users.find(u => u.id === horse.ownerId)   : undefined;
  const trainer = horse ? state.users.find(u => u.id === horse.headTrainerId) : undefined;
  const manager = club  ? state.users.find(u => u.id === club.managerId)  : undefined;
  const evalNum = (val, lo, hi) => {
    if (!val.trim()) return 'empty';
    const n = parseFloat(val.replace(',', '.'));
    if (isNaN(n)) return 'invalid';
    if (n >= lo && n <= hi) return 'normal';
    if (n >= lo - lo * 0.1 && n <= hi + hi * 0.1) return 'watch';
    return 'fail';
  };

  const tempSt = evalNum(temperature, 37.2, 38.3);
  const hrSt   = evalNum(heartRate, 28, 44);
  const rrSt   = evalNum(respRate, 8, 16);

  const numericFields = [
    { key: 'temp',  label: 'Nhiệt độ cơ thể',   icon: '🌡️', val: temperature, setVal: setTemperature, unit: '°C',        range: '37,2–38,3°C',       st: tempSt },
    { key: 'hr',    label: 'Nhịp tim lúc nghỉ',  icon: '❤️',  val: heartRate,   setVal: setHeartRate,   unit: 'lần/phút',  range: '28–44 lần/phút',    st: hrSt   },
    { key: 'rr',    label: 'Nhịp thở lúc nghỉ',  icon: '🫁',  val: respRate,    setVal: setRespRate,    unit: 'lần/phút',  range: '8–16 lần/phút',     st: rrSt   },
  ];

  const clinicalDefs = [
    { key: 'eyes', label: 'Mắt', icon: '👀', hint: 'Bình thường: sáng, tỉnh táo, không đỏ hoặc tiết dịch bất thường.', issues: ['Viêm / đỏ mắt', 'Tiết dịch', 'Tổn thương giác mạc'] },
    { key: 'nose', label: 'Mũi', icon: '👃', hint: 'Bình thường: sạch, không có dịch đặc hoặc màu bất thường.', issues: ['Chảy dịch mũi', 'Chảy máu mũi', 'Tắc nghẽn đường thở'] },
    { key: 'mouth', label: 'Miệng / Nướu', icon: '🦷', hint: 'Bình thường: niêm mạc hồng, ẩm.', issues: ['Tổn thương miệng', 'Viêm nướu', 'Gãy / tổn thương răng'] },
    { key: 'movement', label: 'Vận động', icon: '🐎', hint: 'Bình thường: đi lại bình thường, không khập khiễng, không có dấu hiệu đau.', issues: ['Căng cơ', 'Khập khiễng', 'Trật khớp', 'Gãy xương', 'Tổn thương gân / dây chằng'] },
    { key: 'eating', label: 'Ăn uống', icon: '🍀', hint: 'Bình thường: ăn uống bình thường, có hứng thú với thức ăn.', issues: ['Giảm ăn', 'Bỏ ăn', 'Khó nuốt'] },
    { key: 'waste', label: 'Phân và nước tiểu', icon: '💩', hint: 'Bình thường: đều đặn, hình dạng và màu sắc không bất thường.', issues: ['Tiêu chảy', 'Táo bón', 'Nước tiểu bất thường'] },
    { key: 'skin', label: 'Da và lông', icon: '🧴', hint: 'Bình thường: lông tương đối bóng, da không có nhiều tổn thương hoặc sưng bất thường.', issues: ['Trầy xước', 'Rách da', 'Sưng / viêm', 'Nhiễm trùng da'] },
    { key: 'behavior', label: 'Hành vi', icon: '🧠', hint: 'Bình thường: tỉnh táo, phản ứng bình thường với môi trường xung quanh.', issues: ['Lờ đờ', 'Kích động', 'Phản ứng đau rõ rệt'] },
  ];

  const numStats   = [tempSt, hrSt, rrSt];
  const qualVals   = clinicalDefs.map(d => clinical[d.key]);
  const hasEmpty   = numStats.some(s => s === 'empty') || qualVals.some(v => v === '');
  const hasInvalid = numStats.some(s => s === 'invalid');
  const hasSevereInjury = Object.values(injuryDetails).some(d => d.severity === 'severe');
  const hasFail    = numStats.some(s => s === 'fail') || hasSevereInjury;
  const hasWatch   = numStats.some(s => s === 'watch') || qualVals.some(v => v === 'abnormal');

  const overallEval =
    hasEmpty || hasInvalid ? 'incomplete' : hasFail ? 'fail' : hasWatch ? 'watch' : 'pass';

  // Collect abnormal items
  const abnItems = [];
  if (tempSt === 'watch' || tempSt === 'fail') abnItems.push({ label: 'Nhiệt độ', value: temperature + '°C', normal: '37,2–38,3°C', level: tempSt });
  if (hrSt === 'watch'   || hrSt === 'fail')   abnItems.push({ label: 'Nhịp tim', value: heartRate + ' lần/phút', normal: '28–44 lần/phút', level: hrSt });
  if (rrSt === 'watch'   || rrSt === 'fail')   abnItems.push({ label: 'Nhịp thở', value: respRate + ' lần/phút', normal: '8–16 lần/phút', level: rrSt });
  clinicalDefs.forEach(d => {
    if (clinical[d.key] === 'abnormal') {
      const detail = injuryDetails[d.key];
      abnItems.push({ label: d.label, value: `${detail?.issue || 'Bất thường'} · ${detail?.severity === 'severe' ? 'Nặng' : detail?.severity === 'moderate' ? 'Vừa' : 'Nhẹ'}`, normal: 'Bình thường', level: detail?.severity === 'severe' ? 'fail' : 'watch' });
    }
  });

  const normalCount = numStats.filter(s => s === 'normal').length + qualVals.filter(v => v === 'normal').length;
  const watchCount  = numStats.filter(s => s === 'watch').length  + qualVals.filter(v => v === 'abnormal').length;
  const failCount   = numStats.filter(s => s === 'fail').length + Object.values(injuryDetails).filter(d => d.severity === 'severe').length;

  // ── Training eligibility (auto-derived) ──────────────────────────────────
  const hrVal   = heartRate.trim()    ? parseFloat(heartRate.replace(',', '.'))    : null;
  const tempVal = temperature.trim()  ? parseFloat(temperature.replace(',', '.'))  : null;
  const rrVal   = respRate.trim()     ? parseFloat(respRate.replace(',', '.'))     : null;
  const hasMinVitals = !!temperature && !!heartRate && !hasInvalid;

  const trainingResult = deriveTrainingEligibility({
    hasMinVitals, hasFail,
    hrVal, tempVal, rrVal,
    hrSt, tempSt, rrSt,
    clinical, injuryDetails,
  });
  const willAutoLock = trainingResult.status === 'not-eligible' && !!horse && getLifecycle(horse) === 'training';

  const hasIncompleteInjury = Object.entries(clinical).some(([key, value]) => value === 'abnormal' && !injuryDetails[key]?.issue);
  const canSave = hasMinVitals && !hasIncompleteInjury;

  const handleReset = () => {
    setTemperature(''); setHeartRate(''); setRespRate('');
    setClinical({ eyes: '', nose: '', mouth: '', movement: '', eating: '', waste: '', skin: '', behavior: '' });
    setInjuryDetails({});
    setDiagnosis(''); setMedications(''); setRecommendations(''); setNotes(''); setSubmitted(false); setLockApplied(false);
  };

  const cancel = () => (postSession && onBack ? onBack() : navigate('health-records'));

  const handleSubmit = () => {
    if (!temperature || !heartRate) { onSave('⚠️ Vui lòng nhập ít nhất nhiệt độ và nhịp tim'); return; }
    if (hasInvalid) { onSave('⚠️ Có giá trị không hợp lệ'); return; }
    if (hasIncompleteInjury) { onSave('⚠️ Vui lòng chọn loại chấn thương cho tất cả mục bất thường'); return; }
    const autoNote = abnItems.map(i => `- ${i.label}: ${i.value} (Bình thường: ${i.normal})`).join('\n');
    const resultMap = {
      eligible: 'Eligible', conditional: 'Monitor', 'not-eligible': 'Injured', incomplete: 'Normal',
    };
    const now = Date.now();
    const rec = {
      id: `hr${now}`, horseId: selectedHorse, date: new Date().toLocaleDateString('vi-VN'),
      createdAt: now,
      type: examType, vet: state.user.name, notes,
      result: resultMap[trainingResult.status],
      medications: medications || 'None', isPostTraining,
      vetClearanceGranted: trainingResult.status === 'eligible',
      vitals: { heartRate, temperature, weight: '', respRate, bloodPressure: '' },
      clinical: { eyes: clinical.eyes, nose: clinical.nose, mouth: clinical.mouth, movement: clinical.movement, eating: clinical.eating, waste: clinical.waste, skin: clinical.skin, behavior: clinical.behavior },
      injuryDetails,
      autoEvaluation: overallEval, autoNote, diagnosis, recommendations,
      ownerId: horse?.ownerId, headTrainerId: horse?.headTrainerId, managerId: club?.managerId,
      trainingEligibility: trainingResult.status === 'incomplete' ? undefined : trainingResult.status,
      trainingReasons: trainingResult.reasons,
      trainingAdjustments: trainingResult.adjustments,
      trainingNote: trainingResult.trainingNote,
      nutritionSuggestions: trainingResult.nutritionSuggestions,
    };
    setLockApplied(willAutoLock);
    if (postSession && onPostSubmit) {
      const err = onPostSubmit(postSession.id, { ...rec, type: 'Khám sau buổi tập', isPostTraining: true });
      if (err) { onSave(`⚠️ ${err}`); return; }
      setSubmitted(true);
      return;
    }
    onSaveRecord(rec); setSubmitted(true);
    const statusMsg = trainingResult.status === 'eligible' ? '🟢 Đủ điều kiện huấn luyện!'
      : trainingResult.status === 'conditional' ? '🟡 Được huấn luyện có điều kiện'
      : '🔴 Không đủ điều kiện huấn luyện';
    onSave(`Đã lưu hồ sơ khám — ${statusMsg}`);
  };

  // Styling helpers
  const numInputCls = (st) => {
    const base = 'w-full px-3 py-2.5 pr-16 border-2 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 transition-all';
    if (st === 'normal') return `${base} border-emerald-400 bg-emerald-50 focus:ring-emerald-300`;
    if (st === 'watch')  return `${base} border-amber-400 bg-amber-50 focus:ring-amber-300`;
    if (st === 'fail' || st === 'invalid') return `${base} border-red-400 bg-red-50 focus:ring-red-300`;
    return `${base} border-gray-300 focus:ring-[#c9973b]`;
  };

  const EvalBadge = ({ st }) => {
    if (st === 'normal')  return <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">✓ Bình thường</span>;
    if (st === 'watch')   return <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">⚠ Cần theo dõi</span>;
    if (st === 'fail')    return <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">✕ Vượt ngưỡng</span>;
    if (st === 'invalid') return <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">✕ Không hợp lệ</span>;
    return null;
  };

  const SectionNum = ({ n }) => (
    <span className="w-6 h-6 rounded-full bg-[#1a2844] text-white text-xs flex items-center justify-center font-bold flex-shrink-0">{n}</span>
  );

  const todayStr = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="space-y-5 max-w-3xl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-serif font-bold">{postSession ? 'Khám sau buổi tập' : 'Nhập liệu sức khỏe'}</h2>
          <p className="text-sm text-gray-500">{state.user.name} · {todayStr}</p>
        </div>
        {!submitted && (
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={cancel}>Huỷ</Btn>
            <Btn variant={willAutoLock ? 'danger' : 'gold'} onClick={handleSubmit} disabled={!canSave}>{willAutoLock ? 'Lưu & KHÓA HUẤN LUYỆN' : 'Xác nhận & Lưu'}</Btn>
          </div>
        )}
      </div>

      {/* ── Submitted state ── */}
      {submitted && (
        <Card className={`p-5 border-l-4 ${trainingResult.status === 'eligible' ? 'bg-emerald-50 border-emerald-500' : trainingResult.status === 'conditional' ? 'bg-amber-50 border-amber-400' : 'bg-red-50 border-red-500'}`}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{trainingResult.status === 'eligible' ? '✅' : trainingResult.status === 'conditional' ? '⚠️' : '🚫'}</span>
            <div>
              <div className={`font-semibold text-lg ${trainingResult.status === 'eligible' ? 'text-emerald-800' : trainingResult.status === 'conditional' ? 'text-amber-800' : 'text-red-800'}`}>Hồ sơ khám đã được lưu!</div>
              <div className={`text-sm mt-0.5 ${trainingResult.status === 'eligible' ? 'text-emerald-700' : trainingResult.status === 'conditional' ? 'text-amber-700' : 'text-red-700'}`}>
                {horse?.name}: {trainingResult.status === 'eligible' ? '🟢 Đủ điều kiện huấn luyện' : trainingResult.status === 'conditional' ? '🟡 Được huấn luyện có điều kiện' : '🔴 Không đủ điều kiện — cần nghỉ ngơi / điều trị thêm.'}
              </div>
            </div>
          </div>
          <TrainingEligibilityCard result={trainingResult} compact={false} />
          {lockApplied && <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{horse?.name} đã bị KHÓA HUẤN LUYỆN: gói tạm dừng, các buổi nặng đã xếp bị đánh dấu "Không thực hiện", đã báo Chủ ngựa, Head Trainer và Quản lý.</div>}
          {postSession
            ? <Btn variant="secondary" className="mt-4" onClick={cancel}>← Về danh sách khám sau tập</Btn>
            : <Btn variant="secondary" className="mt-4" onClick={handleReset}>+ Nhập khám tiếp</Btn>}
        </Card>
      )}

      {!submitted && <>
        {/* ── 1. Thông tin khám ── */}
        <Card className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><SectionNum n={1} /> Thông tin khám</h3>
          {postSession && <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">🏇 Buổi tập: <strong>{postSession.type} {postSession.distance}</strong> · {postSession.date} {postSession.time} · HLV {postSession.trainerName}. Áp dụng cùng tiêu chuẩn khám định kỳ — kết quả "Không đủ điều kiện" sẽ tự động kích hoạt KHÓA HUẤN LUYỆN.</div>}
          <div className="grid grid-cols-2 gap-4">
            <Select label="Ngựa được khám" value={selectedHorse} onChange={setSelectedHorse}
              options={horses.map(h => ({ value: h.id, label: `${h.name} (${h.healthStatus})` }))} />
            <Select label="Loại khám" value={examType} onChange={setExamType}
              options={(postSession ? ['Kiểm tra sau tập'] : ['Kiểm tra định kỳ', 'Kiểm tra sau tập', 'Kiểm tra trước đua', 'Tiêm phòng', 'Khám chấn thương', 'Khám đột xuất']).map(v => ({ value: v, label: v }))} />
            {!postSession && <div className="col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-10 h-6 rounded-full transition-all relative ${isPostTraining ? 'bg-[#c9973b]' : 'bg-gray-300'}`} onClick={() => setIsPostTraining(p => !p)}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${isPostTraining ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">Khám sau buổi tập (post-training)</span>
              </label>
            </div>}
          </div>
          {horse && (
            <div className="mt-4 space-y-3">
              {/* Horse summary strip */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                {horse.imageUrl && <img src={horse.imageUrl} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" alt={horse.name} />}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">{horse.name}</div>
                  <div className="text-sm text-gray-500">{horse.breed} · {horse.age} tuổi · {horse.weight} kg · Mã: {horse.id}</div>
                </div>
                <Badge status={horse.healthStatus} />
              </div>

              {/* Linked info — 4-cell grid */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  🔗 Thông tin liên kết
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Owner */}
                  <div className="rounded-xl p-3 border border-blue-100 bg-blue-50/40">
                    <div className="text-xs font-semibold text-blue-700 mb-1.5 flex items-center gap-1">👤 Chủ ngựa</div>
                    {owner ? (
                      <>
                        <div className="font-semibold text-sm text-gray-900">{owner.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{owner.phone ? `📞 ${owner.phone}` : owner.email}</div>
                        <div className="text-xs text-gray-400 mt-0.5 truncate">{owner.email}</div>
                      </>
                    ) : (
                      <div className="text-xs text-amber-600 flex items-center gap-1">⚠ Chưa có thông tin</div>
                    )}
                  </div>

                  {/* Trainer */}
                  <div className="rounded-xl p-3 border border-purple-100 bg-purple-50/40">
                    <div className="text-xs font-semibold text-purple-700 mb-1.5 flex items-center gap-1">🏇 Head Trainer</div>
                    {trainer ? (
                      <>
                        <div className="font-semibold text-sm text-gray-900">{trainer.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{trainer.phone ? `📞 ${trainer.phone}` : trainer.email}</div>
                        <div className="text-xs text-gray-400 mt-0.5 truncate">{trainer.email}</div>
                      </>
                    ) : (
                      <div className="text-xs text-amber-600 flex items-center gap-1">⚠ Chưa được phân công</div>
                    )}
                  </div>

                  {/* Manager */}
                  <div className="rounded-xl p-3 border border-[#c9973b]/25 bg-[#c9973b]/5 col-span-2">
                    <div className="text-xs font-semibold text-[#8B5E1A] mb-1.5 flex items-center gap-1">👨‍💼 Quản lý trung tâm</div>
                    {manager ? (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#c9973b] text-white text-sm flex items-center justify-center font-bold flex-shrink-0">{manager.avatar}</div>
                        <div>
                          <div className="font-semibold text-sm text-gray-900">{manager.name}</div>
                          <div className="text-xs text-gray-500">{manager.phone ? `📞 ${manager.phone}` : manager.email}</div>
                        </div>
                        <div className="ml-auto text-xs text-[#c9973b] font-medium">{club?.name}</div>
                      </div>
                    ) : (
                      <div className="text-xs text-amber-600 flex items-center gap-1">⚠ Chưa được phân công</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* ── 2. Sinh hiệu ── */}
        <Card className="p-5">
          <h3 className="font-semibold mb-1 flex items-center gap-2">
            <SectionNum n={2} /> Sinh hiệu
            <span className="text-red-500 text-sm font-normal ml-1">* bắt buộc: nhiệt độ + nhịp tim</span>
          </h3>
          <p className="text-xs text-gray-400 mb-4 ml-8">Hệ thống tự động đánh giá tình trạng dựa trên giá trị nhập.</p>
          <div className="grid grid-cols-3 gap-4">
            {numericFields.map(f => (
              <div key={f.key} className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <span>{f.icon}</span>{f.label}
                  </label>
                  <EvalBadge st={f.st} />
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={f.val}
                    onChange={e => f.setVal(e.target.value.replace(/[^0-9.,]/g, ''))}
                    placeholder="—"
                    className={numInputCls(f.st)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium pointer-events-none">{f.unit}</span>
                </div>
                <p className="text-xs text-gray-400">Bình thường: {f.range}</p>
                {f.st === 'invalid' && <p className="text-xs text-red-500">Giá trị không hợp lệ</p>}
                {f.st === 'watch'   && <p className="text-xs text-amber-600">⚠ Ngoài khoảng chuẩn</p>}
                {f.st === 'fail'    && <p className="text-xs text-red-600">✕ Vượt ngưỡng ±10%</p>}
              </div>
            ))}
          </div>
        </Card>

        {/* ── 3. Khám lâm sàng ── */}
        <Card className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><SectionNum n={3} /> Khám lâm sàng</h3>
          <div className="grid grid-cols-2 gap-3">
            {clinicalDefs.map(d => {
              const val = clinical[d.key];
              return (
                <div key={d.key} className={`rounded-xl p-4 border-2 transition-all ${val === 'normal' ? 'border-emerald-200 bg-emerald-50/60' : val === 'abnormal' ? 'border-amber-200 bg-amber-50/60' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">{d.icon}</span>
                      <span className="font-medium text-sm text-gray-800">{d.label}</span>
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        className="w-5 h-5 rounded-full border border-gray-300 text-gray-400 hover:text-[#1a2844] hover:border-[#1a2844] text-xs flex items-center justify-center transition-colors"
                        onMouseEnter={() => setActiveTooltip(d.key)}
                        onMouseLeave={() => setActiveTooltip(null)}
                      >?</button>
                      {activeTooltip === d.key && (
                        <div className="absolute right-0 top-7 z-20 w-60 text-xs text-gray-600 bg-white border border-gray-200 rounded-xl p-3 shadow-lg leading-relaxed">
                          {d.hint}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setClx(d.key)('normal')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border-2 transition-all ${val === 'normal' ? 'border-emerald-500 bg-emerald-100 text-emerald-800' : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:bg-emerald-50'}`}>
                      ✓ Bình thường
                    </button>
                    <button type="button" onClick={() => setClx(d.key)('abnormal')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border-2 transition-all ${val === 'abnormal' ? 'border-amber-500 bg-amber-100 text-amber-800' : 'border-gray-200 bg-white text-gray-600 hover:border-amber-300 hover:bg-amber-50'}`}>
                      ⚠ Bất thường
                    </button>
                  </div>
                  {val === 'abnormal' && (
                    <div className="mt-3 space-y-2 border-t border-amber-200 pt-3">
                      <Select
                        label="Dạng bất thường / chấn thương"
                        value={injuryDetails[d.key]?.issue || ''}
                        onChange={issue => setInjuryDetail(d.key, { issue })}
                        options={[{ value: '', label: '— Chọn tình trạng —' }, ...d.issues.map(issue => ({ value: issue, label: issue }))]}
                      />
                      <Select
                        label="Mức độ"
                        value={injuryDetails[d.key]?.severity || 'mild'}
                        onChange={severity => setInjuryDetail(d.key, { severity: severity })}
                        options={[
                          { value: 'mild', label: 'Nhẹ — theo dõi' },
                          { value: 'moderate', label: 'Vừa — điều chỉnh huấn luyện' },
                          { value: 'severe', label: 'Nặng — tự động khóa huấn luyện' },
                        ]}
                      />
                      {injuryDetails[d.key]?.severity === 'severe' && (
                        <p className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">Mức nặng sẽ tự động khóa ngựa khi lưu hồ sơ.</p>
                      )}
                    </div>
                  )}
                  {val === '' && <p className="text-xs text-gray-400 mt-1.5 text-center">Chưa đánh giá</p>}
                </div>
              );
            })}
          </div>
        </Card>

        {/* ── 4. Kết quả đánh giá ── */}
        <Card className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><SectionNum n={4} /> Kết quả đánh giá sức khỏe</h3>

          {/* Auto exam result — read-only "select" */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700">Kết quả khám</label>
              <span className="text-xs text-gray-400 flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">🔒 Tự động xác định</span>
            </div>
            <div className={`w-full px-4 py-3 rounded-xl border-2 flex items-center justify-between text-sm font-semibold transition-all ${
              overallEval === 'pass'       ? 'border-emerald-400 bg-emerald-50 text-emerald-800' :
              overallEval === 'watch'      ? 'border-amber-400 bg-amber-50 text-amber-800' :
              overallEval === 'fail'       ? 'border-red-400 bg-red-50 text-red-800' :
              'border-gray-200 bg-gray-50 text-gray-400'
            }`}>
              <span>
                {overallEval === 'pass'  ? '✓ Ngựa đạt chuẩn' :
                 overallEval === 'watch' ? '⚠ Ngựa cần theo dõi thêm' :
                 overallEval === 'fail'  ? '✕ Ngựa không đủ điều kiện' :
                 'Chưa đủ dữ liệu để đánh giá'}
              </span>
              <svg className="w-4 h-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            <p className="text-xs text-gray-400 mt-1">Kết quả được hệ thống xác định tự động và cập nhật theo dữ liệu nhập.</p>
          </div>

          {overallEval === 'incomplete' && (
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-2xl">📋</span>
              <div>
                <div className="font-medium text-gray-700">Chưa đủ dữ liệu để đánh giá</div>
                <div className="text-sm text-gray-500 mt-0.5">Vui lòng nhập đầy đủ sinh hiệu và hoàn thành khám lâm sàng.</div>
              </div>
            </div>
          )}

          {overallEval !== 'incomplete' && (
            <div className="space-y-3">
              {/* Status banner */}
              <div className={`flex items-center gap-3 p-4 rounded-xl border ${overallEval === 'pass' ? 'bg-emerald-50 border-emerald-200' : overallEval === 'watch' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                <span className="text-2xl">{overallEval === 'pass' ? '✅' : overallEval === 'watch' ? '⚠️' : '🚫'}</span>
                <div>
                  <div className={`font-semibold text-lg ${overallEval === 'pass' ? 'text-emerald-800' : overallEval === 'watch' ? 'text-amber-800' : 'text-red-800'}`}>
                    {overallEval === 'pass' ? 'Ngựa đạt chuẩn' : overallEval === 'watch' ? 'Ngựa cần theo dõi thêm' : 'Ngựa không đủ điều kiện'}
                  </div>
                  <div className={`text-sm mt-0.5 ${overallEval === 'pass' ? 'text-emerald-700' : overallEval === 'watch' ? 'text-amber-700' : 'text-red-700'}`}>
                    {overallEval === 'pass'
                      ? '11/11 tiêu chí trong giới hạn bình thường.'
                      : overallEval === 'watch'
                      ? `${normalCount}/11 tiêu chí bình thường · ${watchCount} tiêu chí cần theo dõi`
                      : 'Có chỉ số vượt quá giới hạn cho phép (±10%).'}
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                  <div className="text-2xl font-bold text-emerald-700">{normalCount}</div>
                  <div className="text-xs text-emerald-600 mt-0.5">Tiêu chí đạt</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                  <div className="text-2xl font-bold text-amber-600">{watchCount}</div>
                  <div className="text-xs text-amber-500 mt-0.5">Cần theo dõi</div>
                </div>
                <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                  <div className="text-2xl font-bold text-red-600">{failCount}</div>
                  <div className="text-xs text-red-500 mt-0.5">Không đạt</div>
                </div>
              </div>

              {/* Abnormal list */}
              {abnItems.length > 0 && (
                <div>
                  <div className={`text-sm font-medium mb-2 ${overallEval === 'fail' ? 'text-red-800' : 'text-amber-800'}`}>
                    {overallEval === 'fail' ? 'Chỉ số vượt ngưỡng:' : 'Các mục cần theo dõi:'}
                  </div>
                  <div className="space-y-1.5">
                    {abnItems.map((item, i) => (
                      <div key={i} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border ${item.level === 'fail' ? 'text-red-700 bg-red-50 border-red-100' : 'text-amber-700 bg-amber-50 border-amber-100'}`}>
                        <span className="font-bold">{item.level === 'fail' ? '✕' : '⚠'}</span>
                        <span className="font-medium">{item.label}:</span>
                        <span>{item.value}</span>
                        <span className={`text-xs ml-auto ${item.level === 'fail' ? 'text-red-400' : 'text-amber-500'}`}>Bình thường: {item.normal}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* ── Auto-generated note (watch) ── */}
        {overallEval === 'watch' && abnItems.length > 0 && (
          <Card className="p-5 border-l-4 border-amber-400">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📝</span>
              <h3 className="font-semibold text-amber-900">Note theo dõi</h3>
              <span className="ml-auto text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Tự động tạo</span>
            </div>
            <p className="text-sm text-amber-800 mb-3">Ngựa cần được theo dõi thêm các chỉ số:</p>
            <div className="space-y-2">
              {abnItems.map((item, i) => (
                <div key={i} className="bg-white rounded-lg p-3 border border-amber-200">
                  <div className="text-sm font-medium text-amber-800 flex items-center gap-1.5">⚠ {item.label}: <span className="text-gray-700 font-normal">{item.value}</span></div>
                  <div className="text-xs text-gray-500 mt-0.5">Bình thường: {item.normal}</div>
                  <div className="text-xs text-amber-600 font-medium mt-0.5">→ Cần theo dõi</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-amber-600 border-t border-amber-200 pt-2.5">Thời gian tạo: {todayStr}</div>
          </Card>
        )}

        {/* ── Warning card (fail) ── */}
        {overallEval === 'fail' && (
          <Card className="p-5 border-l-4 border-red-500">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🚨</span>
              <h3 className="font-semibold text-red-900">Cảnh báo sức khỏe</h3>
              <span className="ml-auto text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Tự động tạo</span>
            </div>
            <p className="text-sm text-red-800 mb-3">Phát hiện chỉ số vượt quá giới hạn cho phép:</p>
            <div className="space-y-2">
              {abnItems.map((item, i) => (
                <div key={i} className={`rounded-lg p-3 border ${item.level === 'fail' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className={`text-sm font-medium flex items-center gap-1.5 ${item.level === 'fail' ? 'text-red-800' : 'text-amber-800'}`}>
                    {item.level === 'fail' ? '✕' : '⚠'} {item.label}: <span className="text-gray-700 font-normal">{item.value}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Bình thường: {item.normal}</div>
                  <div className={`text-xs font-medium mt-0.5 ${item.level === 'fail' ? 'text-red-600' : 'text-amber-600'}`}>
                    → {item.level === 'fail' ? 'Không đủ điều kiện' : 'Cần theo dõi'}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-red-600 border-t border-red-200 pt-2.5">Thời gian tạo: {todayStr}</div>
          </Card>
        )}

        {/* ── 5. Chẩn đoán & Điều trị ── */}
        <Card className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><SectionNum n={5} /> Chẩn đoán & Điều trị</h3>
          <div className="space-y-4">
            <Textarea label="Chẩn đoán lâm sàng" value={diagnosis} onChange={setDiagnosis} placeholder="Mô tả tình trạng, triệu chứng quan sát được..." />
            <Textarea label="Thuốc / Điều trị" value={medications} onChange={setMedications} placeholder="VD: Vitamin E 500IU · Điện giải ORS · Phenylbutazone..." rows={2} />
            <Textarea label="Khuyến nghị chăm sóc" value={recommendations} onChange={setRecommendations} placeholder="Chế độ nghỉ ngơi, ăn uống, hoạt động..." rows={2} />
            <Textarea label="Ghi chú thêm" value={notes} onChange={setNotes} placeholder="Các quan sát khác..." rows={2} />
          </div>
        </Card>

        {/* ── 6. Điều kiện huấn luyện (auto-derived, read-only) ── */}
        <Card className={`p-5 border-2 transition-all ${
          trainingResult.status === 'eligible'    ? 'border-emerald-300 bg-emerald-50/20' :
          trainingResult.status === 'conditional' ? 'border-amber-300 bg-amber-50/20' :
          trainingResult.status === 'not-eligible'? 'border-red-400 bg-red-50/20' :
          'border-gray-200'
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <SectionNum n={6} />
            <span className="font-semibold">🏇 Điều kiện huấn luyện</span>
            <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              🔒 Tự động xác định
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-4 ml-8">
            Hệ thống tự động xác định dựa trên sinh hiệu, lâm sàng và mức độ bất thường. Chỉ dữ liệu khám mới có thể thay đổi trạng thái này.
          </p>
          <TrainingEligibilityCard result={trainingResult} />
        </Card>

        {/* ── Bottom action buttons ── */}
        <div className="flex justify-end gap-2 pb-6">
          <Btn variant="secondary" onClick={cancel}>Huỷ</Btn>
          <Btn variant={postSession && trainingResult.status === 'not-eligible' ? 'danger' : 'gold'} onClick={handleSubmit} disabled={!canSave}>{postSession && trainingResult.status === 'not-eligible' ? '🔒 Lưu & KHÓA HUẤN LUYỆN' : '💾 Xác nhận & Lưu'}</Btn>
        </div>
      </>}
    </div>
  );
}
