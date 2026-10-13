import type { HorseDto, MedicalDto, HorsePackageDto } from '../types/api.ts';

export function packageRegistrationIssues(horse: HorseDto, records: MedicalDto[], packages: HorsePackageDto[], ownerId: number): string[] {
  const issues: string[] = [];
  if (horse.ownerId !== ownerId) issues.push('Bạn chỉ được đăng ký gói cho ngựa của mình.');
  if (horse.admissionStatus !== 'APPROVED') issues.push('Ngựa cần được Manager duyệt tiếp nhận trước.');
  if (!records.some(record => record.examType === 'INITIAL' && record.status === 'CONFIRMED')) issues.push('Chưa có lần khám ban đầu được thú y xác nhận.');
  if (horse.healthStatus !== 'READY') issues.push('Tình trạng sức khỏe của ngựa chưa READY.');
  if (horse.trainingLocked) issues.push('Ngựa đang bị khóa tập.');
  if (packages.some(item => ['PENDING', 'ACTIVE', 'PAUSED'].includes(item.status))) issues.push('Ngựa đang có gói chờ thanh toán, đang hoạt động hoặc tạm dừng.');
  return issues;
}
