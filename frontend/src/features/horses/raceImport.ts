import type { RaceHistoryEntry } from '../../shared/data/data';

export interface RaceImportRow {
  line: number;
  entry?: RaceHistoryEntry;
  errors: string[];
}

const ALIASES: Record<string, string[]> = {
  raceName: ['race name', 'race', 'racename', 'ten cuoc dua', 'ten giai'],
  date: ['date', 'race date', 'racedate', 'ngay', 'ngay dua'],
  distance: ['distance', 'cu ly', 'cự ly', 'distance m'],
  position: ['position', 'finish position', 'finishposition', 'rank', 'thu hang', 'thứ hạng'],
  totalHorses: ['total runners', 'runners', 'total horses', 'so ngua'],
  time: ['time', 'completion time', 'completiontime', 'thoi gian'],
  venue: ['racecourse', 'venue', 'track', 'truong dua'],
  jockey: ['jockey', 'jockey name', 'jockeyname', 'nai ngua'],
  prize: ['prize', 'prize money', 'tien thuong'],
};

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase();

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cur = '', q = false;
  const t = text.replace(/^﻿/, '');
  const delim = (t.split('\n')[0].match(/;/g) || []).length > (t.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      row.push(cur); rows.push(row); row = []; cur = '';
    } else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

export async function readRows(file: File): Promise<unknown[][]> {
  if (/\.csv$/i.test(file.name)) return parseCsv(await file.text());
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import('read-excel-file/browser');
    return (await readSheet(file)) as unknown[][];
  }
  throw new Error('Only .xlsx or .csv files are supported.');
}

function toDate(v: unknown): { dd: string; iso: string } | null {
  let y = 0, m = 0, d = 0;
  if (v instanceof Date && !isNaN(v.getTime())) { y = v.getFullYear(); m = v.getMonth() + 1; d = v.getDate(); }
  else {
    const s = String(v ?? '').trim();
    let a = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
    if (a) { d = +a[1]; m = +a[2]; y = +a[3]; }
    else if ((a = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) { y = +a[1]; m = +a[2]; d = +a[3]; }
    else return null;
  }
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  const p = (n: number) => String(n).padStart(2, '0');
  return { dd: `${p(d)}/${p(m)}/${y}`, iso: `${y}-${p(m)}-${p(d)}` };
}

const num = (v: unknown) => Number(String(v ?? '').replace(/[^\d.]/g, ''));

export function parseRaceRows(rows: unknown[][], opts: { birthIso?: string; todayIso: string }): RaceImportRow[] {
  if (!rows.length) throw new Error('The file is empty.');
  const header = rows[0].map(norm);
  const col: Record<string, number> = {};
  for (const [k, names] of Object.entries(ALIASES)) col[k] = header.findIndex(h => names.includes(h));
  for (const req of ['raceName', 'date', 'distance', 'position'])
    if (col[req] < 0) throw new Error(`Missing column "${ALIASES[req][0]}". Use the sample file for the right headers.`);
  const get = (r: unknown[], k: string) => (col[k] >= 0 ? r[col[k]] : '');
  const out: RaceImportRow[] = [];
  rows.slice(1).forEach((r, i) => {
    if (r.every(c => String(c ?? '').trim() === '')) return;
    const errors: string[] = [];
    const raceName = String(get(r, 'raceName') ?? '').trim();
    if (!raceName) errors.push('Race name is required.');
    else if (raceName.length > 150) errors.push('Race name is too long (max 150).');
    const dt = toDate(get(r, 'date'));
    if (!dt) errors.push('Invalid date (use dd/mm/yyyy).');
    else if (dt.iso > opts.todayIso) errors.push('Race date cannot be in the future.');
    else if (opts.birthIso && dt.iso < opts.birthIso) errors.push('Race date is before the horse was born.');
    const distance = num(get(r, 'distance'));
    if (!(distance > 0)) errors.push('Distance must be greater than 0.');
    const position = num(get(r, 'position'));
    if (!Number.isInteger(position) || position <= 0) errors.push('Position must be a whole number above 0.');
    const prizeRaw = String(get(r, 'prize') ?? '').trim();
    if (prizeRaw && !Number.isFinite(num(prizeRaw))) errors.push('Invalid prize.');
    const time = String(get(r, 'time') ?? '').trim();
    if (time.length > 20) errors.push('Time is too long (max 20).');
    const venue = String(get(r, 'venue') ?? '').trim();
    const jockey = String(get(r, 'jockey') ?? '').trim();
    if (venue.length > 150) errors.push('Racecourse is too long.');
    if (jockey.length > 100) errors.push('Jockey name is too long.');
    const entry: RaceHistoryEntry | undefined = errors.length ? undefined : {
      id: `rh${Date.now()}_${i}`,
      date: dt!.dd, raceName, distance: `${distance}m`, position,
      totalHorses: num(get(r, 'totalHorses')) || 0,
      time, venue, jockey, prize: prizeRaw ? String(num(prizeRaw)) : '0',
    };
    out.push({ line: i + 2, entry, errors });
  });
  if (!out.length) throw new Error('No data rows found.');
  return out;
}

export const SAMPLE_CSV =
  'Race name,Date,Distance,Position,Time,Racecourse,Jockey,Prize\n' +
  'Spring Cup,15/03/2026,1200,1,1:11.24,Phu Tho,Nguyen Van A,50000000\n';
