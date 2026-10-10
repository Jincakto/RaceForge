package com.raceforge.backend.medical.service;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;
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
import java.util.UUID;

@Service
public class TrainingLockService {
    private final TrainingLockRepository trainingLockRepository;
    private final HorseRepository horseRepository;
    private final UserRepository userRepository;
    private final EntityManager entityManager;

    public TrainingLockService(TrainingLockRepository trainingLockRepository,
                               HorseRepository horseRepository,
                               UserRepository userRepository,
                               EntityManager entityManager) {
        this.trainingLockRepository = trainingLockRepository;
        this.horseRepository = horseRepository;
        this.userRepository = userRepository;
        this.entityManager = entityManager;
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
            throw new IllegalStateException("Horse is marked locked but has no active Training_Lock record; reconcile data first");
        }
        TrainingLock lock = new TrainingLock();
        lock.setLockId(generateId());
        lock.setHorse(horse);
        lock.setMedicalRecord(record);
        lock.setLockedBy(veterinarian);
        lock.setLockedAt(LocalDateTime.now());
        lock.setLockReason(reason.trim());
        trainingLockRepository.save(lock);
        horse.setTrainingLocked(true);
        horseRepository.save(horse);
    }

    @Transactional
    public TrainingLock unlockHorse(String horseId, String veterinarianId, String reason) {
        if (horseId == null || horseId.isBlank() || veterinarianId == null || veterinarianId.isBlank()) {
            throw new IllegalArgumentException("Horse ID and veterinarian ID are required");
        }
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Unlock reason is required");
        }
        if (reason.trim().length() > 1000) {
            throw new IllegalArgumentException("Unlock reason must be at most 1000 characters");
        }
        User veterinarian = userRepository.findDetailedById(veterinarianId)
                .orElseThrow(() -> new IllegalArgumentException("Veterinarian not found"));
        validateVeterinarian(veterinarian);

        Horse horse = horseRepository.findById(horseId)
                .orElseThrow(() -> new IllegalArgumentException("Horse not found"));
        entityManager.lock(horse, LockModeType.PESSIMISTIC_WRITE);
        if (!"READY".equals(normalize(horse.getHealthStatus()))) {
            throw new IllegalStateException("Only horses with READY health status may be unlocked");
        }
        if (!Boolean.TRUE.equals(horse.getTrainingLocked())) {
            throw new IllegalStateException("Horse is not currently training-locked");
        }
        TrainingLock activeLock = trainingLockRepository
                .findFirstByHorse_HorseIdAndUnlockedAtIsNullOrderByLockedAtDesc(horseId)
                .orElseThrow(() -> new IllegalStateException("Active Training_Lock record not found"));
        activeLock.setUnlockedBy(veterinarian);
        activeLock.setUnlockedAt(LocalDateTime.now());
        activeLock.setUnlockReason(reason.trim());
        horse.setTrainingLocked(false);
        trainingLockRepository.save(activeLock);
        horseRepository.save(horse);
        return activeLock;
    }

    @Transactional(readOnly = true)
    public List<TrainingLock> getLockHistory(String horseId) {
        if (!horseRepository.existsById(horseId)) {
            throw new IllegalArgumentException("Horse not found");
        }
        return trainingLockRepository.findByHorse_HorseIdOrderByLockedAtDesc(horseId);
    }

    private void validateVeterinarian(User user) {
        if (!"ACTIVE".equals(normalize(user.getStatus())) || user.getRole() == null
                || !"VETERINARIAN".equals(normalize(user.getRole().getRoleName()))) {
            throw new IllegalStateException("An active Veterinarian account is required");
        }
    }

    private String normalize(String value) {
        return value == null ? null : value.trim().toUpperCase(Locale.ROOT);
    }

    private String generateId() {
        return "LCK" + UUID.randomUUID().toString().replace("-", "")
                .substring(0, 10).toUpperCase(Locale.ROOT);
    }
}
