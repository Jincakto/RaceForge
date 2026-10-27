import type { TrainingSession } from './data';
import { clock, seconds, isoDay, scheduleRows, trainingStart, validateSessionWindow, type RoadmapStage } from './trainingSchedule';
import { trainingTimestamp } from './trainingTimestamp';
export interface PreviewSession { key:string; stageIndex:number; date:string; time:string; endTime:string; type:string; distance:string; targetTime:string; notes:string }
export interface PreviewContext {planId:string;horseId:string;trainerId:string;startDate:string;endDate:string;stages:RoadmapStage[];sessions:TrainingSession[];now:Date;horsePackageId?:string;packagePlanIds?:string[];sessionLimit?:number}
export function dayText(iso:string){return isoDay(iso).split('-').reverse().join('/');}
function addDays(iso:string,count:number){const d=new Date(isoDay(iso)+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+count);return d.toISOString().slice(0,10);}
export function stageWindow(context:PreviewContext,index:number){const stage=context.stages[index];if(!stage)return null;return {start: addDays(context.startDate,stage.startDay-1),end:addDays(context.startDate,stage.endDay-1)};}
export function persistedRow(row:Pick<PreviewSession,'date'|'time'|'endTime'>,context:PreviewContext){return context.sessions.find(s=>s.planId===context.planId&&s.horseId===context.horseId&&isoDay(s.date)===isoDay(row.date)&&s.time.slice(0,5)===row.time.slice(0,5)&&s.endTime?.slice(0,5)===row.endTime.slice(0,5)&&['Scheduled','Completed','In Progress'].includes(s.status));}
function virtual(row:PreviewSession,c:PreviewContext):TrainingSession {return {id:'preview-'+row.key,horseId:c.horseId,planId:c.planId,trainerId:c.trainerId,date:row.date,time:row.time,endTime:row.endTime,status:'Scheduled'} as TrainingSession;}
export function rowProblem(row:PreviewSession,rows:PreviewSession[],c:PreviewContext):string {
 if(persistedRow(row,c))return '';
 const window=stageWindow(c,row.stageIndex);if(!window)return 'Choose a saved roadmap stage.';
 if(isoDay(row.date)<window.start||isoDay(row.date)>window.end)return 'Date must remain within this stage: '+dayText(window.start)+' - '+dayText(window.end)+'.';
 const peers=rows.filter(r=>r.key!==row.key&&!persistedRow(r,c));
 const error=validateSessionWindow({date:row.date,time:row.time,endTime:row.endTime,startDate:c.startDate,endDate:c.endDate,horseId:c.horseId,trainerId:c.trainerId},[...c.sessions,...peers.map(r=>virtual(r,c))],c.now);
 if(error)return error;
 if(c.sessions.some(s=>s.horseId===c.horseId&&isoDay(s.date)===isoDay(row.date)&&s.time.slice(0,5)===row.time.slice(0,5)))return 'This start time already exists for this horse. Choose another time.';
 return '';
}
export function templatePreview(c:PreviewContext):PreviewSession[] {
 return c.stages.flatMap((stage,stageIndex)=>scheduleRows([stage],c.startDate).filter(r=>trainingStart(r.date,r.time)>c.now).map((r,i)=>({...r,key:'stage-'+stageIndex+'-'+i,stageIndex})));
}
export function suggestFreeSlot(row:PreviewSession,rows:PreviewSession[],c:PreviewContext,businessStart='07:00',businessEnd='19:00'):PreviewSession|null {
 const window=stageWindow(c,row.stageIndex);if(!window)return null;
 let span:number,start:number,end:number;try{span=seconds(row.endTime)-seconds(row.time);start=seconds(businessStart);end=seconds(businessEnd);}catch{return null;}
 if(span<=0||start>=end||span>end-start)return null;
 const first=[window.start,isoDay(c.startDate),trainingTimestamp(c.now).slice(0,10)].sort().at(-1)!;
 const last=[window.end,isoDay(c.endDate)].sort()[0];if(first>last)return null;
 const dates:string[]=[];for(let day=first;day<=last;day=addDays(day,1))dates.push(day);
 const preferred=isoDay(row.date);dates.sort((a,b)=>Number(b===preferred)-Number(a===preferred)||a.localeCompare(b));
 const times:number[]=[];for(let t=start;t+span<=end;t+=15*60)times.push(t);
 // Preserve a valid preferred start even if it is not aligned to a quarter-hour.
 try{const t=seconds(row.time);if(t>=start&&t+span<=end&&!times.includes(t))times.push(t);}catch{}
 times.sort((a,b)=>Math.abs(a-seconds(row.time))-Math.abs(b-seconds(row.time))||a-b);
 const occupied=new Set([...c.sessions.filter(s=>s.horseId===c.horseId&&s.status!=='Cancelled').map(s=>isoDay(s.date)),...rows.filter(r=>r.key!==row.key).map(r=>isoDay(r.date))]);
 for(const date of dates.filter(day=>!occupied.has(day)))for(const time of times){const candidate={...row,date:dayText(date),time:clock(time).slice(0,5),endTime:clock(time+span).slice(0,5)};if(!persistedRow(candidate,c)&&!rowProblem(candidate,rows,c))return candidate;}
 return null;
}
export function suggestConflicts(rows:PreviewSession[],c:PreviewContext,start='07:00',end='19:00') {
 let result=rows.map(r=>({...r}));let changed=0;const unresolved:string[]=[];
 for(let i=0;i<result.length;i++)if(rowProblem(result[i],result,c)){const suggestion=suggestFreeSlot(result[i],result,c,start,end);if(suggestion){result[i]=suggestion;changed++;}else unresolved.push(result[i].key);}
 return {rows:result,changed,unresolved};
}

/** Frontend package allowance: one session per day of package duration, not one per calendar date. */
export function sessionCapacity(rows:PreviewSession[],c:PreviewContext){
 const termDays=Math.round((Date.parse(isoDay(c.endDate))-Date.parse(isoDay(c.startDate)))/86400000)+1;
 const limit=Number.isInteger(c.sessionLimit)&&c.sessionLimit!>=0?c.sessionLimit!:Number.isFinite(termDays)?Math.max(0,termDays):0;
 const ids=new Set(c.packagePlanIds||[c.planId]);ids.add(c.planId);
 const saved=new Map(c.sessions.filter(s=>s.horseId===c.horseId&&s.status!=='Cancelled'&&(c.horsePackageId&&s.horsePackageId?s.horsePackageId===c.horsePackageId:ids.has(s.planId))).map(s=>[s.id,s]));
 const drafts=rows.filter(r=>!persistedRow(r,c)).length;
 return {limit,saved:saved.size,drafts,remaining:Math.max(0,limit-saved.size-drafts),exceeds:saved.size+drafts>limit};
}
