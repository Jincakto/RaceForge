package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.training.entity.HorsePackage;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

/**
 * Expires ACTIVE package registrations after their inclusive end date.
 * Never modifies PAUSED registrations or the horse's medical Training Lock.
 */
@Service
public class TrainingPackageExpirationService {

    private final HorsePackageRepository horsePackages;
    private final HorseRepository horses;
    private final EntityManager entityManager;
    private final PackageEventService events;

    public TrainingPackageExpirationService(HorsePackageRepository horsePackages,
                                            HorseRepository horses,
                                            EntityManager entityManager,
                                            PackageEventService events) {
        this.horsePackages = horsePackages;
        this.horses = horses;
        this.entityManager = entityManager;
        this.events = events;
    }

    /**
     * For registration/payment operations that ALREADY hold a PESSIMISTIC_WRITE
     * lock on the Horse. Lock order is always Horse -> its package rows.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public int expireForLockedHorse(Horse horse, LocalDate today) {
        Objects.requireNonNull(horse, "horse");
        Objects.requireNonNull(today, "today");
        List<HorsePackage> active = horsePackages.findByHorseIdAndStatusForUpdate(
                horse.getHorseId(), "ACTIVE");
        int count = 0;
        for (HorsePackage registration : active) {
            if (expireIfDue(registration, horse, today)) {
                count++;
            }
        }
        return count;
    }

    /**
     * Used by the daily scheduled sweep. Locks the horse FIRST to match the
     * Medical/Payment/Resumption locking order, then locks the registration.
     * Rows changed or already expired by another caller are safely skipped.
     */
    @Transactional
    public boolean expireRegistration(String registrationId, LocalDate today) {
        Objects.requireNonNull(today, "today");
        if (registrationId == null) {
            throw new IllegalArgumentException("Registration ID is required");
        }
        HorsePackage snapshot = horsePackages.findById(registrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Package registration not found"));
        String horseId = snapshot.getHorse().getHorseId();
        Horse horse = horses.findById(horseId)
                .orElseThrow(() -> new ResourceNotFoundException("Horse not found: " + horseId));
        entityManager.lock(horse, LockModeType.PESSIMISTIC_WRITE);
        HorsePackage locked = horsePackages.findForUpdate(registrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Package registration not found"));
        if (!horseId.equals(locked.getHorse().getHorseId())) {
            throw new IllegalStateException("Package registration horse changed unexpectedly");
        }
        return expireIfDue(locked, horse, today);
    }

    private boolean expireIfDue(HorsePackage registration, Horse horse, LocalDate today) {
        if (!"ACTIVE".equalsIgnoreCase(registration.getStatus())
                || registration.getEndDate() == null
                || !registration.getEndDate().isBefore(today)) {
            return false;
        }
        registration.setStatus("COMPLETED");
        registration.setRemainingDays(0);
        horsePackages.save(registration);

        boolean recovery = registration.getTrainingPackage() != null
                && "RECOVERY".equalsIgnoreCase(registration.getTrainingPackage().getPackageType());
        String type = recovery ? "RECOVERY_PACKAGE_EXPIRED" : "TRAINING_PACKAGE_EXPIRED";
        String label = recovery ? "Recovery" : "Training";
        String horseId = horse.getHorseId();
        // Scheduled actions have no authenticated actor; do not fabricate a CM/Vet ID.
        events.record(null, horseId, registration.getHorsePackageId(), type,
                label + " package expired at end of " + registration.getEndDate());
        if (horse.getOwner() != null) {
            events.notifyOwner(horse.getOwner().getUserId(), horseId, type,
                    label + " package period has ended.");
        }
        if (recovery) {
            if (Boolean.TRUE.equals(horse.getTrainingLocked())) {
                events.notifyManagers(horseId, type,
                        "Recovery has expired, but Training Lock remains active. "
                        + "Arrange veterinary review and decide the next Recovery plan; "
                        + "the original training package must remain PAUSED.");
            } else if (registration.getReplacedHorsePackage() != null) {
                events.notifyManagers(horseId, type,
                        "Center-funded Recovery ended. If the horse is READY and unlocked, "
                        + "CM can review resuming preserved training days.");
            }
        }
        return true;
    }
}
