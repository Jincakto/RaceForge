import { useState } from 'react';
import { Btn, Input, Select, Card } from './ui';
import { DAYS, emptyStage, type Stage } from './workflowApi';
export function ServerDetails({ value }: { value: any }) {
  if (value == null) return <span className="text-gray-400">—</span>;
  if (typeof value !== 'object') return <span className="break-words whitespace-pre-wrap">{String(value)}</span>;
  if (Array.isArray(value)) return value.length ? <div className="space-y-3">{value.map((v,i) => <Card key={i} className="p-3"><ServerDetails value={v} /></Card>)}</div> : <p className="text-gray-500">No records.</p>;
  return <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">{Object.entries(value).map(([k,v]) => <div key={k}><dt className="text-xs text-gray-500 capitalize">{k.replace(/_/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2')}</dt><dd><ServerDetails value={v} /></dd></div>)}</dl>;
}
export function StageEditor({ stages, onChange, disabled = false }: { stages: Stage[]; onChange: (s: Stage[]) => void; disabled?: boolean }) {
  const set = (i: number, patch: Partial<Stage>) => onChange(stages.map((s,n) => n === i ? { ...s, ...patch } : s));
  return <fieldset disabled={disabled} className="space-y-3"><legend className="font-semibold">Training stages</legend>{stages.map((s,i) => <Card key={i} className="p-4 space-y-3">
    <div className="grid grid-cols-2 gap-3"><Input label="First day" type="number" min="1" value={String(s.startDay)} onChange={v => set(i,{startDay:Number(v)})} /><Input label="Last day" type="number" min="1" value={String(s.endDay)} onChange={v => set(i,{endDay:Number(v)})} /></div>
    <Input label="Activity" required value={s.activityName} onChange={activityName => set(i,{activityName})} />
    <Select label="Intensity" value={s.intensity} onChange={intensity => set(i,{intensity})} options={['LOW','MODERATE','HIGH'].map(value => ({value,label:value}))} />
    <div className="flex flex-wrap gap-3">{DAYS.map(d => <label key={d} className="text-xs"><input type="checkbox" checked={s.daysOfWeek.includes(d)} onChange={e => set(i,{daysOfWeek:e.target.checked ? [...s.daysOfWeek,d] : s.daysOfWeek.filter(v=>v!==d)})} /> {d.slice(0,3)}</label>)}</div>
    <div className="grid grid-cols-2 gap-3"><Input label="Start time" type="time" value={s.sessionTime} onChange={sessionTime=>set(i,{sessionTime})} /><Input label="End time" type="time" value={s.sessionEndTime} onChange={sessionEndTime=>set(i,{sessionEndTime})} /></div>
    <Btn variant="secondary" onClick={()=>onChange(stages.filter((_,n)=>n!==i))}>Remove stage</Btn>
  </Card>)}<Btn variant="secondary" onClick={()=>onChange([...stages,emptyStage()])}>Add stage</Btn></fieldset>;
}
export function useServerAction() {
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const run=async(work:()=>Promise<unknown>, success='Saved on the server.')=>{ if(busy)return; setBusy(true);setError('');setNotice(''); try {await work();setNotice(success);}catch(e){setError(e instanceof Error?e.message:'API error');}finally{setBusy(false);} };
  return {busy,error,notice,run};
}
export function ActionStatus({action}: {action: ReturnType<typeof useServerAction>}) {return <>{action.busy&&<p role="status">Loading / saving…</p>}{action.error&&<p role="alert" className="text-red-700">{action.error}</p>}{action.notice&&<p role="status" className="text-emerald-700">{action.notice}</p>}</>;}
