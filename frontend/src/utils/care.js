import { RATIONS } from '../data/care';
import { CARE_LABELS } from '../data/constants';
import { needsTreatment } from './horse';

export function isLow(i) { return i.qty <= i.threshold; }

export function dailyTasks(h) {
  const ration = RATIONS[h.id];
  const defTime = { Sáng: '06:00', Trưa: '12:00', Tối: '18:00' };
  const meals = (['Sáng', 'Trưa', 'Tối']).map(m => {
    const r = ration?.meals.find(x => x.meal === m);
    return { key: `feed-${m}`, icon: '🌾', label: CARE_LABELS[`feed-${m}`], time: r?.time || defTime[m], desc: r ? `${r.grain} kg ngũ cốc · ${r.hay} kg cỏ${r.vitamin ? ` · ${r.vitamin} gói ${r.vitaminName}` : ''}` : 'Chưa có khẩu phần được duyệt' };
  });
  const chores = [
    { key: 'clean', icon: '🧽', label: CARE_LABELS.clean, time: '08:00', desc: 'Dọn phân, thay rơm mới, khử trùng nền chuồng' },
    { key: 'bath', icon: '🚿', label: CARE_LABELS.bath, time: '09:00', desc: 'Tắm, lau khô, chải lông' },
    { key: 'ice', icon: '🧊', label: CARE_LABELS.ice, time: '10:00', desc: 'Ngâm chân nước đá khoảng 20 phút, kiểm tra sưng nóng' },
  ];
  const treat = needsTreatment(h) ? [{ key: 'treat', icon: '🩹', label: CARE_LABELS.treat, time: '16:00', desc: 'Thực hiện theo hướng dẫn của Thú y' }] : [];
  return [...meals, ...chores, ...treat].sort((a, b) => a.time.localeCompare(b.time));
}
