import { useEffect, useRef, useState } from 'react';
import { Btn, Card, Input, Select, Textarea } from './ui';
import { changeProtocolStatus, createProtocol, listProtocols, protocolOverlap, validateProtocol, SOURCE_HOSTS, WEEK_DAYS, type ProtocolRow, type ProtocolStage } from './trainingProtocols';
const types = ['BASIC','RACING','PERFORMANCE','RECOVERY'].map(value=>({value,label:value}));
const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const emptyStage = (): ProtocolStage => ({startDay:1,endDay:1,activityName:'',intensity:'LOW',daysOfWeek:[],sessionTime:'',sessionEndTime:''});
export function TrainingProtocolsPage() {
  const [list,setList]=useState<ProtocolRow[]>([]), [loading,setLoading]=useState(true), [busy,setBusy]=useState(false), [error,setError]=useState(''), [notice,setNotice]=useState('');
  const [open,setOpen]=useState(false), [name,setName]=useState(''), [type,setType]=useState('BASIC'), [min,setMin]=useState(''), [max,setMax]=useState(''), [sources,setSources]=useState(''), [rationale,setRationale]=useState('');
  const [stages,setStages]=useState<ProtocolStage[]>([emptyStage()]);
  const [review,setReview]=useState(false), [fieldErrors,setFieldErrors]=useState<Record<string,string>>({});
  const draft=()=>({name:name.trim(),packageType:type,minWeight:Number(min),maxWeight:Number(max),rationale:rationale.trim(),sources:sources.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),stages});
  const reviewDraft=()=>{
    const d=draft(), problems:Record<string,string>={};
    if(!d.name||d.name.length>150)problems.name='Enter a name of up to 150 characters.';
    if(!Number.isFinite(d.minWeight)||d.minWeight<0.01)problems.min='Enter a positive minimum weight.';
    if(!Number.isFinite(d.maxWeight)||d.maxWeight<=d.minWeight)problems.max='Maximum weight must exceed minimum weight.';
    if(!d.rationale||d.rationale.length>1000)problems.rationale='Enter the clinical rationale, up to 1000 characters.';
    try{validateProtocol({...d,name:'Protocol',minWeight:1,maxWeight:2,rationale:'Rationale',stages:[{startDay:1,endDay:1,activityName:'Activity',intensity:'LOW',daysOfWeek:['MONDAY'],sessionTime:'08:00',sessionEndTime:'09:00'}]});}catch(e){problems.sources=(e as Error).message;}
    let last=0;
    stages.forEach((stage,i)=>{
      try{validateProtocol({...d,name:'Protocol',minWeight:1,maxWeight:2,rationale:'Rationale',sources:['https://www.merckvetmanual.com'],stages:[stage]});if(stage.startDay<=last)throw new Error('Start this phase after the previous phase ends.');}catch(e){problems[`stage${i}`]=(e as Error).message;}
      last=stage.endDay;
    });
    setFieldErrors(problems);setError('');if(!Object.keys(problems).length)setReview(true);
  };
  const [confirm,setConfirm]=useState<{row:ProtocolRow;action:'approve'|'retire'}|null>(null);
  const flight=useRef(false);
  const refresh=async()=>{setLoading(true);setError('');try{setList(await listProtocols());}catch(e){setError((e as Error).message);}finally{setLoading(false);}};
  useEffect(()=>{void refresh();},[]);
  const run=async(action:()=>Promise<unknown>,message:string)=>{
    if(flight.current)return;flight.current=true;setBusy(true);setError('');setNotice('');
    try{await action();setNotice(message);setConfirm(null);await refresh();}catch(e){setError((e as Error).message);}finally{flight.current=false;setBusy(false);}
  };
  const update=(i:number,part:Partial<ProtocolStage>)=>setStages(all=>all.map((s,j)=>i===j?{...s,...part}:s));
  return <Card className="p-5 space-y-4">
    <div className="flex flex-wrap justify-between items-center gap-3"><div><h2 className="font-serif text-xl font-bold">Training protocols</h2><p className="text-sm text-gray-500">Reusable training templates created and approved by veterinarians.</p></div><Btn variant="gold" disabled={busy} onClick={()=>{setOpen(!open);setReview(false);setFieldErrors({});}}>{open?"Close form":"+ Create protocol"}</Btn></div>
    <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900">A protocol applies to a package type and weight range. Trainers use approved protocols to build a roadmap for an individual horse. Save a draft, review its phases, then approve it for use.</p>
    {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}{notice&&<p role="status" className="text-sm text-emerald-700">{notice}</p>}
    {open&&!review&&<fieldset disabled={busy} className="space-y-4 border rounded-xl p-4">
      <h3 className="font-semibold">1. General information</h3>
      <Input label="Protocol name" required value={name} onChange={setName} maxLength={150} error={fieldErrors.name}/><Select label="Package type" required value={type} onChange={setType} options={types}/>
      <h3 className="font-semibold border-t pt-4">2. Applicability</h3>
      <p className="text-sm text-gray-500">For example, 450–550 kg includes a 500 kg horse, but excludes a 550 kg horse.</p>
      <div className="grid grid-cols-2 gap-3"><Input label="Minimum weight (kg, inclusive)" type="number" value={min} onChange={setMin}/><Input label="Maximum weight (kg, exclusive)" type="number" value={max} onChange={setMax}/></div>
      {(fieldErrors.min||fieldErrors.max)&&<p role="alert" className="text-sm text-red-600">{fieldErrors.min} {fieldErrors.max}</p>}
      <Textarea label="Rationale" value={rationale} onChange={setRationale} hint={`${rationale.length}/1000 characters`}/>
      {fieldErrors.rationale&&<p role="alert" className="text-sm text-red-600">{fieldErrors.rationale}</p>}
      <Textarea label="Reference sources (one URL per line)" value={sources} onChange={setSources}/><details className="text-xs text-gray-500"><summary>Supported source sites</summary>{SOURCE_HOSTS.map(h=><div key={h}>{h}</div>)}</details>
      {fieldErrors.sources&&<p role="alert" className="text-sm text-red-600">{fieldErrors.sources}</p>}
      <h3 className="font-semibold border-t pt-4">3. Training phases</h3>
      <p className="text-sm text-gray-500">Day numbers are relative to the roadmap start, not calendar dates. Define each phase's activity, intensity and weekly session times.</p>
      {stages.map((s,i)=><div key={i} className="border rounded-lg p-3 space-y-3">
        <div className="flex justify-between"><strong>Phase {i+1}</strong><Btn variant="ghost" size="sm" disabled={stages.length===1} onClick={()=>setStages(all=>all.filter((_,j)=>j!==i))}>Delete</Btn></div>
        {fieldErrors[`stage${i}`]&&<p role="alert" className="text-sm text-red-600">{fieldErrors[`stage${i}`]}</p>}
        <div className="grid grid-cols-2 gap-3"><Input label="Start day number" type="number" value={String(s.startDay)} onChange={v=>update(i,{startDay:Number(v)})}/><Input label="End day number" type="number" value={String(s.endDay)} onChange={v=>update(i,{endDay:Number(v)})}/></div>
        <Input label="Session activity" value={s.activityName} onChange={v=>update(i,{activityName:v})} maxLength={500}/><Select label="Intensity" value={s.intensity} onChange={v=>update(i,{intensity:v})} options={['LOW','MODERATE','HIGH'].map(value=>({value,label:value}))}/>
        <div className="flex flex-wrap gap-3">{WEEK_DAYS.map((d,j)=><label key={d} className="text-sm flex gap-1 items-center"><input type="checkbox" checked={s.daysOfWeek.includes(d)} onChange={e=>update(i,{daysOfWeek:e.target.checked?[...s.daysOfWeek,d]:s.daysOfWeek.filter(x=>x!==d)})}/>{days[j]}</label>)}</div>
        <div className="grid grid-cols-2 gap-3"><Input label="Start time" type="time" value={s.sessionTime} onChange={v=>update(i,{sessionTime:v})}/><Input label="End time" type="time" value={s.sessionEndTime} onChange={v=>update(i,{sessionEndTime:v})}/></div>
      </div>)}
      <div className="flex gap-3"><Btn variant="secondary" disabled={stages.length>=100} onClick={()=>setStages(all=>[...all,{...emptyStage(),startDay:all[all.length-1].endDay+1,endDay:all[all.length-1].endDay+1}])}>+ Phase</Btn><Btn variant="gold" onClick={reviewDraft}>Review draft →</Btn></div>
    </fieldset>}
    {open&&review&&<section className="space-y-4 border rounded-xl p-4">
      <h3 className="font-semibold">4. Review protocol</h3>
      <p className="font-medium">{name} · {type} · {min} ≤ weight &lt; {max} kg</p>
      <p className="text-sm whitespace-pre-wrap">{rationale}</p>
      <ProtocolDetails row={{protocol_id:'',protocol_name:name,package_type:type,min_weight:Number(min),max_weight:Number(max),status:'DRAFT',stages_json:JSON.stringify(stages),sources_json:JSON.stringify(draft().sources),rationale}}/>
      <p className="text-sm text-gray-500">Saving creates a draft. Approve it from the list when it is ready for trainers to use.</p>
      <div className="flex gap-3"><Btn variant="secondary" disabled={busy} onClick={()=>setReview(false)}>Back to edit</Btn><Btn variant="gold" disabled={busy} onClick={()=>void run(async()=>{await createProtocol(draft());setOpen(false);setReview(false);setName('');setMin('');setMax('');setSources('');setRationale('');setStages([emptyStage()]);},'Draft created. Review it before approval.')}>{busy?'Saving...':'Save draft'}</Btn></div>
    </section>}
    <Btn size="sm" variant="secondary" disabled={busy||loading} onClick={()=>void refresh()}>Refresh list</Btn>
    {loading?<p className="text-sm text-gray-500">Loading...</p>:list.length===0?<p className="text-sm text-gray-500">No protocols yet.</p>:list.map(p=><div key={p.protocol_id} className="border rounded-lg p-4 space-y-2">
      <div className="font-semibold">{p.protocol_name} <span className="text-xs text-gray-500">{p.protocol_id} · {p.status}</span></div><p className="text-sm">{p.package_type} · {p.min_weight}  ≤ weight &lt; {p.max_weight} kg</p>
      <p className="text-sm whitespace-pre-wrap">{p.rationale}</p>
      <details open={confirm?.row.protocol_id===p.protocol_id}><summary className="text-sm cursor-pointer">View phases and sources</summary><ProtocolDetails row={p}/></details>
      {p.status==='DRAFT'&&protocolOverlap(p,list)&&<p className="text-sm text-amber-700">This weight interval overlaps an approved protocol. Retire the existing protocol or create a draft with a different interval.</p>}
      <div className="flex gap-2">{p.status==='DRAFT'&&<Btn size="sm" variant="gold" disabled={busy||protocolOverlap(p,list)} onClick={()=>setConfirm({row:p,action:'approve'})}>Approve</Btn>}{p.status!=='RETIRED'&&<Btn size="sm" variant="secondary" disabled={busy} onClick={()=>setConfirm({row:p,action:'retire'})}>Retire</Btn>}</div>
    </div>)}
    {confirm&&<div className="border border-amber-300 bg-amber-50 rounded-lg p-4 space-y-3"><p>{confirm.action==='approve'?"Approve":"Retire"}  protocol “{confirm.row.protocol_name}”? {confirm.action==='approve'?"Trainers may use this protocol to generate suitable roadmaps.":"This protocol will no longer be selected for new recommendations."}</p><div className="flex gap-2"><Btn disabled={busy} variant="gold" onClick={()=>void run(()=>changeProtocolStatus(confirm.row.protocol_id,confirm.action),"Protocol status updated.")}>Confirm</Btn><Btn disabled={busy} variant="secondary" onClick={()=>setConfirm(null)}>Cancel</Btn></div></div>}
  </Card>;
}
function ProtocolDetails({row}:{row:ProtocolRow}) {
  try { const stages=JSON.parse(row.stages_json) as ProtocolStage[];const sources=JSON.parse(row.sources_json) as string[];
    return <div className="mt-2 space-y-3 text-sm"><div className="overflow-x-auto"><table className="w-full text-left"><caption className="text-left font-medium mb-2">Training phase summary</caption><thead className="bg-gray-50"><tr>{['Phase','Days','Activity','Intensity','Weekdays','Time'].map(label=><th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{stages.map((s,i)=><tr key={i} className="border-t"><td className="p-2">{i+1}</td><td className="p-2 whitespace-nowrap">{s.startDay}–{s.endDay}</td><td className="p-2">{s.activityName}</td><td className="p-2">{s.intensity}</td><td className="p-2">{s.daysOfWeek.map(d=>days[WEEK_DAYS.indexOf(d)]||d).join(', ')}</td><td className="p-2 whitespace-nowrap">{s.sessionTime}–{s.sessionEndTime}</td></tr>)}</tbody></table></div><p className="font-medium">Reference sources</p>{sources.map((s,i)=><p key={i} className="break-all">{s}</p>)}</div>;
  }catch{return <p className="text-red-600 text-sm">Invalid protocol detail data.</p>;}
}
