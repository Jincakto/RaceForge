export function localDateKey(date=new Date()){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function parseCalendarDate(key){
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(key||'');
  if(!match)throw new Error('Ngày lịch không hợp lệ.');
  const [year,month,day]=match.slice(1).map(Number),date=new Date(year,month-1,day,12);
  if(date.getFullYear()!==year||date.getMonth()!==month-1||date.getDate()!==day)throw new Error('Ngày lịch không hợp lệ.');
  return date;
}
export function addCalendarDays(key,amount){const date=parseCalendarDate(key);date.setDate(date.getDate()+amount);return localDateKey(date);}
export function moveCalendarMonth(key,amount){const date=parseCalendarDate(key),day=date.getDate();date.setDate(1);date.setMonth(date.getMonth()+amount);const last=new Date(date.getFullYear(),date.getMonth()+1,0).getDate();date.setDate(Math.min(day,last));return localDateKey(date);}
export function weekDates(key){const date=parseCalendarDate(key);const offset=(date.getDay()+6)%7;const monday=addCalendarDays(key,-offset);return Array.from({length:7},(_,index)=>addCalendarDays(monday,index));}
export function monthDates(key){const date=parseCalendarDate(key);date.setDate(1);const first=weekDates(localDateKey(date))[0];return Array.from({length:42},(_,index)=>addCalendarDays(first,index));}
export function sessionDay(session){const key=session.scheduledStart?.slice(0,10);try{parseCalendarDate(key);return key;}catch{return null;}}
export function groupSessionsByDay(sessions){const grouped=new Map();for(const session of sessions){const day=sessionDay(session);if(!day)continue;if(!grouped.has(day))grouped.set(day,[]);grouped.get(day).push(session);}for(const list of grouped.values())list.sort((a,b)=>String(a.scheduledStart).localeCompare(String(b.scheduledStart)));return grouped;}
export function sessionLabel(session){if(session.status==='SCHEDULED'&&session.actualStart)return 'Đang tập';return {SCHEDULED:'Đã xếp lịch',COMPLETED:'Hoàn tất',MISSED:'Bỏ buổi',CANCELLED:'Đã hủy'}[session.status]||session.status;}
export function sessionTone(session){return session.status==='SCHEDULED'&&session.actualStart?'running':{SCHEDULED:'scheduled',COMPLETED:'completed',MISSED:'missed',CANCELLED:'missed'}[session.status]||'scheduled';}

export function sessionActivity(session){const first=String(session.notes||'').split(/\r?\n/)[0].trim();return first&&!first.startsWith('MISSED:')?first:null;}

// Display priority only; the calendar retains its chronological placement.
export function sortSessionsForDisplay(sessions,now=new Date()){
  const current=now.getTime();
  const timestamp=session=>{const value=new Date(String(session.scheduledStart||'').replace(/(\.\d{3})\d+/, '$1')).getTime();return Number.isFinite(value)?value:null;};
  const group=session=>session.status==='SCHEDULED'?(session.actualStart?0:(timestamp(session)!==null&&timestamp(session)>=current?1:2)):3;
  return [...sessions].sort((a,b)=>{
    const ga=group(a),gb=group(b);if(ga!==gb)return ga-gb;
    const ta=timestamp(a),tb=timestamp(b);if(ta===null||tb===null)return ta===tb?0:ta===null?1:-1;
    return ga>=2?tb-ta:ta-tb;
  });
}
