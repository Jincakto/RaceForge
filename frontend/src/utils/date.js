export function toDDMMYYYY(iso) {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

export function shiftDate(d, off) {
  const [dd, mm, yy] = d.split('/').map(Number);
  const x = new Date(yy, mm - 1, dd + off);
  return `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}/${x.getFullYear()}`;
}

export function toISO(d) { const [dd, mm, yy] = d.split('/'); return `${yy}-${mm}-${dd}`; }

// Parse "dd/mm/yyyy" → timestamp for correct chronological sorting
export function parseDDMMYYYY(d) {
  const p = d.split('/');
  if (p.length !== 3) return 0;
  return new Date(+p[2], +p[1] - 1, +p[0]).getTime();
}

export function addWeeks(d, weeks) {
  const [dd, mm, yy] = d.split('/').map(Number);
  const dt = new Date(yy, mm - 1, dd + weeks * 7);
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
}

export function addDays(d, days) {
  const [dd, mm, yy] = d.split('/').map(Number);
  const dt = new Date(yy, mm - 1, dd + days);
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
}
