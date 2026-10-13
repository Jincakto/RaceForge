import { parseDDMMYYYY } from './date.js';

export function sortHealthRecords(records) {
  return records.filter(r=>r.status!=='DRAFT').sort((a, b) => {
    const diff = parseDDMMYYYY(b.date) - parseDDMMYYYY(a.date);
    return diff !== 0 ? diff : (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });
}
