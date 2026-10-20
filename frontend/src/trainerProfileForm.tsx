import { useEffect, useRef, useState } from 'react';
import type { AppUser } from './data';
import { Btn, Card, Input, Textarea } from './ui';
import { loadOwnTrainerProfile, saveOwnTrainerProfile, type TrainerProfile } from './trainerProfile';

export function TrainerProfileForm({ user }: { user: AppUser }) {
  const [profileId, setProfileId] = useState(user.trainerProfileId || '');
  const [profile, setProfile] = useState<TrainerProfile | null>(null);
  const [bio, setBio] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [busy, setBusy] = useState(false);
  const flight = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!user.trainerProfileId) return;
    let active = true;
    setBusy(true);
    loadOwnTrainerProfile(user.trainerProfileId, user.id).then(p => {
      if (active) { setProfile(p); setBio(p.bio || ''); setQualifications(p.qualifications || ''); }
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [user.id, user.trainerProfileId]);
  const load = async () => {
    if (busy || flight.current) return;
    flight.current = true; setBusy(true); setError(''); setNotice('');
    try { const p = await loadOwnTrainerProfile(profileId, user.id); setProfile(p); setBio(p.bio || ''); setQualifications(p.qualifications || ''); }
    catch (e) { setError((e as Error).message); }
    finally { flight.current = false; setBusy(false); }
  };
  const save = async () => {
    if (!profile || busy || flight.current) return;
    flight.current = true; setBusy(true); setError(''); setNotice('');
    try { const p = await saveOwnTrainerProfile(profile, user.id, bio, qualifications); setProfile(p); setBio(p.bio || ''); setQualifications(p.qualifications || ''); setNotice('Đã lưu hồ sơ chuyên môn trên máy chủ.'); }
    catch (e) { setError((e as Error).message); }
    finally { flight.current = false; setBusy(false); }
  };
  return <Card className="p-6 space-y-4">
    <h3 className="font-serif text-lg font-bold text-[#0f1729]">Hồ sơ chuyên môn Trainer</h3>
    {!profile && <>
      <p className="text-sm text-gray-500">Admin tạo hồ sơ sau khi tài khoản được kích hoạt. Nhập mã hồ sơ Trainer do admin cung cấp để tải thông tin của bạn.</p>
      <Input label="Mã hồ sơ Trainer" value={profileId} onChange={v => { setProfileId(v); setError(''); }} placeholder="HTR-..." />
      <Btn variant="secondary" disabled={busy} onClick={load}>{busy ? 'Đang tải...' : 'Tải hồ sơ'}</Btn>
    </>}
    {profile && <>
      <p className="text-sm text-gray-500">Mã hồ sơ: {profile.trainer_id} · {profile.status || 'ACTIVE'}</p>
      <fieldset disabled={busy} className="space-y-4">
        <Textarea label="Giới thiệu & kinh nghiệm" value={bio} onChange={setBio} rows={5} hint={`${bio.length}/1000 ký tự`} />
        <Textarea label="Chứng chỉ & bằng cấp" value={qualifications} onChange={setQualifications} rows={5} hint={`${qualifications.length}/1000 ký tự · Nhập tên chứng chỉ, đơn vị cấp và năm cấp.`} />
      </fieldset>
      <Btn variant="gold" disabled={busy || bio.length > 1000 || qualifications.length > 1000} onClick={save}>{busy ? 'Đang lưu...' : 'Lưu hồ sơ chuyên môn'}</Btn>
    </>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
  </Card>;
}
