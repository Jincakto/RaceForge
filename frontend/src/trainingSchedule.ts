import { trainingTimestamp } from './trainingTimestamp';
import type { TrainingSession, TrainingPlan } from './data';
export interface RoadmapStage { startDay:number; endDay:number; daysOfWeek:string[]; sessionTime:string; sessionEndTime:string; activityName:string; intensity:string; title?:string; objective?:string; phaseCode?:string }
export interface ScheduleRow { date:string; time:string; endTime:string; type:string; intensity:string; title:string; notes:string; distance:string; targetTime:string }
export const DAY_KEYS=['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
export function normalizeStages(rows:any[]):RoadmapStage[] {
 return rows.map(s=>({...s,startDay:Number(s.startDay??s.start_day),endDay:Number(s.endDay??s.end_day),daysOfWeek:typeof s.weekdays_json==='string'?JSON.parse(s.weekdays_json):s.daysOfWeek,sessionTime:String(s.sessionTime??s.session_time).slice(0,8),sessionEndTime:String(s.sessionEndTime??s.session_end_time).slice(0,8),activityName:s.activityName??s.activity_name,phaseCode:s.phaseCode??s.phase_code}));
}
export function seconds(time:string):number { if(!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time))throw Error('Enter a valid training time.');const [h,m,s=0]=time.split(':').map(Number);return h*3600+m*60+s; }
export function clock(n:number):string { if(n<0||n>=86400)throw Error('The session must end on the same day. Choose an earlier start time.');return [Math.floor(n/3600),Math.floor(n%3600/60),n%60].map(v=>String(v).padStart(2,'0')).join(':'); }
export function selectedStages(rows:any[],days?:number[],time?:string,intensity?:string):RoadmapStage[] {
 if(!rows.length)throw Error('No roadmap stages are available.');
 if(days&&(days.length<1||days.length>6||new Set(days).size!==days.length||days.some(d=>!Number.isInteger(d)||d<0||d>6)))throw Error('Select 1-6 distinct training days.');
 return normalizeStages(rows).map(s=>{const duration=seconds(s.sessionEndTime)-seconds(s.sessionTime);if(duration<=0)throw Error('Session end time must be after its start time.');const start=seconds(time??s.sessionTime);return {...s,daysOfWeek:days?days.map(d=>DAY_KEYS[d]):s.daysOfWeek,sessionTime:clock(start),sessionEndTime:clock(start+duration),intensity:intensity??s.intensity};});
}
function dateAt(iso:string,offset=0){const d=new Date(iso.slice(0,10)+'T12:00:00');d.setDate(d.getDate()+offset);return d;}
function text(d:Date){return [d.getDate(),d.getMonth()+1,d.getFullYear()].map((v,i)=>i<2?String(v).padStart(2,'0'):v).join('/');}
export function isoDay(day:string){return day.includes('/')?day.split('/').reverse().join('-'):day.slice(0,10);}
export function scheduleRows(stages:any[],start:string):ScheduleRow[] {
 return normalizeStages(stages).flatMap(s=>{const result:ScheduleRow[]=[];for(let day=s.startDay;day<=s.endDay;day++){const date=dateAt(isoDay(start),day-1);if(s.daysOfWeek.includes(DAY_KEYS[date.getDay()]))result.push({date:text(date),time:s.sessionTime.slice(0,5),endTime:s.sessionEndTime.slice(0,5),type:s.activityName,intensity:s.intensity,title:s.title||'',notes:s.objective||'',distance:'',targetTime:''});}return result;});
}
export function packageSessions(sessions:TrainingSession[],plans:TrainingPlan[],packageId:string){const ids=new Set(plans.filter(p=>p.horsePackageId===packageId).map(p=>p.id));return sessions.filter(s=>s.horsePackageId?s.horsePackageId===packageId:ids.has(s.planId));}
export function validateSessionWindow(input:{date:string;time:string;endTime:string;startDate:string;endDate:string;horseId:string;trainerId:string;excludeId?:string},sessions:TrainingSession[],now=new Date()):string {
 const day=isoDay(input.date);const start=trainingStart(day,input.time),end=trainingStart(day,input.endTime);
 try {if(seconds(input.endTime)<=seconds(input.time))return 'End time must be after start time on the same day.';}catch(e){return (e as Error).message;}
 if(!Number.isFinite(start.getTime())||trainingTimestamp(start).slice(0,10)!==day)return 'Enter a valid date.';
 if(day<isoDay(input.startDate)||day>isoDay(input.endDate))return 'Choose a date within the package period.';
 if(start<=now)return 'The session must start in the future.';
 const live=sessions.filter(s=>s.id!==input.excludeId&&['Scheduled','Completed','In Progress'].includes(s.status));
 const clash=live.find(s=>{if(s.date!==input.date||!(s.horseId===input.horseId||s.trainerId===input.trainerId))return false;return !s.endTime||(input.time<s.endTime&&input.endTime>s.time);});
 if(clash)return clash.horseId===input.horseId?'This time overlaps another session for the horse.':'This time overlaps another session for the trainer.';
 const monday=dateAt(day);monday.setDate(monday.getDate()-(monday.getDay()+6)%7);const sunday=new Date(monday);sunday.setDate(sunday.getDate()+6);
 const dates=new Set(live.filter(s=>s.horseId===input.horseId&&dateAt(isoDay(s.date))>=monday&&dateAt(isoDay(s.date))<=sunday).map(s=>s.date));dates.add(input.date);
 return dates.size>6?'A horse may train on at most six distinct days per week.':'';
}

/** Session wall times are Bangkok local time, not the browser's timezone. */
export function trainingStart(date:string,time:string){return new Date(isoDay(date)+'T'+(time.length===5?time+':00':time)+'+07:00');}
export function futureSchedule<T extends {date:string;time:string}>(rows:T[],now=new Date()){return rows.filter(row=>trainingStart(row.date,row.time).getTime()>now.getTime());}
export function scheduleWarning(rows:{date:string;time:string}[],now=new Date()){
 if(!rows.length)return '';
 const future=futureSchedule(rows,now).length;
 return future===0?'No future sessions remain. You can adjust the stages before generating sessions.':future<rows.length?'Some scheduled times have passed. Only future sessions will be generated.':'';
}
