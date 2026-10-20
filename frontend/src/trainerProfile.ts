import { request, idPath } from './api';
export interface TrainerProfile { trainer_id: string; user_id: string; bio?: string; qualifications?: string; status?: string; }
export async function loadOwnTrainerProfile(profileId: string, userId: string): Promise<TrainerProfile> {
  if (!profileId.trim()) throw new Error('Nhập mã hồ sơ Trainer do admin cung cấp.');
  const profile = await request<TrainerProfile>(`/trainer-profiles/${idPath(profileId.trim())}`);
  if (profile.user_id !== userId) throw new Error('Mã hồ sơ không thuộc tài khoản của bạn.');
  return profile;
}
export async function saveOwnTrainerProfile(profile: TrainerProfile, userId: string, bio: string, qualifications: string): Promise<TrainerProfile> {
  if (profile.user_id !== userId) throw new Error('Bạn chỉ được cập nhật hồ sơ của mình.');
  if (bio.length > 1000 || qualifications.length > 1000) throw new Error('Mỗi nội dung tối đa 1000 ký tự.');
  return request<TrainerProfile>(`/trainer-profiles/${idPath(profile.trainer_id)}`, 'PUT', { bio: bio.trim(), qualifications: qualifications.trim() });
}
