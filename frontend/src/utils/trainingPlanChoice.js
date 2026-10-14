export function planScheduleIssue(plan,dates=[]){
  if(!plan)return 'Chọn kế hoạch huấn luyện.';
  if(plan.status!=='ACTIVE'||plan.horsePlanStatus!=='ACTIVE')return 'Kế hoạch hoặc liên kết với ngựa chưa hoạt động.';
  if(dates.some(day=>(plan.startDate&&day<plan.startDate)||(plan.endDate&&day>plan.endDate)))return 'Không bao phủ đủ các ngày tập đã chọn.';
  return '';
}
export function chooseEligiblePlan(plans,dates,currentId,preferredId){
  const eligible=plans.filter(plan=>!planScheduleIssue(plan,dates));
  return String(eligible.find(plan=>String(plan.planId)===String(preferredId))?.planId??eligible.find(plan=>String(plan.planId)===String(currentId))?.planId??eligible[0]?.planId??'');
}
