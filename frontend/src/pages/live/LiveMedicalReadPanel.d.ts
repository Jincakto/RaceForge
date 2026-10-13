import type { ComponentType } from 'react';
import type { MedicalDto } from '../../types/api.ts';
export const LiveMedicalReadPanel: ComponentType<{ horseId: number; records?: MedicalDto[] }>;
