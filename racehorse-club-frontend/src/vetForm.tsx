import { useEffect, useMemo, useState } from 'react';
import type { AppUser, Club, Horse, HorseClubRequest, HealthRecord, TrainingSession } from './data';
import { getLifecycle } from './data';
import { Btn, Card, Input, Select, Textarea } from './ui';
import { IdChip, Modal, GENDER_LABEL, dispId } from './admin';
import { vetVisible } from './intake';

// ── Ngưỡng mẫu & tiện ích dùng chung (form khám + lịch sử khám) ─────────────────

export const THRESHOLD_SOURCE =
  'Nguồn: giá trị mẫu tham khảo của nhóm phát triển, CHƯA phải số liệu thú y chính thống — cần thay bằng tài liệu thú y được công nhận trước khi dùng thực tế.';

export type VitalKey = 'temperature' | 'heartRate' | 'respRate';
export interface VitalDef {
  key: VitalKey; label: string; unit: string; lo: number; hi: number; hardLo: number; hardHi: number; icon: string; reason: string; example: string;
}
export const VITAL_DEFS: VitalDef[] = [
  { key: 'temperature', label: 'Nhiệt độ cơ thể', unit: '°C', lo: 37.5, hi: 38.5, hardLo: 30, hardHi: 44, icon: '🌡️', example: 'VD: 38,0',
    reason: 'Phát hiện sốt hoặc nhiễm trùng sớm; nhiệt độ cao còn làm tăng nguy cơ kiệt sức khi tập.' },
  { key: 'heartRate', label: 'Nhịp tim lúc nghỉ', unit: 'lần/phút', lo: 28, hi: 44, hardLo: 10, hardHi: 150, icon: '❤️', example: 'VD: 34',
    reason: 'Đánh giá tim mạch và mức độ đau, căng thẳng; nhịp nghỉ cao bất thường là dấu hiệu cảnh báo.' },
  { key: 'respRate', label: 'Nhịp thở lúc nghỉ', unit: 'lần/phút', lo: 10, hi: 20, hardLo: 2, hardHi: 80, icon: '🫁', example: 'VD: 12',
    reason: 'Phát hiện bệnh hô hấp hoặc sốt; nhịp thở nghỉ tăng cho thấy ngựa chưa sẵn sàng vận động.' },
];

export const fmtNum = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');
export const rangeText = (d: VitalDef) => `${fmtNum(d.lo)}–${fmtNum(d.hi)} ${d.unit}`;

export type VKind = 'empty' | 'invalid' | 'impossible' | 'normal' | 'mild' | 'severe';
export interface VStatus { kind: VKind; n: number; error: string }

export function evalVital(def: VitalDef, raw: string): VStatus {
  const t = (raw ?? '').trim();
  if (!t) return { kind: 'empty', n: NaN, error: '' };
  if (!/^\d+([.,]\d+)?$/.test(t)) return { kind: 'invalid', n: NaN, error: 'Chỉ nhập số, ví dụ 38,2 (không nhập chữ hoặc dấu âm).' };
  const n = Number(t.replace(',', '.'));
  if (n < def.hardLo || n > def.hardHi) return { kind: 'impossible', n, error: `Giá trị bất khả thi với ngựa còn sống (${fmtNum(def.hardLo)}–${fmtNum(def.hardHi)} ${def.unit}). Vui lòng kiểm tra lại thiết bị đo.` };
  if (n >= def.lo && n <= def.hi) return { kind: 'normal', n, error: '' };
  if (n >= def.lo * 0.9 && n <= def.hi * 1.1) return { kind: 'mild', n, error: '' };
  return { kind: 'severe', n, error: '' };
}
export const vitalOk = (s: VStatus) => s.kind === 'normal' || s.kind === 'mild' || s.kind === 'severe';

export function evalWeight(raw: string): { ok: boolean; empty: boolean; error: string } {
  const t = (raw ?? '').trim();
  if (!t) return { ok: true, empty: true, error: '' };
  if (!/^\d+([.,]\d+)?$/.test(t)) return { ok: false, empty: false, error: 'Chỉ nhập số, ví dụ 505.' };
  const n = Number(t.replace(',', '.'));
  if (n < 100 || n > 1200) return { ok: false, empty: false, error: 'Cân nặng phải trong khoảng 100–1200 kg.' };
  return { ok: true, empty: false, error: '' };
}

export interface RegionDef { key: string; label: string; icon: string; hint: string; reason: string; legacy: string }
export const REGION_DEFS: RegionDef[] = [
  { key: 'eyes', legacy: 'eyes', label: 'Mắt', icon: '👀', hint: 'Bình thường: sáng, tỉnh táo, không đỏ, không tiết dịch.', reason: 'Phát hiện viêm, tổn thương giác mạc hoặc dấu hiệu bệnh toàn thân.' },
  { key: 'nose', legacy: 'nose', label: 'Mũi', icon: '👃', hint: 'Bình thường: sạch, không có dịch đặc hoặc đổi màu.', reason: 'Dịch mũi bất thường là dấu hiệu sớm của bệnh đường hô hấp.' },
  { key: 'mouth', legacy: 'mouth', label: 'Miệng', icon: '🦷', hint: 'Bình thường: niêm mạc hồng, ẩm, răng không gãy.', reason: 'Tổn thương miệng, răng làm ngựa đau khi ăn và khi mang hàm thiết.' },
  { key: 'movement', legacy: 'movement', label: 'Vận động / chân', icon: '🐎', hint: 'Bình thường: đi lại đều, không khập khiễng, chân không nóng sưng.', reason: 'Chân và gân là nơi dễ chấn thương nhất, quyết định ngựa có tập được không.' },
];

