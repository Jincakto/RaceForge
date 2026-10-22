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
    try { const p = await saveOwnTrainerProfile(profile, user.id, bio, qualifications); setProfile(p); setBio(p.bio || ''); setQualifications(p.qualifications || ''); setNotice("Professional profile saved on the server."); }
    catch (e) { setError((e as Error).message); }
    finally { flight.current = false; setBusy(false); }
  };
  return <Card className="p-6 space-y-4">
    <h3 className="font-serif text-lg font-bold text-[#0f1729]">Trainer professional profile</h3>
    {!profile && <>
      <p className="text-sm text-gray-500">An administrator creates the profile after account activation. Enter the trainer profile ID provided by your administrator to load your details.</p>
      <Input label="Trainer profile ID" value={profileId} onChange={v => { setProfileId(v); setError(''); }} placeholder="HTR-..." />
      <Btn variant="secondary" disabled={busy} onClick={load}>{busy ? "Loading..." : "Load profile"}</Btn>
    </>}
    {profile && <>
      <p className="text-sm text-gray-500">Profile ID: {profile.trainer_id} · {profile.status || 'ACTIVE'}</p>
      <fieldset disabled={busy} className="space-y-4">
        <Textarea label="Introduction and experience" value={bio} onChange={setBio} rows={5} hint={`${bio.length}/1000 characters`} />
        <Textarea label="Certifications and qualifications" value={qualifications} onChange={setQualifications} rows={5} hint={`${qualifications.length}/1000 characters · Enter the certificate name, issuing organization and year.`} />
      </fieldset>
      <Btn variant="gold" disabled={busy || bio.length > 1000 || qualifications.length > 1000} onClick={save}>{busy ? "Saving..." : "Save professional profile"}</Btn>
    </>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
  </Card>;
}
