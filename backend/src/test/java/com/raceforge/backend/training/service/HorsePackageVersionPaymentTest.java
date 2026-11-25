package com.raceforge.backend.training.service;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.horse.service.ModuleIdAllocator;
import com.raceforge.backend.training.entity.*;
import com.raceforge.backend.training.repository.*;
import com.raceforge.backend.training.mapper.HorsePackageMapper;
import com.raceforge.backend.common.exception.BusinessRuleException;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.junit.jupiter.api.Assertions.*;
class HorsePackageVersionPaymentTest {
 final HorseRepository horses=mock(HorseRepository.class);
 final HorsePackageRepository registrations=mock(HorsePackageRepository.class);
 final TrainingWorkflowGuard guard=mock(TrainingWorkflowGuard.class);
 final HorsePackageService service=new HorsePackageService(horses,mock(TrainingPackageRepository.class),registrations,new HorsePackageMapper(),mock(EntityManager.class),mock(PackageEventService.class),mock(TrainingPackageExpirationService.class),mock(ModuleIdAllocator.class));
 final HorsePackage registration=new HorsePackage();final Horse horse=new Horse();final TrainingPackage pack=new TrainingPackage();
 @BeforeEach void setup(){
  User owner=new User();owner.setUserId("OWN-001");horse.setHorseId("HOR-001");horse.setOwner(owner);horse.setAdmissionStatus("APPROVED");horse.setStatus("ACTIVE");horse.setHealthStatus("READY");horse.setTrainingLocked(false);
  pack.setPackageId("PKG-001");pack.setPackageName("Old basic");pack.setPackageType("BASIC");pack.setStatus("INACTIVE");pack.setSuperseded(true);pack.setDurationDays(30);pack.setPrice(BigDecimal.valueOf(5000000));
  registration.setHorsePackageId("HPG-001");registration.setHorse(horse);registration.setTrainingPackage(pack);registration.setTotalPrice(pack.getPrice());
  when(registrations.findById("HPG-001")).thenReturn(Optional.of(registration));when(horses.findById("HOR-001")).thenReturn(Optional.of(horse));when(registrations.saveAndFlush(any())).thenAnswer(i->i.getArgument(0));
  ReflectionTestUtils.setField(service,"workflowGuard",guard);ReflectionTestUtils.setField(service,"trainingClock",Clock.fixed(Instant.parse("2026-11-25T03:00:00Z"),ZoneId.of("Asia/Ho_Chi_Minh")));
 }
 @Test void inactiveVersionStillActivatesAtOriginalPriceAndDuration(){var result=service.applyPayment("HPG-001",true,"OWN-001");assertEquals("ACTIVE",result.status());assertEquals(BigDecimal.valueOf(5000000),result.totalPrice());assertEquals(LocalDate.of(2026,12,24),result.endDate());}
 @Test void delayedWebhookWithOnTimePaymentCanActivateExpiredRegistration(){registration.setStatus("EXPIRED");registration.setPendingExpiresAtUtc(Instant.parse("2026-11-24T03:30:00Z"));var result=service.applyVerifiedPayment("HPG-001",true,"OWN-001",Instant.parse("2026-11-24T03:20:00Z"));assertEquals("ACTIVE",result.status());}
 @Test void lateOrUnverifiedPaymentCannotActivate(){registration.setPendingExpiresAtUtc(Instant.parse("2026-11-24T03:30:00Z"));assertThrows(BusinessRuleException.class,()->service.applyPayment("HPG-001",true,"OWN-001"));assertThrows(BusinessRuleException.class,()->service.applyVerifiedPayment("HPG-001",true,"OWN-001",Instant.parse("2026-11-24T03:31:00Z")));verify(registrations,never()).saveAndFlush(any());}
 @Test void duplicatePaymentDoesNotResetDates(){service.applyPayment("HPG-001",true,"OWN-001");var end=registration.getEndDate();service.applyPayment("HPG-001",true,"OWN-001");assertEquals(end,registration.getEndDate());verify(registrations,times(1)).saveAndFlush(any());}
 @Test void medicalLockStillPreventsActivation(){horse.setTrainingLocked(true);assertThrows(BusinessRuleException.class,()->service.applyPayment("HPG-001",true,"OWN-001"));assertEquals("PENDING",registration.getPaymentStatus());}
}
