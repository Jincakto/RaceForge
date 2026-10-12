import { ApiHorseRegistration } from '../horses/ApiHorseRegistration.tsx';
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { AppUser, Horse } from '../../data.ts';
import type { HorseDto, MedicalCreateDto, MedicalDto, MedicalUpdateDto, HorsePackageDto } from '../../types/api.ts';
import { liveApi } from '../../services/api.ts';
import { horseService } from '../../services/horseService.ts';
import { healthService } from '../../services/healthService.ts';
import { trainingService } from '../../services/trainingService.ts';
import { applyConfirmedMedical, canRegisterPackage, canResume, reconcileResume } from '../../utils/horseWorkflow.ts';
import { emptyHorseData, demoId, demoPackage, withPayment, remainingDays, type WorkflowStore } from '../../utils/workflowStore.ts';
import { VetHealthFormPage } from '../health/VetHealthFormPage.tsx';
import { MedicalSummary } from '../../components/training/MedicalSummary.tsx';
import { TrainingLockPanel } from '../../components/training/TrainingLockPanel.tsx';
import { RecoveryPanel } from '../../components/training/RecoveryPanel.tsx';
import { PackagePanel } from '../../components/training/PackagePanel.tsx';
import { ResumePanel } from '../../components/training/ResumePanel.tsx';

