export function numOf(v) { return v.trim() === '' ? NaN : Number(v.replace(',', '.')); }

export function fmtQty(n) { return String(Math.round(n * 100) / 100); }
