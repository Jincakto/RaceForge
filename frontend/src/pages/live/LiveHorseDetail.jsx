import {useEffect,useState} from 'react';
import {useNavigate,useParams} from 'react-router-dom';
import {horseService} from '../../services/horseService.ts';
import {useApp} from '../../hooks/useApp.js';
import {LiveTrainers} from './LiveTrainers.jsx';
export function LiveHorseDetail(){
 const {horseId}=useParams(),navigate=useNavigate(),{state}=useApp();const [horse,setHorse]=useState(null),[busy,setBusy]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let active=true;setBusy(true);setHorse(null);setError('');horseService.get(Number(horseId)).then(h=>active&&setHorse(h)).catch(e=>active&&setError(e.message)).finally(()=>active&&setBusy(false));return()=>{active=false;};},[horseId]);
 const own=horse&&state.user.role==='owner'&&horse.ownerId===state.user.id;
 async function submit(){setBusy(true);setError('');try{setHorse(await horseService.submit(horse.horseId));}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <div className="space-y-5">{error&&<p role="alert" className="text-red-700">{error}</p>}{busy&&<p role="status">Đang xử lý...</p>}{horse&&<><h1 className="text-2xl font-bold">{horse.horseName} · #{horse.horseId}</h1><dl className="grid md:grid-cols-2 gap-3">{[['Ngày sinh',horse.dateOfBirth],['Giống',horse.breed],['Giới tính',horse.gender],['Màu lông',horse.coatColor],['Cân nặng',horse.weight],['Chiều cao',horse.height],['Ngựa cha',horse.sire],['Ngựa mẹ',horse.dam],['Ông ngoại',horse.damSire],['Tiếp nhận',horse.admissionStatus],['Ghi chú tiếp nhận',horse.admissionNote],['Sức khỏe',horse.healthStatus||'Chưa khám'],['Trainer ID',horse.headTrainerId],['Tiền sử y tế',horse.declaredMedicalHistory],['Lý lịch',horse.background]].map(([label,value])=><div className="border rounded p-3" key={label}><dt className="font-bold">{label}</dt><dd>{value??'—'}</dd></div>)}</dl>{own&&<div className="flex gap-4"><button disabled={busy} onClick={()=>navigate('/horses/'+horse.horseId+'/edit')}>Sửa hồ sơ</button>{['NOT_SUBMITTED','REJECTED'].includes(horse.admissionStatus)&&<button disabled={busy} onClick={submit}>Gửi vào trung tâm</button>}</div>}{own&&<LiveTrainers horseId={horse.horseId} onAssigned={setHorse}/>}</>}</div>;
}
