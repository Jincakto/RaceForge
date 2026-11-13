package com.raceforge.backend.training.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.training.dto.TrainingAssessmentResponse;
import com.raceforge.backend.training.dto.TrainingAssessmentTemplateResponse;
import com.raceforge.backend.training.dto.TrainingNotificationTargetResponse;
import com.raceforge.backend.training.dto.TrainingVetNotificationResponse;
import com.raceforge.backend.training.dto.VetNotificationRequest;
import com.raceforge.backend.training.service.TrainingAssessmentNotificationService;
import com.raceforge.backend.training.service.TrainingAssessmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Read authorization is method-scoped: assigned vets and managers are not training writers. */
@RestController
@Tag(name = "Post-training assessments")
public class TrainingAssessmentController {
    private final TrainingAssessmentService assessments;
    private final TrainingAssessmentNotificationService notifications;

    public TrainingAssessmentController(TrainingAssessmentService assessments,
            TrainingAssessmentNotificationService notifications) {
        this.assessments = assessments;
        this.notifications = notifications;
    }

    @GetMapping("/api/training-assessments/template")
    @PreAuthorize("hasAnyAuthority('HEAD_TRAINER', 'VETERINARIAN', 'CLUB_MANAGER')")
    @Operation(summary = "Get the versioned post-training performance assessment",
            description = "Returns all 10 checks with English labels and guidance. Trainers need an active profile and training permission.")
    public ApiResponse<TrainingAssessmentTemplateResponse> template() {
        return ApiResponse.success("Post-training health check template", assessments.template());
    }

    @GetMapping("/api/training-sessions/{sessionId}/assessment")
    @PreAuthorize("hasAnyAuthority('HEAD_TRAINER', 'VETERINARIAN', 'CLUB_MANAGER')")
    @Operation(summary = "Read a saved post-training assessment",
            description = "Requires current training scope, historical recorder scope, current veterinary assignment or an active club manager. Historical sessions without an assessment return 404.")
    public ApiResponse<TrainingAssessmentResponse> assessment(@PathVariable String sessionId) {
        return ApiResponse.success("Post-training health check", assessments.get(sessionId));
    }

    @PostMapping("/api/training-sessions/{sessionId}/vet-notification")
    @PreAuthorize("hasAuthority('HEAD_TRAINER') and @permissionAccess.has(authentication, 'MANAGE_TRAINING')")
    @Operation(summary = "Request a vet check for a completed session",
            description = "Current accepted trainer only. Normal requires a trimmed reason of 1 to 1,000 characters and does not create a review hold. Automatic alerts return their existing delivery status. Recipients are selected by the server.")
    public ApiResponse<TrainingVetNotificationResponse> notifyVet(
            @PathVariable String sessionId, @Valid @RequestBody(required = false) VetNotificationRequest request) {
        return ApiResponse.success("Vet check notification status",
                assessments.manual(sessionId, request == null ? null : request.reason()));
    }

    @GetMapping("/api/training-assessments/notifications/{notificationId}/target")
    @PreAuthorize("hasAnyAuthority('HEAD_TRAINER', 'VETERINARIAN', 'CLUB_MANAGER')")
    @Operation(summary = "Resolve the assessment target of your notification",
            description = "Checks notification ownership before current assessment access. A former vet cannot open the target after reassignment.")
    public ApiResponse<TrainingNotificationTargetResponse> target(@PathVariable Integer notificationId) {
        return ApiResponse.success("Post-training health check target", notifications.target(notificationId));
    }
}
