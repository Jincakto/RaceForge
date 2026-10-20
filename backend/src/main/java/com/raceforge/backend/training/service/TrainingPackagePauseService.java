package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.training.entity.HorsePackage;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Freezes unused ordinary training days at the moment a veterinarian confirms
 * a Training Lock. Must run in the same transaction that creates the lock.
 */
@Service
public class TrainingPackagePauseService {

    private final HorsePackageRepository horsePackages;

    public TrainingPackagePauseService(HorsePackageRepository horsePackages) {
        this.horsePackages = horsePackages;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void pauseActiveNormalPackage(String horseId, String confirmedMedicalRecordId) {
        if (horseId == null || horseId.isBlank()
                || confirmedMedicalRecordId == null || confirmedMedicalRecordId.isBlank()) {
            throw new IllegalArgumentException("Horse and confirmed medical record IDs are required");
        }

        // The caller holds PESSIMISTIC_WRITE on Horse; this further locks the
        // affected package rows so the preserved day count cannot race a payment.
        List<HorsePackage> packages = horsePackages
                .findByHorseIdAndStatusForUpdate(horseId, "ACTIVE");
        List<HorsePackage> ordinary = packages.stream()
                .filter(p -> p.getTrainingPackage() != null
                        && !"RECOVERY".equalsIgnoreCase(
                                p.getTrainingPackage().getPackageType()))
                .toList();

        if (ordinary.size() > 1) {
            throw new BusinessRuleException(
                    "More than one ordinary training package is ACTIVE for this horse");
        }
        if (ordinary.isEmpty()) {
            return; // No paid ordinary package to preserve.
        }

        HorsePackage original = ordinary.get(0);
        if (original.getEndDate() == null) {
            throw new BusinessRuleException(
                    "ACTIVE training package is missing endDate");
        }

        LocalDateTime lockedAt = LocalDateTime.now();
        long remaining = ChronoUnit.DAYS.between(
                lockedAt.toLocalDate(), original.getEndDate()) + 1L;

        if (remaining <= 0) {
            // Already expired: it has no usable days to carry forward.
            original.setRemainingDays(0);
            original.setStatus("COMPLETED");
        } else {
            original.setRemainingDays(Math.toIntExact(remaining));
            original.setStatus("PAUSED");
            original.setPausedAt(lockedAt);
            // Connect this pause to the exact CONFIRMED medical record used for
            // the lock (without adding a database column).
            original.setPauseReason("TRAINING_LOCK_MEDICAL:" + confirmedMedicalRecordId);
        }
        horsePackages.save(original);
    }
}
