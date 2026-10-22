import { addDays, diffDays, validDate, parseD, type SessionDraft } from './trainingLogic';

export const DAY_KEYS = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
export interface RoadmapStage {
  stageId?: string; startDay: number; endDay: number; activityName: string;
  intensity: string; daysOfWeek: string[]; sessionTime: string; sessionEndTime: string;
  title?: string; objective?: string;
}
export function clockSeconds(value: string): number {
  const m = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!m || +m[1]>23 || +m[2]>59 || +(m[3]||0)>59) throw new Error('Enter a valid session time.');
  return +m[1]*3600 + +m[2]*60 + +(m[3]||0);
}
export function clockText(seconds: number): string {
  if (seconds < 0 || seconds >= 86400) throw new Error('Session must end within the same day. Choose an earlier start time.');
  return [Math.floor(seconds/3600),Math.floor(seconds%3600/60),seconds%60].map(n=>String(n).padStart(2,'0')).join(':');
}
export function normalizeStage(s: any): RoadmapStage {
  return {stageId:s.stage_id ?? s.stageId, startDay:Number(s.start_day ?? s.startDay),endDay:Number(s.end_day ?? s.endDay),activityName:s.activity_name ?? s.activityName,
    intensity:s.intensity,daysOfWeek:typeof s.weekdays_json==='string'?JSON.parse(s.weekdays_json):s.daysOfWeek,
    sessionTime:s.session_time ?? s.sessionTime,sessionEndTime:s.session_end_time ?? s.sessionEndTime,title:s.title,objective:s.objective};
}
export function selectStages(raw: any[], choice: {weekdays?:number[]; time?:string; workload?:string} = {}): RoadmapStage[] {
  if (!raw.length) throw new Error('No saved roadmap stages are available.');
  const intensity = choice.workload ? ({Low:'LOW',Medium:'MODERATE',High:'HIGH'} as Record<string,string>)[choice.workload] : undefined;
  if(choice.workload&&!intensity)throw new Error('Select a valid training intensity.');
  return raw.map(normalizeStage).map(s=>{
    const duration=clockSeconds(s.sessionEndTime)-clockSeconds(s.sessionTime);
    if(duration<=0)throw new Error('Session end time must be after its start time.');
    const start=clockSeconds(choice.time ?? s.sessionTime);
    const days=choice.weekdays ? choice.weekdays.map(d=>DAY_KEYS[d]) : s.daysOfWeek;
    if(!Array.isArray(days)||days.length<1||days.length>6||new Set(days).size!==days.length||days.some(d=>!DAY_KEYS.includes(d)))throw new Error('Select 1–6 distinct weekdays.');
    return {...s,intensity:intensity ?? s.intensity,daysOfWeek:days,sessionTime:clockText(start),sessionEndTime:clockText(start+duration)};
  });
}
export function buildStageSchedule(raw: any[], start: string, end: string): SessionDraft[] {
  if(!validDate(start)||!validDate(end)||diffDays(start,end)<0)throw new Error('Invalid package term.');
  const span=diffDays(start,end)+1, output:SessionDraft[]=[];
  let last=0;
  for(const s of selectStages(raw)){
    if(!Number.isInteger(s.startDay)||!Number.isInteger(s.endDay)||s.startDay<=last||s.endDay<s.startDay||s.endDay>span)throw new Error('Roadmap stages must be ordered, non-overlapping and within the package term.');
    last=s.endDay;
    for(let n=s.startDay;n<=s.endDay;n++){
      const date=addDays(start,n-1);
      if(s.daysOfWeek.includes(DAY_KEYS[parseD(date).getDay()]))output.push({date,time:s.sessionTime,endTime:s.sessionEndTime,type:s.activityName,intensity:s.intensity,stageId:s.stageId,stageTitle:s.title || `Days ${s.startDay}–${s.endDay}`,distance:'',targetTime:'',notes:s.objective||''});
    }
  }
  return output;
}
export function singleStageSession(raw:any[], start:string, end:string, date:string, time:string): SessionDraft {
  if(!validDate(date)||diffDays(start,date)<0||diffDays(date,end)<0)throw new Error('Session date is outside the package term.');
  const day=diffDays(start,date)+1;
  const stages=raw.map(normalizeStage).filter(s=>day>=s.startDay&&day<=s.endDay);
  if(stages.length!==1)throw new Error('Session date must belong to exactly one saved roadmap stage.');
  const s=selectStages(stages,{time})[0];
  return {date,time:s.sessionTime,endTime:s.sessionEndTime,type:s.activityName,intensity:s.intensity,stageId:s.stageId,stageTitle:s.title,distance:'',targetTime:'',notes:s.objective||''};
}
