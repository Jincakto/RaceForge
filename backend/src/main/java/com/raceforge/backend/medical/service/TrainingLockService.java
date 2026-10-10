package com.raceforge.backend.medical.service;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.medical.entity.MedicalRecord;
import com.raceforge.backend.medical.entity.TrainingLock;
import com.raceforge.backend.medical.repository.TrainingLockRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

@Service
public class TrainingLockService {
    private final TrainingLockRepository trainingLockRepository;

    public TrainingLockService(TrainingLockRepository trainingLockRepository) {
        this.trainingLockRepository = trainingLockRepository;
    }

    public void lockFromConfirmedExamination(Horse horse, MedicalRecord record,
                                              User veterinarian, String reason) {
        if (Boolean.TRUE.equals(horse.getTrainingLocked())) {

            return;
        }
        TrainingLock lock = new TrainingLock();
        lock.setLockId("LCK" + UUID.randomUUID().toString().replace("-", "")
                .substring(0, 10).toUpperCase(Locale.ROOT));
        lock.setHorse(horse);
        lock.setMedicalRecord(record);
        lock.setLockedBy(veterinarian);
        lock.setLockedAt(LocalDateTime.now());
        lock.setLockReason(reason);
        trainingLockRepository.save(lock);
        horse.setTrainingLocked(true);
    }
}
