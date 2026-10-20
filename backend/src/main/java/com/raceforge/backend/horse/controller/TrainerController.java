package com.raceforge.backend.horse.controller;

import com.raceforge.backend.account.dto.AuthDtos;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.horse.dto.HorseResponse;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.entity.HorseAssignment;
import com.raceforge.backend.horse.entity.Trainer;
import com.raceforge.backend.horse.mapper.HorseMapper;
import com.raceforge.backend.horse.repository.HorseAssignmentRepository;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.horse.repository.TrainerRepository;
import com.raceforge.backend.security.AuthenticatedUser;
import com.raceforge.backend.notification.service.NotificationService;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api")
public class TrainerController {
    private final com.raceforge.backend.horse.service.ModuleIdAllocator idAllocator;
    private final UserRepository users;
    private final HorseRepository horses;
    private final TrainerRepository trainers;
    private final HorseAssignmentRepository assignments;
    private final HorsePackageRepository horsePackages;
    private final HorseMapper mapper;
    private final AuditLogService audit;
    private final NotificationService notifications;

    public TrainerController(UserRepository users, HorseRepository horses,
                             TrainerRepository trainers, HorseAssignmentRepository assignments,
                             HorsePackageRepository horsePackages, HorseMapper mapper,
                             AuditLogService audit, NotificationService notifications,
            com.raceforge.backend.horse.service.ModuleIdAllocator idAllocator) {
        this.idAllocator = idAllocator;
        this.users = users;
        this.horses = horses;
        this.trainers = trainers;
        this.assignments = assignments;
        this.horsePackages = horsePackages;
        this.mapper = mapper;
        this.audit = audit;
        this.notifications = notifications;
    }

    public record TrainerSummary(String userId, String fullName, String avatarUrl) {}
    public record Assignment(@NotBlank String trainerId) {}
    public record Decline(@NotBlank @Size(min = 10, max = 1000) String reason) {}
    public record TrainerTask(String id, String horseId, String assigneeId, String status,
                              String reason, LocalDateTime createdAt, LocalDateTime respondedAt) {
        static TrainerTask from(HorseAssignment a) {
            return new TrainerTask(a.getId(), a.getHorse().getHorseId(),
                    a.getAssignee().getUserId(), a.getStatus(), a.getReason(),
                    a.getCreatedAt(), a.getRespondedAt());
        }
    }

    @GetMapping("/trainers")
    @Transactional(readOnly = true)
    public ApiResponse<AuthDtos.PageResponse<TrainerSummary>> trainers(
            @RequestParam(defaultValue = "0") int page) {
        var result = trainers.findEligibleUsers(PageRequest.of(Math.max(0, page), 20));
        return ApiResponse.success("Trainers", new AuthDtos.PageResponse<>(
                result.getContent().stream().map(this::summary).toList(),
                result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages()));
    }

    @GetMapping("/trainers/{id}")
    @Transactional(readOnly = true)
    public ApiResponse<TrainerSummary> trainer(@PathVariable String id) {
        User user = findEligible(id);
        return ApiResponse.success("Trainer", summary(user));
    }

    @GetMapping("/horses/{horseId}/trainers")
    @PreAuthorize("@horseAccess.read(authentication, #horseId)")
    @Transactional(readOnly = true)
    public ApiResponse<List<TrainerSummary>> assigned(@PathVariable String horseId) {
        if (!horses.existsById(horseId)) throw new ResourceNotFoundException("Horse not found");
        return ApiResponse.success("Assigned trainers", trainers.findAssignedToHorse(horseId)
                .stream().map(t -> summary(t.getUser())).toList());
    }

    /** CM creates a request; it does NOT grant access until the trainer accepts. */
    @PostMapping("/horses/{horseId}/trainers")
    @PreAuthorize("hasAuthority('CLUB_MANAGER')")
    @Transactional
    public ApiResponse<TrainerTask> assign(@PathVariable String horseId,
                                           @AuthenticationPrincipal AuthenticatedUser actor,
                                           @Valid @RequestBody Assignment body) {
        return requestAssignment(horseId, actor.userId(), body.trainerId());
    }

    /** Compatibility URL; semantics are now the same as creating a request. */
    @PutMapping("/horses/{horseId}/trainer")
    @PreAuthorize("hasAuthority('CLUB_MANAGER')")
    @Transactional
    public ApiResponse<TrainerTask> assignLegacy(@PathVariable String horseId,
                                                 @AuthenticationPrincipal AuthenticatedUser actor,
                                                 @Valid @RequestBody Assignment body) {
        return requestAssignment(horseId, actor.userId(), body.trainerId());
    }

