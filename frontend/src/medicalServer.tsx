import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import type { AppState } from './App';
import { backendId } from './backendBridge';
import { Btn, Card, Input, Select } from './ui';
import { VetHealthFormPage } from './vetForm';
import { TODAY } from './today';
import { saveExamination, confirmExamination, type ServerRow } from './workflowApi';
import { ActionStatus, ServerDetails, useServerAction } from './serverWidgets';

export function MedicalServerPage({state, refresh}: {state:AppState; refresh:()=>Promise<void>}) {
  const action=useServerAction();
  const manager=state.user!.role==='manager';
  const [horse,setHorse]=useState(state.horses[0]?.id||'');
  const [vet,setVet]=useState('');
  const [rows,setRows]=useState<ServerRow[]>([]),[detail,setDetail]=useState<any>(null);
  const [selected,setSelected]=useState(''),[reason,setReason]=useState('');
  const [draft,setDraft]=useState('');
  const draftRef=useRef('');
  const load=async()=>{ const values=await api<ServerRow[]>(manager ? `/api/medical/assignments/horses/${backendId(horse)}` : '/api/medical/assignments/mine');setRows(values); };
  useEffect(()=>{ if(!manager||horse)void action.run(load,''); },[horse]);
  const current=rows.find(r=>r.assignmentId===selected);
  const accepted=current?.status==='ACCEPTED';
  const examineHorse=state.horses.find(h=>String(backendId(h.id))===String(current?.horseId));
  const clearDraft=()=>{setDraft('');draftRef.current='';};
  return <div className="space-y-5" data-ui-translate="off"><h2 className="font-serif text-xl font-bold">Veterinary assignments and examination</h2><ActionStatus action={action}/>
    {manager&&<Card className="p-5 space-y-3"><Select label="Horse" value={horse} onChange={v=>{setHorse(v);setSelected('');clearDraft();}} options={state.horses.map(h=>({value:h.id,label:`${h.name} · ${h.id}`}))}/><Select label="Veterinarian" value={vet} onChange={setVet} options={[{value:'',label:'Select veterinarian'},...state.users.filter(u=>u.role==='veterinarian'&&!u.locked).map(u=>({value:u.id,label:u.name}))]}/><p className="text-sm text-gray-500">Assigning another veterinarian replaces the current assignment according to backend rules.</p><Btn disabled={action.busy||!horse||!vet} onClick={()=>{void action.run(async()=>{await api(`/api/medical/assignments/horses/${backendId(horse)}`,'POST',{veterinarianId:backendId(vet)});await load();await refresh();});}}>Assign veterinarian</Btn><Btn variant="secondary" disabled={action.busy} onClick={()=>{void action.run(async()=>setDetail(await api('/api/medical/assignments/declined')),'');}}>View declined assignments</Btn></Card>}
    <Btn variant="secondary" disabled={action.busy} onClick={()=>{void action.run(load,'');}}>Reload assignments</Btn>
    <div className="space-y-3">{rows.map(r=><Card key={r.assignmentId} className="p-4"><div className="flex justify-between gap-3"><div><b>{r.horseName} · {r.assignmentId}</b><p>{r.veterinarianName} · {r.status}</p><p className="text-xs text-gray-500">{r.reason}</p></div><Btn disabled={action.busy} variant="secondary" onClick={()=>{setSelected(r.assignmentId);clearDraft();setDetail(null);}}>Select case</Btn></div></Card>)}{!rows.length&&<p>No assignments loaded.</p>}</div>
    {!manager&&current&&<Card className="p-5 space-y-3"><h3 className="font-semibold">{current.horseName} · {current.status}</h3>
      {current.status==='ASSIGNED'&&<><Input label="Reason for declining (at least 10 characters)" value={reason} onChange={setReason}/><Btn disabled={action.busy} onClick={()=>{void action.run(async()=>{await api(`/api/medical/assignments/${current.assignmentId}/accept`,'POST');await load();await refresh();});}}>Accept case</Btn><Btn disabled={action.busy||reason.trim().length<10} variant="danger" onClick={()=>{void action.run(async()=>{await api(`/api/medical/assignments/${current.assignmentId}/decline`,'POST',{reason});await load();});}}>Decline case</Btn></>}
      <Btn disabled={action.busy} variant="secondary" onClick={()=>{void action.run(async()=>setDetail(await api(`/api/medical/horses/${current.horseId}/previous-examination`)),'');}}>Previous confirmed examination</Btn>
      <Btn disabled={action.busy} variant="secondary" onClick={()=>{void action.run(async()=>setDetail(await api(`/api/medical/horses/${current.horseId}/records`)),'');}}>All medical records</Btn>
      <Btn disabled={action.busy} variant="secondary" onClick={()=>{void action.run(async()=>setDetail(await api(`/api/medical/horses/${current.horseId}/training-lock/history`)),'');}}>Training lock history</Btn>
      {accepted&&<><Input label="Reason to unlock training" value={reason} onChange={setReason}/><Btn disabled={action.busy||!reason.trim()} variant="secondary" onClick={()=>{void action.run(async()=>{await api(`/api/medical/horses/${current.horseId}/training-lock/unlock`,'POST',{reason});await refresh();});}}>Unlock after recovery</Btn></>}
    </Card>}
    {detail!==null&&<Card className="p-5"><ServerDetails value={detail}/></Card>}
    {!manager&&accepted&&examineHorse&&<><p className="text-sm text-gray-600">The examination form saves a draft first. Review the server result and confirm below to publish the conclusion.</p>
      <VetHealthFormPage key={selected} state={{...state,horses:[examineHorse],examHorseId:examineHorse.id}} today={TODAY} navigate={()=>{}} onSave={()=>{}} onSaveRecord={async rec=>{const id=await saveExamination(rec,state.user!.id,draftRef.current||undefined,setDetail);draftRef.current=id;setDraft(id);setDetail(await api(`/api/medical/records/${id}`));}}/>
    </>}
    {draft&&<Card className="p-5 space-y-3"><p>Draft {draft} saved. Confirmation applies training eligibility and any training lock on the server.</p><Btn disabled={action.busy} onClick={()=>{void action.run(async()=>{await confirmExamination(draft);setDetail(await api(`/api/medical/records/${draft}`));await load();clearDraft();await refresh();},'Examination confirmed.');}}>Confirm examination</Btn></Card>}
  </div>;
}
