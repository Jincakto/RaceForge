import { useState } from 'react';
import { horseService } from '../../services/horseService.ts';
import type { HorseDto } from '../../types/api.ts';

export function AdmissionPanel({horse,role,onChanged}:{horse:HorseDto;role:string|null;onChanged:(horse:HorseDto)=>Promise<void>}){
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[note,setNote]=useState('');
  const labels:Record<string,string>={NOT_SUBMITTED:'Chưa gửi tiếp nhận',PENDING:'Đang chờ Manager duyệt',APPROVED:'Đã tiếp nhận',REJECTED:'Đã từ chối'};
  async function run(action:()=>Promise<HorseDto>){if(busy)return;setBusy(true);setError('');try{const next=await action();await onChanged(next);setNote('');}catch(e){setError(e instanceof Error?e.message:'Không thực hiện được thao tác.');}finally{setBusy(false);}}
  return <section className="border rounded-xl p-4 bg-amber-50 space-y-3"><h2 className="font-bold">Tiếp nhận ngựa #{horse.horseId}: {labels[horse.admissionStatus]||horse.admissionStatus}</h2>
    {horse.admissionStatus!=='APPROVED'&&<p>Kích hoạt ngựa không thay thế duyệt tiếp nhận. Hồ sơ sức khỏe được tạo sau khi Manager duyệt; khi đó thú y mới tạo hồ sơ khám.</p>}
    {horse.admissionNote&&<p>Ghi chú: {horse.admissionNote}</p>}
    {role==='owner'&&['NOT_SUBMITTED','REJECTED'].includes(horse.admissionStatus)&&<button data-tone="gold" disabled={busy} className="border rounded px-4 py-2" onClick={()=>run(()=>horseService.submit(horse.horseId))}>Gửi ngựa vào trung tâm</button>}
    {role==='manager'&&['NOT_SUBMITTED','REJECTED'].includes(horse.admissionStatus)&&<p>Chủ ngựa cần gửi yêu cầu trước khi bạn duyệt.</p>}
    {role==='manager'&&horse.admissionStatus==='PENDING'&&<><label className="block">Ghi chú duyệt / lý do từ chối<input className="block border rounded p-2 w-full" maxLength={500} value={note} onChange={e=>setNote(e.target.value)}/></label><div className="flex gap-4"><button data-tone="success" disabled={busy} onClick={()=>run(()=>horseService.review(horse.horseId,true,note.trim()))}>Duyệt tiếp nhận và tạo hồ sơ sức khỏe</button><button data-tone="danger" disabled={busy||!note.trim()} onClick={()=>run(()=>horseService.review(horse.horseId,false,note.trim()))}>Từ chối</button></div></>}
    {busy&&<p role="status">Đang xử lý...</p>}{error&&<p role="alert" className="text-red-700">{error}</p>}
  </section>;
}
