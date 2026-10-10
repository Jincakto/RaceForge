package com.raceforge.backend.medical.entity;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.horse.entity.Horse;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Training_Lock")
public class TrainingLock {
    @Id
    @Column(name = "lock_id", length = 20)
    private String lockId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "horse_id", nullable = false)
    private Horse horse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medical_record_id")
    private MedicalRecord medicalRecord;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "locked_by", nullable = false)
    private User lockedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unlocked_by")
    private User unlockedBy;

    @Column(name = "locked_at", nullable = false)
    private LocalDateTime lockedAt;

    @Column(name = "lock_reason", nullable = false, length = 1000)
    private String lockReason;

    @Column(name = "unlocked_at")
    private LocalDateTime unlockedAt;

    @Column(name = "unlock_reason", length = 1000)
    private String unlockReason;

    public String getLockId() { return lockId; }
    public void setLockId(String lockId) { this.lockId = lockId; }
    public Horse getHorse() { return horse; }
    public void setHorse(Horse horse) { this.horse = horse; }
    public MedicalRecord getMedicalRecord() { return medicalRecord; }
    public void setMedicalRecord(MedicalRecord medicalRecord) { this.medicalRecord = medicalRecord; }
    public User getLockedBy() { return lockedBy; }
    public void setLockedBy(User lockedBy) { this.lockedBy = lockedBy; }
    public User getUnlockedBy() { return unlockedBy; }
    public void setUnlockedBy(User unlockedBy) { this.unlockedBy = unlockedBy; }
    public LocalDateTime getLockedAt() { return lockedAt; }
    public void setLockedAt(LocalDateTime lockedAt) { this.lockedAt = lockedAt; }
    public String getLockReason() { return lockReason; }
    public void setLockReason(String lockReason) { this.lockReason = lockReason; }
    public LocalDateTime getUnlockedAt() { return unlockedAt; }
    public void setUnlockedAt(LocalDateTime unlockedAt) { this.unlockedAt = unlockedAt; }
    public String getUnlockReason() { return unlockReason; }
    public void setUnlockReason(String unlockReason) { this.unlockReason = unlockReason; }
}
