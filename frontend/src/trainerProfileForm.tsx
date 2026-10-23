import { useEffect, useRef, useState } from 'react';
import type { AppUser } from './data';
import { Btn, Card, Textarea } from './ui';
import { createOwnTrainerProfile, loadOwnTrainerProfile, saveOwnTrainerProfile, type TrainerProfile } from './trainerProfile';

export function TrainerProfileForm({ user }: { user: AppUser }) {
  const [profile, setProfile] = useState<TrainerProfile | null>(null);
  const [bio, setBio] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const flight = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Automatically resolve the profile from the active login session.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoaded(false);
    setError('');
    loadOwnTrainerProfile().then(p => {
      if (!active) return;
      setProfile(p);
      setLoaded(true);
      setBio(p?.bio || '');
      setQualifications(p?.qualifications || '');
    }).catch(e => {
      if (active) setError((e as Error).message);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user.id, retryCount]);

  const save = async () => {
    if (!loaded || loading || saving || flight.current || bio.length > 1000 || qualifications.length > 1000) return;
    flight.current = true;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const p = profile
        ? await saveOwnTrainerProfile(profile, user.id, bio, qualifications)
        : await createOwnTrainerProfile(bio, qualifications);
      setProfile(p);
      setBio(p.bio || '');
      setQualifications(p.qualifications || '');
      setNotice(profile ? 'Professional profile updated successfully.' : 'Professional profile created successfully.');
    } catch (e) {
      // If the server completed the create but the response was lost, do not create duplicates.
      try {
        const latest = await loadOwnTrainerProfile();
        if (latest) { setProfile(latest); setBio(latest.bio || ''); setQualifications(latest.qualifications || ''); }
      } catch { /* Keep the original error. */ }
      setError((e as Error).message);
    } finally {
      flight.current = false;
      setSaving(false);
    }
  };

  return <Card className="p-6 space-y-4">
    <h3 className="font-serif text-lg font-bold text-[#0f1729]">Trainer professional profile</h3>
    {loading ? <p className="text-sm text-gray-500">Loading your professional profile...</p>
    : !loaded ? <Btn variant="secondary" onClick={() => setRetryCount(n => n + 1)}>Retry loading profile</Btn> : <>
      <p className="text-sm text-gray-500">
        {profile ? 'You can update your professional information below.' : 'Complete your professional profile before receiving trainer assignments.'}
      </p>
      {profile && <p className="text-sm text-gray-500">Profile ID: {profile.trainer_id} · Status: {profile.status || 'ACTIVE'}</p>}
      <fieldset disabled={saving} className="space-y-4">
        <Textarea label="Introduction and experience" value={bio} onChange={setBio} rows={5} hint={`${bio.length}/1000 characters`} />
        <Textarea label="Certifications and qualifications" value={qualifications} onChange={setQualifications} rows={5} hint={`${qualifications.length}/1000 characters · Enter the certificate name, issuing organization and year.`} />
      </fieldset>
      <Btn variant="gold" disabled={saving || bio.length > 1000 || qualifications.length > 1000} onClick={save}>
        {saving ? 'Saving...' : profile ? 'Save changes' : 'Create professional profile'}
      </Btn>
    </>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
  </Card>;
}
