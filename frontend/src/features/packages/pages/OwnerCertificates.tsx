import { getPackageRegistration, getPackageCertificate } from "../api/packagesApi";
import { useEffect, useState } from 'react';
import type { Enrollment, Horse } from '../../../shared/data/data';
import { Btn, Card } from '../../../shared/ui/ui';

interface Certificate {
  certificateNumber: string;
  issueDate: string;
}

export function OwnerCertificates({ ownerId, horses, enrollments }: {
  ownerId: string;
  horses: Horse[];
  enrollments: Enrollment[];
}) {
  const ownedHorses = new Map(horses.filter(horse => horse.ownerId === ownerId).map(horse => [horse.id, horse]));
  const registrations = enrollments.filter(row => ownedHorses.has(row.horseId) && row.apiStatus === 'COMPLETED');
  const registrationIds = JSON.stringify([...new Set(registrations.map(row => row.id))].sort());
  const [loaded, setLoaded] = useState<{ key: string; certificates: Map<string, Certificate>; failed: boolean }>();
  const [revision, setRevision] = useState(0);
  const [downloading, setDownloading] = useState<string>();
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    let active = true;
    const ids: string[] = JSON.parse(registrationIds);
    void Promise.allSettled(ids.map(async id => {
      const detail = await getPackageRegistration(id);
      return [id, detail.certificate] as const;
    })).then(results => {
      if (!active) return;
      const certificates = new Map<string, Certificate>();
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value[1]) certificates.set(result.value[0], result.value[1]);
      }
      setLoaded({ key: registrationIds, certificates, failed: results.some(result => result.status === 'rejected') });
    });
    return () => { active = false; };
  }, [registrationIds, revision]);

  async function download(id: string, certificate: Certificate) {
    setDownloading(id);
    setDownloadError('');
    try {
      const pdf = await getPackageCertificate(id);
      const url = URL.createObjectURL(pdf);
      const link = document.createElement('a');
      link.href = url;
      link.download = certificate.certificateNumber + '.pdf';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setDownloadError((error as Error).message);
    } finally {
      setDownloading(undefined);
    }
  }

  const current = loaded?.key === registrationIds ? loaded : undefined;
  const issued = registrations.flatMap(row => {
    const certificate = current?.certificates.get(row.id);
    return certificate ? [{ row, certificate }] : [];
  }).sort((a, b) => b.certificate.issueDate.localeCompare(a.certificate.issueDate));

  return <section className="space-y-4">
    <h2 className="font-serif text-xl font-bold">Training certificates</h2>
    {current?.failed && <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-red-700">
      Some certificates could not be loaded.
      <Btn variant="secondary" size="sm" onClick={() => { setLoaded(undefined); setRevision(value => value + 1); }}>Retry</Btn>
    </div>}
    {downloadError && <p role="alert" className="text-sm text-red-700">{downloadError}</p>}
    {!current ? <p role="status" className="text-sm text-gray-500">Loading certificates…</p>
      : !issued.length && !current.failed ? <Card className="p-8 text-center text-sm text-gray-500">No training certificates have been issued for your horses yet.</Card>
      : issued.map(({ row, certificate }) => <Card key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h3 className="font-semibold">{ownedHorses.get(row.horseId)?.name}</h3>
          <p className="text-sm text-gray-600">{row.packageName} · {certificate.certificateNumber}</p>
          <p className="text-xs text-gray-500">Issued {certificate.issueDate.split('-').reverse().join('/')}</p>
        </div>
        <Btn variant="gold" disabled={!!downloading} onClick={() => void download(row.id, certificate)}>
          {downloading === row.id ? 'Downloading…' : 'Download PDF'}
        </Btn>
      </Card>)}
  </section>;
}
