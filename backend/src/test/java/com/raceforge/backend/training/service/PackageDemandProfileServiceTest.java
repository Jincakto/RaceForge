package com.raceforge.backend.training.service;
import com.raceforge.backend.training.dto.*;
import com.raceforge.backend.training.dto.TrainingWorkflowDtos.Stage;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
class PackageDemandProfileServiceTest {
    static Stage stage(int start,int end,String level,int minutes,DayOfWeek...days){return new Stage(start,end,"Activity",level,Set.of(days),LocalTime.of(9,0),LocalTime.of(9,0).plusMinutes(minutes),"Stage","Goal","CUSTOM");}
    static PackageDemandProfileService.Profile profile(Stage... stages){return new PackageDemandProfileService().analyze(new PackageRoadmapDto("Title","Goal",1,List.of(stages)),stages[stages.length-1].endDay(),"BASIC");}
    @Test void starterChecksAllSevenStarts(){var p=profile(stage(1,30,"LOW",30,DayOfWeek.MONDAY,DayOfWeek.FRIDAY));assertTrue(p.starter());assertEquals(7,p.scenarios().size());assertEquals(2,p.firstWeekSessionsMax());assertEquals(60,p.firstWeekMinutesMax());}
    @Test void threeDaysPerWeekNotStarter(){assertFalse(profile(stage(1,30,"LOW",30,DayOfWeek.MONDAY,DayOfWeek.WEDNESDAY,DayOfWeek.FRIDAY)).starter());}
    @Test void longerThanThirtyMinutesNotStarter(){assertFalse(profile(stage(1,30,"LOW",31,DayOfWeek.MONDAY)).starter());}
    @Test void directJumpDetected(){assertTrue(profile(stage(1,30,"LOW",30,DayOfWeek.MONDAY),stage(31,60,"HIGH",30,DayOfWeek.MONDAY)).reasonCodes().contains("INTENSITY_JUMP"));}
    @Test void simultaneousLoadIncreasesDetected(){assertTrue(profile(stage(1,30,"LOW",30,DayOfWeek.MONDAY),stage(31,60,"LOW",40,DayOfWeek.MONDAY,DayOfWeek.FRIDAY)).reasonCodes().contains("MULTIPLE_LOAD_INCREASES"));}
    @Test void shortIntensityCycleDetected(){assertTrue(profile(stage(1,29,"LOW",30,DayOfWeek.MONDAY),stage(30,60,"MODERATE",30,DayOfWeek.MONDAY)).reasonCodes().contains("INTENSITY_PERIOD_TOO_SHORT"));}
    @Test void adjacentSameLevelStagesFormOnePeriod(){assertFalse(profile(stage(1,15,"LOW",30,DayOfWeek.MONDAY),stage(16,30,"LOW",30,DayOfWeek.MONDAY),stage(31,60,"MODERATE",30,DayOfWeek.MONDAY)).reasonCodes().contains("INTENSITY_PERIOD_TOO_SHORT"));}
    @Test void emptyStageForOneStartWeekdayIsFlagged(){assertTrue(profile(stage(1,1,"LOW",30,DayOfWeek.MONDAY)).reasonCodes().contains("STAGE_WITHOUT_SESSIONS"));}
    @Test void sameTypeDifferentRoadmapHasDifferentDemand(){assertNotEquals(profile(stage(1,30,"LOW",30,DayOfWeek.MONDAY)).firstWeekMinutesMax(),profile(stage(1,30,"LOW",60,DayOfWeek.MONDAY)).firstWeekMinutesMax());}
    @Test void starterVersusHighPackage(){var h=TrainingReadinessService.analyze(List.of(),TrainingReadinessServiceTest.NOW);assertEquals("RECOMMENDED",TrainingPackageSuggestionService.match(h,profile(stage(1,30,"LOW",30,DayOfWeek.MONDAY)),new HashSet<>()));assertEquals("REVIEW_REQUIRED",TrainingPackageSuggestionService.match(h,profile(stage(1,30,"HIGH",30,DayOfWeek.MONDAY)),new HashSet<>()));}
    @Test void entryLoadMustFitHistory(){var h=TrainingReadinessService.analyze(TrainingReadinessServiceTest.stable("LOW"),TrainingReadinessServiceTest.NOW);assertEquals("RECOMMENDED",TrainingPackageSuggestionService.match(h,profile(stage(1,30,"LOW",30,DayOfWeek.MONDAY)),new HashSet<>()));assertEquals("REVIEW_REQUIRED",TrainingPackageSuggestionService.match(h,profile(stage(1,30,"LOW",60,DayOfWeek.MONDAY)),new HashSet<>()));}
    @Test void missingDurationPreventsRecommendation(){var rows=TrainingReadinessServiceTest.stable("LOW");rows.get(3).setActualStart(null);var h=TrainingReadinessService.analyze(rows,TrainingReadinessServiceTest.NOW);assertEquals("REVIEW_REQUIRED",TrainingPackageSuggestionService.match(h,profile(stage(1,30,"LOW",30,DayOfWeek.MONDAY)),new HashSet<>()));}
}