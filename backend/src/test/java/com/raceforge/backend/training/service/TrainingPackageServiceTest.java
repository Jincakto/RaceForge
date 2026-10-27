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
    @org.junit.jupiter.api.BeforeEach void templates(){org.springframework.test.util.ReflectionTestUtils.setField(service,"roadmaps",roadmaps); }
    private final com.raceforge.backend.horse.service.ModuleIdAllocator ids = mock(com.raceforge.backend.horse.service.ModuleIdAllocator.class);
    private final TrainingPackageRepository packages = mock(TrainingPackageRepository.class);
    private final HorsePackageRepository registrations = mock(HorsePackageRepository.class);
    private final PackageRoadmapTemplateService roadmaps = mock(PackageRoadmapTemplateService.class);
    private final TrainingPackageMapper mapper = new TrainingPackageMapper();
    private final TrainingPackageService service =
            new TrainingPackageService(packages, registrations, mapper, ids);

    @Test
    void newTrainingPackageUsesStringIdFromSequence() {
        when(ids.next("PKG")).thenReturn("PKG-012");
        when(packages.saveAndFlush(any(TrainingPackage.class)))
                .thenAnswer(call -> call.getArgument(0));

        var request = new TrainingPackageCreateRequest(
                "Basic", "BASIC", "Normal training", 30, new BigDecimal("120000"), new com.raceforge.backend.training.dto.PackageRoadmapDto("Basic","Foundation goal",1,java.util.List.of()));
        var result = service.create(request);

        assertEquals("PKG-012", result.packageId());
        verify(packages).saveAndFlush(argThat(p -> "PKG-012".equals(p.getPackageId())));
    }

    @Test
    void packageWithRegistrationsCannotChangeTerms() {
        TrainingPackage existing = new TrainingPackage();
        existing.setPackageId("PKG-012");
        existing.setPackageName("Basic");
        when(packages.findById("PKG-012")).thenReturn(Optional.of(existing));
        when(registrations.existsByTrainingPackage_PackageId("PKG-012")).thenReturn(true);

        var request = new TrainingPackageUpdateRequest(
                "Basic Plus", "RACING", "Updated", 60, new BigDecimal("240000"));
        assertThrows(BusinessRuleException.class,
                () -> service.update("PKG-012", request));
        verify(packages, never()).saveAndFlush(any(TrainingPackage.class));
    }
}
