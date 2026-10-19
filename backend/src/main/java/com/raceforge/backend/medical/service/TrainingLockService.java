package com.raceforge.backend.medical.service;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.entity.Trainer;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.medical.entity.MedicalRecord;
import com.raceforge.backend.medical.entity.TrainingLock;
import com.raceforge.backend.medical.repository.TrainingLockRepository;
import com.raceforge.backend.notification.service.NotificationService;
import com.raceforge.backend.training.service.TrainingPackagePauseService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.HashSet;
import java.util.Set;
import java.util.Locale;
import java.util.Objects;

@Service
public class TrainingLockService {

    private final TrainingLockRepository trainingLockRepository;
    private final HorseRepository horseRepository;
    private final UserRepository userRepository;
    private final EntityManager entityManager;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final TrainingPackagePauseService packagePauseService;

    public TrainingLockService(
            TrainingLockRepository trainingLockRepository,
            HorseRepository horseRepository,
            UserRepository userRepository,
            AuditLogService auditLogService,
            EntityManager entityManager,
            NotificationService notificationService,
            TrainingPackagePauseService packagePauseService) {
        this.trainingLockRepository = trainingLockRepository;
        this.horseRepository = horseRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
        this.entityManager = entityManager;
        this.notificationService = notificationService;
        this.packagePauseService = packagePauseService;
    }

    @Transactional
    public void lockFromConfirmedExamination(Horse horse, MedicalRecord record,
                                             User veterinarian, String reason) {
        if (horse == null || record == null || veterinarian == null) {
            throw new IllegalArgumentException("Horse, medical record and veterinarian are required");
        }
        validateVeterinarian(veterinarian);
        if (!"CONFIRMED".equals(normalize(record.getStatus()))
                || !"NOT_FIT".equals(normalize(record.getFinalConclusion()))) {
            throw new BusinessRuleException("Training Lock requires a confirmed NOT_FIT conclusion");
        }
        if (record.getHealthProfile() == null
                || record.getHealthProfile().getHorse() == null
                || !Objects.equals(record.getHealthProfile().getHorse().getHorseId(), horse.getHorseId())
                || record.getVeterinarian() == null
                || !Objects.equals(record.getVeterinarian().getUserId(), veterinarian.getUserId())) {
            throw new BusinessRuleException("Confirmed examination must match the horse and veterinarian");
        }
        String lockReason = requireReason(reason, "Training Lock reason");
        if (record.getMedicalRecordId() == null || record.getMedicalRecordId().isBlank()) {
            throw new BusinessRuleException("Confirmed medical record ID is required for Training Lock");
        }
        entityManager.lock(horse, LockModeType.PESSIMISTIC_WRITE);

        boolean activeLock = trainingLockRepository
                .findFirstByHorse_HorseIdAndUnlockedAtIsNullOrderByLockedAtDesc(horse.getHorseId())
                .isPresent();
        if (activeLock) {
            // Already locked: do not create duplicate rows or duplicate events.
            horse.setTrainingLocked(true);
            return;
        }
        if (Boolean.TRUE.equals(horse.getTrainingLocked())) {
            throw new BusinessRuleException(
                    "Horse is marked locked but has no active Training_Lock record; reconcile data first");
        }

        // Freeze unused ordinary package days on this date, not when CM
        // eventually approves Recovery. Failure rolls back the medical lock.
        packagePauseService.pauseActiveNormalPackage(horse.getHorseId(), record.getMedicalRecordId());

        TrainingLock lock = new TrainingLock();
        lock.setHorse(horse);
        lock.setMedicalRecord(record);
        lock.setLockedBy(veterinarian);
        lock.setLockedAt(LocalDateTime.now());
        lock.setLockReason(lockReason);
        trainingLockRepository.save(lock);
        horse.setTrainingLocked(true);
        horseRepository.save(horse);
        auditLogService.record(veterinarian.getUserId(), horse.getHorseId(),
                "TRAINING_LOCK", lock.getLockId(), "TRAINING_LOCKED", "SUCCESS", lockReason);
        notifyManagers(horse.getHorseId(), "TRAINING_LOCKED",
                "Vet confirmed Training Lock. Review the horse and approve the Recovery workflow if appropriate.");
        notifyAssignedTrainers(horse, "TRAINING_SUSPENDED",
                "Medical Training Lock confirmed. Ordinary training is suspended; your assignment is retained.");
    }

