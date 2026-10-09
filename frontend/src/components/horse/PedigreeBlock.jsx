export function PedigreeBlock({ horse }) {
  if (!horse.sire && !horse.dam && !horse.damSire && !horse.medicalHistory) return null;
  return (
    <div className="grid grid-cols-3 gap-3 text-sm">
      {[['Cha (Sire)', horse.sire], ['Mẹ (Dam)', horse.dam], ['Cha của mẹ', horse.damSire]].map(([k, v]) => <div key={k} className="p-2.5 bg-gray-50 rounded-lg border border-gray-100"><div className="text-[11px] text-gray-400 uppercase">{k}</div><div className="font-medium">{(v) || '—'}</div></div>)}
      {horse.medicalHistory && <div className="col-span-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100"><div className="text-[11px] text-gray-400 uppercase">Tiền sử bệnh</div><div className="text-gray-700">{horse.medicalHistory}</div></div>}
    </div>
  );
}
