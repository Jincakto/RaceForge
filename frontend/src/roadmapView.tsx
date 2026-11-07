import { useEffect, useState } from 'react';
import { ApiError, request, idPath } from './api';
import { Btn, Input, Select, Textarea } from './ui';
import { blankStage, roadmapFromApi, type PackageRoadmap } from './packageRoadmap';
import { DAY_KEYS, type RoadmapStage } from './trainingSchedule';
const dayLabel = (day: string) => day.slice(0,3).toLowerCase().replace(/^./, c => c.toUpperCase());
const days = [...DAY_KEYS.slice(1), DAY_KEYS[0]];
export function RoadmapTable({ roadmap }: { roadmap: PackageRoadmap }) {
  return <div className="space-y-3">
    <div><h4 className="font-semibold text-[#0f1729]">{roadmap.title}</h4><p className="text-sm text-gray-600">{roadmap.goal}</p>{roadmap.revision != null && <p className="text-xs text-gray-500">Revision {roadmap.revision}</p>}</div>
    {!roadmap.stages.length ? <p className="text-sm text-gray-500">No stages have been configured for this package.</p> : <div className="overflow-x-auto rounded-lg border border-gray-200"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-xs text-gray-600"><tr>{['Stage / days','Objective','Activity','Intensity','Training days','Time'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{[...roadmap.stages].sort((a,b)=>a.startDay-b.startDay).map((s,i)=><tr key={i} className="border-t border-gray-100 align-top"><td className="p-3"><b>{s.title}</b><div className="whitespace-nowrap text-xs text-gray-500">Day {s.startDay}-{s.endDay}</div></td><td className="p-3">{s.objective || '—'}</td><td className="p-3">{s.activityName || '—'}</td><td className="p-3">{s.intensity}</td><td className="p-3">{days.filter(d=>s.daysOfWeek?.includes(d)).map(dayLabel).join(', ') || '—'}</td><td className="whitespace-nowrap p-3">{s.sessionTime?.slice(0,5)}-{s.sessionEndTime?.slice(0,5)}</td></tr>)}</tbody></table></div>}
  </div>;
}
function LoadedRoadmap({ packageId }: { packageId: string }) {
  const [data,setData]=useState<PackageRoadmap | null>(null);
  const [error,setError]=useState(''); const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let active=true; setData(null); setError('');
    request(`/training-packages/${idPath(packageId)}/roadmap-template`).then(value=>{if(active)setData(roadmapFromApi(value));}).catch(e=>{if(active)setError(e instanceof ApiError && e.status===403 ? 'Your account cannot view this package curriculum.' : (e as Error).message);});
    return ()=>{active=false;};
  },[packageId,attempt]);
  if(error)return <div role="alert" className="space-y-2 text-sm text-red-700"><p>{error}</p><Btn size="sm" variant="secondary" onClick={()=>setAttempt(n=>n+1)}>Retry roadmap</Btn></div>;
  return data ? <RoadmapTable roadmap={data}/> : <p role="status" className="text-sm text-gray-500">Loading package roadmap...</p>;
}
export function PackageRoadmapPreview({ packageId }: { packageId: string }) {
  const [open,setOpen]=useState(false);
  return <details className="mt-3 rounded-lg border border-gray-200 bg-white p-3" onToggle={e=>setOpen(e.currentTarget.open)}><summary className="cursor-pointer text-sm font-semibold text-[#8a6420]">View package roadmap</summary><div className="mt-3"><p className="mb-3 text-xs text-gray-500">Package curriculum template. The horse's actual training schedule is confirmed by its trainer.</p>{open && (packageId ? <LoadedRoadmap key={packageId} packageId={packageId}/> : <p className="text-sm text-gray-500">The package reference is unavailable. Refresh the package list to try again.</p>)}</div></details>;
}
export function StagesEditor({ stages, onChange, duration }: { stages: RoadmapStage[]; onChange: (stages: RoadmapStage[])=>void; duration: number }) {
  const update=(index:number,patch:Partial<RoadmapStage>)=>onChange(stages.map((s,i)=>i===index?{...s,...patch}:s));
  return <div className="space-y-3">{stages.map((s,i)=><fieldset key={i} className="space-y-3 rounded-lg border border-gray-200 p-4"><legend className="px-1 text-sm font-semibold">Stage {i+1}</legend>
    <div className="grid gap-3 md:grid-cols-2"><Input label="Stage title" required maxLength={150} value={s.title || ''} onChange={title=>update(i,{title})}/><Input label="Phase code" required maxLength={50} value={s.phaseCode || ''} onChange={phaseCode=>update(i,{phaseCode})}/><Input label="Start day" required type="number" value={String(s.startDay)} onChange={v=>update(i,{startDay:Number(v)})}/><Input label="End day" required type="number" value={String(s.endDay)} onChange={v=>update(i,{endDay:Number(v)})}/></div>
    <Textarea label="Stage objective" value={s.objective || ''} onChange={objective=>update(i,{objective})}/>
    <Input label="Training activity" required maxLength={500} value={s.activityName} onChange={activityName=>update(i,{activityName})}/>
    <div className="grid gap-3 md:grid-cols-3"><Select label="Intensity" value={s.intensity} onChange={intensity=>update(i,{intensity})} options={['LOW','MODERATE','HIGH'].map(value=>({value,label:value}))}/><Input label="Session start time" required type="time" value={s.sessionTime.slice(0,5)} onChange={sessionTime=>update(i,{sessionTime})}/><Input label="Session end time" required type="time" value={s.sessionEndTime.slice(0,5)} onChange={sessionEndTime=>update(i,{sessionEndTime})}/></div>
    <div><p className="mb-2 text-sm font-medium">Training days (1-6 per week)</p><div className="flex flex-wrap gap-2">{days.map(d=><button type="button" key={d} aria-pressed={s.daysOfWeek.includes(d)} disabled={!s.daysOfWeek.includes(d)&&s.daysOfWeek.length>=6} className={`rounded-lg border px-3 py-2 text-xs disabled:opacity-40 ${s.daysOfWeek.includes(d)?'bg-[#1a2844] text-white':'bg-white text-gray-600'}`} onClick={()=>update(i,{daysOfWeek:s.daysOfWeek.includes(d)?s.daysOfWeek.filter(x=>x!==d):[...s.daysOfWeek,d]})}>{dayLabel(d)}</button>)}</div></div>
    <Btn size="sm" variant="danger" disabled={stages.length===1} onClick={()=>onChange(stages.filter((_,index)=>i!==index))}>Remove stage</Btn>
  </fieldset>)}<Btn size="sm" variant="secondary" disabled={stages.length>=100 || stages.some(s=>s.endDay>=duration)} onClick={()=>{const start=Math.max(0,...stages.map(s=>s.endDay))+1;onChange([...stages,blankStage(start,Math.min(start+6,duration))]);}}>+ Add stage</Btn></div>;
}
export function SavedRoadmapPreview({ planId, title, goal }: { planId:string; title:string; goal:string }) {
  const [open,setOpen]=useState(false); const [attempt,setAttempt]=useState(0);
  const [data,setData]=useState<PackageRoadmap | null>(null); const [error,setError]=useState('');
  useEffect(()=>{
    if(!open)return;let active=true;setData(null);setError('');
    request<any[]>(`/training-plans/${idPath(planId)}/stages`).then(stages=>{if(active)setData(roadmapFromApi({title,goal,stages}));}).catch(e=>{if(active)setError((e as Error).message);});
    return ()=>{active=false;};
  },[open,planId,title,goal,attempt]);
  return <details className="mt-3 rounded-lg border border-gray-200 p-3" onToggle={e=>setOpen(e.currentTarget.open)}><summary className="cursor-pointer text-sm font-semibold text-[#8a6420]">View saved roadmap stages</summary>{open&&<div className="mt-3">{error?<div role="alert"><p className="text-sm text-red-700">{error}</p><Btn size="sm" variant="secondary" onClick={()=>setAttempt(n=>n+1)}>Retry roadmap</Btn></div>:data?<RoadmapTable roadmap={data}/>:<p role="status" className="text-sm text-gray-500">Loading saved roadmap...</p>}</div>}</details>;
}
