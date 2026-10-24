/** ISO LocalDateTime in the backend's Bangkok timezone, independent of locale punctuation. */
export function trainingTimestamp(date = new Date()): string {
 const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
  timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',fractionalSecondDigits:3,hourCycle:'h23'
 }).formatToParts(date).map(part => [part.type,part.value]));
 return parts.year+'-'+parts.month+'-'+parts.day+'T'+parts.hour+':'+parts.minute+':'+parts.second+'.'+parts.fractionalSecond;
}
