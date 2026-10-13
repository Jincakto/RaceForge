import { OwnerPackageRegistration } from "./OwnerPackageRegistration.jsx";
export function LivePackages({user}) { return user.role === "owner" ? <OwnerPackageRegistration user={user}/> : <PackageCatalog user={user}/>; }
import { useEffect, useState } from 'react';
import { trainingService } from '../../services/trainingService.ts';
import { ApiForm, ReadableDetails } from './LiveApiForms.jsx';
const fields=[{name:'packageName',label:'Tên gói',required:true,maxLength:100},{name:'packageType',label:'Loại gói',required:true,options:['BASIC','RACING','PERFORMANCE','RECOVERY']},{name:'description',label:'Mô tả',maxLength:500},{name:'durationDays',label:'Số ngày',type:'number',min:1,required:true},{name:'price',label:'Giá',type:'number',min:0,required:true}];
// Previous exported catalog is retained below as PackageCatalog.
function PackageCatalog({user}){
  const manager=user.role==='manager';
  const [items,setItems]=useState([]),[selected,setSelected]=useState(null),[revision,setRevision]=useState(0),[error,setError]=useState(''),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false);
  useEffect(()=>{let active=true;setLoading(true);setError('');(manager?trainingService.allPackages():trainingService.catalog()).then(data=>active&&setItems(data)).catch(e=>active&&setError(e.message)).finally(()=>active&&setLoading(false));return()=>{active=false;};},[manager,revision]);
  const reload=()=>setRevision(v=>v+1);
  async function details(id){setError('');try{setSelected(await trainingService.getPackage(id));}catch(e){setError(e.message);}}
  async function toggle(item){if(busy)return;setBusy(true);setError('');try{await trainingService.togglePackageStatus(item.packageId,item.status!=='ACTIVE');setSelected(null);reload();}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <div className="space-y-4"><h1 className="text-2xl font-bold">Danh mục gói huấn luyện</h1><button disabled={loading||busy} onClick={reload}>Tải lại</button>{loading&&<p role="status">Đang tải...</p>}{error&&<p role="alert" className="text-red-700">{error}</p>}{!loading&&!items.length&&<p>Chưa có gói tập.</p>}{items.map(p=><article className="bg-white border rounded p-4" key={p.packageId}><h2 className="font-bold">{p.packageName}</h2><p>{p.packageType} · {p.durationDays} ngày · {Number(p.price).toLocaleString('vi-VN')} VND · {p.status}</p><div className="flex gap-4"><button onClick={()=>details(p.packageId)}>Xem chi tiết{manager?' / sửa':''}</button>{manager&&<button disabled={busy} onClick={()=>toggle(p)}>{p.status==='ACTIVE'?'Ngừng cung cấp':'Kích hoạt'}</button>}</div></article>)}{selected&&<ReadableDetails data={selected}/>}{manager&&<div className="grid lg:grid-cols-2 gap-4"><ApiForm title="Tạo gói tập" fields={fields} onSubmit={async body=>{await trainingService.createPackage(body);reload();}}/>{selected&&<ApiForm key={selected.packageId} title={'Sửa gói #'+selected.packageId} initial={selected} fields={fields} onSubmit={async body=>{const updated=await trainingService.updatePackage(selected.packageId,body);setSelected(updated);reload();}}/>}</div>}</div>;
}
