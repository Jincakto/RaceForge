import { horseService } from './horseService.ts';
import { healthService } from './healthService.ts';
import { trainingService } from './trainingService.ts';
import type { MedicalDto, TrainingLockDto } from '../types/api.ts';

// A health profile is created by admission approval, not by activation.
export async function loadHorseWorkflow(horseId: number, role: string | null) {
  const horse = await horseService.get(horseId);
  const admitted = horse.admissionStatus === 'APPROVED';
  return Promise.all([
    Promise.resolve(horse),
    admitted ? healthService.list(horseId) : Promise.resolve<MedicalDto[]>([]),
    admitted ? healthService.lockHistory(horseId) : Promise.resolve<TrainingLockDto[]>([]),
    trainingService.catalog(),
    role === 'owner' ? trainingService.history(horseId) : Promise.resolve(undefined),
    admitted && role === 'veterinarian' ? horseService.profile(horseId) : Promise.resolve(0),
  ]);
}
