package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.training.dto.HorsePackageResponse;
import com.raceforge.backend.training.entity.HorsePackage;
import com.raceforge.backend.training.mapper.HorsePackageMapper;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class PackageResumptionService {

    private final HorseRepository horseRepository;
    private final HorsePackageRepository horsePackageRepository;
    private final HorsePackageMapper mapper;
    private final EntityManager entityManager;
    private final PackageEventService packageEventService;

    public PackageResumptionService(
            HorseRepository horseRepository,
            HorsePackageRepository horsePackageRepository,
            HorsePackageMapper mapper,
            EntityManager entityManager,
            PackageEventService packageEventService
    ) {
        this.horseRepository = horseRepository;
        this.horsePackageRepository = horsePackageRepository;
        this.mapper = mapper;
        this.entityManager = entityManager;
        this.packageEventService = packageEventService;
    }

    /**
     * A veterinarian may unlock a horse before CM activates center-funded
     * Recovery. CM can then resume the preserved ordinary package directly.
     * This does not create a Recovery registration or charge the Horse Owner.
     */
    @Transactional
    public HorsePackageResponse resumeWithoutRecovery(
            Integer originalRegistrationId,
            String reason,
            String managerId
    ) {
        if (reason == null || reason.isBlank()) {
            throw new BusinessRuleException("CM confirmation reason is required");
        }

        HorsePackage original = horsePackageRepository.findById(originalRegistrationId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Original package registration not found: " + originalRegistrationId));
        if (original.getHorse() == null) {
            throw new BusinessRuleException("Original package has no horse");
        }

        Horse horse = horseRepository.findById(original.getHorse().getHorseId())
                .orElseThrow(() -> new ResourceNotFoundException("Horse not found"));
        // Same lock order as the regular resumption workflow: Horse, then package.
        entityManager.lock(horse, LockModeType.PESSIMISTIC_WRITE);
        entityManager.lock(original, LockModeType.PESSIMISTIC_WRITE);

        if (Boolean.TRUE.equals(horse.getTrainingLocked())) {
            throw new BusinessRuleException("Veterinarian must unlock training before resumption");
        }
        if (!"READY".equalsIgnoreCase(horse.getHealthStatus())) {
            throw new BusinessRuleException("Horse health status must be READY");
        }
        if (original.getHorse() == null
                || !horse.getHorseId().equals(original.getHorse().getHorseId())) {
            throw new BusinessRuleException("Original package belongs to another horse");
        }
        requirePreservedOriginal(original);

        // Only packages paused by the confirmed Training Lock are eligible for
        // this shortcut, not arbitrary manually paused packages.
        if (original.getPausedAt() == null
                || original.getPauseReason() == null
                || !original.getPauseReason().startsWith("TRAINING_LOCK_MEDICAL:")) {
            throw new BusinessRuleException("Original package was not paused by a Training Lock");
        }

        // If a Recovery registration is already tied to this original package,
        // the CM must use the existing /{recoveryId}/resume-original flow.
        List<HorsePackage> registrations = horsePackageRepository
                .findByHorseIdOrderByRegisteredAtDesc(horse.getHorseId());
        boolean recoveryExists = registrations.stream()
                .anyMatch(p -> p.getReplacedHorsePackage() != null
                        && originalRegistrationId.equals(
                                p.getReplacedHorsePackage().getHorsePackageId()));
        if (recoveryExists) {
            throw new BusinessRuleException(
                    "Recovery registration already exists; use resume-original instead");
        }
        if (registrations.stream().anyMatch(p -> "PENDING".equalsIgnoreCase(p.getStatus()))) {
            throw new BusinessRuleException("Resolve pending package registrations before resumption");
        }

        if (!horsePackageRepository
                .findByHorse_HorseIdAndStatus(horse.getHorseId(), "ACTIVE").isEmpty()) {
            throw new BusinessRuleException("Another package is ACTIVE; cannot resume original");
        }

        return activatePreservedOriginal(original, horse, managerId, reason,
                "ORIGINAL_PACKAGE_RESUMED_WITHOUT_RECOVERY");
    }

    /**
     * CM resumes an original, paid training package after veterinarian Unlock.
     * Center-funded Recovery may still be ACTIVE or may already be COMPLETED.
     * It is never necessary to pay for center-funded Recovery.
     */
    @Transactional
    public HorsePackageResponse resumeOriginalPackage(
            Integer recoveryRegistrationId,
            String reason,
            String managerId
    ) {
        if (reason == null || reason.isBlank()) {
            throw new BusinessRuleException("CM confirmation reason is required");
        }

        HorsePackage recovery = horsePackageRepository.findById(recoveryRegistrationId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Recovery registration not found: " + recoveryRegistrationId));

        Horse horse = horseRepository.findById(recovery.getHorse().getHorseId())
                .orElseThrow(() -> new ResourceNotFoundException("Horse not found"));
        // Match the locking order used by the Training Lock and payment workflows.
        entityManager.lock(horse, LockModeType.PESSIMISTIC_WRITE);
        entityManager.lock(recovery, LockModeType.PESSIMISTIC_WRITE);

        if (Boolean.TRUE.equals(horse.getTrainingLocked())) {
            throw new BusinessRuleException(
                    "Veterinarian must unlock training before resumption");
        }
        if (!"READY".equalsIgnoreCase(horse.getHealthStatus())) {
            throw new BusinessRuleException("Horse health status must be READY");
        }

        boolean recoveryActive = "ACTIVE".equalsIgnoreCase(recovery.getStatus());
        boolean recoveryCompleted = "COMPLETED".equalsIgnoreCase(recovery.getStatus());
        if (recovery.getTrainingPackage() == null
                || !"RECOVERY".equalsIgnoreCase(recovery.getTrainingPackage().getPackageType())
                || !"CENTER_COVERED".equalsIgnoreCase(recovery.getPaymentStatus())
                || (!recoveryActive && !recoveryCompleted)) {
            throw new BusinessRuleException(
                    "Only ACTIVE or COMPLETED center-funded Recovery can resume its original package");
        }

        HorsePackage original = recovery.getReplacedHorsePackage();
        if (original == null) {
            throw new BusinessRuleException(
                    "Owner-paid first-time Recovery has no original package to resume");
        }
        entityManager.lock(original, LockModeType.PESSIMISTIC_WRITE);

        if (original.getHorse() == null
                || !horse.getHorseId().equals(original.getHorse().getHorseId())) {
            throw new BusinessRuleException("Original package belongs to another horse");
        }
        requirePreservedOriginal(original);

        // Match the direct-resumption branch: a pending registration must
        // never coexist with the reactivated ordinary package.
        if (horsePackageRepository.findByHorseIdOrderByRegisteredAtDesc(horse.getHorseId())
                .stream().anyMatch(p -> "PENDING".equalsIgnoreCase(p.getStatus()))) {
            throw new BusinessRuleException("Resolve pending package registrations before resumption");
        }

        List<HorsePackage> active = horsePackageRepository
                .findByHorse_HorseIdAndStatus(horse.getHorseId(), "ACTIVE");
        if (recoveryActive) {
            // Recovery is the ONLY package allowed to be ACTIVE before resumption.
            if (active.size() != 1
                    || !recovery.getHorsePackageId().equals(active.get(0).getHorsePackageId())) {
                throw new BusinessRuleException(
                        "Unexpected active package; cannot safely resume the original package");
            }
        } else if (!active.isEmpty()) {
            // Recovery already ended: there must not be another active package.
            throw new BusinessRuleException(
                    "Another package is ACTIVE; cannot resume a completed Recovery");
        }

        if (recoveryActive) {
            recovery.setStatus("COMPLETED");
            horsePackageRepository.save(recovery);
        }
        return activatePreservedOriginal(original, horse, managerId, reason,
                "ORIGINAL_PACKAGE_RESUMED");
    }

    private void requirePreservedOriginal(HorsePackage original) {
        if (!"PAUSED".equalsIgnoreCase(original.getStatus())
                || !"PAID".equalsIgnoreCase(original.getPaymentStatus())
                || original.getTrainingPackage() == null
                || "RECOVERY".equalsIgnoreCase(original.getTrainingPackage().getPackageType())) {
            throw new BusinessRuleException("Original package must be a paid, paused ordinary package");
        }
        if (original.getRemainingDays() == null || original.getRemainingDays() <= 0) {
            throw new BusinessRuleException("Original package has no preserved days to resume");
        }
    }

    private HorsePackageResponse activatePreservedOriginal(
            HorsePackage original,
            Horse horse,
            String managerId,
            String reason,
            String action
    ) {
        // Use only the remaining days frozen when Training Lock was confirmed.
        int remaining = original.getRemainingDays();
        LocalDate today = LocalDate.now();
        original.setStartDate(today);
        original.setEndDate(today.plusDays(remaining - 1L));
        original.setStatus("ACTIVE");
        original.setPausedAt(null);
        original.setPauseReason(null);

        HorsePackage saved = horsePackageRepository.saveAndFlush(original);
        packageEventService.record(managerId, horse.getHorseId(), saved.getHorsePackageId(),
                action, reason);
        packageEventService.notifyOwner(horse.getOwner().getUserId(), horse.getHorseId(),
                "PACKAGE_RESUMED", "Original training package resumed with "
                        + remaining + " preserved days.");
        packageEventService.notifyAssignedTrainers(horse, "TRAINING_RESUMED",
                "Club Manager approved resumption of the original ordinary training package. Your accepted assignment is retained.");
        return mapper.toResponse(saved);
    }
}