    @Transactional
    public TrainingLock unlockHorse(String horseId, Integer veterinarianId, String reason) {
        if (horseId == null || horseId.isBlank() || veterinarianId == null) {
            throw new IllegalArgumentException("Horse ID and veterinarian ID are required");
        }
        String unlockReason = requireReason(reason, "Unlock reason");
        User veterinarian = userRepository.findDetailedById(veterinarianId)
                .orElseThrow(() -> new ResourceNotFoundException("Veterinarian not found"));
        validateVeterinarian(veterinarian);

        Horse horse = horseRepository.findById(horseId)
                .orElseThrow(() -> new ResourceNotFoundException("Horse not found"));
        entityManager.lock(horse, LockModeType.PESSIMISTIC_WRITE);
        if (!"READY".equals(normalize(horse.getHealthStatus()))) {
            throw new BusinessRuleException("Only horses with READY health status may be unlocked");
        }
        if (!Boolean.TRUE.equals(horse.getTrainingLocked())) {
            throw new BusinessRuleException("Horse is not currently training-locked");
        }
        TrainingLock activeLock = trainingLockRepository
                .findFirstByHorse_HorseIdAndUnlockedAtIsNullOrderByLockedAtDesc(horseId)
                .orElseThrow(() -> new BusinessRuleException("Active Training_Lock record not found"));

        activeLock.setUnlockedBy(veterinarian);
        activeLock.setUnlockedAt(LocalDateTime.now());
        activeLock.setUnlockReason(unlockReason);
        horse.setTrainingLocked(false);
        trainingLockRepository.save(activeLock);
        horseRepository.save(horse);
        auditLogService.record(veterinarianId, horseId, "TRAINING_LOCK",
                activeLock.getLockId(), "TRAINING_UNLOCKED", "SUCCESS", unlockReason);
        notifyManagers(horseId, "TRAINING_UNLOCKED",
                "Vet released Training Lock. Review and approve resumption of the previous training package when eligible.");
        notifyAssignedTrainers(horse, "HORSE_TRAINING_UNLOCKED",
                "Training Lock has been released, but ordinary training remains suspended until Club Manager resumes the original package.");
        return activeLock;
    }

    @Transactional(readOnly = true)
    public List<TrainingLock> getLockHistory(String horseId) {
        if (!horseRepository.existsById(horseId)) {
            throw new ResourceNotFoundException("Horse not found");
        }
        return trainingLockRepository.findByHorse_HorseIdOrderByLockedAtDesc(horseId);
    }

    /** Notify only currently assigned trainers. Do not delete Horse_Trainer or change ACCEPTED assignment rows. */
    private void notifyAssignedTrainers(Horse horse, String type, String message) {
        if (horse.getTrainers() == null) return;
        Set<Integer> notified = new HashSet<>();
        for (Trainer trainer : horse.getTrainers()) {
            if (trainer != null && trainer.getUser() != null
                    && trainer.getUser().getUserId() != null
                    && notified.add(trainer.getUser().getUserId())) {
                notificationService.notify(trainer.getUser().getUserId(), type,
                        "Horse " + horse.getHorseId() + " training status", message);
            }
        }
    }

    /** Notify the CM only after a new lock or unlock action, not for duplicates. */
    private void notifyManagers(String horseId, String type, String message) {
        for (User manager : userRepository.findActiveManagers()) {
            notificationService.notify(manager.getUserId(), type,
                    "Horse " + horseId + " medical status updated", message);
        }
    }

    private void validateVeterinarian(User user) {
        if (!"ACTIVE".equals(normalize(user.getStatus())) || user.getRole() == null
                || !"VETERINARIAN".equals(normalize(user.getRole().getRoleName()))) {
            throw new BusinessRuleException("An active Veterinarian account is required");
        }
    }

    private String requireReason(String reason, String label) {
        if (reason == null || reason.isBlank()) {
            throw new BusinessRuleException(label + " is required");
        }
        String normalized = reason.trim();
        if (normalized.length() > 1000) {
            throw new BusinessRuleException(label + " must not exceed 1000 characters");
        }
        return normalized;
    }

    private String normalize(String value) {
        return value == null ? null : value.trim().toUpperCase(Locale.ROOT);
    }
}
