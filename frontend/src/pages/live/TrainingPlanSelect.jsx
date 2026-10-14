import {planScheduleIssue} from '../../utils/trainingPlanChoice.js';
import {parseCalendarDate} from '../../utils/trainingCalendar.js';
const dateLabel=value=>value?parseCalendarDate(value).toLocaleDateString('vi-VN'):'Không giới hạn';
export function TrainingPlanSelect({plans=[],value,onChange,dates=[],loading=false,disabled=false}){
  const eligible=plans.filter(plan=>!planScheduleIssue(plan,dates));
  return <div className="space-y-2"><label className="block">Kế hoạch huấn luyện<select aria-label="Kế hoạch huấn luyện" className="block w-full border rounded p-2" required disabled={disabled||loading||!plans.length} value={value} onChange={e=>onChange(e.target.value)}><option value="">{loading?'Đang tải kế hoạch...':'Chọn kế hoạch'}</option>{plans.map(plan=>{const issue=planScheduleIssue(plan,dates);return <option key={plan.planId} value={plan.planId} disabled={Boolean(issue)}>{plan.planName} · {dateLabel(plan.startDate)} – {dateLabel(plan.endDate)}{issue?' · '+issue:''}</option>;})}</select></label>
    {!loading&&!plans.length&&<p className="text-amber-800">Ngựa chưa có kế hoạch. Hãy tạo kế hoạch ở phần bên cạnh trước.</p>}
    {!loading&&plans.length>0&&!eligible.length&&<p className="text-amber-800">Chưa có kế hoạch hoạt động bao phủ đủ ngày tập. Hãy tạo kế hoạch mới với khoảng ngày phù hợp.</p>}
    {plans.some(plan=>planScheduleIssue(plan,dates))&&<p className="text-sm">Kế hoạch không phù hợp bị vô hiệu hóa và có ghi lý do trong danh sách.</p>}
  </div>;
}
