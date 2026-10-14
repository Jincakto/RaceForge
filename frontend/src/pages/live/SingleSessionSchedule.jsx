import {useEffect,useMemo,useState} from 'react';
import {TrainingPlanSelect} from './TrainingPlanSelect.jsx';
import {chooseEligiblePlan,planScheduleIssue} from '../../utils/trainingPlanChoice.js';
import {trainingService} from '../../services/trainingService.ts';
export function SingleSessionSchedule({horseId,plans=[],preferredPlanId,plansLoading=false,scheduledTime,onCreated,disabled=false}){
  const [planId,setPlanId]=useState(''),[time,setTime]=useState(scheduledTime),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const dates=useMemo(()=>time?[time.slice(0,10)]:[],[time]);
  useEffect(()=>{setTime(scheduledTime);},[scheduledTime]);
  useEffect(()=>{setPlanId(current=>chooseEligiblePlan(plans,dates,current,preferredPlanId));},[plans,dates,preferredPlanId]);
  const selected=plans.find(plan=>String(plan.planId)===planId);
  const issue=planScheduleIssue(selected,dates);
  return <form className="bg-white border rounded-xl p-4 space-y-3" onSubmit={async e=>{
    e.preventDefault();if(disabled||busy||plansLoading)return;setError('');setNotice('');
    if(issue){setError(issue);return;}setBusy(true);
    try{const next=await trainingService.createSingleSchedule({planId:Number(planId),horseId:Number(horseId),scheduledTime:time});await onCreated(next);setNotice('Đã xếp buổi tập theo kế hoạch '+selected.planName+'.');}catch(e){setError(e.message);}finally{setBusy(false);}
  }}><h2 className="text-lg font-bold">Xếp một buổi tập</h2><fieldset className="space-y-3" disabled={disabled||busy||plansLoading}>
    <TrainingPlanSelect plans={plans} value={planId} onChange={setPlanId} dates={dates} loading={plansLoading}/>
    <label className="block">Ngày giờ tập<input className="block w-full border rounded p-2" type="datetime-local" required value={time} onChange={e=>setTime(e.target.value)}/></label>
    <button type="submit" data-tone="primary" disabled={Boolean(issue)||!time}>{busy?'Đang lưu...':'Xếp buổi tập'}</button>
  </fieldset>{error&&<p role="alert" className="text-red-700">{error}</p>}{notice&&<p role="status" className="text-green-700">{notice}</p>}</form>;
}