    private ApiResponse<TrainerTask> requestAssignment(String horseId, String managerId,
                                                       String trainerUserId) {
        Horse horse = getHorseForUpdate(horseId);
        requireEligibleForTrainerAssignment(horse);
        User manager = users.findById(managerId)
                .orElseThrow(() -> new ResourceNotFoundException("Manager not found"));
        User trainerUser = findEligible(trainerUserId);
        if (horse.getTrainers().stream().anyMatch(t -> t.getUser().getUserId().equals(trainerUserId))) {
            throw new BusinessRuleException("Trainer is already active on this horse");
        }
        if (assignments.existsByHorse_HorseIdAndAssignee_UserIdAndKindAndStatusIn(
                horseId, trainerUserId, "TRAINER", List.of("ASSIGNED", "ACCEPTED"))) {
            throw new BusinessRuleException("An active trainer assignment already exists");
        }
        HorseAssignment task = new HorseAssignment();
        task.setId(idAllocator.next("ASN"));
        task.setKind("TRAINER");
        task.setHorse(horse);
        task.setAssignedBy(manager);
        task.setAssignee(trainerUser);
        task.setStatus("ASSIGNED");
        assignments.saveAndFlush(task);
        notifications.notify(trainerUserId, "TRAINER_ASSIGNMENT_CREATED",
                "New training assignment", "You have been assigned horse " + horseId);
        // The audit service accepts the prefixed User ID and integer assignment ID.
        audit.record(managerId, null, "HORSE_ASSIGNMENT", task.getId(),
                "TRAINER_ASSIGNMENT_CREATED", "SUCCESS", null);
        return ApiResponse.success("Trainer assignment requested", TrainerTask.from(task));
    }

    @GetMapping("/trainers/assignments/mine")
    @PreAuthorize("hasAuthority('HEAD_TRAINER')")
    @Transactional(readOnly = true)
    public ApiResponse<List<TrainerTask>> myTasks(@AuthenticationPrincipal AuthenticatedUser actor) {
        return ApiResponse.success("My trainer assignments",
                assignments.findByAssignee_UserIdAndKindOrderByCreatedAtDesc(actor.userId(), "TRAINER")
                        .stream().map(TrainerTask::from).toList());
    }

    @PostMapping("/trainers/assignments/{id}/accept")
    @PreAuthorize("hasAuthority('HEAD_TRAINER')")
    @Transactional
    public ApiResponse<HorseResponse> accept(@PathVariable String id,
                                             @AuthenticationPrincipal AuthenticatedUser actor) {
        HorseAssignment task = getTrainerTaskForUser(id, actor.userId());
        requirePending(task);
        String horseId = task.getHorse().getHorseId();
        Horse horse = getHorseForUpdate(horseId);
        requireEligibleForTrainerAssignment(horse);
        User user = findEligible(actor.userId());
        Trainer trainer = trainers.findByUser_UserId(user.getUserId()).orElseGet(() -> {
            Trainer item = new Trainer();
            item.setTrainerId(idAllocator.next("HTR"));
            item.setUser(user);
            return trainers.saveAndFlush(item);
        });
        if (horse.getTrainers().stream().noneMatch(t -> t.getUser().getUserId().equals(user.getUserId()))) {
            horse.getTrainers().add(trainer);
        }
        task.setStatus("ACCEPTED");
        task.setRespondedAt(LocalDateTime.now());
        notifications.notify(task.getAssignedBy().getUserId(), "TRAINER_ASSIGNMENT_ACCEPTED",
                "Trainer accepted assignment", "Horse " + horseId + " accepted by trainer " + actor.userId());
        audit.record(actor.userId(), null, "HORSE_ASSIGNMENT", task.getId(),
                "TRAINER_ASSIGNMENT_ACCEPTED", "SUCCESS", null);
        return ApiResponse.success("Trainer assignment accepted", mapper.toResponse(horse));
    }

