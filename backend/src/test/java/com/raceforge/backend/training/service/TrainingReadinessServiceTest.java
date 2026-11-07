package com.raceforge.backend.training.service;
import com.raceforge.backend.training.entity.TrainingSession;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
class TrainingReadinessServiceTest {
    static final LocalDateTime NOW = LocalDateTime.of(2026,11,3,12,0);
    static TrainingSession row(int days,String intensity) {
        var s=new TrainingSession();s.setStatus("COMPLETED");s.setIntensity(intensity);
        s.setActualEnd(NOW.minusDays(days));s.setActualStart(s.getActualEnd().minusMinutes(30));return s;
    }
    static List<TrainingSession> stable(String level) {
        return new ArrayList<>(List.of(row(31,level),row(24,level),row(20,level),row(17,level),row(10,level),row(8,level),row(1,level)));
    }
    @Test void noHistoryIsStarter(){assertTrue(TrainingReadinessService.analyze(List.of(),NOW).starter());}
    @Test void exactThirtyDayCycleWithSixRecentAcrossThreeWeeks(){var p=TrainingReadinessService.analyze(stable("LOW"),NOW);assertEquals("LOW",p.observedStableIntensity());assertEquals(6,p.completedSessions());}
    @Test void sixRecentWithoutThirtyDayCycleIsUnknown(){var rows=stable("LOW");rows.remove(0);assertEquals("UNKNOWN",TrainingReadinessService.analyze(rows,NOW).observedStableIntensity());}
    @Test void mixedIntensityCannotProveHigh(){var rows=stable("LOW");rows.add(row(2,"HIGH"));assertEquals("LOW",TrainingReadinessService.analyze(rows,NOW).observedStableIntensity());}
    @Test void highestStableLevelWins(){var rows=stable("LOW");rows.addAll(stable("MODERATE"));assertEquals("MODERATE",TrainingReadinessService.analyze(rows,NOW).observedStableIntensity());}
    @Test void futureMissingEndAndNullIntensityAreExcludedWithoutStarterFallback(){var missing=row(1,"LOW");missing.setActualEnd(null);var p=TrainingReadinessService.analyze(List.of(row(-1,"HIGH"),missing,row(1,null)),NOW);assertFalse(p.starter());assertEquals(0,p.completedSessions());assertTrue(p.reasonCodes().contains("INCOMPLETE_HISTORY"));}
    @Test void thirtyVersusThirtyOneInactiveDays(){assertFalse(TrainingReadinessService.analyze(List.of(row(30,"HIGH")),NOW).reasonCodes().contains("REASSESSMENT_NEEDED"));assertTrue(TrainingReadinessService.analyze(List.of(row(31,"HIGH")),NOW).reasonCodes().contains("REASSESSMENT_NEEDED"));}
    @Test void missingDurationNotReplacedByPlannedDuration(){var rows=stable("MODERATE");rows.get(3).setActualStart(null);assertFalse(TrainingReadinessService.analyze(rows,NOW).durationComplete());}
    @Test void todayDoesNotEnterThreeCompleteBlocks(){var rows=stable("LOW");var before=TrainingReadinessService.analyze(rows,NOW);rows.add(row(0,"HIGH"));var after=TrainingReadinessService.analyze(rows,NOW);assertEquals(before.weeklyMinutes(),after.weeklyMinutes());assertEquals(before.weeklySessions(),after.weeklySessions());}
    @Test void windowIncludesTwentyNineNotThirtyDaysAgo(){assertEquals(1,TrainingReadinessService.analyze(List.of(row(29,"LOW"),row(30,"LOW")),NOW).completedSessions());}
    @Test void longInterruptionResetsCycle(){var rows=stable("LOW");rows.remove(0);rows.add(row(90,"LOW"));assertEquals("UNKNOWN",TrainingReadinessService.analyze(rows,NOW).observedStableIntensity());}
    @Test void tooFewActiveWeeksCannotProveLevel(){var rows=new ArrayList<TrainingSession>();rows.add(row(31,"HIGH"));for(int i=0;i<6;i++)rows.add(row(i,"HIGH"));assertEquals("UNKNOWN",TrainingReadinessService.analyze(rows,NOW).observedStableIntensity());}
    @Test void medianIncludesEmptyWeeks(){var rows=List.of(row(1,"LOW"),row(2,"LOW"),row(3,"LOW"));var p=TrainingReadinessService.analyze(rows,NOW);assertEquals(0,p.weeklyMinutes());assertEquals(0,p.weeklySessions());}
}