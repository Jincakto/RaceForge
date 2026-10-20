package com.raceforge.backend.training.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.training.dto.SchedulingPackageResponse;
import com.raceforge.backend.training.dto.AttendSessionRequest;
import com.raceforge.backend.training.dto.AttendanceResponse;
import com.raceforge.backend.training.dto.ScheduleRecurringRequest;
import com.raceforge.backend.training.dto.TrainingSessionResponse;
import com.raceforge.backend.training.service.TrainingScheduleService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.raceforge.backend.security.AuthenticatedUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;

// Shares the /api/training-sessions base path with TrainingSessionController but uses different
// sub-paths (/recurring, /{id}/attendance, /horse/{id}), so the mappings do not collide.
@RestController
@RequestMapping("/api/training-sessions")
@Tag(name = "Training Schedule")
public class TrainingScheduleController {

        @Autowired
        private TrainingScheduleService trainingScheduleService;

        @PostMapping("/recurring")
        @PreAuthorize("hasAuthority('HEAD_TRAINER') and @permissionAccess.has(authentication, 'MANAGE_TRAINING')")
        public ResponseEntity<ApiResponse<List<TrainingSessionResponse>>> createRecurring(
                        @Valid @RequestBody ScheduleRecurringRequest request) {
                List<TrainingSessionResponse> created = trainingScheduleService.createRecurringSchedule(request);
                return ResponseEntity.ok(ApiResponse.success("Training schedule created", created));
        }

        @GetMapping("/horse/{horseId}/scheduling-packages")
        @PreAuthorize("hasAuthority('HEAD_TRAINER') and @permissionAccess.has(authentication, 'MANAGE_TRAINING')")
        public ResponseEntity<ApiResponse<List<SchedulingPackageResponse>>> schedulingPackages(
                        @PathVariable String horseId) {
                return ResponseEntity.ok(ApiResponse.success("Scheduling packages retrieved",
                                trainingScheduleService.getSchedulingPackages(horseId)));
        }

        @PutMapping("/{sessionId}/attendance")
        @PreAuthorize("hasAuthority('HEAD_TRAINER') and @permissionAccess.has(authentication, 'MANAGE_TRAINING')")
        public ResponseEntity<ApiResponse<AttendanceResponse>> submitAttendance(
                        @PathVariable String sessionId,
                        @Valid @RequestBody AttendSessionRequest request,
                        @AuthenticationPrincipal AuthenticatedUser user) {
                AttendanceResponse response = trainingScheduleService.submitAttendance(sessionId, request,
                                user.userId());
                String message = response.isWarningTriggered()
                                ? "Attendance recorded, performance warning triggered"
                                : "Attendance recorded";
                return ResponseEntity.ok(ApiResponse.success(message, response));
        }

        @GetMapping("/horse/{horseId}")
        @PreAuthorize("@permissionAccess.canReadHorse(authentication, #p0)")
        public ResponseEntity<ApiResponse<List<TrainingSessionResponse>>> getByHorse(@PathVariable String horseId) {
                return ResponseEntity.ok(ApiResponse.success(
                                "Training schedule retrieved", trainingScheduleService.getScheduleByHorseId(horseId)));
        }
}
