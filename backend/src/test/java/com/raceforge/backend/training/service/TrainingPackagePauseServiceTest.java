package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.training.entity.HorsePackage;
import com.raceforge.backend.training.entity.TrainingPackage;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TrainingPackagePauseServiceTest {

    private final HorsePackageRepository packages = mock(HorsePackageRepository.class);
    private final TrainingPackagePauseService service = new TrainingPackagePauseService(packages);

    private HorsePackage activePackage(String type, int daysLeft) {
        TrainingPackage plan = new TrainingPackage();
        plan.setPackageType(type);
        HorsePackage enrollment = new HorsePackage();
        enrollment.setTrainingPackage(plan);
        enrollment.setStatus("ACTIVE");
        enrollment.setEndDate(LocalDate.now().plusDays(daysLeft - 1L));
        return enrollment;
    }

    @Test
    void lockImmediatelyPreservesDaysIncludingLockDate() {
        HorsePackage regular = activePackage("RACING", 12);
        when(packages.findByHorseIdAndStatusForUpdate("HOR-001", "ACTIVE"))
                .thenReturn(List.of(regular));

        service.pauseActiveNormalPackage("HOR-001", "MED-000001");

        assertEquals("PAUSED", regular.getStatus());
        assertEquals(12, regular.getRemainingDays());
        assertNotNull(regular.getPausedAt());
        verify(packages).save(regular);
    }

    @Test
    void recoveryPackageIsNotPaused() {
        HorsePackage recovery = activePackage("RECOVERY", 5);
        when(packages.findByHorseIdAndStatusForUpdate("HOR-001", "ACTIVE"))
                .thenReturn(List.of(recovery));

        service.pauseActiveNormalPackage("HOR-001", "MED-000001");

        assertEquals("ACTIVE", recovery.getStatus());
        verify(packages, never()).save(any(HorsePackage.class));
    }

    @Test
    void repeatedCallDoesNotSubtractPreservedDays() {
        HorsePackage original = activePackage("BASIC", 10);
        when(packages.findByHorseIdAndStatusForUpdate("HOR-001", "ACTIVE"))
                .thenReturn(List.of(original))
                .thenReturn(List.of());

        service.pauseActiveNormalPackage("HOR-001", "MED-000001");
        Integer frozen = original.getRemainingDays();
        service.pauseActiveNormalPackage("HOR-001", "MED-000001");

        assertEquals("PAUSED", original.getStatus());
        assertEquals(frozen, original.getRemainingDays());
        verify(packages, times(1)).save(original);
    }

    @Test
    void overduePackageHasNoDaysToPreserve() {
        HorsePackage old = activePackage("BASIC", -2);
        when(packages.findByHorseIdAndStatusForUpdate("HOR-001", "ACTIVE"))
                .thenReturn(List.of(old));

        service.pauseActiveNormalPackage("HOR-001", "MED-000001");

        assertEquals("COMPLETED", old.getStatus());
        assertEquals(0, old.getRemainingDays());
    }

    @Test
    void twoActiveOrdinaryPackagesRejectRatherThanGuess() {
        when(packages.findByHorseIdAndStatusForUpdate("HOR-001", "ACTIVE"))
                .thenReturn(List.of(activePackage("BASIC", 5), activePackage("RACING", 10)));

        assertThrows(BusinessRuleException.class,
                () -> service.pauseActiveNormalPackage("HOR-001", "MED-000001"));

        verify(packages, never()).save(any(HorsePackage.class));
    }
}
