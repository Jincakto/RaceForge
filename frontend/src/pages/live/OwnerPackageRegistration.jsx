import { useEffect, useRef, useState } from 'react';
import { horseService } from '../../services/horseService.ts';
import { trainingService } from '../../services/trainingService.ts';
import { loadHorseWorkflow } from '../../services/loadHorseWorkflow.ts';
import { packageRegistrationIssues } from '../../utils/packageRegistration.ts';
import { PackagePanel } from '../../components/training/PackagePanel.tsx';

export function OwnerPackageRegistration({ user }) {
  const [horses,setHorses]=useState([]),[horseId,setHorseId]=useState(''),[data,setData]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[revision,setRevision]=useState(0);
  const running=useRef(false);
  useEffect(()=>{
    let active=true;setLoading(true);setError('');setHorses([]);setHorseId('');
    horseService.list().then(items=>{if(!active)return;const owned=items.filter(h=>h.ownerId===user.id);setHorses(owned);setHorseId(String(owned[0]?.horseId||''));if(!owned.length)setLoading(false);}).catch(e=>{if(active){setError(e.message);setLoading(false);}});
    return()=>{active=false;};
  },[user.id]);
  useEffect(()=>{
    let active=true;setData(null);if(!horseId)return;
    setLoading(true);setError('');
    loadHorseWorkflow(Number(horseId),'owner').then(([horse,records,,catalog,packages])=>{
      if(active)setData({horse,records,catalog,packages:packages||[]});
    }).catch(e=>active&&setError(e.message)).finally(()=>active&&setLoading(false));
    return()=>{active=false;};
  },[horseId,revision]);
  async function mutate(action,successMessage){
    if(running.current||!data)return;
    running.current=true;setBusy(true);setError('');setNotice('');
    try{
      const saved=await action();
      setData(current=>current?{...current,packages:[...current.packages.filter(p=>p.horsePackageId!==saved.horsePackageId),saved]}:current);
      setNotice(successMessage(saved));setRevision(v=>v+1);
    }catch(e){setError(e.message);throw e;}
    finally{running.current=false;setBusy(false);}
  }
  const issues=data?packageRegistrationIssues(data.horse,data.records,data.packages,user.id):[];
  return <div className="space-y-5"><header><h1 className="text-2xl font-bold">Đăng ký gói huấn luyện cho ngựa</h1><p>Chọn ngựa của bạn, đăng ký một gói phù hợp rồi thanh toán mô phỏng.</p></header>
    <div className="flex flex-wrap gap-4 items-end"><label>Ngựa của tôi<select aria-label="Ngựa đăng ký gói" className="block border bg-white rounded p-2" value={horseId} disabled={busy||horses.length===0} onChange={e=>{setHorseId(e.target.value);setNotice('');}}><option value="">Chọn ngựa</option>{horses.map(h=><option key={h.horseId} value={h.horseId}>{h.horseName} · #{h.horseId}</option>)}</select></label><button disabled={loading||busy||!horseId} onClick={()=>setRevision(v=>v+1)}>Tải lại điều kiện và lịch sử</button></div>
    {loading&&<p role="status">Đang tải ngựa và các gói đã đăng ký...</p>}{error&&<p role="alert" className="text-red-700">{error}</p>}{notice&&<p role="status" className="text-green-700">{notice}</p>}
    {!loading&&!error&&!horses.length&&<p>Bạn chưa có ngựa. Mở “Ngựa của tôi” để đăng ký ngựa trước.</p>}
    {data&&<><section className="bg-white border rounded p-4"><h2 className="font-bold">Điều kiện đăng ký — {data.horse.horseName}</h2>{issues.length?<ul className="list-disc pl-5 text-amber-800">{issues.map(message=><li key={message}>{message}</li>)}</ul>:<p className="text-green-700">Ngựa đủ điều kiện đăng ký gói thông thường.</p>}</section>
      <PackagePanel catalog={data.catalog} packages={data.packages} eligible={issues.length===0} busy={busy||loading} owner onRegister={packageId=>mutate(()=>trainingService.register(Number(horseId),packageId),saved=>`Đã đăng ký gói #${saved.horsePackageId}. Vui lòng thanh toán mô phỏng bên dưới.`)} onPay={(registration,successful)=>mutate(()=>trainingService.pay(registration.horsePackageId,successful,registration.packageType==='RECOVERY'),saved=>`Gói #${saved.horsePackageId}: ${saved.paymentStatus==='PAID'?'thanh toán thành công':'thanh toán thất bại, gói đã hủy'}.`)}/>
      <p className="text-sm text-slate-600">Gói phục hồi cần được Manager duyệt theo luồng phục hồi. Thanh toán ở đây là mô phỏng, không thu tiền thật.</p></>}
  </div>;
}