    @PostMapping("/trainers/assignments/{id}/decline")
    @PreAuthorize("hasAuthority('HEAD_TRAINER')")
    @Transactional
    public ApiResponse<TrainerTask> decline(@PathVariable String id,
                                            @AuthenticationPrincipal AuthenticatedUser actor,
                                            @Valid @RequestBody Decline body) {
        HorseAssignment task = getTrainerTaskForUser(id, actor.userId());
        requirePending(task);
        task.setStatus("DECLINED");
        task.setReason(body.reason().trim());
        task.setRespondedAt(LocalDateTime.now());
        notifications.notify(task.getAssignedBy().getUserId(), "TRAINER_ASSIGNMENT_DECLINED",
                "Trainer declined assignment", "Horse " + task.getHorse().getHorseId() + ": " + task.getReason());
        audit.record(actor.userId(), null, "HORSE_ASSIGNMENT", task.getId(),
                "TRAINER_ASSIGNMENT_DECLINED", "SUCCESS", task.getReason());
        return ApiResponse.success("Trainer assignment declined", TrainerTask.from(task));
    }

    @DeleteMapping("/horses/{horseId}/trainers/{userId}")
    @PreAuthorize("hasAuthority('CLUB_MANAGER')")
    @Transactional
    public ApiResponse<HorseResponse> unassign(@PathVariable String horseId,
                                               @PathVariable String userId,
                                               @AuthenticationPrincipal AuthenticatedUser actor) {
        Horse horse = getHorseForUpdate(horseId);
        boolean removed = horse.getTrainers().removeIf(t -> t.getUser().getUserId().equals(userId));
        var open = assignments.findByHorse_HorseIdAndKindAndStatusIn(
                horseId, "TRAINER", List.of("ASSIGNED", "ACCEPTED"));
        boolean cancelled = false;
        for (HorseAssignment task : open) {
            if (task.getAssignee().getUserId().equals(userId)) {
                task.setStatus("CANCELLED");
                task.setReason("Cancelled by Club Manager");
                cancelled = true;
            }
        }
        if (!removed && !cancelled) throw new ResourceNotFoundException("No active trainer assignment");
        audit.record(actor.userId(), null, "HORSE", null,
                "TRAINER_UNASSIGNED", "SUCCESS", "Horse " + horseId + "; trainer " + userId);
        return ApiResponse.success("Trainer unassigned", mapper.toResponse(horse));
    }

    private HorseAssignment getTrainerTaskForUser(String id, String userId) {
        HorseAssignment a = assignments.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found"));
        if (!"TRAINER".equals(a.getKind()) || !a.getAssignee().getUserId().equals(userId)) {
            throw new BusinessRuleException("This trainer assignment does not belong to you");
        }
        return a;
    }

    private void requirePending(HorseAssignment task) {
        if (!"ASSIGNED".equals(task.getStatus())) {
            throw new BusinessRuleException("Only an ASSIGNED task can be accepted or declined");
        }
    }

    /**
     * Called BOTH when CM creates the assignment and when the trainer accepts.
     * A Recovery registration is ACTIVE but is not ordinary training eligibility.
     * endDate is inclusive; already expired packages cannot authorize assignment.
     */
    private void requireEligibleForTrainerAssignment(Horse horse) {
        if (Boolean.TRUE.equals(horse.getTrainingLocked())
                || !"READY".equalsIgnoreCase(horse.getHealthStatus())) {
            throw new BusinessRuleException(
                    "Horse must be READY and free of Training Lock before trainer assignment");
        }
        LocalDate today = LocalDate.now();
        boolean hasValidOrdinaryPackage = horsePackages
                .findByHorse_HorseIdAndStatus(horse.getHorseId(), "ACTIVE")
                .stream().anyMatch(p -> p.getTrainingPackage() != null
                        && !"RECOVERY".equalsIgnoreCase(p.getTrainingPackage().getPackageType())
                        && p.getEndDate() != null && !p.getEndDate().isBefore(today));
        if (!hasValidOrdinaryPackage) {
            throw new BusinessRuleException(
                    "An unexpired ACTIVE ordinary training package is required; Recovery is not eligible");
        }
    }

    private Horse getHorseForUpdate(String horseId) {
        return horses.findByIdForUpdate(horseId)
                .orElseThrow(() -> new ResourceNotFoundException("Horse not found"));
    }

    private User findEligible(String userId) {
        User user = users.findDetailedById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Trainer not found"));
        if (user.getRole() == null || !"HEAD_TRAINER".equals(user.getRole().getRoleName())
                || !"ACTIVE".equals(user.getStatus()) || !user.isEmailVerified()) {
            throw new BusinessRuleException("Trainer must be active, verified and HEAD_TRAINER");
        }
        return user;
    }

    private TrainerSummary summary(User user) {
        return new TrainerSummary(user.getUserId(), user.getFullName(), user.getAvatarUrl());
    }
}
