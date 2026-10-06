import { type AppState, type Page } from '../../types/reference';
import { useState } from 'react';
import { sortHealthRecords } from '../../utils/trainingAlgorithm';
import { type HealthRecord } from '../../data';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { TrainingEligibilityCard } from '../../components/training/TrainingEligibilityCard';
import { Btn } from '../../components/common/Button';

export function HealthRecordsPage({ state, navigate }: { state: AppState; navigate: (p: Page) => void }) {
  const horses = state.horses.filter(h => h.ownerId === state.user!.id);
  const [sel, setSel] = useState(horses.some(horse => horse.id === state.selectedHorseId) ? state.selectedHorseId : horses[0]?.id || '');
  const [tab, setTab] = useState<'all' | 'history'>('all');
  const isVet = state.user?.role === 'veterinarian';
  // Sorted newest exam first, ties broken by createdAt DESC
  const records = sortHealthRecords(state.healthRecords.filter(r => r.horseId === sel));
  const watchRecords = records.filter(r => r.autoEvaluation === 'watch' || r.autoEvaluation === 'fail');

  const autoEvalLabel = (ev?: string) => {
    if (ev === 'pass')  return <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">✓ Đạt chuẩn</span>;
    if (ev === 'watch') return <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">⚠ Cần theo dõi</span>;
    if (ev === 'fail')  return <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">✕ Không đủ điều kiện</span>;
    return null;
  };

  const RecordCard = ({ r }: { r: HealthRecord }) => (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-semibold">{r.type}</div>
            {r.isPostTraining && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Sau tập</span>}
            {autoEvalLabel(r.autoEvaluation)}
          </div>
          <div className="text-sm text-gray-500 mt-0.5">{r.date} · {r.vet}</div>
        </div>
        <Badge status={r.result} />
      </div>

      {r.vitals && (r.vitals.heartRate || r.vitals.temperature || r.vitals.respRate) && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {r.vitals.heartRate  && <div className="text-center p-2 bg-gray-50 rounded-lg"><div className="text-xs text-gray-400">Nhịp tim</div><div className="text-xs font-semibold mt-0.5">{r.vitals.heartRate} lần/p</div></div>}
          {r.vitals.temperature && <div className="text-center p-2 bg-gray-50 rounded-lg"><div className="text-xs text-gray-400">Nhiệt độ</div><div className="text-xs font-semibold mt-0.5">{r.vitals.temperature}°C</div></div>}
          {r.vitals.respRate   && <div className="text-center p-2 bg-gray-50 rounded-lg"><div className="text-xs text-gray-400">Nhịp thở</div><div className="text-xs font-semibold mt-0.5">{r.vitals.respRate} lần/p</div></div>}
        </div>
      )}

      {r.autoNote && (r.autoEvaluation === 'watch' || r.autoEvaluation === 'fail') && (
        <div className={`mb-3 rounded-lg p-3 border text-xs space-y-1 ${r.autoEvaluation === 'fail' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className={`font-medium mb-1 ${r.autoEvaluation === 'fail' ? 'text-red-800' : 'text-amber-800'}`}>
            {r.autoEvaluation === 'fail' ? '🚨 Cảnh báo:' : '📝 Chỉ số cần theo dõi:'}
          </div>
          {r.autoNote.split('\n').map((line, i) => <div key={i} className={r.autoEvaluation === 'fail' ? 'text-red-700' : 'text-amber-700'}>{line}</div>)}
        </div>
      )}

      {r.diagnosis && <div className="text-sm text-gray-700 mb-1"><strong>Chẩn đoán:</strong> {r.diagnosis}</div>}
      {r.medications !== 'None' && <div className="text-sm text-blue-600 mb-1">💊 {r.medications}</div>}
      {r.recommendations && <div className="text-sm text-gray-600 mb-3"><strong>Khuyến nghị:</strong> {r.recommendations}</div>}

      {/* Training eligibility section */}
      {r.trainingEligibility && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            🏇 Điều kiện huấn luyện
          </div>
          <TrainingEligibilityCard
            result={{
              status: r.trainingEligibility,
              reasons: r.trainingReasons || [],
              adjustments: r.trainingAdjustments || [],
              trainingNote: r.trainingNote || '',
              nutritionSuggestions: r.nutritionSuggestions || [],
            }}
            recordId={r.id}
            compact={false}
          />
        </div>
      )}

      {!r.trainingEligibility && r.vetClearanceGranted && (
        <div className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">✅ Đã xác nhận đủ điều kiện</div>
      )}
    </Card>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-xl font-serif font-bold">Hồ sơ y tế</h2></div>
        {isVet && <Btn variant="gold" onClick={() => navigate('vet-health-form')}>+ Nhập khám mới</Btn>}
        {!isVet && (
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <span>👁</span><span>Chế độ xem — chỉ thú y được phép tạo hồ sơ khám</span>
          </div>
        )}
      </div>

      {/* Horse selector */}
      <div className="flex gap-3 flex-wrap">
        {horses.map(h => (
          <button key={h.id} onClick={() => setSel(h.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${sel === h.id ? 'bg-[#1a2844] text-white border-[#1a2844]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#c9973b]'}`}>
            {h.imageUrl && <img src={h.imageUrl} className="w-6 h-6 rounded object-cover" alt="" />}
            {h.name}<Badge status={h.healthStatus} />
          </button>
        ))}
      </div>

      {/* Tab switcher */}
      {records.length > 0 && (
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          <button onClick={() => setTab('all')}     className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'all'     ? 'bg-white text-[#1a2844] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Tất cả hồ sơ</button>
          <button onClick={() => setTab('history')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${tab === 'history' ? 'bg-white text-[#1a2844] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            Lịch sử theo dõi
            {watchRecords.length > 0 && <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center">{watchRecords.length}</span>}
          </button>
        </div>
      )}

      {records.length === 0 && (
        <Card className="p-10 text-center">
          <div className="text-4xl mb-3">🏥</div>
          <div className="text-gray-500">Chưa có hồ sơ khám</div>
          {isVet && <Btn variant="gold" className="mt-3" onClick={() => navigate('vet-health-form')}>Nhập khám đầu tiên</Btn>}
        </Card>
      )}

      {/* All records tab */}
      {tab === 'all' && records.map(r => <RecordCard key={r.id} r={r} />)}

      {/* Monitoring history tab */}
      {tab === 'history' && (
        <div className="space-y-4">
          {watchRecords.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-3xl mb-2">✅</div>
              <div className="font-medium text-gray-700">Không có chỉ số bất thường</div>
              <div className="text-sm text-gray-500 mt-1">Tất cả các lần khám đều đạt chuẩn.</div>
            </Card>
          ) : (
            <>
              <div className="text-sm text-gray-500">Hiển thị {watchRecords.length} lần khám có chỉ số cần theo dõi hoặc không đủ điều kiện.</div>
              {watchRecords.map(r => <RecordCard key={r.id} r={r} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
