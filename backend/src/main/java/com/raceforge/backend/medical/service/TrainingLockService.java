package com.raceforge.backend.medical.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.medical.entity.MedicalRecord;
import com.raceforge.backend.medical.entity.TrainingLock;
import com.raceforge.backend.medical.repository.TrainingLockRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
public class TrainingLockService {
    private final TrainingLockRepository trainingLockRepository;
    private final HorseRepository horseRepository;
    private final UserRepository userRepository;
    private final EntityManager entityManager;
    private final AuditLogService auditLogService;

    public TrainingLockService(TrainingLockRepository trainingLockRepository,
                               HorseRepository horseRepository,
                               UserRepository userRepository,
                               AuditLogService auditLogService,
                               EntityManager entityManager) {
        this.trainingLockRepository = trainingLockRepository;
        this.horseRepository = horseRepository;
        this.userRepository = userRepository;
        this.entityManager = entityManager;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public void lockFromConfirmedExamination(Horse horse, MedicalRecord record,
                                             User veterinarian, String reason) {
        if (horse == null || record == null || veterinarian == null) {
            throw new IllegalArgumentException("Horse, medical record and veterinarian are required");
        }
        validateVeterinarian(veterinarian);
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Lock reason is required");
        }
        entityManager.lock(horse, LockModeType.PESSIMISTIC_WRITE);
        boolean activeLock = trainingLockRepository
                .findFirstByHorse_HorseIdAndUnlockedAtIsNullOrderByLockedAtDesc(horse.getHorseId())
                .isPresent();
        if (activeLock) {
            horse.setTrainingLocked(true);
            return;
        }
        if (Boolean.TRUE.equals(horse.getTrainingLocked())) {
            throw new BusinessRuleException("Horse is marked locked but has no active Training_Lock record; reconcile data first");
        }
        TrainingLock lock = new TrainingLock();
        lock.setHorse(horse);
        lock.setMedicalRecord(record);
        lock.setLockedBy(veterinarian);
        lock.setLockedAt(LocalDateTime.now());
        lock.setLockReason(reason.trim());
        trainingLockRepository.save(lock);
        horse.setTrainingLocked(true);
        horseRepository.save(horse);
        auditLogService.record(veterinarian.getUserId(), horse.getHorseId(), "TRAINING_LOCK", lock.getLockId(), "TRAINING_LOCKED", "SUCCESS", reason.trim());
    }

    @Transactional
    public TrainingLock unlockHorse(Integer horseId, Integer veterinarianId, String reason) {
        if (horseId == null || veterinarianId == null) {
            throw new IllegalArgumentException("Horse ID and veterinarian ID are required");
        }
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Unlock reason is required");
        }
        if (reason.trim().length() > 1000) {
            throw new IllegalArgumentException("Unlock reason must be at most 1000 characters");
        }
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
        activeLock.setUnlockReason(reason.trim());
        horse.setTrainingLocked(false);
        trainingLockRepository.save(activeLock);
        horseRepository.save(horse);
        auditLogService.record(veterinarianId, horseId, "TRAINING_LOCK", activeLock.getLockId(), "TRAINING_UNLOCKED", "SUCCESS", reason.trim());
        return activeLock;
    }

    @Transactional(readOnly = true)
    public List<TrainingLock> getLockHistory(Integer horseId) {
        if (!horseRepository.existsById(horseId)) {
            throw new ResourceNotFoundException("Horse not found");
        }
        return trainingLockRepository.findByHorse_HorseIdOrderByLockedAtDesc(horseId);
    }

    private void validateVeterinarian(User user) {
        if (!"ACTIVE".equals(normalize(user.getStatus())) || user.getRole() == null
                || !"VETERINARIAN".equals(normalize(user.getRole().getRoleName()))) {
            throw new BusinessRuleException("An active Veterinarian account is required");
        }
    }

    private String normalize(String value) {
        return value == null ? null : value.trim().toUpperCase(Locale.ROOT);
    }


}
