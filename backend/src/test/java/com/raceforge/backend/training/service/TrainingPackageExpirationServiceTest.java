package com.raceforge.backend.training.service;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.training.entity.HorsePackage;
import com.raceforge.backend.training.entity.TrainingPackage;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class TrainingPackageExpirationServiceTest {
    private final HorsePackageRepository registrations = mock(HorsePackageRepository.class);
    private final HorseRepository horses = mock(HorseRepository.class);
    private final EntityManager em = mock(EntityManager.class);
    private final PackageEventService events = mock(PackageEventService.class);
    private final TrainingPackageExpirationService service =
            new TrainingPackageExpirationService(registrations, horses, em, events);

    private Horse horse;
    private HorsePackage normal;
    private final LocalDate today = LocalDate.of(2026, 10, 19);

    @BeforeEach
    void setup() {
        User owner = new User();
        owner.setUserId("7");
        horse = new Horse();
        horse.setHorseId("HOR-001");
        horse.setOwner(owner);
        TrainingPackage normalType = new TrainingPackage();
        normalType.setPackageType("RACING");
        normal = new HorsePackage();
        normal.setHorsePackageId(10);
        normal.setHorse(horse);
        normal.setTrainingPackage(normalType);
        normal.setStatus("ACTIVE");
        normal.setRemainingDays(30);
        normal.setEndDate(today.minusDays(1));
        when(registrations.findByHorseIdAndStatusForUpdate("HOR-001", "ACTIVE"))
                .thenReturn(List.of(normal));
        when(registrations.findById(10)).thenReturn(Optional.of(normal));
        when(registrations.findForUpdate(10)).thenReturn(Optional.of(normal));
        when(horses.findById("HOR-001")).thenReturn(Optional.of(horse));
    }

    @Test
    void normalPackageExpiresAfterInclusiveEndDate() {
        assertEquals(1, service.expireForLockedHorse(horse, today));
        assertEquals("COMPLETED", normal.getStatus());
        assertEquals(0, normal.getRemainingDays());
        verify(registrations).save(normal);
        verify(events).notifyOwner(eq("7"), eq("HOR-001"),
                eq("TRAINING_PACKAGE_EXPIRED"), anyString());
        verify(events, never()).notifyManagers(anyString(), anyString(), anyString());
    }

    @Test
    void packageIsStillActiveOnLastDay() {
        normal.setEndDate(today);
        assertEquals(0, service.expireForLockedHorse(horse, today));
        assertEquals("ACTIVE", normal.getStatus());
        verify(registrations, never()).save(any());
    }

    @Test
    void futurePackageDoesNotExpire() {
        normal.setEndDate(today.plusDays(1));
        assertEquals(0, service.expireForLockedHorse(horse, today));
    }

    @Test
    void frozenPausedDaysNeverExpireEvenWhenOldEndDatePassed() {
        normal.setStatus("PAUSED");
        normal.setRemainingDays(12);
        assertEquals(0, service.expireForLockedHorse(horse, today));
        assertEquals("PAUSED", normal.getStatus());
        assertEquals(12, normal.getRemainingDays());
        verify(registrations, never()).save(any());
    }

    @Test
    void recoveryExpiresButDoesNotClearMedicalLockOrPausedOriginal() {
        TrainingPackage recoveryType = new TrainingPackage();
        recoveryType.setPackageType("RECOVERY");
        HorsePackage original = new HorsePackage();
        original.setStatus("PAUSED");
        original.setRemainingDays(12);
        normal.setTrainingPackage(recoveryType);
        normal.setReplacedHorsePackage(original);
        horse.setTrainingLocked(true);

        assertEquals(1, service.expireForLockedHorse(horse, today));
        assertEquals("COMPLETED", normal.getStatus());
        assertTrue(horse.getTrainingLocked());
        assertEquals("PAUSED", original.getStatus());
        assertEquals(12, original.getRemainingDays());
        verify(events).notifyManagers(eq("HOR-001"),
                eq("RECOVERY_PACKAGE_EXPIRED"), contains("Training Lock"));
    }

    @Test
    void expiryIsIdempotentOnRepeatCall() {
        assertTrue(service.expireRegistration(10, today));
        assertFalse(service.expireRegistration(10, today));
        verify(registrations, times(1)).save(normal);
        verify(events, times(1)).notifyOwner(eq("7"), eq("HOR-001"), anyString(), anyString());
    }

    @Test
    void scheduledSingleRowPathAcquiresHorseBeforeRegistrationLock() {
        assertTrue(service.expireRegistration(10, today));
        var inOrder = inOrder(horses, em, registrations);
        inOrder.verify(horses).findById("HOR-001");
        inOrder.verify(em).lock(eq(horse), any());
        inOrder.verify(registrations).findForUpdate(10);
    }

    @Test
    void anAlreadyCompletedRecordIsSkippedByScheduledPath() {
        normal.setStatus("COMPLETED");
        assertFalse(service.expireRegistration(10, today));
        verify(events, never()).record(any(), any(), any(), any(), any());
    }
}
