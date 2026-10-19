package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;

import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.medical.entity.TrainingLock;
import com.raceforge.backend.medical.repository.TrainingLockRepository;
import com.raceforge.backend.training.dto.HorsePackageResponse;
import com.raceforge.backend.training.dto.RecoveryApprovalRequest;
import com.raceforge.backend.training.entity.HorsePackage;
import com.raceforge.backend.training.entity.TrainingPackage;
import com.raceforge.backend.training.mapper.HorsePackageMapper;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import com.raceforge.backend.training.repository.TrainingPackageRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.List;

@Service
public class RecoveryPackageService {
    private final com.raceforge.backend.horse.service.ModuleIdAllocator idAllocator;

    private final HorseRepository horseRepository;
    private final HorsePackageRepository horsePackageRepository;
    private final TrainingPackageRepository trainingPackageRepository;
    private final TrainingLockRepository trainingLockRepository;
    private final HorsePackageMapper mapper;
    private final EntityManager entityManager;    
    private final PackageEventService packageEventService;
    private final TrainingPackageExpirationService expirationService;

    public RecoveryPackageService(
            HorseRepository horseRepository,
            HorsePackageRepository horsePackageRepository,
            TrainingPackageRepository trainingPackageRepository,
            TrainingLockRepository trainingLockRepository,
            HorsePackageMapper mapper,
            EntityManager entityManager,
            PackageEventService packageEventService,
            TrainingPackageExpirationService expirationService,
            com.raceforge.backend.horse.service.ModuleIdAllocator idAllocator) {
        this.idAllocator = idAllocator;
        this.horseRepository = horseRepository;
        this.horsePackageRepository = horsePackageRepository;
        this.trainingPackageRepository = trainingPackageRepository;
        this.trainingLockRepository = trainingLockRepository;
        this.mapper = mapper;
        this.entityManager = entityManager;
        this.packageEventService = packageEventService;
        this.expirationService = expirationService;
    }

