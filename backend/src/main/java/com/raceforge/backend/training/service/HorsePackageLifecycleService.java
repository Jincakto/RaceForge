package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.permission.service.PermissionService;
import com.raceforge.backend.security.AuthenticatedUser;
import com.raceforge.backend.training.dto.HorsePackageLifecycleResponse;
import com.raceforge.backend.training.entity.HorsePackage;
import com.raceforge.backend.training.entity.TrainingCertificate;
import com.raceforge.backend.training.entity.TrainingSession;
import com.raceforge.backend.training.mapper.HorsePackageMapper;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import com.raceforge.backend.training.repository.TrainingCertificateRepository;
import com.raceforge.backend.training.repository.TrainingSessionRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@Service
@Transactional
public class HorsePackageLifecycleService {
    private final HorsePackageRepository packages;
    private final HorseRepository horses;
    private final TrainingSessionRepository sessions;
    private final TrainingCertificateRepository certificates;
    private final TrainerAssignmentService assignments;
    private final TrainingWorkflowGuard guard;
    private final PermissionService permissions;
    private final TrainingScheduleCoordinator schedule;
    private final PackageEventService events;
    private final HorsePackageMapper mapper;
    private final EntityManager em;
    private final Clock clock;

    public HorsePackageLifecycleService(HorsePackageRepository packages, HorseRepository horses,
            TrainingSessionRepository sessions, TrainingCertificateRepository certificates,
            TrainerAssignmentService assignments, TrainingWorkflowGuard guard, PermissionService permissions,
            TrainingScheduleCoordinator schedule, PackageEventService events, HorsePackageMapper mapper,
            EntityManager em, @Qualifier("trainingClock") Clock clock) {
        this.packages = packages; this.horses = horses; this.sessions = sessions;
        this.certificates = certificates; this.assignments = assignments; this.guard = guard;
        this.permissions = permissions; this.schedule = schedule; this.events = events;
        this.mapper = mapper; this.em = em; this.clock = clock;
    }

    public HorsePackageLifecycleResponse cancel(String id) {
        var actor = requireRole("HORSE_OWNER");
        HorsePackage registration = lockedRegistration(id);
        Horse horse = registration.getHorse();
        if (horse.getOwner() == null || !actor.userId().equals(horse.getOwner().getUserId()))
            throw new AccessDeniedException("Only the horse owner may cancel this package.");
        if (!Set.of("ACTIVE", "PAUSED").contains(registration.getStatus())
                || !"PAID".equals(registration.getPaymentStatus()))
            throw conflict("PACKAGE_NOT_CANCELLABLE", "Only an active or paused paid registration may be cancelled.");
        List<TrainingSession> work = sessions.findForPackageForUpdate(id);
        if (work.stream().anyMatch(s -> s.getActualStart() != null
                && !Set.of("COMPLETED", "MISSED", "CANCELLED").contains(s.getStatus())))
            throw conflict("PACKAGE_HAS_UNFINISHED_SESSION",
                    "Finish the started session and save its recovery results before cancelling this package.");
        List<TrainingSession> unstarted = work.stream()
                .filter(s -> "SCHEDULED".equals(s.getStatus()) && s.getActualStart() == null).toList();
        sessions.deleteAll(unstarted);
        sessions.flush(); // Dependent history must cause rollback, never be silently cascaded away.
        List<String> trainers = assignments.closeForPackage(id, "Owner cancelled the paid training package.");
        registration.setStatus("CANCELLED");
        packages.saveAndFlush(registration);
        publish(actor, registration, trainers, "TRAINING_PACKAGE_CANCELLED",
                "Training package cancelled. Deleted " + unstarted.size()
                        + " unstarted sessions; recorded history and payment are retained. No automatic refund.");
        return new HorsePackageLifecycleResponse(mapper.toResponse(registration), unstarted.size(), null);
    }

