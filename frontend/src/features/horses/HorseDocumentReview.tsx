import { useEffect, useState } from 'react';
import type { Horse } from '../../shared/data/data';
import { Btn } from '../../shared/ui/ui';
import { reviewHorseDocument, type HorseDocumentReport } from './api/horsesApi';

const LABELS: Record<string, string> = {
  MATCHED: 'Content matches', MISMATCH: 'Content differs', INCOMPLETE: 'Manual review needed',
  MANUAL_REVIEW: 'Manual review needed', SOURCE_UNAVAILABLE: 'Document unavailable',
  UNREADABLE: 'Text unavailable', LIMIT_EXCEEDED: 'Manual review needed', MISSING: 'Not extracted',
  AMBIGUOUS: 'Multiple values found', UNSUPPORTED_VALUE: 'Needs manual comparison',
};

/** Only mounted in the manager intake UI; the endpoint also enforces the CM role. */
export function HorseDocumentReview({ horse }: { horse: Horse }) {
  const [report, setReport] = useState<HorseDocumentReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const version = JSON.stringify([horse.id, horse.microchip, horse.name, horse.birthDate, horse.gender, horse.identityEvidence?.fileUrl]);
  useEffect(() => {
    let active = true;
    setReport(null); setError(''); setLoading(true);
    reviewHorseDocument(horse.id).then(value => { if (active) setReport(value); })
      .catch(cause => { if (active) setError((cause as Error).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [horse.id, version, retry]);

  return <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-3 text-sm" aria-label="Document content comparison">
    <div className="flex items-center justify-between gap-2">
      <h4 className="font-semibold">PDF content comparison</h4>
      <Btn size="sm" variant="secondary" disabled={loading} onClick={() => setRetry(n => n + 1)}>Refresh comparison</Btn>
    </div>
    {loading && <p role="status">Reading the stored PDF…</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {report && <>
      <p className={report.status === 'MISMATCH' ? 'font-medium text-red-700' : 'font-medium text-slate-700'}>{LABELS[report.status]}</p>
      <p className="text-xs text-gray-500">{report.message}</p>
      {!!report.fields.length && <div className="overflow-x-auto"><table className="w-full text-left text-xs">
        <thead><tr className="border-b"><th className="p-2">Field</th><th className="p-2">Profile</th><th className="p-2">PDF</th><th className="p-2">Result</th></tr></thead>
        <tbody>{report.fields.map(field => <tr key={field.field} className="border-b">
          <td className="p-2">{field.field}</td><td className="p-2 break-words">{field.profileValue || '—'}</td>
          <td className="p-2 break-words">{field.documentValue || '—'}</td>
          <td className={`p-2 ${field.status === 'MISMATCH' ? 'text-red-700' : ''}`}>{LABELS[field.status]}</td>
        </tr>)}</tbody>
      </table></div>}
      <p className="text-xs text-gray-500">Source: owner-uploaded document · Checked {new Date(report.checkedAt).toLocaleString()}</p>
    </>}
    <p className="text-xs text-amber-900">Issuer authenticity: unverified. Ownership: unverified. This comparison does not pass screening automatically. Review the original document; OCR is not available for scanned PDFs.</p>
  </section>;
}