    @Transactional
    public HorsePackageResponse approveRecovery(
            String horseId, RecoveryApprovalRequest request, String managerId
    ) {
        Horse horse = lockedHorse(horseId);
        expirationService.expireForLockedHorse(horse, LocalDate.now());
        TrainingLock activeLock = requireConfirmedTrainingLock(horse);

        TrainingPackage recovery = trainingPackageRepository.findById(request.recoveryPackageId())
                .orElseThrow(() -> new ResourceNotFoundException("Recovery package not found"));
        if (!"RECOVERY".equalsIgnoreCase(recovery.getPackageType())
                || !"ACTIVE".equalsIgnoreCase(recovery.getStatus())) {
            throw new BusinessRuleException("Selected package is not an active Recovery package");
        }

        List<HorsePackage> packages = horsePackageRepository
                .findByHorseIdOrderByRegisteredAtDesc(horseId);

        if (packages.stream().anyMatch(p ->
                "RECOVERY".equalsIgnoreCase(p.getTrainingPackage().getPackageType())
                        && List.of("PENDING", "ACTIVE").contains(p.getStatus()))) {
            throw new BusinessRuleException("A recovery transition is already pending or active");
        }

        if (packages.stream().anyMatch(p -> "PENDING".equals(p.getStatus()))) {
            throw new BusinessRuleException("Resolve other pending registrations first");
        }

        // By this stage, TrainingLockService must have paused the ordinary
        // package and frozen remainingDays on the LOCK DATE.
        boolean activeNormal = packages.stream().anyMatch(p ->
                "ACTIVE".equals(p.getStatus())
                        && !"RECOVERY".equalsIgnoreCase(p.getTrainingPackage().getPackageType()));
        if (activeNormal) {
            throw new BusinessRuleException(
                    "An ordinary package is still ACTIVE despite Training Lock; "
                    + "it must be paused at the lock event, not at CM approval");
        }

        List<HorsePackage> pausedNormal = packages.stream()
                .filter(p -> "PAUSED".equals(p.getStatus())
                        && !"RECOVERY".equalsIgnoreCase(p.getTrainingPackage().getPackageType()))
                .toList();
        if (pausedNormal.size() > 1) {
            throw new BusinessRuleException("More than one paused original package exists");
        }
        // Center-funded Recovery is ONLY for an injury during an active ordinary
        // training package. A horse injured before its first training package
        // uses the separate Owner-paid registration workflow.
        if (pausedNormal.isEmpty()) {
            throw new BusinessRuleException(
                    "No paid ordinary package paused by Training Lock. "
                    + "First-time recovery must be purchased by the Horse Owner");
        }
        HorsePackage original = pausedNormal.get(0);
        entityManager.lock(original, LockModeType.PESSIMISTIC_WRITE);
        // Fund Recovery only if the original was paused for THIS medical lock,
        // not for an earlier injury or an unrelated administrative pause.
        String expectedPauseReason = "TRAINING_LOCK_MEDICAL:"
                + activeLock.getMedicalRecord().getMedicalRecordId();
        if (!expectedPauseReason.equals(original.getPauseReason())
                || original.getPausedAt() == null
                || activeLock.getLockedAt() == null
                || original.getPausedAt().isAfter(activeLock.getLockedAt())) {
            throw new BusinessRuleException(
                    "Original package was not paused by the current confirmed Training Lock");
        }
        if (!"PAID".equals(original.getPaymentStatus())
                || original.getRemainingDays() == null
                || original.getRemainingDays() <= 0) {
            throw new BusinessRuleException("Original package has no valid preserved paid days");
        }
        if (recovery.getDurationDays() == null || recovery.getDurationDays() <= 0) {
            throw new BusinessRuleException("Recovery package duration must be positive");
        }

        // No Owner payment or payment simulation here. The center covers the
        // recovery; totalPrice is the OWNER-PAYABLE amount (zero), not the
        // center's internal accounting cost.
        LocalDate today = LocalDate.now();
        HorsePackage centerRecovery = new HorsePackage();
        centerRecovery.setHorsePackageId(idAllocator.next("HPG"));
        centerRecovery.setHorse(horse);
        centerRecovery.setTrainingPackage(recovery);
        centerRecovery.setReplacedHorsePackage(original);
        centerRecovery.setTotalPrice(BigDecimal.ZERO);
        centerRecovery.setPaymentStatus("CENTER_COVERED");
        centerRecovery.setStatus("ACTIVE");
        centerRecovery.setStartDate(today);
        centerRecovery.setEndDate(today.plusDays(recovery.getDurationDays() - 1L));
        centerRecovery.setRemainingDays(recovery.getDurationDays());
        // Intentionally NO paidAt: the owner never paid.

        HorsePackage saved = horsePackageRepository.saveAndFlush(centerRecovery);
        packageEventService.record(managerId, horseId, saved.getHorsePackageId(),
                "RECOVERY_CENTER_ACTIVATED", request.reason());
        packageEventService.notifyOwner(horse.getOwner().getUserId(), horseId,
                "RECOVERY_CENTER_ACTIVATED",
                "Center-funded Recovery is ACTIVE. No payment is required from you; "
                + "original training days remain preserved.");
        packageEventService.notifyAssignedTrainers(horse, "HORSE_RECOVERY_ACTIVE",
                "Center-funded Recovery is active. Your assignment is retained; do not resume ordinary training until CM approval after veterinary Unlock.");
        packageEventService.notifyManagers(horseId, "RECOVERY_CENTER_ACTIVATED",
                "Recovery was activated upon CM approval and is covered by the center.");
        return mapper.toResponse(saved);
    }

