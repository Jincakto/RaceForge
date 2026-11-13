package com.raceforge.backend.training.service;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.training.entity.TrainingPackage;
import com.raceforge.backend.training.repository.TrainingPackageRepository;
import com.raceforge.backend.training.dto.PackageRoadmapDto;
import org.junit.jupiter.api.*;
import java.time.*;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class TrainingPackageSuggestionServiceTest {
    final HorseRepository horses=mock(HorseRepository.class);
    final TrainingPackageRepository packages=mock(TrainingPackageRepository.class);
    final TrainingPackageEligibilityService eligibility=mock(TrainingPackageEligibilityService.class);
    final TrainingReadinessService readiness=mock(TrainingReadinessService.class);
    final PackageRoadmapTemplateService roadmaps=mock(PackageRoadmapTemplateService.class);
    final Clock clock=Clock.fixed(Instant.parse("2026-11-03T03:00:00Z"),ZoneId.of("Asia/Bangkok"));
    final TrainingPackageSuggestionService service=new TrainingPackageSuggestionService(horses,packages,eligibility,readiness,roadmaps,new PackageDemandProfileService(),clock);
    final Horse horse=new Horse();
    @BeforeEach void setup(){var owner=new User();owner.setUserId("OWN-1");horse.setHorseId("HOR-1");horse.setOwner(owner);when(horses.findById("HOR-1")).thenReturn(Optional.of(horse));when(readiness.read(eq("HOR-1"),any())).thenReturn(TrainingReadinessService.analyze(List.of(),LocalDateTime.now(clock)));}
    TrainingPackage pack(String id,String type){var p=new TrainingPackage();p.setPackageId(id);p.setPackageName(id);p.setPackageType(type);p.setDurationDays(30);p.setPrice(BigDecimal.TEN);when(eligibility.evaluate(eq(horse),eq(p),any())).thenReturn(new TrainingPackageEligibilityService.Result(true,List.of()));when(roadmaps.read(id)).thenReturn(new PackageRoadmapDto("Roadmap","Goal",1,List.of(PackageDemandProfileServiceTest.stage(1,30,"LOW",30,DayOfWeek.MONDAY))));return p;}
    @Test void goalCannotPromoteReviewAboveRecommended(){var basic=pack("B","BASIC");var racing=pack("R","RACING");when(packages.findByStatusOrderByPackageNameAsc("ACTIVE")).thenReturn(List.of(racing,basic));var r=service.suggest("HOR-1","OWN-1","PREPARE_FOR_RACING");assertEquals("B",r.packages().get(0).packageId());assertEquals("RECOMMENDED",r.packages().get(0).recommendationStatus());assertEquals("REVIEW_REQUIRED",r.packages().get(1).recommendationStatus());assertTrue(r.packages().get(1).canRegister());assertEquals("2.2",r.ruleVersion());assertEquals(LocalDateTime.of(2026,11,3,10,0),r.evaluatedAt());}
    @Test void retiredTypeIsExcludedFromSuggestions(){var p=pack("REC","RECOVERY");when(packages.findByStatusOrderByPackageNameAsc("ACTIVE")).thenReturn(List.of(p));assertTrue(service.suggest("HOR-1","OWN-1",null).packages().isEmpty());verify(eligibility,never()).evaluate(any(),eq(p),any());}
    @Test void missingRoadmapDoesNotHideOtherPackages(){var bad=pack("BAD","BASIC");var good=pack("GOOD","BASIC");when(eligibility.evaluate(eq(horse),eq(bad),any())).thenReturn(new TrainingPackageEligibilityService.Result(false,List.of(new TrainingPackageEligibilityService.Reason("ROADMAP_CONFIGURATION","Missing roadmap"))));when(packages.findByStatusOrderByPackageNameAsc("ACTIVE")).thenReturn(List.of(bad,good));var r=service.suggest("HOR-1","OWN-1",null);assertEquals(2,r.packages().size());assertEquals("RECOMMENDED",r.packages().get(0).recommendationStatus());assertEquals("NOT_ELIGIBLE",r.packages().get(1).recommendationStatus());verify(roadmaps,never()).read("BAD");}
    @Test void wrongOwnerDeniedBeforeHistoryQuery(){assertThrows(org.springframework.security.access.AccessDeniedException.class,()->service.suggest("HOR-1","OTHER",null));verifyNoInteractions(packages);verify(readiness,never()).read(any(),any());}
    @Test void invalidGoalRejected(){assertThrows(com.raceforge.backend.common.exception.BusinessRuleException.class,()->service.suggest("HOR-1","OWN-1","UNKNOWN"));verifyNoInteractions(horses,packages);}
    @Test void goalDoesNotChangeEligibilityOrWriteData(){var p=pack("B","BASIC");when(packages.findByStatusOrderByPackageNameAsc("ACTIVE")).thenReturn(List.of(p));assertEquals(service.suggest("HOR-1","OWN-1",null).packages().get(0).canRegister(),service.suggest("HOR-1","OWN-1","PREPARE_FOR_RACING").packages().get(0).canRegister());verify(packages,never()).save(any());}
}