export type Decision = 'eligible' | 'conditional' | 'not-eligible';
export const DECISION_LABEL: Record<Decision, string> = {
  eligible: 'Đủ điều kiện huấn luyện',
  conditional: 'Đủ điều kiện nhưng cần theo dõi',
  'not-eligible': 'Không đủ điều kiện, khóa tập luyện',
};

export function recordDecision(r: HealthRecord): Decision | undefined {
  if (r.decision) return r.decision;
  if (r.trainingEligibility === 'not-eligible') return 'not-eligible';
  if (r.trainingEligibility === 'conditional' || r.result === 'Monitor') return 'conditional';
  if (r.trainingEligibility === 'eligible') return 'eligible';
  if (r.vetClearanceGranted || r.result === 'Eligible') return 'eligible';
  if (r.result === 'Injured') return 'not-eligible';
  return undefined;
}

export function DecisionPill({ d, small = false }: { d?: Decision; small?: boolean }) {
  const sz = small ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  if (!d) return <span className={`inline-flex items-center rounded-full border border-gray-200 bg-gray-50 font-medium text-gray-500 ${sz}`}>Không kết luận</span>;
  if (d === 'eligible') return <span className={`inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 font-medium text-emerald-800 ${sz}`}>✓ {DECISION_LABEL[d]}</span>;
  if (d === 'conditional') return <span className={`inline-flex items-center rounded-full border border-amber-200 bg-amber-50 font-medium text-amber-800 ${sz}`}>! {DECISION_LABEL[d]}</span>;
  return <span className={`inline-flex items-center rounded-full border border-red-200 bg-red-50 font-medium text-red-700 ${sz}`}>✕ {DECISION_LABEL[d]}</span>;
}

