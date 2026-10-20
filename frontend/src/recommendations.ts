import { request, idPath as enc } from './api';
import type { TrainingSuggestion } from './data';
const cache = new Map<string, Promise<any>>();
export function recommendationFor(packageId: string, assignmentId: string) {
  const key = `${packageId}:${assignmentId}`;
  if (!cache.has(key)) cache.set(key, request(`/horse-packages/${enc(packageId)}/training-recommendations`, 'POST', { assignmentId }).catch(e => { cache.delete(key); throw e; }));
  return cache.get(key)!;
}
export function clearRecommendations() { cache.clear(); }
export function recommendationView(value: any): TrainingSuggestion {
  const stages: any[] = value.stages || [];
  const days = [...new Set(stages.flatMap(s => s.daysOfWeek as string[]))];
  const dayNames: Record<string, string> = { MONDAY:'Thứ 2', TUESDAY:'Thứ 3', WEDNESDAY:'Thứ 4', THURSDAY:'Thứ 5', FRIDAY:'Thứ 6', SATURDAY:'Thứ 7', SUNDAY:'CN' };
  let sessionCount = 0;
  const dayKeys = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
  for (const stage of stages) for (let day = stage.startDay; day <= stage.endDay; day++) {
    const date = new Date(`${value.startDate}T12:00:00`); date.setDate(date.getDate()+day-1);
    if (stage.daysOfWeek.includes(dayKeys[date.getDay()])) sessionCount++;
  }
  const approvedIntensity = stages.some(s => s.intensity === 'HIGH') ? 'HIGH' : stages.some(s => s.intensity === 'MODERATE') ? 'MODERATE' : 'LOW';
  return { phase: value.packageName || value.packageType || 'Lộ trình được thú y phê duyệt', approvedIntensity, sessionCount, intensityScore: 0, weeklyKm: 0, sessionsPerWeek: Math.min(days.length, 6), restDaysPerWeek: 7-days.length, highIntensityPercent: 0, lowIntensityPercent: 0,
    weeklySchedule: days.map(day => { const s = stages.find(s => s.daysOfWeek.includes(day)); return { day: dayNames[day] || day, type: s.activityName, distance: 'Theo phác đồ', intensity: s.intensity, zone: '' }; }),
    rationale: [value.rationale || '', ...(value.sources || []).map(String)], warnings: [value.limitations || ''], twelveWeekPlan: [] };
}
