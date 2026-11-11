import { useEffect, useRef, useState } from 'react';
import { request } from '../../shared/api/api';
import type { Res } from '../../shared/data/data';
import { Btn, Card } from '../../shared/ui/ui';

export interface TrainerResumption {
  horsePackageId: string; horseId: string; horseName: string;
  packageName: string; packageType: string; remainingDays: number;
  eligibleForResumption: boolean;
}

/** Vet clearance preserves paid days; the assigned trainer chooses when to resume. */
export function TrainingResumptions({ revision, onAccept }: {
  revision: unknown; onAccept: (id: string) => Promise<Res<null>>;
}) {
  const [rows, setRows] = useState<TrainerResumption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const flight = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    request<TrainerResumption[]>('/horse-packages/resumptions/mine')
      .then(data => { if (active) setRows(data); })
      .catch(e => { if (active) { setRows([]); setError(e.message || 'Unable to load training resumptions.'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision, refresh]);
  async function accept(id: string) {
    if (flight.current) return;
    flight.current = true; setBusy(id); setError('');
    try {
      const result = await onAccept(id);
      if (result.ok) setRefresh(n => n + 1);
      else setError(result.message);
    } catch (e) { setError((e as Error).message); }
    finally { flight.current = false; setBusy(null); }
  }
  if (loading && rows.length === 0) return <p role="status" className="text-sm text-slate-500">Checking packages ready to resume...</p>;
  return <section aria-label="Training resumption" className="space-y-3">
    {error && <div role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{error} <Btn size="sm" variant="secondary" disabled={!!busy} onClick={() => setRefresh(n => n + 1)}>Retry</Btn></div>}
    {rows.map(row => <Card key={row.horsePackageId} className="border-l-4 border-emerald-400 bg-emerald-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="font-semibold text-emerald-900">{row.horseName} is medically cleared</h3>
          <p className="text-sm text-emerald-800">{row.packageName} has {row.remainingDays} preserved days. Accept to restart the package period from today.</p>
          {!row.eligibleForResumption && <p className="text-xs text-amber-800">Resolve other active packages or pending payments before resuming.</p>}
        </div>
        <Btn variant="gold" disabled={loading || !!busy || !row.eligibleForResumption} onClick={() => void accept(row.horsePackageId)}>{busy === row.horsePackageId ? 'Resuming...' : 'Accept training resumption'}</Btn>
      </div>
    </Card>)}
  </section>;
}
