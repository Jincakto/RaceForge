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
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class RecoveryPackageService {

    private final HorseRepository horseRepository;
    private final HorsePackageRepository horsePackageRepository;
    private final TrainingPackageRepository trainingPackageRepository;
    private final TrainingLockRepository trainingLockRepository;
    private final HorsePackageMapper mapper;
    private final EntityManager entityManager;    
    private final PackageEventService packageEventService;

    public RecoveryPackageService(
            HorseRepository horseRepository,
            HorsePackageRepository horsePackageRepository,
            TrainingPackageRepository trainingPackageRepository,
            TrainingLockRepository trainingLockRepository,
            HorsePackageMapper mapper,
            EntityManager entityManager,
            PackageEventService packageEventService
    ) {
        this.horseRepository = horseRepository;
        this.horsePackageRepository = horsePackageRepository;
        this.trainingPackageRepository = trainingPackageRepository;
        this.trainingLockRepository = trainingLockRepository;
        this.mapper = mapper;
        this.entityManager = entityManager;
        this.packageEventService = packageEventService;
    }

    @Transactional
    public HorsePackageResponse approveRecovery(
            String horseId, RecoveryApprovalRequest request, String managerId
    ) {
        Horse horse = lockedHorse(horseId);
        requireConfirmedTrainingLock(horse);

        TrainingPackage recovery = trainingPackageRepository.findById(request.recoveryPackageId())
                .orElseThrow(() -> new ResourceNotFoundException("Recovery package not found"));
        if (!"RECOVERY".equalsIgnoreCase(recovery.getPackageType())
                || !"ACTIVE".equalsIgnoreCase(recovery.getStatus())) {
            throw new BusinessRuleException("Selected package is not an active Recovery package");
        }

        List<HorsePackage> packages = horsePackageRepository
                .findByHorse_HorseIdOrderByRegisteredAtDesc(horseId);

        if (packages.stream().anyMatch(p ->
                "RECOVERY".equalsIgnoreCase(p.getTrainingPackage().getPackageType())
                        && List.of("PENDING", "ACTIVE").contains(p.getStatus()))) {
            throw new BusinessRuleException("A recovery transition is already pending or active");
        }

        List<HorsePackage> activeNormal = packages.stream()
                .filter(p -> "ACTIVE".equals(p.getStatus())
                        && !"RECOVERY".equalsIgnoreCase(p.getTrainingPackage().getPackageType()))
                .toList();
        if (activeNormal.size() > 1) {
            throw new BusinessRuleException("More than one active normal package exists");
        }
        if (packages.stream().anyMatch(p -> "PENDING".equals(p.getStatus()))) {
            throw new BusinessRuleException("Resolve other pending registrations first");
        }

        List<HorsePackage> pausedNormal = packages.stream()
                .filter(p -> "PAUSED".equals(p.getStatus())
                        && !"RECOVERY".equalsIgnoreCase(p.getTrainingPackage().getPackageType()))
                .toList();
        if (pausedNormal.size() > 1 || (!pausedNormal.isEmpty() && !activeNormal.isEmpty())) {
            throw new BusinessRuleException("Ambiguous original package state");
        }

        HorsePackage original = !activeNormal.isEmpty() ? activeNormal.get(0)
                : (pausedNormal.isEmpty() ? null : pausedNormal.get(0));

        if (original != null && "ACTIVE".equals(original.getStatus())) {
            LocalDate today = LocalDate.now();
            if (original.getEndDate() == null) {
                throw new BusinessRuleException("Original package end date is missing");
            }
            long unused = ChronoUnit.DAYS.between(today, original.getEndDate()) + 1;
            if (unused <= 0) {
                throw new BusinessRuleException("Original package has no days remaining");
            }
            original.setRemainingDays(Math.toIntExact(unused));
            original.setStatus("PAUSED");
            original.setPausedAt(LocalDateTime.now());
            original.setPauseReason(request.reason() == null || request.reason().isBlank()
                    ? "Training Lock confirmed; awaiting Recovery payment"
                    : request.reason().trim());
            horsePackageRepository.save(original);
        }
        if (original != null && (original.getRemainingDays() == null
                || original.getRemainingDays() <= 0)) {
            throw new BusinessRuleException("Paused package has no preserved days");
        }

        HorsePackage pendingRecovery = new HorsePackage();
        pendingRecovery.setHorsePackageId(newId());
        pendingRecovery.setHorse(horse);
        pendingRecovery.setTrainingPackage(recovery);
        pendingRecovery.setTotalPrice(recovery.getPrice());
        pendingRecovery.setStatus("PENDING");
        pendingRecovery.setPaymentStatus("PENDING");

        if (original != null) {
            pendingRecovery.setReplacedHorsePackage(original);
        }

        HorsePackage saved = horsePackageRepository.saveAndFlush(pendingRecovery);
        packageEventService.record(managerId, horseId, saved.getHorsePackageId(),
                "RECOVERY_APPROVED", request.reason());
        packageEventService.notifyOwner(horse.getOwner().getUserId(), horseId,
                "RECOVERY_APPROVED", "Club Manager approved Recovery; payment is pending.");
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
        if (!"ACTIVE".equalsIgnoreCase(registration.getTrainingPackage().getStatus())) {
            throw new BusinessRuleException("Recovery package is no longer offered");
        }
        List<HorsePackage> active = horsePackageRepository
                .findByHorse_HorseIdAndStatus(horse.getHorseId(), "ACTIVE");
        HorsePackage original = registration.getReplacedHorsePackage();

        if (!active.isEmpty()) {
            throw new BusinessRuleException("Another package is active; recovery cannot be activated");
        }
        if (original != null) {
            entityManager.lock(original, LockModeType.PESSIMISTIC_WRITE);
            if (!original.getHorse().getHorseId().equals(horse.getHorseId())
                    || "RECOVERY".equalsIgnoreCase(original.getTrainingPackage().getPackageType())
                    || !"PAUSED".equals(original.getStatus())
                    || !"PAID".equals(original.getPaymentStatus())
                    || original.getRemainingDays() == null
                    || original.getRemainingDays() <= 0) {
                throw new BusinessRuleException("Original package is not a valid paused package");
            }
        }

        LocalDate today = LocalDate.now();
        int days = registration.getTrainingPackage().getDurationDays();
        registration.setPaymentStatus("PAID");
        registration.setPaidAt(LocalDateTime.now());
        registration.setStatus("ACTIVE");
        registration.setStartDate(today);
        registration.setEndDate(today.plusDays(days - 1L));
        registration.setRemainingDays(days);
        HorsePackage saved = horsePackageRepository.saveAndFlush(registration);
        packageEventService.record(ownerId, horse.getHorseId(), saved.getHorsePackageId(),
                "RECOVERY_ACTIVATED", "Recovery payment successful; original package was paused at CM approval");
        packageEventService.notifyOwner(ownerId, horse.getHorseId(),
                "RECOVERY_ACTIVATED", "Recovery is active; original package days preserved.");
        packageEventService.notifyManagers(horse.getHorseId(),
                "RECOVERY_ACTIVATED", "Recovery activated; preserved days remain frozen.");
        return mapper.toResponse(saved);
    }

    private Horse lockedHorse(String horseId) {
        Horse horse = horseRepository.findById(horseId)
                .orElseThrow(() -> new ResourceNotFoundException("Horse not found"));
        entityManager.lock(horse, LockModeType.PESSIMISTIC_WRITE);
        return horse;
    }

    private void requireConfirmedTrainingLock(Horse horse) {
        if (!Boolean.TRUE.equals(horse.getTrainingLocked())) {
            throw new BusinessRuleException("Horse must have an active Training Lock");
        }
        TrainingLock lock = trainingLockRepository
                .findFirstByHorse_HorseIdAndUnlockedAtIsNullOrderByLockedAtDesc(horse.getHorseId())
                .orElseThrow(() -> new BusinessRuleException("Active Training Lock record is missing"));
        if (lock.getMedicalRecord() == null
                || !"CONFIRMED".equalsIgnoreCase(lock.getMedicalRecord().getStatus())) {
            throw new BusinessRuleException("Training Lock must originate from a confirmed medical examination");
        }
    }

    private String newId() {
        return "HPK" + UUID.randomUUID().toString().replace("-", "")
                .substring(0, 17).toUpperCase(Locale.ROOT);
    }
}
