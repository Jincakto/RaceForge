import { useEffect, useState } from 'react';
import { request, idPath } from './api';
import { Btn } from './ui';
type Feedback = {sessionId:string; suggestedAction:string; note:string; requiresTrainerConfirmation:boolean; automaticScheduleChange:boolean};
export function RecoveryReview({sessionId}: {sessionId:string; onReview?:()=>void}) {
 const [note,setNote]=useState(''),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;setLoading(true);setError('');setNote('');
 request<Feedback>('/training-sessions/'+idPath(sessionId)+'/feedback').then(value=>{if(active)setNote(value.note || 'Recovery note is unavailable.');}).catch(e=>{if(active)setError(e.message || 'Unable to load the recovery note.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};
 },[sessionId,attempt]);
 return <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm" aria-live="polite">{loading?'Loading training note…':error?<><span>Results saved. {error}</span> <Btn size="sm" variant="ghost" onClick={()=>setAttempt(n=>n+1)}>Retry note</Btn></>:<><strong>Training note: </strong>{note}</>}</div>;
}
