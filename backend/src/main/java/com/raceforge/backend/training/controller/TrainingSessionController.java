package com.raceforge.backend.training.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.training.dto.CompleteSessionRequest;
import com.raceforge.backend.training.dto.ScheduleSessionRequest;
import com.raceforge.backend.training.dto.TrainingSessionResponse;
import com.raceforge.backend.training.service.TrainingSessionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.raceforge.backend.security.AuthenticatedUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/training-sessions")
@PreAuthorize("hasAuthority('HEAD_TRAINER') and @permissionAccess.has(authentication, 'MANAGE_TRAINING')")
@Tag(name = "Training Sessions")
public class TrainingSessionController {

    @Autowired
    private com.raceforge.backend.training.service.TrainingSessionFeedbackService feedback;

    @GetMapping("/{sessionId}/feedback")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> feedback(@PathVariable String sessionId) {
        return ResponseEntity.ok(ApiResponse.success("Trainer review suggestions", feedback.feedback(sessionId)));
    }

    @Autowired
    private TrainingSessionService trainingSessionService;

    @PostMapping
    public ResponseEntity<ApiResponse<TrainingSessionResponse>> schedule(
            @Valid @RequestBody ScheduleSessionRequest request) {

        TrainingSessionResponse response = trainingSessionService.scheduleSession(request);
        return ResponseEntity.ok(ApiResponse.success("Session scheduled", response));
    }

    @PatchMapping("/{sessionId}/start")
    public ResponseEntity<ApiResponse<TrainingSessionResponse>> start(@PathVariable String sessionId) {
        TrainingSessionResponse response = trainingSessionService.startSession(sessionId);
        return ResponseEntity.ok(ApiResponse.success("Session started", response));
    }

    @PatchMapping("/{sessionId}/adjust")
    public ResponseEntity<ApiResponse<TrainingSessionResponse>> adjust(@PathVariable String sessionId,
            @Valid @RequestBody com.raceforge.backend.training.dto.AdjustSessionRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Future session adjusted",
                trainingSessionService.adjustSession(sessionId, request)));
    }

    @PatchMapping("/{sessionId}/stop")
    public ResponseEntity<ApiResponse<TrainingSessionResponse>> stop(@PathVariable String sessionId,
            @RequestBody(required = false) com.raceforge.backend.training.dto.StopSessionRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Exercise stopped; submit recovery measurements separately",
                trainingSessionService.stopSession(sessionId, request)));
    }

    @PatchMapping("/{sessionId}/complete")
    public ResponseEntity<ApiResponse<TrainingSessionResponse>> complete(
            @PathVariable String sessionId,
            @Valid @RequestBody CompleteSessionRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {

        TrainingSessionResponse response = trainingSessionService.completeSession(sessionId, request, user.userId());
        return ResponseEntity.ok(ApiResponse.success("Session completed", response));
    }
}
