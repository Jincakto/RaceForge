package com.raceforge.backend.training.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.security.AuthenticatedUser;
import com.raceforge.backend.training.dto.AttendSessionRequest;
import com.raceforge.backend.training.dto.AttendanceResponse;
import com.raceforge.backend.training.dto.ScheduleRecurringRequest;
import com.raceforge.backend.training.dto.TrainingSessionResponse;
import com.raceforge.backend.training.service.TrainingScheduleService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

// Shares the /api/training-sessions base path with TrainingSessionController but uses different
// sub-paths (/recurring, /{id}/attendance, /horse/{id}), so the mappings do not collide.
@RestController
@RequestMapping("/api/training-sessions")
public class TrainingScheduleController {

  @Autowired
  private TrainingScheduleService trainingScheduleService;

  @PostMapping("/recurring")
  @PreAuthorize("hasAuthority('HEAD_TRAINER')")
  public ResponseEntity<ApiResponse<List<TrainingSessionResponse>>> createRecurring(
          @Valid @RequestBody ScheduleRecurringRequest request) {
      List<TrainingSessionResponse> created = trainingScheduleService.createRecurringSchedule(request);
      return ResponseEntity.ok(ApiResponse.success("Training schedule created", created));
  }

  @PutMapping("/{sessionId}/attendance")
  @PreAuthorize("hasAuthority('HEAD_TRAINER')")
  public ResponseEntity<ApiResponse<AttendanceResponse>> submitAttendance(
          @PathVariable Integer sessionId,
          @Valid @RequestBody AttendSessionRequest request,
          @AuthenticationPrincipal AuthenticatedUser currentUser) {
      request.setPerformedBy(currentUser.userId());
      AttendanceResponse response = trainingScheduleService.submitAttendance(sessionId, request);
      String message = response.isWarningTriggered()
              ? "Attendance recorded, performance warning triggered"
              : "Attendance recorded";
      return ResponseEntity.ok(ApiResponse.success(message, response));
  }

  @GetMapping("/horse/{horseId}")
  public ResponseEntity<ApiResponse<List<TrainingSessionResponse>>> getByHorse(@PathVariable Integer horseId) {
      return ResponseEntity.ok(ApiResponse.success(
              "Training schedule retrieved", trainingScheduleService.getScheduleByHorseId(horseId)));
  }
}
