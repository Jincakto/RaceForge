import { horseService } from './horseService.ts';
import { raceService } from './raceService.ts';
import { sessionService } from './sessionService.ts';
// BE has no dashboard/report endpoint: aggregate from the real endpoints that exist.
export async function loadDashboard() {
  const horses = await horseService.list();
  const [races, sessions] = await Promise.all([
    Promise.all(horses.map(h => raceService.byHorse(h.horseId).catch(() => []))),
    Promise.all(horses.map(h => sessionService.byHorse(h.horseId).catch(() => []))),
  ]);
  const allRaces = races.flat(), allSessions = sessions.flat();
  return {
    horses,
    totalHorses: horses.length,
    lockedHorses: horses.filter(h => h.trainingLocked).length,
    injured: horses.filter(h => h.healthStatus === 'INJURED').length,
    races: allRaces,
    wins: allRaces.filter(r => r.finishPosition === 1).length,
    top3: allRaces.filter(r => (r.finishPosition ?? 99) <= 3).length,
    totalPrize: allRaces.reduce((s, r) => s + Number(r.prize || 0), 0),
    sessions: allSessions,
    completedSessions: allSessions.filter(s => s.status === 'COMPLETED').length,
    missedSessions: allSessions.filter(s => s.status === 'MISSED').length,
  };
}
