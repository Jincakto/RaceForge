import { useEffect, useState } from 'react';
import { healthService } from '../../services/healthService.ts';
import { MedicalRecordDetails } from './MedicalRecordDetails.jsx';
export function LiveMedicalReadPanel({horseId,records=[]}){
  const [detail,setDetail]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  useEffect(()=>{setDetail(null);setError('');setNotice('');},[horseId]);
  async function load(action){if(busy)return;setBusy(true);setError('');setNotice('');try{const data=await action();setDetail(data);if(!data)setNotice('Chưa có lần khám trước.');}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <section className="bg-white border rounded p-4 space-y-3"><h2 className="font-bold">Tra cứu hồ sơ khám</h2><button disabled={busy||!horseId} onClick={()=>load(()=>healthService.previous(horseId))}>Lần khám trước</button><div className="flex flex-wrap gap-3">{records.map(r=><button key={r.medicalRecordId} disabled={busy} onClick={()=>load(()=>healthService.get(r.medicalRecordId))}>Chi tiết hồ sơ #{r.medicalRecordId}</button>)}</div>{busy&&<p role="status">Đang tải...</p>}{error&&<p role="alert" className="text-red-700">{error}</p>}{notice&&<p>{notice}</p>}<MedicalRecordDetails data={detail}/></section>;
}
