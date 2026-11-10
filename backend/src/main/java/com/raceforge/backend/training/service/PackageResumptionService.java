package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.training.dto.HorsePackageResponse;
import com.raceforge.backend.training.dto.TrainerResumptionResponse;
import com.raceforge.backend.training.entity.HorsePackage;
import com.raceforge.backend.training.mapper.HorsePackageMapper;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

/** A Vet unlocks medically; an already-accepted Trainer resumes the preserved paid package. */
@Service
public class PackageResumptionService {
    private final HorseRepository horses;
    private final HorsePackageRepository packages;
    private final HorsePackageMapper mapper;
    private final EntityManager entityManager;
    private final PackageEventService events;
    private final TrainingWorkflowGuard guard;
    private final JdbcTemplate jdbc;
    private final Clock clock;
    private final TrainingScheduleCoordinator scheduleCoordinator;

    public PackageResumptionService(HorseRepository horses, HorsePackageRepository packages,
            HorsePackageMapper mapper, EntityManager entityManager, PackageEventService events,
            TrainingWorkflowGuard guard, JdbcTemplate jdbc, @Qualifier("trainingClock") Clock clock,
            TrainingScheduleCoordinator scheduleCoordinator) {
        this.horses = horses;
        this.packages = packages;
        this.mapper = mapper;
        this.entityManager = entityManager;
        this.events = events;
        this.guard = guard;
        this.jdbc = jdbc;
        this.clock = clock;
        this.scheduleCoordinator = scheduleCoordinator;
    }

    @Transactional(readOnly = true)
    public List<TrainerResumptionResponse> myPending(String trainerId) {
        // The database query is scoped to accepted package-level assignments of this actor.
        List<String> ids = jdbc.queryForList("""
                SELECT DISTINCT hp.horse_package_id FROM dbo.HORSE_PACKAGE hp
                JOIN dbo.Training_Assignment ta ON ta.horse_package_id = hp.horse_package_id
                JOIN dbo.Horse_Assignment a ON a.id = ta.assignment_id
                WHERE a.kind='TRAINER' AND a.status='ACCEPTED' AND a.assignee_id=?
                  AND ta.ended_at IS NULL AND hp.status='PAUSED' AND hp.payment_status='PAID'
                  AND hp.pause_reason LIKE 'TRAINING_LOCK_MEDICAL:%'
                ORDER BY hp.horse_package_id
                """, String.class, trainerId);
        return ids.stream().filter(id -> guard.canAccessPackage(id, trainerId))
                .map(packages::findById).flatMap(java.util.Optional::stream)
                .filter(p -> medicalReady(p.getHorse()))
                .map(p -> response(p, trainerId))
                .toList();
    }

    @Transactional(readOnly = true)
    public TrainerResumptionResponse detail(String id, String trainerId) {
        requireAssignment(id, trainerId);
        HorsePackage original = packages.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Package not found"));
        requirePreserved(original);
        return response(original, trainerId);
    }

    @Transactional
    public HorsePackageResponse accept(String originalId, String trainerId) {
        // Same global schedule lock used by TrainerAssignmentService; acquire before horse lock.
        scheduleCoordinator.lockSchedule();
        HorsePackage snapshot = packages.findById(originalId)
                .orElseThrow(() -> new ResourceNotFoundException("Package not found"));
        String horseId = snapshot.getHorse().getHorseId();
        // Globally consistent lock ordering: Horse -> its package rows.
        Horse horse = horses.findById(horseId)
                .orElseThrow(() -> new ResourceNotFoundException("Horse not found"));
        entityManager.lock(horse, LockModeType.PESSIMISTIC_WRITE);
        HorsePackage original = packages.findForUpdate(originalId)
                .orElseThrow(() -> new ResourceNotFoundException("Package not found"));
        if (!horseId.equals(original.getHorse().getHorseId())) {
            throw new BusinessRuleException("Horse package changed while requesting resumption");
        }
        requireAssignment(originalId, trainerId); // re-check after locking
        if (!trainerId.equals(scheduleCoordinator.requireTrainer(originalId).userId())) {
            throw new AccessDeniedException("Only the accepted trainer of this package can resume it");
        }
        requirePreserved(original);
        if (!medicalReady(horse)) {
            throw new BusinessRuleException("Veterinarian must clear the horse and release Training Lock first");
        }
        guard.requireHealthy(horse); // also checks active lock row and latest confirmed medical eligibility
        if (hasPending(horseId)) {
            throw new BusinessRuleException("Resolve pending package payment before resumption");
        }
        List<HorsePackage> active = packages.findByHorseIdAndStatusForUpdate(horseId, "ACTIVE");
        HorsePackage oldCenterRecovery = linkedCenterRecovery(original, active);
        if (active.size() > (oldCenterRecovery == null ? 0 : 1)) {
            throw new BusinessRuleException("Another package is ACTIVE; cannot resume training");
        }
        if (oldCenterRecovery != null) {
            // Historical center-funded Recovery is concluded atomically; never two active packages.
            oldCenterRecovery.setStatus("COMPLETED");
            oldCenterRecovery.setRemainingDays(0);
            packages.save(oldCenterRecovery);
        }
        int days = original.getRemainingDays();
        LocalDate today = LocalDate.now(clock);
        original.setStartDate(today);
        original.setEndDate(today.plusDays(days - 1L));
        original.setStatus("ACTIVE");
        original.setPausedAt(null);
        original.setPauseReason(null);
        HorsePackage result = packages.saveAndFlush(original);
        events.record(trainerId, horseId, result.getHorsePackageId(),
                "TRAINER_RESUMPTION_ACCEPTED", "Assigned trainer accepted resumption after medical clearance");
        if (horse.getOwner() != null) {
            events.notifyOwner(horse.getOwner().getUserId(), horseId, "TRAINING_RESUMED",
                    "Trainer accepted resumption; " + days + " preserved days are now active.");
        }
        events.notifyAssignedTrainers(horse, "TRAINING_RESUMED",
                "Training package " + result.getHorsePackageId() + " has resumed.");
        return mapper.toResponse(result);
    }

