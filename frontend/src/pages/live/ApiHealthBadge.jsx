import {useEffect,useState} from 'react';
import {request} from '../../services/api.ts';
export function ApiHealthBadge(){
  const [status,setStatus]=useState('Đang kiểm tra máy chủ...');
  useEffect(()=>{let active=true;request('/api/health').then(()=>active&&setStatus('Máy chủ đã kết nối')).catch(()=>active&&setStatus('Không kết nối được máy chủ'));return()=>{active=false;};},[]);
  return <span role="status" className="text-xs text-slate-600">{status}</span>;
}