    public HorsePackageLifecycleResponse complete(String id) {
        var actor = requireRole("HEAD_TRAINER");
        if (!permissions.hasPermission(actor.roleName(), "MANAGE_TRAINING"))
            throw new AccessDeniedException("MANAGE_TRAINING permission is required.");
        HorsePackage registration = lockedRegistration(id);
        if (!guard.canAccessPackage(id, actor.userId())) {
            // A successful completion closes the assignment. Its historical caller
            // receives conflict on retry, without regaining write permission.
            if (Set.of("COMPLETED", "CANCELLED", "EXPIRED").contains(registration.getStatus())
                    && assignments.hasPackageHistory(id, actor.userId()))
                throw conflict("PACKAGE_ALREADY_ENDED", "This package registration has already ended.");
            throw new AccessDeniedException("An accepted current trainer assignment is required for this package.");
        }
        LocalDate today = LocalDate.now(clock);
        if (!"ACTIVE".equals(registration.getStatus()) || !"PAID".equals(registration.getPaymentStatus())
                || registration.getStartDate() == null || registration.getEndDate() == null
                || today.isBefore(registration.getStartDate()) || today.isAfter(registration.getEndDate()))
            throw conflict("PACKAGE_NOT_COMPLETABLE", "The paid package must be active and within its valid period.");
        List<TrainingSession> counted = sessions.findForPackageForUpdate(id).stream()
                .filter(s -> !"CANCELLED".equals(s.getStatus())).toList();
        if (counted.isEmpty() || counted.stream().anyMatch(s -> !Set.of("COMPLETED", "MISSED").contains(s.getStatus())))
            throw conflict("PACKAGE_SESSIONS_NOT_FINISHED",
                    "At least one session is required; every non-cancelled session must be completed or missed.");
        if (certificates.existsById(id))
            throw conflict("PACKAGE_CERTIFICATE_EXISTS", "A certificate has already been issued for this registration.");
        List<String> trainers = assignments.closeForPackage(id, "Trainer completed the training package.");
        registration.setStatus("COMPLETED");
        registration.setRemainingDays(0);
        packages.saveAndFlush(registration);
        var certificate = certificates.saveAndFlush(
                new TrainingCertificate(id, registration.getHorse().getHorseName(), today));
        publish(actor, registration, trainers, "TRAINING_PACKAGE_COMPLETED",
                "Training package completed by its assigned trainer. The certificate is available to the owner.");
        return new HorsePackageLifecycleResponse(mapper.toResponse(registration), 0,
                new TrainingCertificateAccess.CertificateSummary(certificate.getCertificateNumber(), certificate.getIssueDate()));
    }

    private AuthenticatedUser requireRole(String role) {
        var actor = guard.actor(); // Also rejects inactive principals on direct service calls.
        if (!role.equals(actor.roleName())) throw new AccessDeniedException("This operation requires " + role + ".");
        return actor;
    }

    private HorsePackage lockedRegistration(String id) {
        schedule.lockSchedule();
        var snapshot = packages.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Package registration not found"));
        String horseId = snapshot.getHorse().getHorseId();
        Horse horse = horses.findById(horseId)
                .orElseThrow(() -> new ResourceNotFoundException("Horse not found"));
        em.refresh(horse, LockModeType.PESSIMISTIC_WRITE);
        var registration = packages.findForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Package registration not found"));
        em.refresh(registration, LockModeType.PESSIMISTIC_WRITE);
        if (!horseId.equals(registration.getHorse().getHorseId()))
            throw conflict("PACKAGE_HORSE_CHANGED", "The registration changed. Refresh and retry.");
        return registration;
    }

    private void publish(AuthenticatedUser actor, HorsePackage registration, List<String> trainers,
                         String type, String message) {
        var horse = registration.getHorse();
        events.record(actor.userId(), horse.getHorseId(), registration.getHorsePackageId(), type, message);
        if (horse.getOwner() != null)
            events.notifyOwner(horse.getOwner().getUserId(), horse.getHorseId(), type, message);
        events.notifyPackageTrainers(horse.getHorseId(), trainers, type, message);
    }

    private static ApiException conflict(String code, String message) {
        return new ApiException(HttpStatus.CONFLICT, code, message);
    }
}
