package com.raceforge.backend.medical.dto;

import com.raceforge.backend.medical.entity.TrainingLock;
import java.time.LocalDateTime;

public class TrainingLockResponse {
    private String lockId;
    private String horseId;
    private String medicalRecordId;
    private String lockedById;
    private String unlockedById;
    private LocalDateTime lockedAt;
    private String lockReason;
    private LocalDateTime unlockedAt;
    private String unlockReason;

    public static TrainingLockResponse from(TrainingLock lock) {
        TrainingLockResponse result = new TrainingLockResponse();
        result.lockId = lock.getLockId();
        result.horseId = lock.getHorse().getHorseId();
        result.medicalRecordId = lock.getMedicalRecord() == null ? null : lock.getMedicalRecord().getMedicalRecordId();
        result.lockedById = lock.getLockedBy().getUserId();
        result.unlockedById = lock.getUnlockedBy() == null ? null : lock.getUnlockedBy().getUserId();
        result.lockedAt = lock.getLockedAt();
        result.lockReason = lock.getLockReason();
        result.unlockedAt = lock.getUnlockedAt();
        result.unlockReason = lock.getUnlockReason();
        return result;
    }
    public String getLockId() { return lockId; }
    public String getHorseId() { return horseId; }
    public String getMedicalRecordId() { return medicalRecordId; }
    public String getLockedById() { return lockedById; }
    public String getUnlockedById() { return unlockedById; }
    public LocalDateTime getLockedAt() { return lockedAt; }
    public String getLockReason() { return lockReason; }
    public LocalDateTime getUnlockedAt() { return unlockedAt; }
    public String getUnlockReason() { return unlockReason; }
}
