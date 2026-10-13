// Reusable read-only card showing training condition derived from a health record

export function TrainingEligibilityCard({ result, recordId, compact = false }) {
  if (result.status === 'incomplete') {
    return (
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <span className="text-2xl">📋</span>
        <div className="text-sm text-gray-500">Nhập đủ sinh hiệu (ít nhất nhiệt độ + nhịp tim) để xem điều kiện huấn luyện.</div>
      </div>
    );
  }

  const cfg = {
    eligible:    { dot: '🟢', label: 'ĐỦ ĐIỀU KIỆN HUẤN LUYỆN',         banner: 'bg-emerald-50 border-emerald-400', title: 'text-emerald-800', pill: 'bg-emerald-100 text-emerald-800 border-emerald-200', arrowIcon: '↑', arrowColor: 'text-emerald-700' },
    conditional: { dot: '🟡', label: 'ĐƯỢC HUẤN LUYỆN CÓ ĐIỀU KIỆN',    banner: 'bg-amber-50 border-amber-400',   title: 'text-amber-800',   pill: 'bg-amber-100 text-amber-800 border-amber-200',   arrowIcon: '↕', arrowColor: 'text-amber-700'   },
    'not-eligible': { dot: '🔴', label: 'KHÔNG ĐỦ ĐIỀU KIỆN HUẤN LUYỆN', banner: 'bg-red-50 border-red-500',       title: 'text-red-800',     pill: 'bg-red-100 text-red-800 border-red-200',         arrowIcon: '⛔', arrowColor: 'text-red-700'    },
  };
  const c = cfg[result.status];

  return (
    <div className="space-y-3">
      {/* Status banner */}
      <div className={`flex items-center gap-4 p-4 rounded-xl border-2 ${c.banner}`}>
        <span className="text-3xl leading-none">{c.dot}</span>
        <div>
          <div className={`font-bold text-lg tracking-wide ${c.title}`}>{c.label}</div>
          {result.status === 'eligible' && <div className="text-sm text-emerald-700 mt-0.5">Có thể huấn luyện theo kế hoạch hiện tại.</div>}
          {result.status === 'not-eligible' && <div className="text-sm text-red-700 mt-0.5">Tạm ngưng huấn luyện — cần tái khám.</div>}
        </div>
      </div>

      {!compact && result.reasons.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Lý do</div>
          <div className="space-y-1.5">
            {result.reasons.map((r, i) => (
              <div key={i} className={`flex items-start gap-2 text-sm px-3 py-2 rounded-lg border ${result.status === 'not-eligible' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                <span className="font-bold mt-0.5 flex-shrink-0">{result.status === 'not-eligible' ? '✕' : '⚠'}</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!compact && result.adjustments.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Điều chỉnh huấn luyện</div>
          <div className="space-y-1.5">
            {result.adjustments.map((a, i) => (
              <div key={i} className={`flex items-center gap-2 text-sm ${c.arrowColor} font-medium`}>
                <span>{c.arrowIcon}</span><span>{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!compact && result.trainingNote && (
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3 font-semibold text-sm text-gray-700">
            <span>📝</span> Training Note
            <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Tự động tạo</span>
          </div>
          <pre className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed font-sans">{result.trainingNote}</pre>
        </div>
      )}

      {!compact && result.nutritionSuggestions.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Gợi ý hỗ trợ dinh dưỡng</div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-3 text-xs text-amber-700">
            ⚠️ <strong>Disclaimer:</strong> Đây là gợi ý hỗ trợ, không thay thế chẩn đoán hoặc chỉ định của bác sĩ thú y.
          </div>
          <div className="space-y-2">
            {result.nutritionSuggestions.map((ns, i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="font-semibold text-sm text-gray-800 mb-2">🌿 {ns.category}</div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {ns.items.map((item, j) => <span key={j} className="text-xs bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 rounded-full">{item}</span>)}
                </div>
                <div className="text-xs text-gray-500 italic">{ns.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recordId && (
        <div className="text-xs text-gray-400 pt-1">
          Nguồn: Health Examination #{recordId}
        </div>
      )}
    </div>
  );
}
