import { blankStage, validateRoadmap, type PackageRoadmap } from './packageRoadmap';
import { DAY_KEYS, seconds, type RoadmapStage } from './trainingSchedule';
export const PACKAGE_DURATIONS: Record<string, readonly number[]> = {
  RACING: [90,180], BASIC: [30,60,90], PERFORMANCE: [30,60,90], RECOVERY: [30,60],
};
export type FieldErrors = Record<string,string>;
export function copyStage(stage: RoadmapStage): RoadmapStage {
  return {...stage,daysOfWeek:[...stage.daysOfWeek]};
}
export function copyRoadmap(roadmap: PackageRoadmap): PackageRoadmap {
  // A new package owns a new template, not the source's ID or revision.
  return {title:roadmap.title,goal:roadmap.goal,stages:roadmap.stages.map(copyStage)};
}
export function packageInfoErrors(d:{name:string;description:string;price:number;packageType?:string;durationDays:number}):FieldErrors {
  const e:FieldErrors={};
  if(!d.name.trim()||d.name.length>100)e.name='Enter a package name, up to 100 characters.';
  if(d.description.length>500)e.description='Description cannot exceed 500 characters.';
  if(!Number.isFinite(d.price)||d.price<0||d.price>=10000000000||Math.abs(Math.round(d.price*100)-d.price*100)>0.0001)e.price='Enter a non-negative price with up to 10 integer digits and 2 decimal places.';
  if(!PACKAGE_DURATIONS[d.packageType || ''])e.packageType='Select a package type.';
  if(!PACKAGE_DURATIONS[d.packageType || '']?.includes(d.durationDays))e.durationDays='Select one of the durations available for this package type.';
  return e;
}
export function stageDraftErrors(value:PackageRoadmap,duration:number):{fields:FieldErrors;stages:FieldErrors[]} {
  const fields:FieldErrors={};
  if(!value.title.trim()||value.title.length>150)fields.title='Enter a roadmap title, up to 150 characters.';
  if(!value.goal.trim()||value.goal.length>500)fields.goal='Enter a roadmap goal, up to 500 characters.';
  if(!value.stages.length||value.stages.length>100)fields.stages='Provide 1-100 stages.';
  const stages=value.stages.map((s,i)=>{
    const e:FieldErrors={};const previous=value.stages[i-1];
    if(!s.title?.trim()||(s.title?.length||0)>150)e.title='Enter a stage name, up to 150 characters.';
    if(!s.phaseCode?.trim()||(s.phaseCode?.length||0)>50)e.metadata='This source stage has incomplete phase metadata. Choose another source or create this stage manually.';
    if((s.objective?.length||0)>1000)e.objective='Objective cannot exceed 1000 characters.';
    if(!s.activityName.trim()||s.activityName.length>500)e.activityName='Enter an activity, up to 500 characters.';
    if(!Number.isInteger(s.startDay)||s.startDay<1)e.startDay='Start day must be a positive integer.';
    if(!Number.isInteger(s.endDay)||s.endDay<s.startDay)e.endDay='End day must be an integer on or after the start day.';
    if(s.endDay>duration)e.endDay='This stage extends beyond the selected package duration.';
    if(previous&&s.startDay<=previous.endDay)e.startDay='Stage dates must follow the displayed order without overlap.';
    if(!s.daysOfWeek.length||s.daysOfWeek.length>6||new Set(s.daysOfWeek).size!==s.daysOfWeek.length||s.daysOfWeek.some(d=>!DAY_KEYS.includes(d)))e.daysOfWeek='Select 1-6 distinct training days.';
    try{seconds(s.sessionTime);}catch{e.sessionTime='Enter a valid start time.';}
    try{seconds(s.sessionEndTime);}catch{e.sessionEndTime='Enter a valid end time.';}
    if(!e.sessionTime&&!e.sessionEndTime&&seconds(s.sessionEndTime)<=seconds(s.sessionTime))e.sessionEndTime='End time must be later on the same day.';
    if(!['LOW','MODERATE','HIGH'].includes(s.intensity))e.intensity='Select an intensity.';
    return e;
  });
  if(!Object.keys(fields).length&&!stages.some(e=>Object.keys(e).length)) {
    const calendar=validateRoadmap(value,duration);
    if(calendar) {fields.calendar=calendar;stages.forEach(e=>{e.daysOfWeek=calendar;});}
  }
  return {fields,stages};
}
export function draftHasContent(r:PackageRoadmap):boolean {return !!(r.title||r.goal||r.stages.length);}
export interface MoveRow {sourceIndex:number;title:string;oldStart:number;oldEnd:number;newStart:number;newEnd:number;gapBefore:number;duration:number}
export function proposeStageMove(stages:RoadmapStage[],from:number,to:number):{stages:RoadmapStage[];rows:MoveRow[]} {
  if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=stages.length||to>=stages.length)throw Error('Choose a valid stage position.');
  const entries=stages.map((stage,i)=>{
    const gap=stage.startDay-(i?stages[i-1].endDay:0)-1;
    const duration=stage.endDay-stage.startDay+1;
    if(!Number.isInteger(gap)||gap<0||!Number.isInteger(duration)||duration<1)throw Error('Correct the stage date order and overlaps before rearranging.');
    return {stage,sourceIndex:i,gap,duration};
  });
  const [entry]=entries.splice(from,1);entries.splice(to,0,entry);
  let end=0;const rows:MoveRow[]=[];
  const result=entries.map(e=>{
    const start=end+e.gap+1;end=start+e.duration-1;
    rows.push({sourceIndex:e.sourceIndex,title:e.stage.title||'Untitled stage',oldStart:e.stage.startDay,oldEnd:e.stage.endDay,newStart:start,newEnd:end,gapBefore:e.gap,duration:e.duration});
    return {...copyStage(e.stage),startDay:start,endDay:end};
  });
  return {stages:result,rows};
}
export function appendStage(stages:RoadmapStage[],source?:RoadmapStage):RoadmapStage[] {
  const start=(stages.at(-1)?.endDay||0)+1;
  const next=source?{...copyStage(source),startDay:start,endDay:start+source.endDay-source.startDay}:blankStage(start,start+6);
  return [...stages,next];
}
export function uncoveredDays(stages:RoadmapStage[],duration:number):{start:number;end:number}[] {
  if(!Number.isInteger(duration)||duration<1)return [];
  let next=1;const gaps:{start:number;end:number}[]=[];
  for(const s of [...stages].sort((a,b)=>a.startDay-b.startDay)) {
    if(!Number.isInteger(s.startDay)||!Number.isInteger(s.endDay)||s.endDay<s.startDay)continue;
    if(s.startDay>next&&next<=duration)gaps.push({start:next,end:Math.min(duration,s.startDay-1)});
    next=Math.max(next,s.endDay+1);
  }
  if(next<=duration)gaps.push({start:next,end:duration});return gaps;
}
