import { request, idPath } from './api';
export interface TrainerProfile { trainer_id: string; user_id: string; bio?: string; qualifications?: string; status?: string; }
export async function loadOwnTrainerProfile(profileId: string, userId: string): Promise<TrainerProfile> {
  if (!profileId.trim()) throw new Error("Enter the trainer profile ID provided by your administrator.");
  const profile = await request<TrainerProfile>(`/trainer-profiles/${idPath(profileId.trim())}`);
  if (profile.user_id !== userId) throw new Error("This profile does not belong to your account.");
  return profile;
}
export async function saveOwnTrainerProfile(profile: TrainerProfile, userId: string, bio: string, qualifications: string): Promise<TrainerProfile> {
  if (profile.user_id !== userId) throw new Error("You may only update your own profile.");
  if (bio.length > 1000 || qualifications.length > 1000) throw new Error("Each field may contain up to 1000 characters.");
  return request<TrainerProfile>(`/trainer-profiles/${idPath(profile.trainer_id)}`, 'PUT', { bio: bio.trim(), qualifications: qualifications.trim() });
}
