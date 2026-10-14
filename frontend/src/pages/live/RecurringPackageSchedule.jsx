import {useEffect,useMemo,useState} from 'react';
import {TrainingPlanSelect} from './TrainingPlanSelect.jsx';
import {chooseEligiblePlan,planScheduleIssue} from '../../utils/trainingPlanChoice.js';
import {trainingService} from '../../services/trainingService.ts';
import {weekdays,packageScheduleDates,packageCalendarDays} from '../../utils/packageSchedule.js';
import {parseCalendarDate} from '../../utils/trainingCalendar.js';
const display=day=>parseCalendarDate(day).toLocaleDateString('vi-VN');

export function RecurringPackageSchedule({horseId,planId,plans=[],plansLoading=false,onPackageChange,onCreated,disabled=false}){
  const [packages,setPackages]=useState([]),[packageId,setPackageId]=useState(''),[selectedDays,setSelectedDays]=useState(['MONDAY','WEDNESDAY','FRIDAY']);
  const [plan,setPlan]=useState(planId||''),[activity,setActivity]=useState(''),[time,setTime]=useState('07:00');
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[retry,setRetry]=useState(0);
  const pack=packages.find(item=>String(item.horsePackageId)===packageId);
  const dates=useMemo(()=>packageScheduleDates(pack,selectedDays),[pack,selectedDays]);
  useEffect(()=>{setPlan(current=>chooseEligiblePlan(plans,dates,current,planId));},[plans,dates,planId]);
  const planIssue=planScheduleIssue(plans.find(item=>String(item.planId)===String(plan)),dates);
  useEffect(()=>{let active=true;setLoading(true);setPackages([]);setPackageId('');setError('');onPackageChange(null);
    trainingService.schedulingPackages(Number(horseId)).then(list=>{if(active){setPackages(list);setPackageId(String(list[0]?.horsePackageId||''));}}).catch(e=>active&&setError(e.message)).finally(()=>active&&setLoading(false));
    return()=>{active=false;};
  },[horseId,retry,onPackageChange]);
  useEffect(()=>{onPackageChange(pack||null);},[pack,onPackageChange]);
  return <form className="bg-white border rounded-xl p-4 space-y-4" onSubmit={async e=>{
    e.preventDefault();if(busy||loading||plansLoading||disabled)return;setError('');setNotice('');
    if(!pack||!dates.length){setError('Chọn gói đang áp dụng và ít nhất một thứ có ngày tập trong gói.');return;}
    if(planIssue){setError(planIssue);return;}
    if(!activity.trim()){setError('Nhập tên hoạt động tập.');return;}
    setBusy(true);
    try{
      const created=await trainingService.createRecurringSchedule({planId:Number(plan),horseId:Number(horseId),horsePackageId:pack.horsePackageId,activityName:activity.trim(),daysOfWeek:selectedDays,sessionTime:time});
      await onCreated(created);
      setNotice('Đã tạo '+created.length+' buổi cho gói '+pack.packageName+', từ '+display(pack.startDate)+' đến '+display(pack.endDate)+'. Lịch đã được tải lại.');
    }catch(e){setError(e.message||'Không tạo được lịch.');}finally{setBusy(false);}
  }}>
    <h2 className="text-lg font-bold">Xếp lịch theo tuần của gói đã đăng ký</h2>
    {loading&&<p role="status">Đang lấy gói áp dụng từ máy chủ...</p>}
    {!loading&&!packages.length&&<p>Chưa có gói ACTIVE đã thanh toán với ngày bắt đầu và kết thúc hợp lệ. Chủ ngựa cần đăng ký và thanh toán gói trước khi xếp lịch lặp.</p>}
    <button type="button" disabled={busy||loading||disabled} onClick={()=>setRetry(n=>n+1)}>Tải lại gói áp dụng</button>
    <fieldset disabled={disabled||busy||loading||!packages.length} className="space-y-4">
      <label className="block">Gói áp dụng<select className="block w-full border rounded p-2" required value={packageId} onChange={e=>{setPackageId(e.target.value);setNotice('');}}><option value="">Chọn gói</option>{packages.map(item=><option key={item.horsePackageId} value={item.horsePackageId}>{item.packageName} · {display(item.startDate)} – {display(item.endDate)}</option>)}</select></label>
      {pack&&<div className="border rounded-xl p-3 bg-amber-50"><p className="font-bold">Áp dụng gói: {pack.packageName}</p><p>Từ {display(pack.startDate)} đến {display(pack.endDate)} · {packageCalendarDays(pack)} ngày (tính cả hai đầu).</p><p className="text-sm">Khoảng ngày cố định theo gói đã đăng ký; không nhập số tuần tùy ý.</p></div>}
      <TrainingPlanSelect plans={plans} value={String(plan)} onChange={setPlan} dates={dates} loading={plansLoading}/>
      <p className="text-sm">Chỉ chọn kế hoạch hoạt động bao phủ đủ các ngày tập xem trước. Kế hoạch mới tạo được tự chọn.</p>
      <label className="block">Hoạt động<input className="block w-full border rounded p-2" required maxLength="1000" value={activity} onChange={e=>setActivity(e.target.value)}/></label>
      <fieldset className="border rounded p-3"><legend>Lặp vào các thứ</legend><div className="flex flex-wrap gap-3">{weekdays.map(([value,label])=><label key={value} className="flex items-center gap-2"><input type="checkbox" checked={selectedDays.includes(value)} onChange={e=>setSelectedDays(days=>e.target.checked?[...days,value]:days.filter(day=>day!==value))}/>{label}</label>)}</div></fieldset>
      <label className="block">Giờ tập<input className="block border rounded p-2" type="time" required value={time} onChange={e=>setTime(e.target.value)}/></label>
      <section aria-label="Xem trước các ngày tập"><h3 className="font-bold">Xem trước: {dates.length} buổi tập</h3><p className="text-sm">Số ngày áp dụng gói khác số buổi tập; chỉ tạo buổi vào những thứ đã chọn.</p><div className="flex flex-wrap gap-2 mt-2" style={{maxHeight:'14rem',overflowY:'auto'}}>{dates.map(day=><span className="border rounded px-2 py-1" key={day}>{display(day)} · {time}</span>)}</div></section>
      <button type="submit" data-tone="gold" disabled={!dates.length||Boolean(planIssue)||plansLoading}>{busy?'Đang tạo...':'Tạo '+dates.length+' buổi theo gói'}</button>
    </fieldset>
    {error&&<p role="alert" className="text-red-700">{error}</p>}{notice&&<p role="status" className="text-green-700">{notice}</p>}
  </form>;
}
