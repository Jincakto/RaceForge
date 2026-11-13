import { useRef, useState } from 'react';
import type { Enrollment } from '../../shared/data/data';
import { Btn } from '../../shared/ui/ui';
import { Modal } from '../admin/admin';
import type { PackageLifecycleAction, PackageLifecycleOutcome, PackageLifecycleResult } from './packageLifecycle';
export function PackageLifecycleButton({ enrollment, action, blockedReason, onAction }: {
  enrollment: Enrollment; action: PackageLifecycleAction; blockedReason?: string | null;
  onAction: (id: string) => Promise<PackageLifecycleResult>;
}) {
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [uncertain,setUncertain]=useState(false),[done,setDone]=useState<PackageLifecycleOutcome|null>(null);
  const flight=useRef(false),complete=action==='complete';
  const title=complete?'Complete package':'Cancel registration';
  const submit=async()=>{
    if(flight.current || done || blockedReason)return;
    flight.current=true;setBusy(true);setError('');
    try{
      const result=await onAction(enrollment.id);
      if(result.ok){setDone(result.data);setOpen(false);setUncertain(false);}
      else {setError(result.message);setUncertain(!!result.uncertain);}
    }catch{setError('The result could not be confirmed. Check the registration status before trying again.');setUncertain(true);}
    finally{flight.current=false;setBusy(false);}
  };
  if(done)return <div role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
    {complete ? `Package completed.${done.certificate ? ' Certificate '+done.certificate.certificateNumber+' is available to the owner.' : ' Check the registration for its certificate.'}`
      : `Registration cancelled.${done.deletedSessionCount !== undefined ? ' '+done.deletedSessionCount+' unstarted sessions deleted.' : ''} Recorded history and payment are retained. No automatic refund.`}
    {done.refreshWarning && <p className="mt-1 text-amber-800">{done.refreshWarning}</p>}
  </div>;
  return <div className="mt-3">
    <Btn size="sm" variant={complete?'gold':'secondary'} disabled={busy || !!blockedReason} onClick={()=>{setError('');setOpen(true);}}>{title}</Btn>
    {blockedReason && <p className="mt-1 text-xs text-amber-800">{blockedReason}</p>}
    {open && <Modal title={title+'?'} onClose={()=>{if(!busy)setOpen(false);}}>
      <p className="text-sm text-gray-700"><strong>{enrollment.packageName}</strong> · {enrollment.id}</p>
      <p className="mt-3 text-sm text-gray-600">{complete
        ? 'This ends the package and its current trainer assignment. A training certificate will be issued to the owner.'
        : 'This cancels the paid registration and deletes scheduled sessions that have not started. Recorded history and payment are retained. There is no automatic refund.'}</p>
      {blockedReason && <p role="alert" className="mt-3 text-sm text-amber-800">{blockedReason}</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Btn variant="secondary" disabled={busy} onClick={()=>setOpen(false)}>Back</Btn>
        <Btn variant="gold" disabled={busy || !!blockedReason} onClick={()=>void submit()}>{busy?'Processing...':uncertain?'Check status':title}</Btn>
      </div>
    </Modal>}
  </div>;
}