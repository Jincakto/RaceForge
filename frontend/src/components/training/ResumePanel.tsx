import { useState } from 'react';
import type { HorseDto, HorsePackageDto } from '../../types/api';
import { canResume } from '../../utils/horseWorkflow';
export function ResumePanel({ horse, packages, busy, onResume }: { horse: HorseDto; packages: HorsePackageDto[]; busy: boolean; onResume: (id: number, reason: string) => Promise<void> }) {
  const [reason,setReason]=useState(''); const [error,setError]=useState('');
  return <section className="bg-white rounded-xl border p-5 space-y-3"><h2 className="text-xl font-bold">Resume gói gốc</h2><p>Chỉ Resume sau khi thú y đã Unlock riêng và ngựa READY; Recovery phải ACTIVE / PAID, gói gốc PAUSED / PAID và còn ngày.</p><input aria-label="Lý do Resume" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Lý do Resume" className="border rounded p-2 w-full"/>{packages.filter(p=>p.packageType==='RECOVERY').map(p=><button key={p.horsePackageId} disabled={busy || !reason.trim() || !canResume(horse,p,packages)} className="block px-4 py-2 bg-blue-700 text-white rounded disabled:opacity-40" onClick={async()=>{try{setError('');await onResume(p.horsePackageId,reason);setReason('');}catch(e){setError(e instanceof Error?e.message:'Không thể Resume.');}}}>Resume từ Recovery #{p.horsePackageId}</button>)}{error && <p role="alert" className="text-red-700">{error}</p>}</section>;
}
