package com.raceforge.backend.training.service;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.horse.entity.HorseAssignment;
import com.raceforge.backend.horse.repository.HorseAssignmentRepository;
import com.raceforge.backend.permission.service.PermissionService;
import com.raceforge.backend.security.AuthenticatedUser;
import com.raceforge.backend.training.entity.TrainingSession;
import com.raceforge.backend.training.repository.TrainingAssessmentScopeRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

/** Assessment-specific scope. Historical read access never authorizes a mutation. */
@Service
@Transactional(readOnly = true)
public class TrainingAssessmentAccessService {
    private static final Set<String> READABLE_VET_STATUSES = Set.of("ASSIGNED", "ACCEPTED", "COMPLETED");
    private static final Set<String> EXAM_ALLOWED_VET_STATUSES = Set.of("ACCEPTED", "COMPLETED");
    private static final Set<String> RECORDED_RESULT_STATUSES = Set.of("COMPLETED", "MISSED");

    private final TrainingWorkflowGuard workflowGuard;
    private final TrainingReadAccess trainingReadAccess;
    private final PermissionService permissions;
    private final HorseAssignmentRepository assignments;
    private final UserRepository users;
    private final TrainingAssessmentScopeRepository scopeRepository;

    public TrainingAssessmentAccessService(TrainingWorkflowGuard workflowGuard,
                                          TrainingReadAccess trainingReadAccess,
                                          PermissionService permissions,
                                          HorseAssignmentRepository assignments,
                                          UserRepository users,
                                          TrainingAssessmentScopeRepository scopeRepository) {
        this.workflowGuard = workflowGuard;
        this.trainingReadAccess = trainingReadAccess;
        this.permissions = permissions;
        this.assignments = assignments;
        this.users = users;
        this.scopeRepository = scopeRepository;
    }

    public AuthenticatedUser actor() {
        return workflowGuard.actor();
    }

    /** The template contains no horse data, so either training permission can open it. */
    public void requireTemplate() {
        AuthenticatedUser actor = actor();
        if (!active(actor)) {
            throw denied();
        }
        if ("CLUB_MANAGER".equals(actor.roleName()) || "VETERINARIAN".equals(actor.roleName())) {
            return;
        }
        if ("HEAD_TRAINER".equals(actor.roleName())
                && trainingReadAccess.activeProfile(actor.userId())
                && (permissions.hasPermission(actor.roleName(), "VIEW_TRAINING")
                    || permissions.hasPermission(actor.roleName(), "MANAGE_TRAINING"))) {
            return;
        }
        throw denied();
    }

    public void requireRead(TrainingSession session) {
        if (!canRead(actor(), session)) {
            throw denied();
        }
    }

    public boolean canRead(AuthenticatedUser actor, TrainingSession session) {
        return session != null && session.getSessionId() != null
                && readableSessionIds(actor, List.of(session)).contains(session.getSessionId());
    }

    /** Batched assignment queries for cross-horse lists; single-horse policy stays shared. */
    public Set<String> readableSessionIds(AuthenticatedUser actor, List<TrainingSession> sessions) {
        if (!active(actor) || sessions == null || sessions.isEmpty()) {
            return Set.of();
        }
        List<TrainingSession> validSessions = sessions.stream()
                .filter(Objects::nonNull)
                .filter(s -> s.getSessionId() != null && s.getHorse() != null
                        && s.getHorse().getHorseId() != null)
                .toList();
        Set<String> horseIds = new LinkedHashSet<>();
        validSessions.forEach(s -> horseIds.add(s.getHorse().getHorseId()));
        Set<String> readable = new LinkedHashSet<>();
        if ("CLUB_MANAGER".equals(actor.roleName())) {
            // RaceForge currently operates as a single club; do not invent a club scope.
            validSessions.forEach(s -> readable.add(s.getSessionId()));
        } else if ("VETERINARIAN".equals(actor.roleName())) {
            Map<String, Boolean> horseScope = vetReadScope(actor, horseIds);
            for (TrainingSession session : validSessions) {
                if (Boolean.TRUE.equals(horseScope.get(session.getHorse().getHorseId()))) {
                    readable.add(session.getSessionId());
                }
            }
        } else if ("HEAD_TRAINER".equals(actor.roleName())
                && permissions.hasPermission(actor.roleName(), "VIEW_TRAINING")
                && trainingReadAccess.activeProfile(actor.userId())) {
            Map<String, Set<String>> horsePackages = trainerReadScope(actor, horseIds);
            for (TrainingSession session : validSessions) {
                Set<String> packages = horsePackages.getOrDefault(session.getHorse().getHorseId(), Set.of());
                boolean current = session.getPlan() != null && session.getPlan().getHorsePackageId() != null
                        && packages.contains(session.getPlan().getHorsePackageId());
                boolean recorded = session.getStatus() != null && RECORDED_RESULT_STATUSES.contains(session.getStatus())
                        && actor.userId().equals(session.getRecordedBy());
                if (current || recorded) {
                    readable.add(session.getSessionId());
                }
            }
        }
        return Collections.unmodifiableSet(readable);
    }