    private TrainerResumptionResponse response(HorsePackage p, String trainerId) {
        Horse h = p.getHorse();
        boolean eligible = guard.canAccessPackage(p.getHorsePackageId(), trainerId)
                && validPreserved(p) && medicalReady(h)
                && !hasPending(h.getHorseId()) && activeCompatible(p);
        return new TrainerResumptionResponse(p.getHorsePackageId(), h.getHorseId(), h.getHorseName(),
                p.getTrainingPackage().getPackageName(), p.getTrainingPackage().getPackageType(),
                p.getRemainingDays() == null ? 0 : p.getRemainingDays(), p.getPausedAt(),
                h.getHealthStatus(), Boolean.TRUE.equals(h.getTrainingLocked()), eligible);
    }

    private void requireAssignment(String packageId, String trainerId) {
        if (trainerId == null || !guard.canAccessPackage(packageId, trainerId)) {
            throw new AccessDeniedException("A current accepted Head Trainer assignment for this package is required");
        }
    }
    private boolean medicalReady(Horse h) {
        return h != null && !Boolean.TRUE.equals(h.getTrainingLocked())
                && "READY".equalsIgnoreCase(h.getHealthStatus())
                && "APPROVED".equalsIgnoreCase(h.getAdmissionStatus())
                && "ACTIVE".equalsIgnoreCase(h.getStatus());
    }
    private void requirePreserved(HorsePackage p) {
        if (!validPreserved(p)) throw new BusinessRuleException(
                "Only a paid ordinary package paused by Medical Lock with remaining days may resume");
    }
    private boolean validPreserved(HorsePackage p) {
        return p != null && "PAUSED".equalsIgnoreCase(p.getStatus())
                && "PAID".equalsIgnoreCase(p.getPaymentStatus())
                && p.getRemainingDays() != null && p.getRemainingDays() > 0
                && p.getPausedAt() != null && p.getPauseReason() != null
                && p.getPauseReason().startsWith("TRAINING_LOCK_MEDICAL:")
                && p.getTrainingPackage() != null
                && !"RECOVERY".equalsIgnoreCase(p.getTrainingPackage().getPackageType());
    }
    private boolean hasPending(String horseId) {
        return packages.findByHorseIdOrderByRegisteredAtDesc(horseId).stream()
                .anyMatch(p -> "PENDING".equalsIgnoreCase(p.getStatus()));
    }
    private HorsePackage linkedCenterRecovery(HorsePackage original, List<HorsePackage> active) {
        HorsePackage found = null;
        for (HorsePackage p : active) {
            if (p.getReplacedHorsePackage() == null
                    || !original.getHorsePackageId().equals(p.getReplacedHorsePackage().getHorsePackageId())
                    || p.getTrainingPackage() == null
                    || !"RECOVERY".equalsIgnoreCase(p.getTrainingPackage().getPackageType())
                    || !"CENTER_COVERED".equalsIgnoreCase(p.getPaymentStatus())) continue;
            if (found != null) throw new BusinessRuleException("Multiple active Recovery packages found");
            found = p;
        }
        return found;
    }
    private boolean activeCompatible(HorsePackage p) {
        List<HorsePackage> active = packages.findByHorse_HorseIdAndStatus(p.getHorse().getHorseId(), "ACTIVE");
        return active.size() <= (linkedCenterRecovery(p, active) == null ? 0 : 1);
    }
}
