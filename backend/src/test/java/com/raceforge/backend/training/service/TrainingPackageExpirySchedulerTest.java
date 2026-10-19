package com.raceforge.backend.training.service;

import com.raceforge.backend.training.repository.HorsePackageRepository;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class TrainingPackageExpirySchedulerTest {
    private final HorsePackageRepository registrations = mock(HorsePackageRepository.class);
    private final TrainingPackageExpirationService expiration = mock(TrainingPackageExpirationService.class);
    private final TrainingPackageExpiryScheduler scheduler =
            new TrainingPackageExpiryScheduler(registrations, expiration);

    @Test
    void runsEachExpiredIdOnce() {
        when(registrations.findExpiredActiveRegistrationIds(any(LocalDate.class)))
                .thenReturn(List.of(10, 11));
        scheduler.expireOverduePackages();
        verify(expiration).expireRegistration(eq(10), any(LocalDate.class));
        verify(expiration).expireRegistration(eq(11), any(LocalDate.class));
    }

    @Test
    void oneFailureDoesNotPreventProcessingTheNextRegistration() {
        when(registrations.findExpiredActiveRegistrationIds(any(LocalDate.class)))
                .thenReturn(List.of(10, 11));
        doThrow(new RuntimeException("temporary failure"))
                .when(expiration).expireRegistration(eq(10), any(LocalDate.class));
        scheduler.expireOverduePackages();
        verify(expiration).expireRegistration(eq(11), any(LocalDate.class));
    }
}
