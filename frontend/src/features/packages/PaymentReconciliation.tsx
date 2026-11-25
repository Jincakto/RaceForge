import { useEffect, useState } from 'react';
import { request } from '../../shared/api/api';
import { Btn, Card } from '../../shared/ui/ui';
interface PaymentReview { orderCode: number; registrationId: string; amount: number; paymentState: string; applicationError?: string; }
export function PaymentReconciliation(){
  const [rows,setRows]=useState<PaymentReview[]>([]);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [attempt,setAttempt]=useState(0);
  useEffect(()=>{let live=true;setBusy(true);request<PaymentReview[]>('/payments/payos/reconciliation').then(r=>{if(live){setRows(r);setError('');}}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setBusy(false);});return()=>{live=false;};},[attempt]);
  return <Card className="space-y-3 p-5"><div className="flex justify-between gap-3"><h3 className="font-semibold">Payments requiring reconciliation</h3><Btn size="sm" disabled={busy} onClick={()=>setAttempt(n=>n+1)}>Refresh</Btn></div>
    <p className="text-sm text-gray-500">Verified receipts are retained. Retry rechecks PayOS and eligibility; late payments require manual resolution with the owner. No automatic refund or forced activation.</p>
    {error&&<p role="alert" className="text-red-700">{error}</p>}{busy&&<p role="status">Checking payments...</p>}
    {!busy&&!error&&!rows.length&&<p className="text-sm">No payments need review.</p>}
    {rows.map(p=><div key={p.orderCode} className="rounded-lg border p-3 text-sm"><strong>{p.registrationId}</strong> · Order {p.orderCode} · {p.amount.toLocaleString()} VND · {p.paymentState}<p>{p.applicationError}</p><Btn size="sm" disabled={busy} onClick={async()=>{setBusy(true);try{await request(`/payments/payos/reconciliation/${p.orderCode}/retry`,'POST');setAttempt(n=>n+1);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>Recheck payment and activation</Btn></div>)}
  </Card>;
}
