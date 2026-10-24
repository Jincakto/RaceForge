import { request, idPath } from './api';

export interface TrainerProfile {
  trainer_id: string;
  user_id: string;
  bio?: string;
  qualifications?: string;
  status?: string;
}

// User identity comes from the access token on the server; no trainer ID is entered.
export async function loadOwnTrainerProfile(): Promise<TrainerProfile | null> {
  return request<TrainerProfile | null>('/trainer-profiles/me');
}

export async function createOwnTrainerProfile(bio: string, qualifications: string): Promise<TrainerProfile> {
  validateProfile(bio, qualifications);
  return request<TrainerProfile>('/trainer-profiles', 'POST', {
    bio: bio.trim(), qualifications: qualifications.trim(),
  });
}

export async function saveOwnTrainerProfile(profile: TrainerProfile, userId: string, bio: string, qualifications: string): Promise<TrainerProfile> {
  if (profile.user_id !== userId) throw new Error('You may only update your own profile.');
  validateProfile(bio, qualifications);
  return request<TrainerProfile>(`/trainer-profiles/${idPath(profile.trainer_id)}`, 'PUT', {
    bio: bio.trim(), qualifications: qualifications.trim(),
  });
}

function validateProfile(bio: string, qualifications: string): void {
  if (bio.length > 1000 || qualifications.length > 1000)
    throw new Error('Each field may contain up to 1000 characters.');
}
