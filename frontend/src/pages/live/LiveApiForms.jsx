import { useState } from 'react';

export function ApiForm({ title, fields, initial = {}, submitLabel = 'Lưu', onSubmit, disabled = false }) {
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  return <form className="bg-white border rounded-xl p-4 space-y-3" onSubmit={async e => {
    e.preventDefault(); if (busy || disabled) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const data = {};
      fields.forEach(f => {
        const value = values[f.name];
        if (value !== '' && value !== undefined && value !== null) data[f.name] = f.type === 'number' ? Number(value) : value;
      });
      await onSubmit(data); setNotice('Thao tác thành công.');
    } catch (err) { setError(err.message || 'Không thực hiện được thao tác.'); }
    finally { setBusy(false); }
  }}><h2 className="text-lg font-bold">{title}</h2><fieldset disabled={busy || disabled} className="space-y-3">{fields.map(f => <label key={f.name} className="block text-sm">{f.label}
    {f.options ? <select required={f.required} className="block border rounded p-2 w-full text-slate-900 bg-white" value={values[f.name] ?? ''} onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))}><option value="">Chọn...</option>{f.options.map(o => <option key={o} value={o}>{o}</option>)}</select>
      : <input className="block border rounded p-2 w-full" type={f.type || 'text'} required={f.required} min={f.min} max={f.max} step={f.type === 'number' ? 'any' : undefined} maxLength={f.maxLength} value={values[f.name] ?? ''} onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))}/>}</label>)}<button type="submit" data-tone="primary" className="bg-slate-800 text-white rounded px-4 py-2">{busy ? 'Đang gửi...' : submitLabel}</button></fieldset>{error && <p role="alert" className="text-red-700">{error}</p>}{notice && <p role="status" className="text-green-700">{notice}</p>}</form>;
}

export function ReadableDetails({ data }) {
  if (!data) return null;
  return <dl className="bg-white border rounded p-3 space-y-1">{Object.entries(data).map(([key, value]) => <div key={key} className="flex flex-wrap gap-2"><dt className="font-medium">{key}:</dt><dd className="break-all">{value && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—')}</dd></div>)}</dl>;
}
