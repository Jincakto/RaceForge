export function deriveTrainingEligibility(params) {
  const { hasMinVitals, hasFail, hrVal, tempVal, rrVal, hrSt, tempSt, rrSt, clinical, injuryDetails } = params;

  if (!hasMinVitals) return { status: 'incomplete', reasons: [], adjustments: [], trainingNote: '', nutritionSuggestions: [] };

  const severeInjuries = Object.entries(injuryDetails).filter(([, detail]) => detail.severity === 'severe');

  // CASE 3: Any vital exceeds ±10% or a severe injury is recorded → not eligible
  if (hasFail || severeInjuries.length > 0) {
    const reasons = [];
    if (hrSt === 'fail' && hrVal !== null) reasons.push(`Nhịp tim: ${hrVal} lần/phút (Bình thường: 28–44) — vượt ngưỡng ±10%`);
    if (tempSt === 'fail' && tempVal !== null) reasons.push(`Nhiệt độ: ${tempVal}°C (Bình thường: 37,2–38,3°C) — vượt ngưỡng ±10%`);
    if (rrSt === 'fail' && rrVal !== null) reasons.push(`Nhịp thở: ${rrVal} lần/phút (Bình thường: 8–16) — vượt ngưỡng ±10%`);
    severeInjuries.forEach(([, detail]) => reasons.push(`Chấn thương nặng: ${detail.issue}`));
    const adjustments = ['Tạm ngưng huấn luyện ngay lập tức.', 'Theo dõi sát tình trạng ngựa.', 'Tái khám trước khi được phép luyện tập trở lại.'];
    const trainingNote = `Lý do:\n${reasons.map(r => `- ${r}`).join('\n')}\n\nKhuyến nghị:\n${adjustments.map(a => `- ${a}`).join('\n')}`;
    return { status: 'not-eligible', reasons, adjustments, trainingNote, nutritionSuggestions: [] };
  }

  // CASE 2: watch — analyse causes
  const reasons = [];
  const adjustments = [];
  const nutritionSuggestions = [];
  let hasHighVital = false;
  let hasLowVital = false;

  if (hrSt === 'watch' && hrVal !== null) {
    if (hrVal > 44) { hasHighVital = true; reasons.push(`Nhịp tim cao hơn mức tham chiếu: ${hrVal} lần/phút (Bình thường: 28–44)`); }
    else { hasLowVital = true; reasons.push(`Nhịp tim thấp hơn mức tham chiếu: ${hrVal} lần/phút (Bình thường: 28–44)`); }
  }
  if (tempSt === 'watch' && tempVal !== null) {
    if (tempVal > 38.3) { hasHighVital = true; reasons.push(`Nhiệt độ cao hơn mức tham chiếu: ${tempVal}°C (Bình thường: 37,2–38,3°C)`); }
    else { hasLowVital = true; reasons.push(`Nhiệt độ thấp hơn mức tham chiếu: ${tempVal}°C (Bình thường: 37,2–38,3°C)`); }
  }
  if (rrSt === 'watch' && rrVal !== null) {
    if (rrVal > 16) { hasHighVital = true; reasons.push(`Nhịp thở cao hơn mức tham chiếu: ${rrVal} lần/phút (Bình thường: 8–16)`); }
    else { hasLowVital = true; reasons.push(`Nhịp thở thấp hơn mức tham chiếu: ${rrVal} lần/phút (Bình thường: 8–16)`); }
  }

  const clinicalLabels = {
    eyes: 'Mắt', nose: 'Mũi', mouth: 'Miệng / Nướu', movement: 'Vận động',
    eating: 'Ăn uống', waste: 'Phân và nước tiểu', skin: 'Da và lông', behavior: 'Hành vi',
  };
  const clinicalAbn = [];
  Object.entries(clinical).forEach(([k, v]) => {
    if (v === 'abnormal') {
      clinicalAbn.push(k);
      const detail = injuryDetails[k];
      const severityLabel = detail?.severity === 'moderate' ? 'vừa' : detail?.severity === 'severe' ? 'nặng' : 'nhẹ';
      reasons.push(`${clinicalLabels[k] || k}: ${detail?.issue || 'Bất thường'} (${severityLabel})`);
    }
  });

  // CASE 1: No issues → eligible
  if (reasons.length === 0) {
    return { status: 'eligible', reasons: [], adjustments: ['Huấn luyện bình thường theo kế hoạch hiện tại.'], trainingNote: '', nutritionSuggestions: [] };
  }

  // Build adjustments for conditional
  if (hasHighVital) {
    adjustments.push('Giảm cường độ huấn luyện.', 'Theo dõi phản ứng của ngựa trong buổi tập.', 'Đánh giá lại sau buổi tập.');
  } else if (hasLowVital && clinicalAbn.length === 0) {
    adjustments.push('Có thể tăng cường độ từ từ nếu các dấu hiệu khác bình thường.', 'Theo dõi phản ứng của ngựa.', 'Không tăng cường độ đột ngột.');
  }
  if (clinicalAbn.length > 0) {
    if (!hasHighVital && !hasLowVital) adjustments.push('Tiếp tục theo dõi trong các buổi tập.');
    adjustments.push('Đánh giá khẩu phần dinh dưỡng.', 'Tham khảo bác sĩ thú y về hỗ trợ dinh dưỡng phù hợp.');
    if (clinicalAbn.includes('skin')) {
      nutritionSuggestions.push({ category: 'Da / Lông', items: ['Chế độ ăn cân đối', 'Omega-3', 'Kẽm', 'Đồng'], note: 'Kẽm và đồng có vai trò đối với da, móng và mô liên kết. Việc bổ sung nên dựa trên khẩu phần và đánh giá dinh dưỡng thực tế.' });
    }
    if (clinicalAbn.includes('movement')) {
      nutritionSuggestions.push({ category: 'Khớp / Vận động', items: ['Đánh giá khẩu phần và tình trạng cơ-xương-khớp', 'Nutritional joint support (theo chỉ định bác sĩ thú y)'], note: 'Không kết luận ngựa bị viêm khớp. Các vấn đề vận động cần được đánh giá qua khám lâm sàng và gait assessment.' });
    }
    if (clinicalAbn.includes('eating') || clinicalAbn.includes('behavior')) {
      nutritionSuggestions.push({ category: 'Cơ / Phục hồi', items: ['Đánh giá khẩu phần năng lượng và protein', 'Đảm bảo cung cấp nước đầy đủ', 'Điện giải (theo đánh giá bác sĩ thú y khi có mất nước)'], note: 'Không tự động kê electrolyte hoặc sản phẩm cụ thể mà không có chỉ định bác sĩ thú y.' });
    }
    if (clinicalAbn.includes('nose') || clinicalAbn.includes('waste')) {
      adjustments.push('Kiểm tra tình trạng nước uống và vệ sinh chuồng trại.');
    }
  }

  const trainingNote = `Lý do:\n${reasons.map(r => `- ${r}`).join('\n')}\n\nKhuyến nghị:\n${adjustments.map(a => `- ${a}`).join('\n')}`;
  return { status: 'conditional', reasons, adjustments, trainingNote, nutritionSuggestions };
}
