import { useEffect, useRef, useState } from 'react';
import { Btn, Card, Input, Select, Textarea } from './ui';
import { changeProtocolStatus, createProtocol, listProtocols, protocolOverlap, SOURCE_HOSTS, WEEK_DAYS, type ProtocolRow, type ProtocolStage } from './trainingProtocols';
const types = ['BASIC','RACING','PERFORMANCE','RECOVERY'].map(value=>({value,label:value}));
const days = ['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ nhật'];
const emptyStage = (): ProtocolStage => ({startDay:1,endDay:1,activityName:'',intensity:'LOW',daysOfWeek:[],sessionTime:'',sessionEndTime:''});
export function TrainingProtocolsPage() {
  const [list,setList]=useState<ProtocolRow[]>([]), [loading,setLoading]=useState(true), [busy,setBusy]=useState(false), [error,setError]=useState(''), [notice,setNotice]=useState('');
  const [open,setOpen]=useState(false), [name,setName]=useState(''), [type,setType]=useState('BASIC'), [min,setMin]=useState(''), [max,setMax]=useState(''), [sources,setSources]=useState(''), [rationale,setRationale]=useState('');
  const [stages,setStages]=useState<ProtocolStage[]>([emptyStage()]);
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
    <div className="flex justify-between items-center gap-3"><div><h3 className="font-serif text-xl font-bold">Phác đồ huấn luyện</h3><p className="text-sm text-gray-500">Bác sĩ tạo và phê duyệt phác đồ để Trainer lập lộ trình.</p></div><Btn variant="gold" disabled={busy} onClick={()=>setOpen(!open)}>{open?'Đóng form':'+ Tạo phác đồ'}</Btn></div>
    {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}{notice&&<p role="status" className="text-sm text-emerald-700">{notice}</p>}
    {open&&<fieldset disabled={busy} className="space-y-4 border rounded-xl p-4">
      <Input label="Tên phác đồ" value={name} onChange={setName} maxLength={150}/><Select label="Loại gói" value={type} onChange={setType} options={types}/>
      <div className="grid grid-cols-2 gap-3"><Input label="Cân nặng từ (kg, bao gồm)" type="number" value={min} onChange={setMin}/><Input label="Cân nặng đến (kg, không bao gồm)" type="number" value={max} onChange={setMax}/></div>
      <Textarea label="Cơ sở áp dụng" value={rationale} onChange={setRationale} hint={`${rationale.length}/1000 ký tự`}/>
      <Textarea label="Nguồn tham khảo (mỗi URL một dòng)" value={sources} onChange={setSources}/><details className="text-xs text-gray-500"><summary>Nguồn được BE hỗ trợ</summary>{SOURCE_HOSTS.map(h=><div key={h}>{h}</div>)}</details>
      {stages.map((s,i)=><div key={i} className="border rounded-lg p-3 space-y-3">
        <div className="flex justify-between"><strong>Giai đoạn {i+1}</strong><Btn variant="ghost" size="sm" disabled={stages.length===1} onClick={()=>setStages(all=>all.filter((_,j)=>j!==i))}>Xóa</Btn></div>
        <div className="grid grid-cols-2 gap-3"><Input label="Từ ngày thứ" type="number" value={String(s.startDay)} onChange={v=>update(i,{startDay:Number(v)})}/><Input label="Đến ngày thứ" type="number" value={String(s.endDay)} onChange={v=>update(i,{endDay:Number(v)})}/></div>
        <Input label="Nội dung buổi tập" value={s.activityName} onChange={v=>update(i,{activityName:v})} maxLength={500}/><Select label="Cường độ" value={s.intensity} onChange={v=>update(i,{intensity:v})} options={['LOW','MODERATE','HIGH'].map(value=>({value,label:value}))}/>
        <div className="flex flex-wrap gap-3">{WEEK_DAYS.map((d,j)=><label key={d} className="text-sm flex gap-1 items-center"><input type="checkbox" checked={s.daysOfWeek.includes(d)} onChange={e=>update(i,{daysOfWeek:e.target.checked?[...s.daysOfWeek,d]:s.daysOfWeek.filter(x=>x!==d)})}/>{days[j]}</label>)}</div>
        <div className="grid grid-cols-2 gap-3"><Input label="Giờ bắt đầu" type="time" value={s.sessionTime} onChange={v=>update(i,{sessionTime:v})}/><Input label="Giờ kết thúc" type="time" value={s.sessionEndTime} onChange={v=>update(i,{sessionEndTime:v})}/></div>
      </div>)}
      <div className="flex gap-3"><Btn variant="secondary" disabled={stages.length>=100} onClick={()=>setStages(all=>[...all,{...emptyStage(),startDay:all[all.length-1].endDay+1,endDay:all[all.length-1].endDay+1}])}>+ Giai đoạn</Btn><Btn variant="gold" onClick={()=>void run(async()=>{await createProtocol({name:name.trim(),packageType:type,minWeight:Number(min),maxWeight:Number(max),rationale:rationale.trim(),sources:sources.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),stages});setOpen(false);setName('');setMin('');setMax('');setSources('');setRationale('');setStages([emptyStage()]);},'Đã tạo bản nháp. Kiểm tra lại trước khi phê duyệt.')}>{busy?'Đang lưu...':'Lưu bản nháp'}</Btn></div>
    </fieldset>}
    <Btn size="sm" variant="secondary" disabled={busy||loading} onClick={()=>void refresh()}>Tải lại danh sách</Btn>
    {loading?<p className="text-sm text-gray-500">Đang tải...</p>:list.length===0?<p className="text-sm text-gray-500">Chưa có phác đồ.</p>:list.map(p=><div key={p.protocol_id} className="border rounded-lg p-4 space-y-2">
      <div className="font-semibold">{p.protocol_name} <span className="text-xs text-gray-500">{p.protocol_id} · {p.status}</span></div><p className="text-sm">{p.package_type} · {p.min_weight} ≤ cân nặng &lt; {p.max_weight} kg</p>
      <p className="text-sm whitespace-pre-wrap">{p.rationale}</p>
      <details><summary className="text-sm cursor-pointer">Xem giai đoạn và nguồn</summary><ProtocolDetails row={p}/></details>
      {p.status==='DRAFT'&&protocolOverlap(p,list)&&<p className="text-sm text-amber-700">Khoảng cân nặng trùng phác đồ đã duyệt. Cần ngừng phác đồ cũ hoặc tạo bản nháp với khoảng khác.</p>}
      <div className="flex gap-2">{p.status==='DRAFT'&&<Btn size="sm" variant="gold" disabled={busy||protocolOverlap(p,list)} onClick={()=>setConfirm({row:p,action:'approve'})}>Phê duyệt</Btn>}{p.status!=='RETIRED'&&<Btn size="sm" variant="secondary" disabled={busy} onClick={()=>setConfirm({row:p,action:'retire'})}>Ngừng sử dụng</Btn>}</div>
    </div>)}
    {confirm&&<div className="border border-amber-300 bg-amber-50 rounded-lg p-4 space-y-3"><p>{confirm.action==='approve'?'Phê duyệt':'Ngừng sử dụng'} phác đồ “{confirm.row.protocol_name}”? {confirm.action==='approve'?'Trainer có thể dùng phác đồ này để sinh lộ trình phù hợp.':'Phác đồ sẽ không được chọn cho các gợi ý mới.'}</p><div className="flex gap-2"><Btn disabled={busy} variant="gold" onClick={()=>void run(()=>changeProtocolStatus(confirm.row.protocol_id,confirm.action),'Đã cập nhật trạng thái phác đồ.')}>Xác nhận</Btn><Btn disabled={busy} variant="secondary" onClick={()=>setConfirm(null)}>Hủy</Btn></div></div>}
  </Card>;
}
function ProtocolDetails({row}:{row:ProtocolRow}) {
  try { const stages=JSON.parse(row.stages_json) as ProtocolStage[];const sources=JSON.parse(row.sources_json) as string[];
    return <div className="mt-2 space-y-2 text-sm">{stages.map((s,i)=><p key={i}>Ngày {s.startDay}–{s.endDay}: {s.activityName} · {s.intensity} · {s.daysOfWeek.map(d=>days[WEEK_DAYS.indexOf(d)]||d).join(', ')} · {s.sessionTime}–{s.sessionEndTime}</p>)}{sources.map((s,i)=><p key={i}>{s}</p>)}</div>;
  }catch{return <p className="text-red-600 text-sm">Dữ liệu chi tiết phác đồ không hợp lệ.</p>;}
}
