package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.training.dto.TrainingPackageCreateRequest;
import com.raceforge.backend.training.dto.TrainingPackageUpdateRequest;
import com.raceforge.backend.training.entity.TrainingPackage;
import com.raceforge.backend.training.mapper.TrainingPackageMapper;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import com.raceforge.backend.training.repository.TrainingPackageRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class TrainingPackageServiceTest {
    private final TrainingPackageRepository packages = mock(TrainingPackageRepository.class);
    private final HorsePackageRepository registrations = mock(HorsePackageRepository.class);
    private final TrainingPackageMapper mapper = new TrainingPackageMapper();
    private final TrainingPackageService service =
            new TrainingPackageService(packages, registrations, mapper);

    @Test
    void newTrainingPackageUsesStringIdFromSequence() {
        when(packages.nextPackageNumber()).thenReturn(12L);
        when(packages.saveAndFlush(any(TrainingPackage.class)))
                .thenAnswer(call -> call.getArgument(0));

        var request = new TrainingPackageCreateRequest(
                "Basic", "BASIC", "Normal training", 30, new BigDecimal("120000"));
        var result = service.create(request);

        assertEquals("PKG-000012", result.packageId());
        verify(packages).saveAndFlush(argThat(p -> "PKG-000012".equals(p.getPackageId())));
    }

    @Test
    void packageWithRegistrationsCannotChangeTerms() {
        TrainingPackage existing = new TrainingPackage();
        existing.setPackageId("PKG-000012");
        existing.setPackageName("Basic");
        when(packages.findById("PKG-000012")).thenReturn(Optional.of(existing));
        when(registrations.existsByTrainingPackage_PackageId("PKG-000012")).thenReturn(true);

        var request = new TrainingPackageUpdateRequest(
                "Basic Plus", "RACING", "Updated", 60, new BigDecimal("240000"));
        assertThrows(BusinessRuleException.class,
                () -> service.update("PKG-000012", request));
        verify(packages, never()).saveAndFlush(any(TrainingPackage.class));
    }
}