export function WorkflowWorkspace({ user, legacyHorses, store, setStore }: { user: AppUser; legacyHorses: Horse[]; store: WorkflowStore; setStore: Dispatch<SetStateAction<WorkflowStore>> }) {
  const horses = store.horses.filter(h => user.role !== 'owner' || h.ownerId === user.id);
  const [registering,setRegistering]=useState(false);
  const [selected, setSelected] = useState(horses[0]?.horseId || 0);
  const [recordId, setRecordId] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(!liveApi);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const running = useRef(false);
  const horse = horses.find(h => h.horseId === selected);
  const data = store.byHorse[selected] || emptyHorseData();
  const record = data.records.find(r => r.medicalRecordId === recordId);
  const veterinarian = user.role === 'veterinarian';
  const manager = user.role === 'manager';
  const owner = user.role === 'owner';
  function updateHorse(next: HorseDto) { setStore(s => ({ ...s, horses: s.horses.map(h => h.horseId === next.horseId ? next : h) })); }
  function updateData(patch: Partial<typeof data>) { setStore(s => ({ ...s, byHorse: { ...s.byHorse, [selected]: { ...(s.byHorse[selected] || emptyHorseData()), ...patch } } })); }
  function upsertMedical(next: MedicalDto) { updateData({ records: [...data.records.filter(r => r.medicalRecordId !== next.medicalRecordId), next] }); setRecordId(next.medicalRecordId); }
  function upsertPackage(next: HorsePackageDto) { updateData({ packages: [...data.packages.filter(p => p.horsePackageId !== next.horsePackageId), next] }); }
  async function refresh(id: number) {
    if (!liveApi) return;
    const [nextHorse, records, locks, catalog, packages] = await Promise.all([horseService.get(id), healthService.list(id), healthService.lockHistory(id), trainingService.catalog(), owner ? trainingService.history(id) : Promise.resolve(undefined)]);
    setStore(s => ({ ...s, horses: s.horses.map(h => h.horseId === id ? nextHorse : h), catalog, byHorse: { ...s.byHorse, [id]: { ...(s.byHorse[id] || emptyHorseData()), records, locks, ...(packages ? { packages } : {}) } } }));
    setLoaded(true);
  }
  useEffect(() => {
    if (!liveApi) return;
    let active = true;
    setLoaded(false);
    horseService.list().then(list => { if (!active) return; setStore(s => ({ ...s, horses: list })); setSelected(list.find(h => user.role !== 'owner' || h.ownerId === user.id)?.horseId || 0); }).catch(e => active && setError(e.message));
    return () => { active = false; };
  }, [user.id, user.role, setStore]);
  useEffect(() => {
    if (!liveApi || !selected) return;
    let active = true;
    setLoaded(false); setError(''); setRecordId(0);
    Promise.all([horseService.get(selected), healthService.list(selected), healthService.lockHistory(selected), trainingService.catalog(), owner ? trainingService.history(selected) : Promise.resolve(undefined)]).then(([nextHorse, records, locks, catalog, packages]) => {
      if (!active) return;
      setStore(s => ({ ...s, horses: s.horses.map(h => h.horseId === selected ? nextHorse : h), catalog, byHorse: { ...s.byHorse, [selected]: { ...(s.byHorse[selected] || emptyHorseData()), records, locks, packages: packages || [] } } })); setLoaded(true);
    }).catch(e => active && setError(e.message));
    return () => { active = false; };
  }, [selected, owner, setStore]);
  async function act(action: () => Promise<void>) {
    if (running.current || !horse || !loaded) return;
    running.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); setNotice('Đã thực hiện thành công.'); }
    catch(e) { const message=e instanceof Error?e.message:'Không thể thực hiện.'; setError(message); throw e; }
    finally { running.current=false; setBusy(false); }
  }
  async function refreshAfterMutation() { if (liveApi) { setLoaded(false); try { await refresh(selected); } catch { setError('Thao tác đã thành công nhưng tải lại dữ liệu thất bại. Bấm Tải lại trước thao tác tiếp theo.'); } } }
  async function save(body: MedicalCreateDto | MedicalUpdateDto) { return act(async () => {
    if (!veterinarian) throw new Error('Chỉ thú y được lưu Medical.');
    const { examinedAt, healthStatus, diagnosis, treatment, medication, careRecommendation, notes, vitalSign, clinicalExams } = body;
    const update: MedicalUpdateDto = { examinedAt, healthStatus, diagnosis, treatment, medication, careRecommendation, notes, vitalSign, clinicalExams };
    const next: MedicalDto = liveApi ? record ? await healthService.saveDraft(record.medicalRecordId,update) : await healthService.createDraft(body as MedicalCreateDto) : { ...(body as MedicalCreateDto), ...(record || {}), ...update, correctionOfId: record?.correctionOfId ?? null, medicalRecordId: record?.medicalRecordId || demoId(), veterinarianId: user.id, systemNote: 'DEMO — đánh giá cuối cùng do BE thực hiện.', trainingNote: 'DEMO_DRAFT_REVIEW_REQUIRED', status: 'DRAFT', confirmedAt: null, createdAt: record?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    upsertMedical(next);
  }); }
  async function confirm(id: number) { return act(async () => {
    if (!veterinarian) throw new Error('Chỉ thú y được Confirm.');
    const draft = data.records.find(r => r.medicalRecordId === id);
    if (!draft || draft.status !== 'DRAFT' || draft.veterinarianId !== user.id) throw new Error('Chỉ Confirm bản nháp đã lưu.');
    if (!liveApi && (!draft.healthStatus || !draft.vitalSign || Object.values(draft.vitalSign).some(v=>v===null || v<=0) || draft.clinicalExams.some(e => !e.conditionStatus || (e.conditionStatus !== 'NORMAL' && !e.severity)) || draft.clinicalExams.length < 6)) throw new Error('Hoàn tất các mục khám lâm sàng trước Confirm.');
    const critical = draft.clinicalExams.some(e => ['SEVERE','CRITICAL'].includes(e.severity || '')) || (draft.vitalSign?.bodyTemperature ?? 0) >= 39 || (draft.vitalSign?.restingHeartRate ?? 0) > 60;
    if (!liveApi && critical && draft.healthStatus === 'READY') throw new Error('Không được READY khi có chỉ số nghiêm trọng.');
    const next = liveApi ? await healthService.confirm(id) : { ...draft, status: 'CONFIRMED' as const, confirmedAt: new Date().toISOString(), systemNote: 'DEMO — hồ sơ đã xác nhận.', trainingNote: critical || draft.healthStatus !== 'READY' ? 'TRAINING_LOCK' : 'ALLOW_TRAINING' };
    upsertMedical(next);
    if (liveApi) await refreshAfterMutation();
    else {
      const updated=applyConfirmedMedical(horse!,next); updateHorse(updated);
      if (critical) updated.trainingLocked = true;
      if ((critical || next.healthStatus !== 'READY') && updated.trainingLocked && !data.locks.some(l=>!l.unlockedAt)) updateData({ records: [...data.records.filter(r=>r.medicalRecordId!==id),next], locks: [...data.locks,{lockId:demoId(),horseId:selected,medicalRecordId:id,lockedById:user.id,unlockedById:null,lockedAt:new Date().toISOString(),lockReason:next.healthStatus || 'CRITICAL',unlockedAt:null,unlockReason:null}] });
    }
  }); }
  async function unlock(reason: string) { return act(async()=>{
    if (!data.locks.some(l=>!l.unlockedAt)) throw new Error('Chưa có Training Lock đang hoạt động trong lịch sử. Hãy kiểm tra dữ liệu.');
    if (!veterinarian || horse!.healthStatus !== 'READY' || !horse!.trainingLocked || !reason.trim()) throw new Error('Cần thú y, READY, khóa hiện tại và lý do.');
    if(liveApi){await healthService.unlock(selected,reason);await refreshAfterMutation();}
    else {updateHorse({...horse!,trainingLocked:false});updateData({locks:data.locks.map(l=>!l.unlockedAt?{...l,unlockedById:user.id,unlockedAt:new Date().toISOString(),unlockReason:reason.trim()}:l)});}
  }); }
  async function register(packageId:number) { return act(async()=>{
    if(!owner || !canRegisterPackage(horse!,data.records,data.packages)) throw new Error('Ngựa chưa đủ điều kiện đăng ký.');
    const pkg=store.catalog.find(p=>p.packageId===packageId);if(!pkg)throw new Error('Gói không tồn tại.');
    const next=liveApi?await trainingService.register(selected,packageId):demoPackage(selected,pkg);upsertPackage(next);await refreshAfterMutation();
  }); }
  async function pay(pkg:HorsePackageDto,successful:boolean){return act(async()=>{
    if(!owner || pkg.status!=='PENDING' || pkg.paymentStatus!=='PENDING')throw new Error('Gói không chờ thanh toán.');
    const next=liveApi?await trainingService.pay(pkg.horsePackageId,successful,pkg.packageType==='RECOVERY'):withPayment(pkg,successful,store.catalog.find(p=>p.packageId===pkg.packageId)?.durationDays||14);upsertPackage(next);await refreshAfterMutation();
  });}
  async function recovery(packageId:number,reason:string){return act(async()=>{
    if(!manager || !horse!.trainingLocked || !data.locks.some(l=>!l.unlockedAt && data.records.some(r=>r.medicalRecordId===l.medicalRecordId && r.status==='CONFIRMED')))throw new Error('Cần CM và Training Lock hiện tại.');
    if(liveApi){const next=await trainingService.approveRecovery(selected,packageId,reason);upsertPackage(next);await refreshAfterMutation();}
    else {if(data.packages.some(p=>p.packageType==='RECOVERY' && ['PENDING','ACTIVE'].includes(p.status)))throw new Error('Đã có gói Recovery.');const pkg=store.catalog.find(p=>p.packageId===packageId);if(!pkg)throw new Error('Gói không tồn tại.');const original=data.packages.find(p=>p.status==='ACTIVE' && p.packageType!=='RECOVERY');const next={...demoPackage(selected,pkg),replacedHorsePackageId:original?.horsePackageId||null};updateData({packages:[...data.packages.map(p=>p.horsePackageId===original?.horsePackageId?{...p,status:'PAUSED',remainingDays:remainingDays(p)}:p),next]});}
  });}
  async function resume(id:number,reason:string){return act(async()=>{
    if(!manager || !reason.trim())throw new Error('Cần CM và lý do Resume.');
    const recovery=data.packages.find(p=>p.horsePackageId===id);
    if(!liveApi && (!recovery || !canResume(horse!,recovery,data.packages)))throw new Error('Chưa đủ điều kiện Resume.');
    const original=liveApi?await trainingService.resume(id,reason):(()=>{const p=data.packages.find(p=>p.horsePackageId===recovery!.replacedHorsePackageId)!;const paid=withPayment(p,true,p.remainingDays!);return {...paid,paidAt:p.paidAt,remainingDays:p.remainingDays};})();
    updateData({packages:reconcileResume(data.packages,id,original)});await refreshAfterMutation();
  });}
  return <div className="space-y-5"><header className="bg-[#1a2844] text-white p-5 rounded-xl"><h1 className="text-2xl font-bold">Medical & Training</h1><p>{liveApi?'API trực tiếp':'DEMO · dữ liệu giữ trong phiên trang, không gửi BE; Profile ID dùng số dương để thử'} · Đăng ký → CM Approval → Initial Medical → Training Package</p></header>{owner && liveApi && <><button className="bg-[#c9973b] text-white rounded px-4 py-2" onClick={()=>setRegistering(!registering)}>Đăng ký ngựa mới</button>{registering && <ApiHorseRegistration ownerId={user.id} onCreated={next=>{setStore(s=>({...s,horses:[...s.horses,next]}));setSelected(next.horseId);setRegistering(false);}}/>}</>}<div className="flex gap-3"><select aria-label="Chọn ngựa" disabled={busy} value={selected} onChange={e=>{setSelected(Number(e.target.value));setRecordId(0);setNotice('');}} className="border rounded p-2"><option value={0}>Chọn ngựa</option>{horses.map(h=><option key={h.horseId} value={h.horseId}>#{h.horseId} · {h.horseName}</option>)}</select>{liveApi && <button disabled={busy} className="border rounded px-3" onClick={()=>{setBusy(true);setError('');refresh(selected).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}>Tải lại</button>}</div>{error && <p role="alert" className="text-red-700">{error}</p>}{notice && <p role="status" className="text-emerald-700">{notice}</p>}{!horse && <p>Chưa có ngựa. Đăng ký hồ sơ trước.</p>}{horse && <><TrainingLockPanel horse={horse} history={data.locks} veterinarian={veterinarian} busy={busy||!loaded} onUnlock={unlock}/>{veterinarian && <><div className="flex gap-2"><select aria-label="Chọn hồ sơ Medical" disabled={busy} value={recordId} className="border rounded p-2" onChange={e=>setRecordId(Number(e.target.value))}><option value={0}>Tạo Medical mới</option>{data.records.map(r=><option key={r.medicalRecordId} value={r.medicalRecordId}>#{r.medicalRecordId} · {r.status}</option>)}</select></div><VetHealthFormPage key={`${selected}-${recordId}-${record?.updatedAt}`} record={record} busy={busy||!loaded||!!(record && record.veterinarianId!==user.id)} initialAllowed={liveApi || legacyHorses.find(h=>h.id===selected)?.approvalStatus==='approved'} onSave={save} onConfirm={confirm}/></>}<MedicalSummary records={data.records}/>{manager && <><RecoveryPanel catalog={store.catalog} locked={horse.trainingLocked && data.locks.some(l=>!l.unlockedAt && data.records.some(r=>r.medicalRecordId===l.medicalRecordId && r.status==='CONFIRMED'))} busy={busy||!loaded} onApprove={recovery}/>{liveApi && <p className="text-amber-700 text-sm">BE giới hạn lịch sử gói cho chủ ngựa. CM dùng Recovery ID thực tế khi Resume; BE kiểm tra điều kiện.</p>}<ResumePanel horse={horse} packages={data.packages} busy={busy||!loaded} onResume={resume}/></>}<PackagePanel catalog={store.catalog} packages={data.packages} eligible={canRegisterPackage(horse,data.records,data.packages)} busy={busy||!loaded} owner={owner} onRegister={register} onPay={pay}/></>}</div>;
}
