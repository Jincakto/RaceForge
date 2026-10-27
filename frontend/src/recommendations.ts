import { normalizeStages } from './trainingSchedule';
import { request, idPath as enc } from './api';
import type { TrainingSuggestion } from './data';
const cache = new Map<string, Promise<any>>();
export function packageRoadmapFor(packageId: string) {
  const key = packageId;
  if (!cache.has(key)) cache.set(key, request(`/horse-packages/${enc(packageId)}/roadmap-template`).then(value => { recommendationView(value); return value; }).catch(e => { cache.delete(key); throw e; }));
  return cache.get(key)!;
}
export function clearRecommendations() { cache.clear(); }
export function recommendationView(value: any): TrainingSuggestion {
  if (!Array.isArray(value?.stages) || !value.stages.length) throw new Error('No package roadmap stages are configured. Contact the club manager.');
  const stages = normalizeStages(value.stages);
  const days = [...new Set(stages.flatMap(s => s.daysOfWeek as string[]))];
  const dayNames: Record<string, string> = { MONDAY:"Monday", TUESDAY:"Tuesday", WEDNESDAY:"Wednesday", THURSDAY:"Thursday", FRIDAY:"Friday", SATURDAY:"Saturday", SUNDAY:'Sun' };
  let sessionCount = 0;
  const dayKeys = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
  for (const stage of stages) for (let day = stage.startDay; day <= stage.endDay; day++) {
    if (!value.startDate) continue;
    const date = new Date(`${value.startDate}T12:00:00`); date.setDate(date.getDate()+day-1);
    if (stage.daysOfWeek.includes(dayKeys[date.getDay()])) sessionCount++;
  }
  const approvedIntensity = stages.some(s => s.intensity === 'HIGH') ? 'HIGH' : stages.some(s => s.intensity === 'MODERATE') ? 'MODERATE' : 'LOW';
  return { stages, phase: value.title || value.packageType || "Package roadmap", approvedIntensity, sessionCount, intensityScore: 0, weeklyKm: 0, sessionsPerWeek: Math.min(days.length, 6), restDaysPerWeek: 7-days.length, highIntensityPercent: 0, lowIntensityPercent: 0,
    weeklySchedule: days.flatMap(day => { const s = stages.find(s => s.daysOfWeek.includes(day)); return s ? [{ day: dayNames[day] || day, type: s.activityName, distance: "According to the training plan", intensity: s.intensity, zone: '' }] : []; }),
    rationale: [value.goal || value.rationale || ''], warnings: [value.limitations || ''], twelveWeekPlan: [] };
}
