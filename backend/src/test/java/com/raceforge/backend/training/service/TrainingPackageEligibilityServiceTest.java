package com.raceforge.backend.training.service;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.medical.entity.*;
import com.raceforge.backend.medical.repository.*;
import com.raceforge.backend.training.entity.*;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import com.raceforge.backend.common.exception.BusinessRuleException;
import org.junit.jupiter.api.*;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class TrainingPackageEligibilityServiceTest {
    final TrainingWorkflowGuard guard=mock(TrainingWorkflowGuard.class);
    final HorsePackageRepository packages=mock(HorsePackageRepository.class);
    final HealthProfileRepository profiles=mock(HealthProfileRepository.class);
    final MedicalRecordRepository records=mock(MedicalRecordRepository.class);
    final PackageRoadmapTemplateService roadmaps=mock(PackageRoadmapTemplateService.class);
    final TrainingLockRepository locks=mock(TrainingLockRepository.class);
    final TrainingPackageEligibilityService service=new TrainingPackageEligibilityService(guard,packages,profiles,records,locks,roadmaps);
    final Horse horse=new Horse();final TrainingPackage pack=new TrainingPackage();
    @BeforeEach void setup(){horse.setHorseId("HOR-1");horse.setStatus("ACTIVE");horse.setAdmissionStatus("APPROVED");horse.setHealthStatus("READY");pack.setPackageId("PKG-1");pack.setPackageType("BASIC");pack.setDurationDays(30);pack.setStatus("ACTIVE");var profile=new HealthProfile();profile.setProfileId("HPR-1");when(profiles.findByHorse_HorseId("HOR-1")).thenReturn(Optional.of(profile));var record=new MedicalRecord();record.setExamType("INITIAL");record.setStatus("CONFIRMED");when(records.findByHealthProfile_ProfileIdOrderByExaminedAtDesc("HPR-1")).thenReturn(List.of(record));}
    TrainingPackageEligibilityService.Result evaluate(){return service.evaluate(horse,pack,LocalDate.of(2026,11,3));}
    @Test void ordinaryUsesExistingGuard(){assertTrue(evaluate().canRegister());verify(guard).requireHealthy(horse);verify(guard,never()).requireRacingEligible(any());}
    @Test void racingRetainsExtraMedicalRestriction(){pack.setPackageType("RACING");doThrow(new BusinessRuleException("FIT required")).when(guard).requireRacingEligible(horse);assertFalse(evaluate().canRegister());assertTrue(evaluate().reasons().stream().anyMatch(r->r.code().equals("RACING_REQUIREMENTS")));}
    @Test void retiredTypeCannotBypassMedicalGuard(){pack.setPackageType("RECOVERY");horse.setTrainingLocked(true);var result=evaluate();assertFalse(result.canRegister());assertTrue(result.reasons().stream().anyMatch(r->r.code().equals("UNSUPPORTED_PACKAGE_TYPE")));verifyNoInteractions(guard);}
    @Test void unknownTypeCannotRegister(){pack.setPackageType("OTHER");assertFalse(evaluate().canRegister());}
    @Test void existingPackageBlocksButExpiredActiveIsReadOnly(){var p=new HorsePackage();p.setTrainingPackage(pack);p.setStatus("ACTIVE");p.setEndDate(LocalDate.of(2026,11,3));when(packages.findByHorseIdOrderByRegisteredAtDesc("HOR-1")).thenReturn(List.of(p));assertFalse(evaluate().canRegister());p.setEndDate(LocalDate.of(2026,11,2));assertTrue(evaluate().canRegister());assertEquals("ACTIVE",p.getStatus());verify(packages,never()).save(any());}
    @Test void initialExamStillRequired(){when(profiles.findByHorse_HorseId("HOR-1")).thenReturn(Optional.empty());assertFalse(evaluate().canRegister());}
    @Test void badRoadmapDoesNotHideOtherReasons(){horse.setStatus("INACTIVE");doThrow(new BusinessRuleException("Missing roadmap")).when(roadmaps).read("PKG-1");var result=evaluate();assertTrue(result.reasons().stream().anyMatch(r->r.code().equals("ROADMAP_CONFIGURATION")));assertTrue(result.reasons().stream().anyMatch(r->r.code().equals("HORSE_INACTIVE")));}
    @Test void technicalErrorPropagates(){doThrow(new org.springframework.dao.DataAccessResourceFailureException("DB unavailable")).when(roadmaps).read("PKG-1");assertThrows(org.springframework.dao.DataAccessResourceFailureException.class,this::evaluate);}
}