    private Map<String, Set<String>> trainerReadScope(AuthenticatedUser actor, Set<String> horseIds) {
        Map<String, Set<String>> packages = new LinkedHashMap<>();
        if (horseIds.size() == 1) {
            String horseId = horseIds.iterator().next();
            packages.put(horseId, trainingReadAccess.currentPackages(actor.userId(), horseId));
        } else if (!horseIds.isEmpty()) {
            for (TrainingAssessmentScopeRepository.CurrentTrainerPackage row :
                    scopeRepository.findCurrentTrainerPackages(actor.userId(), horseIds)) {
                if (horseIds.contains(row.getHorseId()) && row.getHorsePackageId() != null) {
                    packages.computeIfAbsent(row.getHorseId(), ignored -> new LinkedHashSet<>())
                            .add(row.getHorsePackageId());
                }
            }
        }
        return packages;
    }

    private Map<String, Boolean> vetReadScope(AuthenticatedUser actor, Set<String> horseIds) {
        Map<String, Boolean> scope = new LinkedHashMap<>();
        if (horseIds.size() == 1) {
            String horseId = horseIds.iterator().next();
            scope.put(horseId, currentVet(horseId, false)
                    .map(vet -> actor.userId().equals(vet.getUserId())).orElse(false));
        } else if (!horseIds.isEmpty()) {
            Map<String, List<HorseAssignment>> latestByHorse = new LinkedHashMap<>();
            for (HorseAssignment assignment : scopeRepository.findLatestVetAssignments(horseIds)) {
                if (assignment.getHorse() != null && horseIds.contains(assignment.getHorse().getHorseId())) {
                    latestByHorse.computeIfAbsent(assignment.getHorse().getHorseId(), ignored -> new java.util.ArrayList<>())
                            .add(assignment);
                }
            }
            latestByHorse.forEach((horseId, latest) -> {
                // Equal timestamps have no documented total order in the existing policy.
                // Deny the ambiguous horse instead of granting an old vet responsibility.
                if (latest.size() == 1) {
                    HorseAssignment assignment = latest.get(0);
                    User vet = assignment.getAssignee();
                    scope.put(horseId, assignment.getStatus() != null
                            && READABLE_VET_STATUSES.contains(assignment.getStatus())
                            && activeUserWithRole(vet, "VETERINARIAN")
                            && actor.userId().equals(vet.getUserId()));
                }
            });
        }
        return scope;
    }

    /** Current accepted assignment is required even if this actor originally recorded the result. */
    public void requireWrite(TrainingSession session) {
        AuthenticatedUser actor = actor();
        if (!active(actor) || !"HEAD_TRAINER".equals(actor.roleName())
                || !permissions.hasPermission(actor.roleName(), "MANAGE_TRAINING")
                || session == null || session.getPlan() == null) {
            throw denied();
        }
        workflowGuard.authorizePlan(session.getPlan());
    }

    /**
     * Only the newest assignment is considered. Latest legacy COMPLETED is still a
     * continuing care assignment under Medical's current policy; older rows never are.
     */
    public Optional<User> currentVet(String horseId, boolean acceptedOnly) {
        if (horseId == null || horseId.isBlank()) {
            return Optional.empty();
        }
        Set<String> statuses = acceptedOnly ? EXAM_ALLOWED_VET_STATUSES : READABLE_VET_STATUSES;
        return assignments.findFirstByHorse_HorseIdAndKindOrderByCreatedAtDesc(horseId, "VET")
                .filter(assignment -> assignment.getStatus() != null && statuses.contains(assignment.getStatus()))
                .map(HorseAssignment::getAssignee)
                .filter(user -> activeUserWithRole(user, "VETERINARIAN"));
    }

    public List<User> activeManagers() {
        Map<String, User> managers = new LinkedHashMap<>();
        for (User user : users.findActiveManagers()) {
            if (activeUserWithRole(user, "CLUB_MANAGER")) {
                managers.putIfAbsent(user.getUserId(), user);
            }
        }
        return List.copyOf(managers.values());
    }

    private boolean active(AuthenticatedUser actor) {
        return actor != null && actor.userId() != null && "ACTIVE".equals(actor.status());
    }

    private boolean activeUserWithRole(User user, String role) {
        return user != null && user.getUserId() != null && "ACTIVE".equals(user.getStatus())
                && user.getRole() != null && role.equals(user.getRole().getRoleName());
    }

    private AccessDeniedException denied() {
        return new AccessDeniedException("This post-training assessment is outside your authorized scope.");
    }
}