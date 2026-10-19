package com.raceforge.backend.training.service;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.training.entity.HorsePackage;
import com.raceforge.backend.training.entity.TrainingPackage;
import com.raceforge.backend.training.mapper.HorsePackageMapper;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PackageResumptionServiceTest {

    private final HorseRepository horses = mock(HorseRepository.class);
    private final HorsePackageRepository horsePackages = mock(HorsePackageRepository.class);
    private final HorsePackageMapper mapper = mock(HorsePackageMapper.class);
    private final EntityManager entityManager = mock(EntityManager.class);
    private final PackageEventService events = mock(PackageEventService.class);
    private final PackageResumptionService service = new PackageResumptionService(
            horses, horsePackages, mapper, entityManager, events);

    private Horse horse;
    private HorsePackage recovery;
    private HorsePackage original;

    @BeforeEach
    void setup() {
        User owner = new User();
        owner.setUserId("7");
        horse = new Horse();
        horse.setHorseId("HOR-001");
        horse.setOwner(owner);
        horse.setHealthStatus("READY");
        horse.setTrainingLocked(false);

        TrainingPackage normalType = new TrainingPackage();
        normalType.setPackageType("RACING");
        original = new HorsePackage();
        original.setHorse(horse);
        original.setHorsePackageId("HPG-011");
        original.setTrainingPackage(normalType);
        original.setStatus("PAUSED");
        original.setPaymentStatus("PAID");
        original.setRemainingDays(12);
        original.setPausedAt(LocalDateTime.now().minusDays(3));
        original.setPauseReason("TRAINING_LOCK_MEDICAL:MED-001");
        original.setEndDate(LocalDate.now().minusDays(4)); // old end date is irrelevant

        TrainingPackage recoveryType = new TrainingPackage();
        recoveryType.setPackageType("RECOVERY");
        recovery = new HorsePackage();
        recovery.setHorse(horse);
        recovery.setHorsePackageId("HPG-022");
        recovery.setTrainingPackage(recoveryType);
        recovery.setPaymentStatus("CENTER_COVERED");
        recovery.setStatus("ACTIVE");
        recovery.setReplacedHorsePackage(original);

        when(horsePackages.findById("HPG-022")).thenReturn(Optional.of(recovery));
        when(horses.findById("HOR-001")).thenReturn(Optional.of(horse));
        when(horsePackages.saveAndFlush(original)).thenReturn(original);
    }

    @Test
    void activeRecoveryCanBeCompletedAndOriginalResumed() {
        when(horsePackages.findByHorse_HorseIdAndStatus("HOR-001", "ACTIVE"))
                .thenReturn(List.of(recovery));
        service.resumeOriginalPackage("HPG-022", "Vet approved resumption", "2");

        assertEquals("COMPLETED", recovery.getStatus());
        assertEquals("ACTIVE", original.getStatus());
        assertEquals(12, original.getRemainingDays());
        assertEquals(LocalDate.now().plusDays(11), original.getEndDate());
        verify(horsePackages).save(recovery);
        verify(horsePackages).saveAndFlush(original);
    }

    @Test
    void completedRecoveryCanStillResumePreservedOriginalDays() {
        recovery.setStatus("COMPLETED");
        recovery.setEndDate(LocalDate.now().minusDays(5));
        when(horsePackages.findByHorse_HorseIdAndStatus("HOR-001", "ACTIVE"))
                .thenReturn(List.of());
        service.resumeOriginalPackage("HPG-022", "Recovery completed and vet cleared horse", "2");

        assertEquals("ACTIVE", original.getStatus());
        assertEquals(12, original.getRemainingDays());
        assertEquals(LocalDate.now().plusDays(11), original.getEndDate());
        verify(horsePackages, never()).save(recovery);
        verify(horsePackages).saveAndFlush(original);
    }

    @Test
    void trainingLockBlocksResumptionEvenIfRecoveryCompleted() {
        recovery.setStatus("COMPLETED");
        horse.setTrainingLocked(true);
        assertThrows(BusinessRuleException.class,
                () -> service.resumeOriginalPackage("HPG-022", "Some reason", "2"));
        verify(horsePackages, never()).saveAndFlush(any(HorsePackage.class));
    }

    @Test
    void anotherActivePackageBlocksResumptionAfterCompletedRecovery() {
        recovery.setStatus("COMPLETED");
        HorsePackage other = new HorsePackage();
        other.setHorsePackageId("HPG-033");
        when(horsePackages.findByHorse_HorseIdAndStatus("HOR-001", "ACTIVE"))
                .thenReturn(List.of(other));
        assertThrows(BusinessRuleException.class,
                () -> service.resumeOriginalPackage("HPG-022", "Some reason", "2"));
        assertEquals("PAUSED", original.getStatus());
    }

    @Test
    void ownerPaidRecoveryCannotResumeAnOriginalPackage() {
        recovery.setPaymentStatus("PAID");
        assertThrows(BusinessRuleException.class,
                () -> service.resumeOriginalPackage("HPG-022", "Some reason", "2"));
    }

    @Test
    void noRemainingDaysCannotBeResumed() {
        original.setRemainingDays(0);
        assertThrows(BusinessRuleException.class,
                () -> service.resumeOriginalPackage("HPG-022", "Some reason", "2"));
    }

    @Test
    void cannotApproveResumptionTwice() {
        when(horsePackages.findByHorse_HorseIdAndStatus("HOR-001", "ACTIVE"))
                .thenReturn(List.of(recovery));
        service.resumeOriginalPackage("HPG-022", "Veterinarian cleared horse", "2");
        assertThrows(BusinessRuleException.class,
                () -> service.resumeOriginalPackage("HPG-022", "Try again", "2"));
        verify(horsePackages, times(1)).saveAndFlush(original);
    }

    private void prepareDirectResumption() {
        when(horsePackages.findById("HPG-011")).thenReturn(Optional.of(original));
        when(horsePackages.findByHorseIdOrderByRegisteredAtDesc("HOR-001"))
                .thenReturn(List.of(original));
        when(horsePackages.findByHorse_HorseIdAndStatus("HOR-001", "ACTIVE"))
                .thenReturn(List.of());
    }

    @Test
    void cmCanResumeDirectlyIfVetUnlockedBeforeRecoveryStarted() {
        prepareDirectResumption();

        service.resumeWithoutRecovery("HPG-011", "Cleared by veterinarian", "2");

        assertEquals("ACTIVE", original.getStatus());
        assertEquals(12, original.getRemainingDays());
        assertEquals(LocalDate.now(), original.getStartDate());
        assertEquals(LocalDate.now().plusDays(11), original.getEndDate());
        assertNull(original.getPausedAt());
        assertNull(original.getPauseReason());
        verify(horsePackages).saveAndFlush(original);
        verify(horsePackages, never()).save(any(HorsePackage.class));
        verify(events).record("2", "HOR-001", "HPG-011",
                "ORIGINAL_PACKAGE_RESUMED_WITHOUT_RECOVERY", "Cleared by veterinarian");
        verify(events).notifyOwner(eq("7"), eq("HOR-001"), eq("PACKAGE_RESUMED"), anyString());
    }

    @Test
    void directResumptionRequiresVetUnlock() {
        prepareDirectResumption();
        horse.setTrainingLocked(true);

        assertThrows(BusinessRuleException.class,
                () -> service.resumeWithoutRecovery("HPG-011", "CM confirmed", "2"));
        verify(horsePackages, never()).saveAndFlush(any(HorsePackage.class));
    }

    @Test
    void directResumptionRequiresReadyHorse() {
        prepareDirectResumption();
        horse.setHealthStatus("NOT_READY");

        assertThrows(BusinessRuleException.class,
                () -> service.resumeWithoutRecovery("HPG-011", "CM confirmed", "2"));
    }

    @Test
    void directResumptionCannotBypassExistingRecovery() {
        prepareDirectResumption();
        when(horsePackages.findByHorseIdOrderByRegisteredAtDesc("HOR-001"))
                .thenReturn(List.of(recovery, original));

        assertThrows(BusinessRuleException.class,
                () -> service.resumeWithoutRecovery("HPG-011", "CM confirmed", "2"));
        verify(horsePackages, never()).saveAndFlush(any(HorsePackage.class));
    }

    @Test
    void directResumptionRejectsPendingRegistrations() {
        prepareDirectResumption();
        HorsePackage pending = new HorsePackage();
        pending.setHorsePackageId("HPG-044");
        pending.setStatus("PENDING");
        when(horsePackages.findByHorseIdOrderByRegisteredAtDesc("HOR-001"))
                .thenReturn(List.of(pending, original));

        assertThrows(BusinessRuleException.class,
                () -> service.resumeWithoutRecovery("HPG-011", "CM confirmed", "2"));
    }

    @Test
    void directResumptionRequiresTrainingLockPause() {
        prepareDirectResumption();
        original.setPauseReason("Manual pause");

        assertThrows(BusinessRuleException.class,
                () -> service.resumeWithoutRecovery("HPG-011", "CM confirmed", "2"));
    }

    @Test
    void directResumptionRejectsAnotherActivePackage() {
        prepareDirectResumption();
        HorsePackage another = new HorsePackage();
        another.setHorsePackageId("HPG-033");
        when(horsePackages.findByHorse_HorseIdAndStatus("HOR-001", "ACTIVE"))
                .thenReturn(List.of(another));

        assertThrows(BusinessRuleException.class,
                () -> service.resumeWithoutRecovery("HPG-011", "CM confirmed", "2"));
    }

    @Test
    void directResumptionPreservesNoExpiredOrZeroDays() {
        prepareDirectResumption();
        original.setRemainingDays(0);

        assertThrows(BusinessRuleException.class,
                () -> service.resumeWithoutRecovery("HPG-011", "CM confirmed", "2"));
    }

    @Test
    void directResumptionCannotRunTwice() {
        prepareDirectResumption();
        service.resumeWithoutRecovery("HPG-011", "CM confirmed", "2");

        assertThrows(BusinessRuleException.class,
                () -> service.resumeWithoutRecovery("HPG-011", "CM confirmed again", "2"));
        verify(horsePackages, times(1)).saveAndFlush(original);
    }

    @Test
    void directResumptionRequiresCMReason() {
        prepareDirectResumption();

        assertThrows(BusinessRuleException.class,
                () -> service.resumeWithoutRecovery("HPG-011", " ", "2"));
        verify(horsePackages, never()).saveAndFlush(any(HorsePackage.class));
    }
}