/** Mã hồ sơ tuần tự MED-000001… : lớn nhất hiện có + 1. */
export function nextMedId(records: HealthRecord[]): string {
  let max = 0;
  for (const r of records) {
    const m = /^MED-(\d{1,9})$/.exec(r.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `MED-${String(max + 1).padStart(6, '0')}`;
}

export function VitalStatusPill({ s }: { s: VStatus }) {
  if (s.kind === 'normal') return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">✓ Bình thường</span>;
  if (s.kind === 'mild' || s.kind === 'severe') return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">⚠ Bất thường</span>;
  return null;
}

// ── Form khám ───────────────────────────────────────────────────────────────

type FormState = {
  user: AppUser | null; users: AppUser[]; clubs: Club[]; horses: Horse[]; healthRecords: HealthRecord[];
  horseClubRequests: HorseClubRequest[]; examHorseId: string | null;
};

type Level = 'pass' | 'watch' | 'fail';
interface Finding { label: string; text: string; level: 'watch' | 'fail' }

const STEPS = ['Chọn ngựa', 'Chỉ số sinh tồn', 'Khám lâm sàng', 'Kết luận'];

function ageText(h: Horse) { return `${h.age} tuổi`; }

export function VetHealthFormPage({ state, navigate, onSave, onSaveRecord, today, postSession, onPostSubmit, onBack, onConsumeExamHorse }: {
  state: FormState; navigate: (p: 'health-records' | 'vet-assign') => void; onSave: (msg: string) => void; onSaveRecord: (r: HealthRecord) => void; today: string;
  postSession?: TrainingSession; onPostSubmit?: (sessionId: string, r: HealthRecord) => string | null; onBack?: () => void; onConsumeExamHorse?: () => void;
}) {
  const user = state.user!;
  const visible = useMemo(
    () => state.horses.filter(h => postSession ? h.id === postSession.horseId : vetVisible(h, user)),
    [state.horses, user, postSession],
  );
  const [horseId, setHorseId] = useState(() => {
    if (postSession) return postSession.horseId;
    return state.examHorseId && visible.some(h => h.id === state.examHorseId) ? state.examHorseId : '';
  });
  useEffect(() => { if (state.examHorseId) onConsumeExamHorse?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState(false);
  const [examType, setExamType] = useState('Kiểm tra định kỳ');
  const [vit, setVit] = useState<Record<VitalKey, string>>({ temperature: '', heartRate: '', respRate: '' });
  const [weight, setWeight] = useState('');
  const [regions, setRegions] = useState<Record<string, '' | 'ok' | 'bad'>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [decision, setDecision] = useState<Decision | ''>('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [decisionReason, setDecisionReason] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [medications, setMedications] = useState('');
  const [tried, setTried] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [saved, setSaved] = useState<HealthRecord | null>(null);
  const [saveError, setSaveError] = useState('');

  const horse = visible.find(h => h.id === horseId);
  const horseRecords = useMemo(
    () => state.healthRecords.filter(r => r.horseId === horseId).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0) || b.date.split('/').reverse().join('').localeCompare(a.date.split('/').reverse().join(''))),
    [state.healthRecords, horseId],
  );
  const prev = horseRecords.find(r => r.vitals);

  const pendingReq = horse ? state.horseClubRequests.find(r => r.horseId === horse.id && r.status === 'pending') : undefined;
  const isIntake = !postSession && !!horse && !!pendingReq && horse.vetAssign?.status === 'accepted' && !horse.intakeExamId;
  const club = state.clubs.find(c => c.id === (horse?.clubId ?? ''));
  const willLock = !!horse && decision === 'not-eligible' && getLifecycle(horse) === 'training';

  // ── Đánh giá ──
  const vs = Object.fromEntries(VITAL_DEFS.map(d => [d.key, evalVital(d, vit[d.key])])) as Record<VitalKey, VStatus>;
  const wt = evalWeight(weight);
  const vitalsDone = VITAL_DEFS.every(d => vitalOk(vs[d.key])) && wt.ok;
  const regionsDone = REGION_DEFS.every(r => regions[r.key] === 'ok' || (regions[r.key] === 'bad' && (notes[r.key] || '').trim().length >= 3));
  const findings: Finding[] = [];
  VITAL_DEFS.forEach(d => {
    const s = vs[d.key];
    if (s.kind === 'mild' || s.kind === 'severe') findings.push({ label: d.label, text: `${fmtNum(s.n)} ${d.unit} (bình thường ${rangeText(d)})`, level: s.kind === 'severe' ? 'fail' : 'watch' });
  });
  REGION_DEFS.forEach(r => { if (regions[r.key] === 'bad') findings.push({ label: r.label, text: (notes[r.key] || '').trim() || 'Bất thường', level: 'watch' }); });
  const overall: Level = findings.some(f => f.level === 'fail') ? 'fail' : findings.length ? 'watch' : 'pass';
  const overallCfg = {
    pass: { label: 'Bình thường', cls: 'border-emerald-300 bg-emerald-50 text-emerald-800', icon: '🟢' },
    watch: { label: 'Cần theo dõi', cls: 'border-amber-300 bg-amber-50 text-amber-800', icon: '🟡' },
    fail: { label: 'Nghiêm trọng', cls: 'border-red-300 bg-red-50 text-red-800', icon: '🔴' },
  }[overall];
  const suggestedDecision: Decision = overall === 'fail' ? 'not-eligible' : overall === 'watch' ? 'conditional' : 'eligible';
  const needsOverride = !!decision && decision !== suggestedDecision;
  const decisionDetailsDone = decision === 'conditional'
    ? followUpNote.trim().length >= 10
    : decision === 'not-eligible'
      ? decisionReason.trim().length >= 10
      : !!decision;
  const overrideDone = !needsOverride || overrideReason.trim().length >= 10;
  const autoConclusion = (() => {
    if (!decision) return '';
    if (decision === 'eligible') return `Ngựa ${horse?.name || ''} đủ điều kiện huấn luyện.`;
    if (decision === 'conditional') return `Horse ${horse?.name || ''} is eligible, but needs monitoring: ${followUpNote.trim() || 'monitoring details not entered'}.`;
    return `Ngựa ${horse?.name || ''} không đủ điều kiện huấn luyện và bị khóa tập luyện. Lý do: ${decisionReason.trim() || 'chưa nhập lý do'}.`;
  })();
  const concText = autoConclusion.trim();
  const conclusionDone = decisionDetailsDone && overrideDone && concText.length >= 10;
  const done = [!!horse, vitalsDone, regionsDone, conclusionDone];
  const current = done.findIndex(d => !d);
  const suggestionText = overall === 'pass'
    ? 'Mọi chỉ số và vùng khám đều bình thường — hệ thống gợi ý ĐỦ ĐIỀU KIỆN huấn luyện.'
    : overall === 'watch'
      ? `Có ${findings.length} mục bất thường mức nhẹ (${findings.map(f => f.label).join(', ')}) — hệ thống gợi ý có thể huấn luyện nhưng cần theo dõi, bác sĩ cân nhắc.`
      : `Có chỉ số lệch nhiều so với ngưỡng (${findings.filter(f => f.level === 'fail').map(f => f.label).join(', ')}) — hệ thống gợi ý KHÔNG ĐỦ ĐIỀU KIỆN huấn luyện.`;

  // ── Lỗi từng trường ──
  const vitalError = (d: VitalDef) => {
    const s = vs[d.key];
    if (s.error) return s.error;
    if (tried && s.kind === 'empty') return `Vui lòng nhập ${d.label.toLowerCase()}.`;
    return '';
  };
  const regionError = (k: string) => {
    if (tried && !regions[k]) return 'Chọn "Bình thường" hoặc "Bất thường".';
    return '';
  };
  const noteError = (k: string) => (regions[k] === 'bad' && (tried || (notes[k] ?? '') !== '') && (notes[k] || '').trim().length < 3 ? 'Bắt buộc mô tả bất thường (tối thiểu 3 ký tự).' : '');
  const conclusionError = tried && !decisionDetailsDone ? 'Vui lòng hoàn thành thông tin bắt buộc của thẻ kết luận.' : tried && !overrideDone ? 'Vui lòng nêu lý do khi chọn khác gợi ý hệ thống.' : '';
  const decisionError = tried && !decision ? 'Hãy chọn một kết luận cuối cùng.' : '';
  const missing = [!horse && 'chọn ngựa', !vitalsDone && 'chỉ số sinh tồn', !regionsDone && 'khám lâm sàng', !conclusionDone && 'kết luận'].filter(Boolean) as string[];

  const submitReview = () => {
    setTried(true);
    if (missing.length) return;
    setConfirm(true);
  };

  const buildRecord = (): HealthRecord => {
    const clinicalMap = Object.fromEntries(REGION_DEFS.map(r => [r.legacy, regions[r.key] === 'bad' ? 'abnormal' : 'normal'])) as Record<string, string>;
    const regionData: Record<string, { ok: boolean; note: string }> = {};
    REGION_DEFS.forEach(r => { regionData[r.key] = { ok: regions[r.key] === 'ok', note: regions[r.key] === 'bad' ? (notes[r.key] || '').trim() : '' }; });
    const elig: 'eligible' | 'conditional' | 'not-eligible' = decision as 'eligible' | 'conditional' | 'not-eligible';
    const result: HealthRecord['result'] = elig === 'eligible' ? 'Eligible' : elig === 'conditional' ? 'Monitor' : 'Injured';
    const abnLines = findings.map(f => `- ${f.label}: ${f.text}`);
    const type = postSession ? 'Khám sau buổi tập' : isIntake ? 'Khám tiếp nhận' : examType;
    const adj = elig === 'eligible' ? ['Huấn luyện bình thường theo kế hoạch hiện tại.']
      : elig === 'conditional' ? ['Giảm cường độ huấn luyện và theo dõi phản ứng của ngựa.', 'Đánh giá lại sau buổi tập.']
        : ['Tạm ngưng huấn luyện ngay.', 'Tái khám trước khi được tập trở lại.'];
    return {
      id: nextMedId(state.healthRecords), horseId: horse!.id, date: today, createdAt: Date.now(),
      type, vet: user.name, vetId: user.id, intake: isIntake || undefined,
      notes: abnLines.length ? abnLines.join('\n') : 'Các vùng khám đều bình thường.',
      result, medications: medications.trim() || 'None', isPostTraining: !!postSession, vetClearanceGranted: elig === 'eligible',
      vitals: { heartRate: String(vs.heartRate.n), temperature: String(vs.temperature.n), weight: wt.empty ? '' : String(Number(weight.replace(',', '.'))), respRate: String(vs.respRate.n), bloodPressure: '' },
      clinical: clinicalMap as HealthRecord['clinical'],
      regions: regionData, decision: decision as Decision, conclusion: concText, status: 'confirmed',
      followUpNote: decision === 'conditional' ? followUpNote.trim() : undefined,
      decisionReason: decision === 'not-eligible' ? decisionReason.trim() : undefined,
      overrideReason: needsOverride ? overrideReason.trim() : undefined,
      autoEvaluation: overall, autoNote: abnLines.join('\n'), diagnosis: concText, recommendations: recommendations.trim(),
      ownerId: horse!.ownerId, headTrainerId: horse!.headTrainerId, managerId: club?.managerId,
      trainingEligibility: elig, trainingReasons: findings.map(f => `${f.label}: ${f.text}`), trainingAdjustments: adj,
      trainingNote: concText, nutritionSuggestions: [],
    };
  };

  const doSave = () => {
    if (!horse) return;
    const rec = buildRecord();
    setSaveError('');
    if (postSession && onPostSubmit) {
      const err = onPostSubmit(postSession.id, rec);
      if (err) { setSaveError(err); setConfirm(false); return; }
    } else {
      onSaveRecord(rec);
      onSave(`Đã lưu hồ sơ khám ${rec.id} — ${DECISION_LABEL[rec.decision!]}`);
    }
    setConfirm(false);
    setSaved(rec);
  };

  const reset = () => {
    setHorseId(''); setQuery(''); setVit({ temperature: '', heartRate: '', respRate: '' }); setWeight(''); setRegions({}); setNotes({});
    setDecision(''); setFollowUpNote(''); setDecisionReason(''); setOverrideReason(''); setRecommendations(''); setMedications(''); setTried(false); setSaved(null); setSaveError(''); setExamType('Kiểm tra định kỳ');
  };
  const leave = () => (postSession && onBack ? onBack() : navigate('health-records'));

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visible.filter(h => !q || h.name.toLowerCase().includes(q) || h.id.toLowerCase().includes(q) || dispId('HRS', h.id).toLowerCase().includes(q)).slice(0, 8);
  }, [visible, query]);

  // ── Trạng thái rỗng ──
  if (!postSession && visible.length === 0) {
    return (
      <div className="max-w-3xl space-y-5">
        <div><h2 className="font-serif text-xl font-bold text-[#0f1729]">Khám sức khỏe</h2><p className="text-sm text-gray-500">Ghi nhận chỉ số, khám lâm sàng và kết luận cho ngựa được giao.</p></div>
        <Card className="p-10 text-center">
          <div className="mb-3 text-5xl">🩺</div>
          <h3 className="font-serif text-lg font-bold text-[#0f1729]">Bạn chưa có ngựa nào để khám</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">Chỉ những ngựa đã được Quản lý giao cho bạn và bạn đã nhận khám mới xuất hiện ở đây. Hãy vào mục "Ngựa được giao khám" để xem và nhận các ca đang chờ.</p>
          <Btn variant="gold" className="mt-5" onClick={() => navigate('vet-assign')}>Mở "Ngựa được giao khám" →</Btn>
        </Card>
      </div>
    );
  }

  // ── Thành công ──
  if (saved) {
    const ok = saved.decision !== 'not-eligible';
    return (
      <div className="max-w-3xl space-y-5">
        <Card className={`border-l-4 p-6 ${ok ? 'border-emerald-500 bg-emerald-50' : 'border-red-500 bg-red-50'}`}>
          <div className="flex items-start gap-4">
            <span className="text-4xl">{ok ? '✅' : '🚫'}</span>
            <div className="flex-1">
              <div className={`font-serif text-lg font-bold ${ok ? 'text-emerald-800' : 'text-red-800'}`}>Đã lưu hồ sơ khám</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600"><IdChip kind="MED" id={saved.id} /><span>{saved.date}</span><span>· {horse?.name}</span><DecisionPill d={saved.decision} /></div>
              <p className="mt-3 rounded-lg border border-white/60 bg-white/70 p-3 text-sm text-gray-800">{saved.conclusion}</p>
              {isIntake && <p className="mt-3 text-sm text-gray-600">Đây là lần khám tiếp nhận — kết luận đã được gửi tới Quản lý để xem xét duyệt ngựa vào CLB.</p>}
              {saved.decision === 'not-eligible' && !isIntake && <p className="mt-3 text-sm text-red-700">Ngựa không đủ điều kiện. Việc mở khóa tập luyện sau này cần lý do bắt buộc ở mục "Khám sau tập & Khóa".</p>}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {postSession ? <Btn variant="primary" onClick={leave}>← Quay lại danh sách</Btn> : <>
              <Btn variant="gold" onClick={reset}>Khám ngựa khác</Btn>
              <Btn variant="secondary" onClick={() => navigate('health-records')}>Xem lịch sử khám</Btn>
            </>}
          </div>
        </Card>
      </div>
    );
  }

  const SectionHead = ({ n, title, sub }: { n: number; title: string; sub: string }) => (
    <div className="mb-4 flex items-start gap-3">
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#1a2844] text-xs font-bold text-white">{n}</span>
      <div><h3 className="font-serif text-base font-bold text-[#0f1729]">{title}</h3><p className="text-xs text-gray-500">{sub}</p></div>
    </div>
  );

  const seg = (active: boolean, tone: 'ok' | 'bad') => `flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${active ? (tone === 'ok' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-red-500 bg-red-50 text-red-700') : 'border-gray-200 bg-white text-gray-500 hover:border-[#c9973b]'}`;

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#0f1729]">{postSession ? 'Khám sau buổi tập' : 'Khám sức khỏe'}</h2>
          <p className="text-sm text-gray-500">{user.name} · {today}{postSession ? ` · Buổi ${postSession.type} ${postSession.distance}` : ''}</p>
        </div>
        <Btn variant="secondary" onClick={leave}>Hủy</Btn>
      </div>

      {/* Tiến trình */}
      <Card className="px-4 py-4">
        <ol className="flex items-start" aria-label="Tiến trình khám">
          {STEPS.map((label, i) => {
            const isDone = done[i]; const cur = current === i;
            return (
              <li key={label} className="flex flex-1 flex-col items-center text-center">
                <div className="flex w-full items-center">
                  <div className={`h-0.5 flex-1 ${i === 0 ? 'opacity-0' : isDone || cur ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isDone ? 'bg-emerald-500 text-white' : cur ? 'bg-[#c9973b] text-white ring-4 ring-[#c9973b]/20' : 'bg-gray-100 text-gray-400'}`}>{isDone ? '✓' : i + 1}</span>
                  <div className={`h-0.5 flex-1 ${i === STEPS.length - 1 ? 'opacity-0' : isDone ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                </div>
                <span className={`mt-1.5 text-[11px] leading-tight ${cur ? 'font-semibold text-[#0f1729]' : 'text-gray-500'}`}>{label}</span>
              </li>
            );
          })}
        </ol>
      </Card>

      {tried && missing.length > 0 && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Còn thiếu hoặc chưa hợp lệ: <b>{missing.join(', ')}</b>. Các ô cần sửa đã được đánh dấu đỏ.</div>
      )}
      {saveError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</div>}

      {/* 1. Chọn ngựa */}
      <Card className="p-5">
        <SectionHead n={1} title="Chọn ngựa" sub="Gõ tên hoặc mã ngựa (HRS-…) — chỉ hiện ngựa đã giao cho bạn." />
        {postSession && horse ? null : !horse ? (
          <div className="relative">
            <label className="mb-1 block text-sm font-medium text-gray-700">Tìm ngựa<span className="ml-0.5 text-red-500">*</span></label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input value={query} onChange={e => setQuery(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)}
                placeholder="VD: Red Comet hoặc HRS-000006"
                className={`w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b] ${tried ? 'border-red-400 bg-red-50/40' : 'border-gray-300'}`} />
            </div>
            {tried ? <p className="mt-0.5 text-xs text-red-600">Vui lòng chọn một con ngựa để bắt đầu khám.</p> : <p className="mt-0.5 text-xs text-gray-400">Có {visible.length} ngựa có thể khám. Chọn xong hồ sơ ngựa sẽ hiện ngay bên dưới để bạn chuẩn bị.</p>}
            {(focus || query) && (
              <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                {matches.length === 0 && <li className="px-4 py-3 text-sm text-gray-400">Không tìm thấy ngựa khớp "{query}".</li>}
                {matches.map(h => (
                  <li key={h.id}>
                    <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => { setHorseId(h.id); setQuery(''); setFocus(false); }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[#c9973b]/10">
                      <img src={h.imageUrl} alt="" className="h-9 w-9 rounded-lg bg-gray-200 object-cover" />
                      <span className="flex-1"><span className="block text-sm font-semibold text-[#0f1729]">{h.name}</span><span className="text-xs text-gray-500">{dispId('HRS', h.id)} · {h.breed} · {ageText(h)}</span></span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {horse && (
          <div className={postSession ? '' : 'mt-0'}>
            <div className="flex flex-wrap items-start gap-4">
              <img src={horse.imageUrl} alt={horse.name} className="h-24 w-24 rounded-xl bg-gray-200 object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="font-serif text-lg font-bold text-[#0f1729]">{horse.name}</span><IdChip kind="HRS" id={horse.id} />{isIntake && <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">Khám tiếp nhận</span>}</div>
                <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                  {[['Tuổi', ageText(horse)], ['Giới tính', GENDER_LABEL[horse.gender] || horse.gender], ['Cân nặng khai báo', `${horse.weight} kg`], ['Giống', horse.breed], ['Màu lông', horse.color], ['Chiều cao', `${horse.height} cm`], ['Chủ ngựa', horse.ownerName], ['Vi mạch', horse.microchip || '—']].map(([k, v]) => (
                    <div key={k}><div className="text-[11px] uppercase tracking-wide text-gray-400">{k}</div><div className="truncate font-medium text-gray-800">{v}</div></div>
                  ))}
                </div>
              </div>
              {!postSession && <Btn variant="secondary" size="sm" onClick={() => { setHorseId(''); }}>Đổi ngựa</Btn>}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">Tiền sử do chủ ngựa khai báo</div>
                <p className="text-sm text-gray-700">{horse.medicalHistory?.trim() || 'Chủ ngựa chưa khai báo tiền sử bệnh.'}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Các lần khám trước ({horseRecords.length})</div>
                {horseRecords.length === 0 ? <p className="text-sm text-gray-500">Đây là lần khám đầu tiên của ngựa này.</p> : (
                  <ul className="space-y-1.5">
                    {horseRecords.slice(0, 3).map(r => (
                      <li key={r.id} className="text-xs text-gray-600">
                        <div className="flex flex-wrap items-center gap-1.5"><IdChip kind="MED" id={r.id} /><span>{r.date}</span><DecisionPill d={recordDecision(r)} small /></div>
                        <div className="mt-0.5 line-clamp-2 text-gray-500">{r.conclusion || r.diagnosis || r.notes}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            {!postSession && !isIntake && (
              <div className="mt-4 max-w-xs">
                <Select label="Loại khám" required value={examType} onChange={setExamType} hint="Dùng để phân loại hồ sơ khi tra cứu lịch sử."
                  options={[{ value: 'Kiểm tra định kỳ', label: 'Kiểm tra định kỳ' }, { value: 'Khám trước huấn luyện', label: 'Khám trước huấn luyện' }, { value: 'Khám chấn thương', label: 'Khám chấn thương' }]} />
              </div>
            )}
          </div>
        )}
      </Card>

      {horse && <>
        {/* 2. Chỉ số sinh tồn */}
        <Card className="p-5">
          <SectionHead n={2} title="Chỉ số sinh tồn" sub="Đo khi ngựa nghỉ ngơi, đã yên tĩnh ít nhất 10 phút. Cả ba chỉ số đều bắt buộc." />
          <div className="grid gap-4 md:grid-cols-3">
            {VITAL_DEFS.map(d => {
              const s = vs[d.key]; const err = vitalError(d);
              const border = err ? 'border-red-400 bg-red-50/40' : s.kind === 'normal' ? 'border-emerald-400 bg-emerald-50' : s.kind === 'mild' || s.kind === 'severe' ? 'border-red-400 bg-red-50' : 'border-gray-300';
              const pv = prev?.vitals?.[d.key];
              return (
                <div key={d.key} className="rounded-xl border border-gray-200 p-3">
                  <label className="mb-0.5 block text-sm font-semibold text-gray-800">{d.icon} {d.label}<span className="ml-0.5 text-red-500">*</span></label>
                  <p className="mb-2 text-[11px] leading-snug text-gray-500">Vì sao đo: {d.reason}</p>
                  <div className="relative">
                    <input inputMode="decimal" value={vit[d.key]} onChange={e => setVit(p => ({ ...p, [d.key]: e.target.value }))} placeholder={d.example} aria-invalid={!!err}
                      className={`w-full rounded-lg border-2 py-2 pl-3 pr-20 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#c9973b] ${border}`} />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{d.unit}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md bg-[#1a2844]/5 px-1.5 py-0.5 text-[11px] font-medium text-[#1a2844]">Bình thường: {rangeText(d)}</span>
                    <VitalStatusPill s={s} />
                  </div>
                  {err ? <p className="mt-1 text-xs text-red-600">{err}</p> : s.kind === 'severe' ? <p className="mt-1 text-xs text-red-600">Lệch nhiều so với ngưỡng — hãy đo lại để chắc chắn.</p> : pv ? <p className="mt-1 text-xs text-gray-400">Lần trước: {fmtNum(Number(pv))} {d.unit}</p> : null}
                </div>
              );
            })}
          </div>
          <div className="mt-4 max-w-xs">
            <Input label="Cân nặng thực tế (kg)" value={weight} onChange={setWeight} placeholder="VD: 505" hint="Không bắt buộc. Dùng theo dõi dinh dưỡng và tính liều thuốc." error={wt.error} />
          </div>
          <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Bảng ngưỡng bình thường</div>
            <table className="w-full text-xs text-gray-700"><tbody>
              {VITAL_DEFS.map(d => <tr key={d.key} className="border-t border-gray-100 first:border-0"><td className="py-1 pr-3">{d.label}</td><td className="py-1 font-medium">{rangeText(d)}</td></tr>)}
            </tbody></table>
            <p className="mt-2 text-[11px] italic leading-snug text-amber-700">{THRESHOLD_SOURCE}</p>
          </div>
        </Card>

        {/* 3. Khám lâm sàng */}
        <Card className="p-5">
          <SectionHead n={3} title="Khám lâm sàng theo vùng" sub="Mỗi vùng chọn một trong hai: Bình thường hoặc Bất thường. Nếu bất thường, bắt buộc ghi chú mô tả." />
          <div className="space-y-3">
            {REGION_DEFS.map(r => {
              const v = regions[r.key] || ''; const e = regionError(r.key);
              return (
                <div key={r.key} className={`rounded-xl border p-3 ${e ? 'border-red-300 bg-red-50/30' : v === 'bad' ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-800">{r.icon} {r.label}<span className="ml-0.5 text-red-500">*</span></div>
                      <div className="text-[11px] leading-snug text-gray-500">{r.hint}</div>
                      <div className="text-[11px] leading-snug text-gray-400">Vì sao khám: {r.reason}</div>
                    </div>
                    <div className="flex w-full gap-2 sm:w-72">
                      <button type="button" className={seg(v === 'ok', 'ok')} onClick={() => setRegions(p => ({ ...p, [r.key]: 'ok' }))}>Bình thường</button>
                      <button type="button" className={seg(v === 'bad', 'bad')} onClick={() => setRegions(p => ({ ...p, [r.key]: 'bad' }))}>Bất thường</button>
                    </div>
                  </div>
                  {e && <p className="mt-1 text-xs text-red-600">{e}</p>}
                  {v === 'bad' && (
                    <div className="mt-2">
                      <Input label="Mô tả bất thường" required value={notes[r.key] || ''} onChange={x => setNotes(p => ({ ...p, [r.key]: x }))} maxLength={200}
                        placeholder="VD: Sưng nhẹ khớp cổ chân phải, phản ứng đau khi ấn" hint="Ghi vị trí và dấu hiệu quan sát được (tối đa 200 ký tự)." error={noteError(r.key)} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* 4. Kết luận */}
        <Card className="p-5">
          <SectionHead n={4} title="Kết luận của bác sĩ" sub="Hệ thống chỉ gợi ý dựa trên dữ liệu đã nhập; quyết định cuối cùng thuộc về bác sĩ." />
          <div className={`mb-4 rounded-xl border p-4 ${overallCfg.cls}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span>{overallCfg.icon}</span><span className="text-sm font-bold">Tình trạng chung: {overallCfg.label}</span>
              <span className="text-xs opacity-75">(tự suy ra theo mục nặng nhất)</span>
            </div>
            {!vitalsDone || !regionsDone ? <p className="mt-1 text-sm opacity-80">Hoàn thành bước 2 và 3 để hệ thống đưa ra gợi ý.</p> : <>
              <p className="mt-1 text-sm"><b>Gợi ý:</b> {suggestionText}</p>
              {findings.length > 0 && <ul className="mt-2 space-y-0.5 text-xs">{findings.map((f, i) => <li key={i}>{f.level === 'fail' ? '✕' : '⚠'} <b>{f.label}:</b> {f.text}</li>)}</ul>}
              <div className="mt-3"><Btn size="sm" variant="secondary" onClick={() => setDecision(suggestedDecision)}>Chọn theo gợi ý</Btn></div>
            </>}
          </div>

          <div className="mt-4">
            <div className="mb-1 text-sm font-medium text-gray-700">Kết luận <span className="text-red-500">*</span></div>
            <div className="grid gap-2 md:grid-cols-3">
              <button type="button" onClick={() => setDecision('eligible')} className={`flex-1 rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition-all ${decision === 'eligible' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-gray-200 text-gray-600 hover:border-emerald-300'}`}>✓ Đủ điều kiện huấn luyện</button>
              <button type="button" onClick={() => setDecision('conditional')} className={`flex-1 rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition-all ${decision === 'conditional' ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200 text-gray-600 hover:border-amber-300'}`}>! Đủ điều kiện nhưng cần theo dõi</button>
              <button type="button" onClick={() => setDecision('not-eligible')} className={`flex-1 rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition-all ${decision === 'not-eligible' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:border-red-300'}`}>✕ Không đủ điều kiện, khóa tập luyện</button>
            </div>
            {decisionError ? <p className="mt-0.5 text-xs text-red-600">{decisionError}</p> : <p className="mt-0.5 text-xs text-gray-400">Chọn "Không đủ điều kiện" sẽ tạm dừng huấn luyện của ngựa đang tập.</p>}
            {decision === 'conditional' && <div className="mt-4"><Textarea label="Monitoring instructions" required rows={2} value={followUpNote} onChange={setFollowUpNote} placeholder="Example: Monitor heart rate and reduce intensity by 20% for 7 days" hint="At least 10 characters." /></div>}
            {decision === 'not-eligible' && <div className="mt-4"><Textarea label="Lý do khóa tập luyện" required rows={2} value={decisionReason} onChange={setDecisionReason} placeholder="Nêu rõ dấu hiệu hoặc nguy cơ khiến ngựa chưa thể tập luyện" hint="Tối thiểu 10 ký tự." /></div>}
            {needsOverride && vitalsDone && regionsDone && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3"><Textarea label="Lý do chọn khác gợi ý hệ thống" required rows={2} value={overrideReason} onChange={setOverrideReason} placeholder="Giải thích đánh giá chuyên môn của bác sĩ" hint="Tối thiểu 10 ký tự; nội dung được lưu trong hồ sơ." /></div>}
            {conclusionError && <p className="mt-2 text-xs text-red-600">{conclusionError}</p>}
          </div>

          {decision && <div className="mt-4 rounded-xl border-l-4 border-[#c9973b] bg-[#c9973b]/10 p-4"><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#8a6620]">Câu kết luận tự ghép sẽ in trên hồ sơ</div><p className="text-sm text-gray-800">{autoConclusion}</p></div>}

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Textarea label="Khuyến nghị (không bắt buộc)" rows={2} value={recommendations} onChange={setRecommendations} placeholder="VD: Nghỉ 3 ngày, chườm lạnh, tái khám sau 1 tuần" hint="Hướng dẫn cho huấn luyện viên và nhân viên chăm sóc." />
            <Textarea label="Thuốc / chỉ định (không bắt buộc)" rows={2} value={medications} onChange={setMedications} placeholder="VD: Vitamin E 500IU/ngày" hint="Ghi tên thuốc và liều nếu có kê." />
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3 pb-6">
          <p className="text-xs text-gray-500">Bạn sẽ được xem lại toàn bộ trước khi lưu.</p>
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={leave}>Hủy</Btn>
            <Btn variant={willLock ? 'danger' : 'gold'} onClick={submitReview}>{willLock ? 'Xem lại & lưu (sẽ khóa huấn luyện)' : 'Xem lại & lưu'}</Btn>
          </div>
        </div>
      </>}

      {confirm && horse && (
        <Modal title="Xác nhận hồ sơ khám" onClose={() => setConfirm(false)} wide>
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3"><img src={horse.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" /><div><div className="font-semibold text-[#0f1729]">{horse.name}</div><div className="text-xs text-gray-500">{dispId('HRS', horse.id)} · {today} · {postSession ? 'Khám sau buổi tập' : isIntake ? 'Khám tiếp nhận' : examType}</div></div></div>
            <div className="grid grid-cols-3 gap-2">
              {VITAL_DEFS.map(d => <div key={d.key} className={`rounded-lg border p-2 text-center ${vs[d.key].kind === 'normal' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}><div className="text-[11px] text-gray-500">{d.label}</div><div className="font-semibold">{fmtNum(vs[d.key].n)} {d.unit}</div><div className="text-[11px]">{vs[d.key].kind === 'normal' ? 'Bình thường' : 'Bất thường'}</div></div>)}
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Vùng khám bất thường</div>
              {REGION_DEFS.filter(r => regions[r.key] === 'bad').length === 0 ? <p className="text-gray-600">Tất cả 8 vùng đều bình thường.</p> : <ul className="space-y-0.5">{REGION_DEFS.filter(r => regions[r.key] === 'bad').map(r => <li key={r.key}>⚠ <b>{r.label}:</b> {notes[r.key]}</li>)}</ul>}
            </div>
            <div className={`rounded-lg border px-3 py-2 ${overallCfg.cls}`}>Tình trạng chung: <b>{overallCfg.label}</b></div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="mb-1 flex items-center gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Kết luận</span><DecisionPill d={decision || undefined} small /></div>
              <p className="text-gray-800">{concText}</p>
            </div>
            {isIntake && <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">Hồ sơ này là khám tiếp nhận: sau khi lưu, Quản lý sẽ được thông báo để duyệt ngựa vào CLB.</p>}
            {willLock && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">Ngựa đang tập sẽ bị KHÓA HUẤN LUYỆN, gói tạm dừng và các buổi nặng bị hủy.</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Btn variant="secondary" onClick={() => setConfirm(false)}>Quay lại chỉnh sửa</Btn>
              <Btn variant={willLock ? 'danger' : 'gold'} onClick={doSave}>Xác nhận & lưu hồ sơ</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
