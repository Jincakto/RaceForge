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

    public RecoveryPackageService(
            HorseRepository horseRepository,
            HorsePackageRepository horsePackageRepository,
            TrainingPackageRepository trainingPackageRepository,
            TrainingLockRepository trainingLockRepository,
            HorsePackageMapper mapper,
            EntityManager entityManager
    ) {
        this.horseRepository = horseRepository;
        this.horsePackageRepository = horsePackageRepository;
        this.trainingPackageRepository = trainingPackageRepository;
        this.trainingLockRepository = trainingLockRepository;
        this.mapper = mapper;
        this.entityManager = entityManager;
    }

    @Transactional
    public HorsePackageResponse approveRecovery(
            String horseId, RecoveryApprovalRequest request
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

        HorsePackage pendingRecovery = new HorsePackage();
        pendingRecovery.setHorsePackageId(newId());
        pendingRecovery.setHorse(horse);
        pendingRecovery.setTrainingPackage(recovery);
        pendingRecovery.setTotalPrice(recovery.getPrice());
        pendingRecovery.setStatus("PENDING");
        pendingRecovery.setPaymentStatus("PENDING");

        if (!activeNormal.isEmpty()) {
            pendingRecovery.setReplacedHorsePackage(activeNormal.get(0));
        }
        return mapper.toResponse(horsePackageRepository.saveAndFlush(pendingRecovery));
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
            return mapper.toResponse(horsePackageRepository.saveAndFlush(registration));
        }

        requireConfirmedTrainingLock(horse);
        if (!"ACTIVE".equalsIgnoreCase(registration.getTrainingPackage().getStatus())) {
            throw new BusinessRuleException("Recovery package is no longer offered");
        }
        List<HorsePackage> active = horsePackageRepository
                .findByHorse_HorseIdAndStatus(horse.getHorseId(), "ACTIVE");
        HorsePackage original = registration.getReplacedHorsePackage();

        if (original == null && !active.isEmpty()) {
            throw new BusinessRuleException("A horse with an active package must switch through that package");
        }
        if (original != null) {
            if (active.size() != 1 || !active.get(0).getHorsePackageId()
                    .equals(original.getHorsePackageId())) {
                throw new BusinessRuleException("Original package is no longer the active package");
            }
            if (!original.getHorse().getHorseId().equals(horse.getHorseId())
                    || "RECOVERY".equalsIgnoreCase(original.getTrainingPackage().getPackageType())) {
                throw new BusinessRuleException("Invalid original package linkage");
            }
            int remaining = original.getEndDate() == null ? 0 :
                    (int) Math.max(0, ChronoUnit.DAYS.between(LocalDate.now(),
                            original.getEndDate()) + 1);
            if (remaining == 0) {
                throw new BusinessRuleException("Original package has no days remaining");
            }
            original.setRemainingDays(remaining);
            original.setStatus("PAUSED");
            original.setPausedAt(LocalDateTime.now());
            original.setPauseReason("Veterinarian-confirmed training lock; recovery activated");
            horsePackageRepository.save(original);
        }

        LocalDate today = LocalDate.now();
        int days = registration.getTrainingPackage().getDurationDays();
        registration.setPaymentStatus("PAID");
        registration.setPaidAt(LocalDateTime.now());
        registration.setStatus("ACTIVE");
        registration.setStartDate(today);
        registration.setEndDate(today.plusDays(days - 1L));
        registration.setRemainingDays(days);
        return mapper.toResponse(horsePackageRepository.saveAndFlush(registration));
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