    @Transactional
    public HorsePackageResponse simulateRecoveryPayment(
            String recoveryRegistrationId, boolean successful, String ownerId
    ) {
        HorsePackage registration = horsePackageRepository.findById(recoveryRegistrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Recovery registration not found"));
        Horse horse = lockedHorse(registration.getHorse().getHorseId());
        if (ownerId == null || horse.getOwner() == null
                || !ownerId.equals(horse.getOwner().getUserId())) {
            throw new BusinessRuleException("Only the Horse Owner may simulate payment");
        }

        entityManager.lock(registration, LockModeType.PESSIMISTIC_WRITE);
        expirationService.expireForLockedHorse(horse, LocalDate.now());
        // Center-funded Recovery is already ACTIVE. It must never enter an
        // Owner payment flow, even if someone calls the endpoint directly.
        if (registration.getReplacedHorsePackage() != null) {
            throw new BusinessRuleException(
                    "Center-funded Recovery does not require Owner payment");
        }
        if (!"RECOVERY".equalsIgnoreCase(registration.getTrainingPackage().getPackageType())
                || !"PENDING".equals(registration.getStatus())
                || !"PENDING".equals(registration.getPaymentStatus())) {
            throw new BusinessRuleException("Recovery registration is not awaiting payment");
        }
        if (!successful) {
            registration.setPaymentStatus("FAILED");
            registration.setStatus("CANCELLED");
            HorsePackage failed = horsePackageRepository.saveAndFlush(registration);
            packageEventService.record(ownerId, horse.getHorseId(), failed.getHorsePackageId(),
                    "RECOVERY_PAYMENT_FAILED", "Simulated payment failed");
            packageEventService.notifyManagers(horse.getHorseId(),
                    "RECOVERY_PAYMENT_FAILED", "Recovery payment was not successful.");
            return mapper.toResponse(failed);
        }

        requireConfirmedTrainingLock(horse);
        if (!"NOT_FIT".equalsIgnoreCase(horse.getHealthStatus())) {
            throw new BusinessRuleException("Horse must remain NOT_FIT for initial Recovery payment");
        }
        if (!"ACTIVE".equalsIgnoreCase(registration.getTrainingPackage().getStatus())) {
            throw new BusinessRuleException("Recovery package is no longer offered");
        }
        List<HorsePackage> active = horsePackageRepository
                .findByHorse_HorseIdAndStatus(horse.getHorseId(), "ACTIVE");
        if (!active.isEmpty()) {
            throw new BusinessRuleException("Another package is active; recovery cannot be activated");
        }
        // If an ordinary package exists, Owner-paid initial recovery is not
        // the correct route. CM must handle an injury during training.
        boolean hasOrdinaryHistory = horsePackageRepository
                .findByHorseIdOrderByRegisteredAtDesc(horse.getHorseId())
                .stream()
                .anyMatch(p -> !"RECOVERY".equalsIgnoreCase(
                        p.getTrainingPackage().getPackageType()));
        if (hasOrdinaryHistory) {
            throw new BusinessRuleException(
                    "Owner-paid Recovery is reserved for horses before their first ordinary training package");
        }

        LocalDate today = LocalDate.now();
        Integer days = registration.getTrainingPackage().getDurationDays();
        if (days == null || days <= 0) {
            throw new BusinessRuleException("Recovery package duration must be positive");
        }
        registration.setPaymentStatus("PAID");
        registration.setPaidAt(LocalDateTime.now());
        registration.setStatus("ACTIVE");
        registration.setStartDate(today);
        registration.setEndDate(today.plusDays(days - 1L));
        registration.setRemainingDays(days);
        HorsePackage saved = horsePackageRepository.saveAndFlush(registration);
        packageEventService.record(ownerId, horse.getHorseId(), saved.getHorsePackageId(),
                "RECOVERY_OWNER_ACTIVATED", "Horse Owner paid for initial Recovery");
        packageEventService.notifyOwner(ownerId, horse.getHorseId(),
                "RECOVERY_OWNER_ACTIVATED", "Owner-paid Recovery is now active.");
        packageEventService.notifyManagers(horse.getHorseId(),
                "RECOVERY_OWNER_ACTIVATED", "Initial Owner-paid Recovery is now active.");
        return mapper.toResponse(saved);
    }

    private Horse lockedHorse(String horseId) {
        Horse horse = horseRepository.findById(horseId)
                .orElseThrow(() -> new ResourceNotFoundException("Horse not found"));
        entityManager.lock(horse, LockModeType.PESSIMISTIC_WRITE);
        return horse;
    }

    private TrainingLock requireConfirmedTrainingLock(Horse horse) {
        if (!Boolean.TRUE.equals(horse.getTrainingLocked())) {
            throw new BusinessRuleException("Horse must have an active Training Lock");
        }
        TrainingLock lock = trainingLockRepository
                .findFirstByHorse_HorseIdAndUnlockedAtIsNullOrderByLockedAtDesc(horse.getHorseId())
                .orElseThrow(() -> new BusinessRuleException("Active Training Lock record is missing"));
        if (lock.getMedicalRecord() == null
                || !"CONFIRMED".equalsIgnoreCase(lock.getMedicalRecord().getStatus())
                || lock.getMedicalRecord().getMedicalRecordId() == null) {
            throw new BusinessRuleException("Training Lock must originate from a confirmed medical examination");
        }
        return lock;
    }


}
