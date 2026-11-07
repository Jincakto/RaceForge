import { DAY_KEYS, normalizeStages, seconds, type RoadmapStage } from './trainingSchedule';
export interface PackageRoadmap { title: string; goal: string; revision?: number; stages: RoadmapStage[] }
export function roadmapFromApi(value: any): PackageRoadmap {
  if (!value || !Array.isArray(value.stages)) throw new Error('The package roadmap response is incomplete.');
  return { title: value.title || 'Package roadmap', goal: value.goal || '', revision: value.revision, stages: normalizeStages(value.stages) };
}
export function blankStage(startDay = 1, endDay = 7): RoadmapStage {
  return { startDay, endDay, title: '', phaseCode: 'CUSTOM', objective: '', activityName: '', intensity: 'LOW', daysOfWeek: [], sessionTime: '07:30', sessionEndTime: '08:00' };
}
/** Validate the same calendar and field constraints as the existing package API. */
export function validateRoadmap(value: PackageRoadmap | undefined, duration: number, startDate?: string): string {
  if (!value || !value.title.trim() || value.title.length > 150 || !value.goal.trim() || value.goal.length > 500) return 'Enter a roadmap title (up to 150 characters) and goal (up to 500 characters).';
  if (!Number.isInteger(duration) || duration < 1) return 'Enter a valid package duration before configuring the roadmap.';
  if (!value.stages.length || value.stages.length > 100) return 'Provide 1-100 roadmap stages.';
  let last = 0;
  for (const [i, s] of [...value.stages].sort((a,b) => a.startDay-b.startDay).entries()) {
    const label = `Stage ${i+1}: `;
    if (!Number.isInteger(s.startDay) || !Number.isInteger(s.endDay) || s.startDay < 1 || s.endDay < s.startDay || s.endDay > duration || s.startDay <= last) return label+'day ranges must not overlap and must fall within the package duration.';
    if (!s.title?.trim() || s.title.length > 150 || !s.phaseCode?.trim() || s.phaseCode.length > 50 || (s.objective?.length || 0) > 1000 || !s.activityName?.trim() || s.activityName.length > 500) return label+'enter a title, phase code and activity within their character limits.';
    if (!s.daysOfWeek?.length || s.daysOfWeek.length > 6 || new Set(s.daysOfWeek).size !== s.daysOfWeek.length || s.daysOfWeek.some(d => !DAY_KEYS.includes(d))) return label+'select 1-6 distinct training days.';
    if (!['LOW','MODERATE','HIGH'].includes(s.intensity)) return label+'select a valid intensity.';
    try { if (seconds(s.sessionEndTime) <= seconds(s.sessionTime)) return label+'end time must be after start time on the same day.'; } catch { return label+'enter valid start and end times.'; }
    last = s.endDay;
  }
  // A catalogue template must work for every possible starting weekday.
  for (let offset=0; offset<(startDate ? 1 : 7); offset++) {
    const anchor = new Date((startDate || '2026-01-05')+'T12:00:00');
    if (!Number.isFinite(anchor.getTime())) return 'Enter a valid roadmap start date.';
    anchor.setDate(anchor.getDate()+offset);
    const weeks = new Map<string,Set<string>>();
    for (const s of value.stages) for (let day=s.startDay; day<=s.endDay; day++) {
      const date = new Date(anchor); date.setDate(date.getDate()+day-1);
      if (!s.daysOfWeek.includes(DAY_KEYS[date.getDay()])) continue;
      const monday = new Date(date); monday.setDate(date.getDate()-(date.getDay()+6)%7);
      const key=monday.toDateString(); const days=weeks.get(key) || new Set<string>(); days.add(date.toDateString()); weeks.set(key,days);
      if (days.size>6) return 'The combined stages must leave at least one rest day in every Monday-to-Sunday week.';
    }
  }
  return '';
}
