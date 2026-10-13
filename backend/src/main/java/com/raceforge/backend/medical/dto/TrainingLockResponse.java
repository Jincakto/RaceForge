package com.raceforge.backend.medical.dto;

import com.raceforge.backend.medical.entity.TrainingLock;
import java.time.LocalDateTime;

public class TrainingLockResponse {
    private Integer lockId;
    private Integer horseId;
    private Integer medicalRecordId;
    private Integer lockedById;
    private Integer unlockedById;
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
    
    public Integer getLockId() {
         return lockId; 
    }

    public Integer getHorseId() { 
        return horseId; 
    }

    public Integer getMedicalRecordId() { 
        return medicalRecordId; 
    }

    public Integer getLockedById() { 
        return lockedById; 
    }

    public Integer getUnlockedById() { 
        return unlockedById; 
    }

    public LocalDateTime getLockedAt() { 
        return lockedAt; 
    }

    public String getLockReason() { 
        return lockReason; 
    }

    public LocalDateTime getUnlockedAt() { 
        return unlockedAt; 
    }

    public String getUnlockReason() { 
        return unlockReason; 
    }
    
}
