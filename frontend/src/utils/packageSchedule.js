import {parseCalendarDate,localDateKey} from './trainingCalendar.js';
export const weekdays=[['MONDAY','Thứ Hai'],['TUESDAY','Thứ Ba'],['WEDNESDAY','Thứ Tư'],['THURSDAY','Thứ Năm'],['FRIDAY','Thứ Sáu'],['SATURDAY','Thứ Bảy'],['SUNDAY','Chủ nhật']];
const names=['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
export function packageScheduleDates(pack,days){
  if(!pack?.startDate||!pack?.endDate||!days?.length)return [];
  const start=parseCalendarDate(pack.startDate),end=parseCalendarDate(pack.endDate);
  if(end<start)return [];
  const dates=[];
  for(let date=new Date(start);date<=end;date.setDate(date.getDate()+1)){
    if(days.includes(names[date.getDay()]))dates.push(localDateKey(date));
  }
  return dates;
}
export function packageCalendarDays(pack){
  if(!pack?.startDate||!pack?.endDate)return 0;
  const a=parseCalendarDate(pack.startDate),b=parseCalendarDate(pack.endDate);
  return Math.round((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate())-Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()))/86400000)+1;
}
