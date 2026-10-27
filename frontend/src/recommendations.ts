import { request, idPath as enc } from './api';
import type { TrainingSuggestion } from './data';
const cache = new Map<string, Promise<any>>();
export function packageRoadmapFor(packageId: string) {
  const key = packageId;
  if (!cache.has(key)) cache.set(key, request(`/horse-packages/${enc(packageId)}/roadmap-template`).catch(e => { cache.delete(key); throw e; }));
  return cache.get(key)!;
}
export function clearRecommendations() { cache.clear(); }
export function recommendationView(value: any): TrainingSuggestion {
  const stages: any[] = (value.phases || []).map((phase: any) => ({ ...phase, daysOfWeek: [], sessionTime: '07:30', sessionEndTime: '07:30', activityName: '', intensity: 'LOW' }));
  const days = [...new Set(stages.flatMap(s => s.daysOfWeek as string[]))];
  const dayNames: Record<string, string> = { MONDAY:"Monday", TUESDAY:"Tuesday", WEDNESDAY:"Wednesday", THURSDAY:"Thursday", FRIDAY:"Friday", SATURDAY:"Saturday", SUNDAY:'Sun' };
  let sessionCount = 0;
  const dayKeys = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
  for (const stage of stages) for (let day = stage.startDay; day <= stage.endDay; day++) {
    const date = new Date(`${value.startDate}T12:00:00`); date.setDate(date.getDate()+day-1);
    if (stage.daysOfWeek.includes(dayKeys[date.getDay()])) sessionCount++;
  }
  const approvedIntensity = stages.some(s => s.intensity === 'HIGH') ? 'HIGH' : stages.some(s => s.intensity === 'MODERATE') ? 'MODERATE' : 'LOW';
  return { stages, phase: value.title || value.packageType || "Package roadmap", approvedIntensity, sessionCount, intensityScore: 0, weeklyKm: 0, sessionsPerWeek: Math.min(days.length, 6), restDaysPerWeek: 7-days.length, highIntensityPercent: 0, lowIntensityPercent: 0,
    weeklySchedule: days.map(day => { const s = stages.find(s => s.daysOfWeek.includes(day)); return { day: dayNames[day] || day, type: s.activityName, distance: "According to the training plan", intensity: s.intensity, zone: '' }; }),
    rationale: [value.rationale || ''], warnings: [value.limitations || ''], twelveWeekPlan: [] };
}
