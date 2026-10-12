export function computeTrainingSuggestion(horse, health) {
  // ── Multi-factor scoring (max 100) ──────────────────────────────────────────
  let score = 40;
  const rationale = [];
  const warnings = [];

  // 1. Health status (0-40 pts)
  const healthPts = {
    Eligible: 40, Monitor: 15, Injured: -20, 'Pending Vet': 5, Retired: -40,
  };
  score += healthPts[horse.healthStatus] ?? 0;
  if (horse.healthStatus === 'Monitor') warnings.push('Ngựa đang trong diện theo dõi — giới hạn cường độ tối đa 60%');
  if (horse.healthStatus === 'Injured') warnings.push('Ngựa đang chấn thương — chỉ áp dụng liệu trình phục hồi thụ động');
  if (horse.healthStatus === 'Eligible') rationale.push('Sức khỏe ổn định, đủ điều kiện tập luyện đầy đủ');

  // 2. Age factor (0-20 pts) — peak performance: 4–7 years
  if (horse.age >= 4 && horse.age <= 7) {
    score += 20; rationale.push(`Tuổi ${horse.age} — giai đoạn đỉnh cao phong độ (4–7 tuổi)`);
  } else if (horse.age === 3) {
    score += 10; warnings.push('Ngựa 3 tuổi — xương còn phát triển, giới hạn sprint cường độ cao');
  } else if (horse.age <= 10) {
    score += 12; rationale.push(`Tuổi ${horse.age} — còn thi đấu được, tăng thời gian hồi phục`);
  } else {
    score += 2; warnings.push(`Ngựa ${horse.age} tuổi — chương trình bảo trì và nghỉ ngơi ưu tiên`);
  }

  // 3. Weight factor (0-15 pts) — optimal TB: 450–550 kg
  if (horse.weight >= 450 && horse.weight <= 550) {
    score += 15; rationale.push(`Cân nặng ${horse.weight} kg — trong khoảng lý tưởng (450–550 kg)`);
  } else if (horse.weight < 430) {
    score += 0; warnings.push(`Cân nặng ${horse.weight} kg thấp — bổ sung dinh dưỡng trước khi tập nặng`);
  } else if (horse.weight > 570) {
    score += 5; warnings.push(`Cân nặng ${horse.weight} kg cao — cần giảm tải, theo dõi khớp`);
  } else {
    score += 10;
  }

  // 4. Vitals from latest health record (0-15 pts)
  if (health?.vitals) {
    const hr = Number(health.vitals.heartRate);
    const temp = Number(health.vitals.temperature);
    if (hr >= 28 && hr <= 36) {
      score += 15; rationale.push(`Nhịp tim nghỉ ${hr} bpm — tim mạch xuất sắc (nền tảng tốt cho tập hiệu suất cao)`);
    } else if (hr <= 44) {
      score += 8; rationale.push(`Nhịp tim nghỉ ${hr} bpm — bình thường`);
    } else {
      score -= 5; warnings.push(`Nhịp tim nghỉ ${hr} bpm cao — cần đánh giá lại tim mạch trước khi tăng tải`);
    }
    if (temp > 38.5) { score -= 10; warnings.push(`Nhiệt độ ${temp}°C — dấu hiệu viêm nhiễm, tạm ngưng tập luyện`); }
  } else {
    warnings.push('Chưa có dữ liệu sinh hiệu gần nhất — đề xuất khám trước khi bắt đầu chương trình');
  }

  // 5. Race performance bonus (0-10 pts)
  if (horse.totalRaces >= 5) {
    const winRate = horse.wins / horse.totalRaces;
    if (winRate >= 0.6) { score += 10; rationale.push(`Tỷ lệ thắng ${Math.round(winRate * 100)}% — đẳng cấp competition`); }
    else if (winRate >= 0.4) { score += 5; }
  }

  const finalScore = Math.max(0, Math.min(100, score));

  // ── Map score → training phase ───────────────────────────────────────────
  if (finalScore >= 82) {
    return buildPlan('Competition Prep', finalScore, {
      weeklyKm: 42, sessions: 5, rest: 2, hi: 30, lo: 70,
      schedule: [
        { day: 'Thứ 2', type: 'Sprint Interval', distance: '4 × 200m', intensity: 'Rất cao', zone: 'Z4–Z5' },
        { day: 'Thứ 3', type: 'Recovery Trot', distance: '3000m', intensity: 'Thấp', zone: 'Z1' },
        { day: 'Thứ 4', type: 'Race-Pace Gallop', distance: '1200m', intensity: 'Cao', zone: 'Z4' },
        { day: 'Thứ 5', type: 'Nghỉ / Đi bộ nhẹ', distance: '600m', intensity: 'Nghỉ', zone: 'Z0' },
        { day: 'Thứ 6', type: 'Tempo Gallop', distance: '1600m', intensity: 'TB-Cao', zone: 'Z3' },
        { day: 'Thứ 7', type: 'Endurance Base', distance: '2400m', intensity: 'Trung bình', zone: 'Z2' },
        { day: 'CN', type: 'Nghỉ hoàn toàn', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
      ],
      rationale, warnings,
      twelveWeek: buildTwelveWeek(38, 'Competition Prep'),
    });
  }
  if (finalScore >= 65) {
    return buildPlan('Base Building', finalScore, {
      weeklyKm: 30, sessions: 4, rest: 3, hi: 20, lo: 80,
      schedule: [
        { day: 'Thứ 2', type: 'Aerobic Trot', distance: '2000m', intensity: 'Thấp-TB', zone: 'Z2' },
        { day: 'Thứ 3', type: 'Nghỉ / Đi bộ', distance: '500m', intensity: 'Nghỉ', zone: 'Z0' },
        { day: 'Thứ 4', type: 'Fartlek', distance: '1600m', intensity: 'TB-Cao', zone: 'Z3' },
        { day: 'Thứ 5', type: 'Nghỉ hoàn toàn', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
        { day: 'Thứ 6', type: 'Easy Gallop', distance: '1200m', intensity: 'Trung bình', zone: 'Z2' },
        { day: 'Thứ 7', type: 'Long Easy Run', distance: '2800m', intensity: 'Thấp', zone: 'Z1–Z2' },
        { day: 'CN', type: 'Nghỉ hoàn toàn', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
      ],
      rationale, warnings,
      twelveWeek: buildTwelveWeek(24, 'Base Building'),
    });
  }
  if (finalScore >= 42) {
    return buildPlan('Foundation', finalScore, {
      weeklyKm: 18, sessions: 3, rest: 4, hi: 10, lo: 90,
      schedule: [
        { day: 'Thứ 2', type: 'Walk + Trot', distance: '1500m', intensity: 'Rất thấp', zone: 'Z1' },
        { day: 'Thứ 3', type: 'Nghỉ', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
        { day: 'Thứ 4', type: 'Easy Trot', distance: '1200m', intensity: 'Thấp', zone: 'Z1' },
        { day: 'Thứ 5', type: 'Nghỉ', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
        { day: 'Thứ 6', type: 'Light Canter', distance: '1000m', intensity: 'Thấp', zone: 'Z2' },
        { day: 'Thứ 7', type: 'Nghỉ', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
        { day: 'CN', type: 'Nghỉ', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
      ],
      rationale, warnings,
      twelveWeek: buildTwelveWeek(14, 'Foundation'),
    });
  }
  return buildPlan('Recovery', finalScore, {
    weeklyKm: 6, sessions: 2, rest: 5, hi: 0, lo: 100,
    schedule: [
      { day: 'Thứ 2', type: 'Đi bộ nhẹ', distance: '400m', intensity: 'Rất nhẹ', zone: 'Z0' },
      { day: 'Thứ 3', type: 'Nghỉ', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
      { day: 'Thứ 4', type: 'Nghỉ', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
      { day: 'Thứ 5', type: 'Đi bộ nhẹ', distance: '400m', intensity: 'Rất nhẹ', zone: 'Z0' },
      { day: 'Thứ 6', type: 'Nghỉ', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
      { day: 'Thứ 7', type: 'Nghỉ', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
      { day: 'CN', type: 'Nghỉ', distance: '—', intensity: 'Nghỉ', zone: 'Z0' },
    ],
    rationale, warnings,
    twelveWeek: buildTwelveWeek(5, 'Recovery'),
  });
}

export function buildTwelveWeek(baseKm, phase) {
  const phases = {
    'Competition Prep': ['Nền tảng', 'Nền tảng', 'Xây dựng', 'Xây dựng', 'Xây dựng', 'Tăng cường độ', 'Tăng cường độ', 'Tăng cường độ', 'Đỉnh cao', 'Đỉnh cao', 'Taper', 'Thi đấu'],
    'Base Building': ['Khởi động', 'Xây dựng', 'Xây dựng', 'Duy trì', 'Tăng cường', 'Tăng cường', 'Nghỉ giữa kỳ', 'Tăng dần', 'Tăng dần', 'Đỉnh Base', 'Ổn định', 'Chuyển tiếp'],
    'Foundation': ['Thích nghi', 'Thích nghi', 'Xây dựng nhẹ', 'Xây dựng nhẹ', 'Duy trì', 'Duy trì', 'Phát triển', 'Phát triển', 'Ổn định', 'Ổn định', 'Đánh giá', 'Chuyển tiếp'],
    'Recovery': ['Nghỉ tích cực', 'Nghỉ tích cực', 'Phục hồi nhẹ', 'Phục hồi nhẹ', 'Đánh giá', 'Tái khởi động', 'Tái khởi động', 'Foundation nhẹ', 'Foundation nhẹ', 'Ổn định', 'Ổn định', 'Chuyển tiếp'],
  };
  const multipliers = [0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.85, 1.0, 1.05, 1.1, 0.8, 0.7];
  const focusArr = phases[phase] || phases['Foundation'];
  return Array.from({ length: 12 }, (_, i) => ({
    week: i + 1,
    focus: focusArr[i],
    volumeKm: Math.round(baseKm * multipliers[i]),
    intensityNote: i % 3 === 2 ? 'Tuần giảm tải 15%' : i >= 9 && phase === 'Competition Prep' ? 'Taper + mô phỏng đua' : 'Tăng dần 10%/tuần',
  }));
}

export function buildPlan(phase, score, opts) {
  return {
    phase, intensityScore: score,
    weeklyKm: opts.weeklyKm, sessionsPerWeek: opts.sessions, restDaysPerWeek: opts.rest,
    highIntensityPercent: opts.hi, lowIntensityPercent: opts.lo,
    weeklySchedule: opts.schedule, rationale: opts.rationale, warnings: opts.warnings,
    twelveWeekPlan: opts.twelveWeek,
  };
}
