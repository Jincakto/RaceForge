package com.raceforge.backend.training.service;
import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.training.entity.HorsePackage;
import com.raceforge.backend.training.entity.TrainingPackage;
import com.raceforge.backend.training.mapper.HorsePackageMapper;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PackageResumptionServiceTest {
 final HorseRepository horses=mock(HorseRepository.class);
 final HorsePackageRepository packages=mock(HorsePackageRepository.class);
 final EntityManager em=mock(EntityManager.class);
 final PackageEventService events=mock(PackageEventService.class);
 final TrainingWorkflowGuard guard=mock(TrainingWorkflowGuard.class);
 final TrainingScheduleCoordinator schedules=mock(TrainingScheduleCoordinator.class);
 final Clock clock=Clock.fixed(Instant.parse("2026-11-10T05:00:00Z"),ZoneId.of("Asia/Bangkok"));
 final PackageResumptionService service=new PackageResumptionService(horses,packages,new HorsePackageMapper(),em,events,guard,mock(JdbcTemplate.class),clock,schedules);
 final Horse horse=new Horse();final HorsePackage paused=new HorsePackage();
 @BeforeEach void setup(){
  horse.setHorseId("HOR-001");horse.setHorseName("Demo");horse.setTrainingLocked(false);
  horse.setHealthStatus("READY");horse.setAdmissionStatus("APPROVED");horse.setStatus("ACTIVE");
  var type=new TrainingPackage();type.setPackageId("PKG-001");type.setPackageType("BASIC");type.setPackageName("Foundation");
  paused.setHorsePackageId("HPG-001");paused.setHorse(horse);paused.setTrainingPackage(type);
  paused.setStatus("PAUSED");paused.setPaymentStatus("PAID");paused.setRemainingDays(12);
  paused.setPausedAt(LocalDateTime.of(2026,11,1,9,0));paused.setPauseReason("TRAINING_LOCK_MEDICAL:MED-001");
  when(packages.findById("HPG-001")).thenReturn(Optional.of(paused));
  when(packages.findForUpdate("HPG-001")).thenReturn(Optional.of(paused));
  when(horses.findById("HOR-001")).thenReturn(Optional.of(horse));
  when(guard.canAccessPackage("HPG-001","HTR-001")).thenReturn(true);
  when(schedules.requireTrainer("HPG-001")).thenReturn(new TrainingScheduleCoordinator.Trainer("HTR-001","Trainer"));
  when(packages.saveAndFlush(paused)).thenReturn(paused);
 }
 @Test void acceptedTrainerResumesOnlyPreservedDays(){
  var response=service.accept("HPG-001","HTR-001");
  assertEquals("ACTIVE",response.status());assertEquals(LocalDate.of(2026,11,10),paused.getStartDate());
  assertEquals(LocalDate.of(2026,11,21),paused.getEndDate());assertEquals(12,paused.getRemainingDays());
  assertNull(paused.getPausedAt());assertNull(paused.getPauseReason());
  verify(guard).requireHealthy(horse);
  var order=inOrder(schedules,em,packages);order.verify(schedules).lockSchedule();
  order.verify(packages).findById("HPG-001");order.verify(em).lock(horse,LockModeType.PESSIMISTIC_WRITE);
  order.verify(packages).findForUpdate("HPG-001");
 }
 @Test void anotherActivePackageBlocksResumption(){
  when(packages.findByHorseIdAndStatusForUpdate("HOR-001","ACTIVE")).thenReturn(List.of(new HorsePackage()));
  assertThrows(BusinessRuleException.class,()->service.accept("HPG-001","HTR-001"));assertEquals("PAUSED",paused.getStatus());verify(packages,never()).saveAndFlush(any());
 }
 @Test void medicalLockStillBlocks(){horse.setTrainingLocked(true);assertThrows(BusinessRuleException.class,()->service.accept("HPG-001","HTR-001"));verify(packages,never()).saveAndFlush(any());}
 @Test void wrongTrainerCannotResume(){assertThrows(AccessDeniedException.class,()->service.accept("HPG-001","HTR-002"));verify(packages,never()).saveAndFlush(any());}
 @Test void pendingPaymentBlocks(){var pending=new HorsePackage();pending.setStatus("PENDING");when(packages.findByHorseIdOrderByRegisteredAtDesc("HOR-001")).thenReturn(List.of(pending));assertThrows(BusinessRuleException.class,()->service.accept("HPG-001","HTR-001"));}
 @Test void repeatedAcceptCannotResetPackagePeriod(){service.accept("HPG-001","HTR-001");assertThrows(BusinessRuleException.class,()->service.accept("HPG-001","HTR-001"));verify(packages,times(1)).saveAndFlush(any());}
 @Test void unsupportedTypeCannotResume(){paused.getTrainingPackage().setPackageType("RECOVERY");assertThrows(BusinessRuleException.class,()->service.accept("HPG-001","HTR-001"));}
}
