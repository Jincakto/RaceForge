import { type Horse, type TrainingSuggestion, type HealthRecord } from '../../data';
import { Card } from '../common/Card';

export function TrainingAlgorithmTab({ horse, suggestion, latestHealth }: { horse: Horse; suggestion: TrainingSuggestion; latestHealth?: HealthRecord }) {
  const phaseColors: Record<string, string> = { 'Competition Prep': 'bg-orange-100 text-orange-800', 'Base Building': 'bg-blue-100 text-blue-800', Foundation: 'bg-teal-100 text-teal-800', Recovery: 'bg-gray-100 text-gray-700' };
  const zoneColors: Record<string, string> = { 'Z0': 'bg-gray-100 text-gray-500', 'Z1': 'bg-blue-100 text-blue-700', 'Z1–Z2': 'bg-cyan-100 text-cyan-700', 'Z2': 'bg-emerald-100 text-emerald-700', 'Z3': 'bg-yellow-100 text-yellow-700', 'Z4': 'bg-orange-100 text-orange-800', 'Z4–Z5': 'bg-red-100 text-red-700', 'Z5': 'bg-red-200 text-red-800' };
  return (
    <div className="space-y-5">
      {/* Score header */}
      <Card className="p-5 border-l-4 border-[#c9973b]">
        <div className="flex items-start gap-5">
          <div className="text-center flex-shrink-0">
            <div className="text-5xl font-serif font-bold text-[#c9973b]">{suggestion.intensityScore}</div>
            <div className="text-sm text-gray-500">/ 100</div>
            <div className="text-xs text-gray-400 mt-1">Chỉ số tổng hợp</div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${phaseColors[suggestion.phase] || 'bg-gray-100 text-gray-700'}`}>{suggestion.phase}</span>
              <span className="text-sm text-gray-500">— Giai đoạn được đề xuất bởi AI</span>
            </div>
            <div className="text-sm text-gray-600 mb-2"><strong>Dựa trên:</strong> {suggestion.rationale.join(' · ') || 'Dữ liệu cơ bản'}</div>
            <div className="grid grid-cols-4 gap-3">
              {[['Tổng km/tuần', suggestion.weeklyKm + ' km'], ['Buổi/tuần', suggestion.sessionsPerWeek + ' buổi'], ['Ngày nghỉ', suggestion.restDaysPerWeek + ' ngày'], ['Cường độ cao', suggestion.highIntensityPercent + '%']].map(([k, v]) => (
                <div key={k as string} className="p-2 bg-gray-50 rounded-lg text-center"><div className="text-xs text-gray-400">{k as string}</div><div className="font-bold text-sm">{v as string}</div></div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Warnings */}
      {suggestion.warnings.length > 0 && (
        <Card className="p-4 bg-amber-50 border border-amber-200">
          <div className="text-sm font-semibold text-amber-800 mb-2">⚠️ Lưu ý quan trọng:</div>
          {suggestion.warnings.map((w, i) => <div key={i} className="text-sm text-amber-700 flex items-start gap-2"><span>•</span><span>{w}</span></div>)}
        </Card>
      )}

      {/* Phân phối cường độ */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Phân phối cường độ (mô hình 80/20)</h3>
        <div className="flex rounded-full overflow-hidden h-8 mb-3">
          <div className="bg-[#1a4a3a] flex items-center justify-center text-white text-xs font-bold transition-all" style={{ width: `${suggestion.lowIntensityPercent}%` }}>{suggestion.lowIntensityPercent}% cường độ thấp</div>
          {suggestion.highIntensityPercent > 0 && <div className="bg-[#c9973b] flex items-center justify-center text-white text-xs font-bold" style={{ width: `${suggestion.highIntensityPercent}%` }}>{suggestion.highIntensityPercent}% cao</div>}
        </div>
        <p className="text-xs text-gray-500">Dựa trên mô hình polarized training của Seiler (2010) — chứng minh hiệu quả tối ưu cho ngựa đua chuyên nghiệp.</p>
      </Card>

      {/* Lịch tuần */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4">Lịch tập tuần (đề xuất)</h3>
        <div className="space-y-2">
          {suggestion.weeklySchedule.map((day, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${day.intensity === 'Nghỉ' ? 'bg-gray-50' : 'bg-white border border-gray-100'}`}>
              <div className="w-16 text-xs font-semibold text-gray-500 flex-shrink-0">{day.day}</div>
              <div className="flex-1">
                <span className="text-sm font-medium">{day.type}</span>
                {day.distance !== '—' && <span className="text-xs text-gray-500 ml-2">· {day.distance}</span>}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${zoneColors[day.zone] || 'bg-gray-100 text-gray-600'}`}>{day.zone}</span>
              <span className="text-xs text-gray-400 w-24 text-right">{day.intensity}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* 12 tuần */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4">Kế hoạch 12 tuần</h3>
        <div className="grid grid-cols-3 gap-2">
          {suggestion.twelveWeekPlan.map(w => (
            <div key={w.week} className="p-3 rounded-lg border border-gray-100 hover:border-[#c9973b] transition-all">
              <div className="flex items-center justify-between mb-1"><span className="text-xs font-semibold text-gray-500">Tuần {w.week}</span><span className="text-xs font-bold text-[#c9973b]">{w.volumeKm} km</span></div>
              <div className="text-xs font-medium">{w.focus}</div>
              <div className="text-xs text-gray-400 mt-0.5">{w.intensityNote}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-[#1a2844]/5 rounded-xl">
          <p className="text-xs text-gray-500">
            <strong>Nguyên tắc:</strong> Tăng 10% volume/tuần (Bompa 2009) · Tuần mỗi 3rd giảm 15% (Supercompensation theory) · Giai đoạn taper: giảm 50% volume, giữ cường độ (FEI guidelines)
          </p>
        </div>
      </Card>
    </div>
  );
}
